/* =========================================================================
   query.js — Função de consulta local única e determinística (design (b)).
   ---------------------------------------------------------------------------
   runQuery({contextId, measure, dimension, filters, sort}) lê datasets[ctx]
   de data.js, FILTRA as linhas-base, agrupa por dimension, aplica a regra do
   measureKind, ordena, e devolve um objeto com discriminador `shape`.

   Regras de cálculo (design (b)):
     total/count  -> soma/contagem das linhas filtradas do grupo.
     rate         -> soma(numerador)/soma(denominador)*100 (nunca média de %).
     distribution -> contagens inteiras do seed + percentuais RECONCILIADOS
                     pelo método do MAIOR RESTO (somam exatamente 100).
     delta        -> relativa vs. período imediatamente anterior em periods,
                     só para total/count/rate com exatamente UM período e
                     predecessor com linhas-base; senão null.

   Filtros aplicáveis vs. ignorados (MEDIUM-6): aplicável SSE a key é coluna
   da base E está em measure.appliesTo.

   NENHUMA sincronização com Superset. NENHUM Math.random()/Date: determinístico.
   As cores NÃO são atribuídas aqui — vêm do renderizador (MEDIUM-2).
   ========================================================================= */

import { CONTEXTS, datasets, fixtureStatusCounts } from './data.js';

/* Rótulo de uma opção de filtro que representa "sem restrição" (clearedTo). */
function isClearedValue(ctx, key, value) {
  const f = (ctx.filters || []).find((x) => x.key === key);
  if (!f) return false;
  return value == null || value === '' || value === f.clearedTo;
}

/* Colunas existentes nas linhas-base do contexto. */
function baseColumns(contextId) {
  const rows = datasets[contextId] || [];
  return rows.length ? Object.keys(rows[0]) : [];
}

/* Classifica filtros em aplicáveis (aplicados) vs. ignorados (design (b)).
   - aplicável SSE key é coluna da base E está em measure.appliesTo.
   - só entra em appliedFilters quando realmente restringe (não é clearedTo). */
function classifyFilters(ctx, contextId, measureCfg, filters) {
  const cols = baseColumns(contextId);
  const appliesTo = measureCfg.appliesTo || [];
  const appliedFilters = {};
  const ignoredFilters = {};
  for (const [key, value] of Object.entries(filters || {})) {
    if (isClearedValue(ctx, key, value)) continue; // não restringe
    const isColumn = cols.includes(key);
    const inAppliesTo = appliesTo.includes(key);
    if (isColumn && inAppliesTo) {
      appliedFilters[key] = value;
    } else {
      // Válido no contexto mas fora do appliesTo da medida (ou não é coluna).
      ignoredFilters[key] = value;
    }
  }
  return { appliedFilters, ignoredFilters };
}

/* Aplica somente os filtros efetivamente aplicados às linhas-base. */
function filterRows(contextId, appliedFilters) {
  const rows = datasets[contextId] || [];
  const entries = Object.entries(appliedFilters);
  if (!entries.length) return rows.slice();
  return rows.filter((r) => entries.every(([k, v]) => String(r[k]) === String(v)));
}

/* Agrupa linhas por uma dimensão, preservando ordem de primeira aparição. */
function groupBy(rows, dimKey) {
  const map = new Map();
  for (const r of rows) {
    const key = r[dimKey];
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return map;
}

/* Soma uma coluna numérica sobre um conjunto de linhas. */
function sumCol(rows, col) {
  let s = 0;
  for (const r of rows) s += Number(r[col]) || 0;
  return s;
}

/* -------------------------------------------------------------------------
   Reconciliação de 100% pelo método do maior resto (largest remainder).
   Entrada: contagens inteiras por categoria. Saída: percentuais inteiros que
   somam exatamente 100 (design (b), HIGH-2 / rev-iter2 #7).
   ------------------------------------------------------------------------- */
export function largestRemainderPercents(counts) {
  const keys = Object.keys(counts);
  const total = keys.reduce((s, k) => s + (Number(counts[k]) || 0), 0);
  if (total <= 0) {
    const zero = {};
    for (const k of keys) zero[k] = 0;
    return zero;
  }
  const exact = {};
  const floors = {};
  let floorSum = 0;
  for (const k of keys) {
    exact[k] = ((Number(counts[k]) || 0) / total) * 100;
    floors[k] = Math.floor(exact[k]);
    floorSum += floors[k];
  }
  let remaining = 100 - floorSum;
  // Ordena por maior parte fracionária; desempate estável pela ordem das keys.
  const order = keys
    .map((k, i) => ({ k, i, frac: exact[k] - floors[k] }))
    .sort((a, b) => (b.frac - a.frac) || (a.i - b.i));
  const out = { ...floors };
  for (let j = 0; j < order.length && remaining > 0; j++) {
    out[order[j].k] += 1;
    remaining -= 1;
  }
  return out;
}

/* Ordena rows categóricas por value conforme sort ('asc'|'desc'|null). */
function sortRows(rows, sort) {
  if (sort === 'asc') return rows.slice().sort((a, b) => a.value - b.value);
  if (sort === 'desc') return rows.slice().sort((a, b) => b.value - a.value);
  return rows;
}

/* Calcula o valor de uma medida (não-distribution) sobre um grupo de linhas. */
function measureValue(measureCfg, rows) {
  if (measureCfg.kind === 'rate') {
    const num = sumCol(rows, measureCfg.numerator);
    const den = sumCol(rows, measureCfg.denominator);
    if (!den) return 0;
    return Math.round((num / den) * 100 * 10) / 10; // 1 casa decimal
  }
  if (measureCfg.kind === 'count') {
    return rows.length;
  }
  // total (default): soma da coluna de mesmo nome da key.
  return sumCol(rows, measureCfg.key);
}

/* Único período efetivamente selecionado (para delta), ou null. */
function singleSelectedPeriod(ctx, appliedFilters) {
  const v = appliedFilters.periodo;
  if (v == null) return null;
  return ctx.periods.includes(v) ? v : null;
}

/* Calcula delta relativo vs. período anterior; null quando não aplicável. */
function computeDelta(ctx, contextId, measureCfg, appliedFilters, currentValue) {
  if (!['total', 'count', 'rate'].includes(measureCfg.kind)) return null;
  const period = singleSelectedPeriod(ctx, appliedFilters);
  if (!period) return null;
  const idx = ctx.periods.indexOf(period);
  if (idx <= 0) return null; // sem predecessor
  const prevPeriod = ctx.periods[idx - 1];
  // Linhas-base do período anterior no MESMO recorte (demais filtros aplicados).
  const prevFilters = { ...appliedFilters, periodo: prevPeriod };
  const prevRows = filterRows(contextId, prevFilters);
  if (!prevRows.length) return null;
  const prevValue = measureValue(measureCfg, prevRows);
  if (!prevValue) return null;
  const delta = ((currentValue - prevValue) / prevValue) * 100;
  return Math.round(delta * 10) / 10; // 1 casa, sinal preservado
}

/* -------------------------------------------------------------------------
   runQuery — contrato único de consulta.
   ------------------------------------------------------------------------- */
export function runQuery({ contextId, measure, dimension, filters, sort } = {}) {
  const ctx = CONTEXTS[contextId];
  const measureCfg = ctx ? (ctx.measures || []).find((m) => m.key === measure) : null;

  // Contexto/medida inválidos -> vazio coerente (nunca throw).
  if (!ctx || !measureCfg) {
    return {
      shape: 'categorical',
      rows: [],
      series: null,
      columns: [],
      meta: { unit: '', period: '', sourceLabel: '', measureKind: null, updatedAt: null },
      appliedFilters: {},
      ignoredFilters: {},
      empty: true,
    };
  }

  const { appliedFilters, ignoredFilters } = classifyFilters(ctx, contextId, measureCfg, filters || {});
  const rows = filterRows(contextId, appliedFilters);
  const period = appliedFilters.periodo || 'todos os períodos';
  const baseMeta = {
    unit: measureCfg.unit || '',
    period,
    sourceLabel: `${ctx.label} (fictício)`,
    measureKind: measureCfg.kind,
    updatedAt: null, // preenchido pela camada de persistência/seed (FEAT-002)
  };

  /* ---- Distribuição: shape categorical com count (bruto) + pct (reconciliado) ---- */
  if (measureCfg.kind === 'distribution') {
    const cats = measureCfg.categories || [];
    // Fixture não-exata pinada (ex. status de entrevista) tem contagens fixas.
    let counts = {};
    if (measureCfg.fixture === 'status') {
      counts = { ...fixtureStatusCounts };
    } else {
      for (const c of cats) counts[c.key] = sumCol(rows, c.key);
    }
    const pcts = largestRemainderPercents(counts);
    let built = cats.map((c) => ({
      key: c.key,
      label: c.label,
      value: Number(counts[c.key]) || 0,
      count: Number(counts[c.key]) || 0,
      pct: pcts[c.key] || 0,
    }));
    built = sortRows(built, sort);
    const empty = built.every((r) => r.count === 0);
    return {
      shape: 'categorical',
      rows: built,
      series: null,
      columns: [
        { key: 'label', label: 'Categoria', type: 'text' },
        { key: 'count', label: 'Contagem', type: 'num' },
        { key: 'pct', label: '%', type: 'pct' },
      ],
      meta: baseMeta,
      appliedFilters,
      ignoredFilters,
      empty,
    };
  }

  const groups = groupBy(rows, dimension);

  /* ---- Série temporal (dimensão de período) -> shape series ---- */
  const isTemporal = dimension === 'periodo';
  if (isTemporal) {
    // Rótulos em ordem cronológica crescente declarada em ctx.periods,
    // limitados aos presentes no recorte.
    const present = ctx.periods.filter((p) => groups.has(p));
    const labels = present.length ? present : Array.from(groups.keys());
    const data = labels.map((p) => measureValue(measureCfg, groups.get(p) || []));
    const empty = rows.length === 0;
    return {
      shape: 'series',
      rows: null,
      series: {
        labels,
        datasets: [{ key: measureCfg.key, label: measureCfg.label, data }],
      },
      columns: [
        { key: 'label', label: 'Período', type: 'text' },
        { key: 'value', label: measureCfg.label, type: measureCfg.kind === 'rate' ? 'pct' : 'num' },
      ],
      meta: baseMeta,
      appliedFilters,
      ignoredFilters,
      empty,
    };
  }

  /* ---- Categórica (bar/metric/table) -> shape categorical ---- */
  const dimCfg = (ctx.dimensions || []).find((d) => d.key === dimension);
  let built = [];
  for (const [key, grpRows] of groups.entries()) {
    built.push({ key, label: String(key), value: measureValue(measureCfg, grpRows) });
  }
  built = sortRows(built, sort);
  const empty = rows.length === 0;

  // Delta: só quando o recorte representa um valor único comparável
  // (um período selecionado) — calculado sobre o total do recorte.
  const totalValue = measureValue(measureCfg, rows);
  const delta = computeDelta(ctx, contextId, measureCfg, appliedFilters, totalValue);

  return {
    shape: 'categorical',
    rows: built,
    series: null,
    columns: [
      { key: 'label', label: dimCfg ? dimCfg.label : 'Categoria', type: 'text' },
      { key: 'value', label: measureCfg.label, type: measureCfg.kind === 'rate' ? 'pct' : 'num' },
    ],
    meta: { ...baseMeta, delta },
    appliedFilters,
    ignoredFilters,
    empty,
  };
}
