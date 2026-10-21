/* =========================================================================
   render.js — Renderizador único de análise (design (b)/(j)/(k), FR-4).
   ---------------------------------------------------------------------------
   renderAnalysis(analysis, result) é a ÚNICA porta de renderização de análise
   para dashboard, catálogo, editor/preview, compositor e consumo. Ele:

     1. Escolhe a visualização por result.shape / analysis.viz.
     2. Monta a PALETA ORDENADA das CSS vars do contexto e a repassa aos charts
        (que indexam a série/fatia de índice i por palette[i % palette.length];
        série/valor único usa var(--accent)).
     3. Para donut, repassa os pct RECONCILIADOS de result.rows[].pct.
     4. Para tabela, usa tableChart(rows, columns).
     5. Trata estados: embed (placeholder Superset simulado, sem iframe/token)
        e "sem dados" (result.empty), com o recorte que o causou.
     6. SEMPRE anexa o rodapé de metadados (significado conceitual / regra de
        cálculo / fonte / atualização) + descrição textual acessível.

   NÃO contém lógica de dados: só escolhe viz, monta paleta e anexa metadados a
   partir de `result` (vindo de runQuery). Cores NUNCA vêm de runQuery.
   ========================================================================= */

import { esc, lineChart, barChart, donutChart, tableChart } from './charts.js';

/* Paleta ordenada a partir das CSS vars do contexto ativo (redefinidas no
   .shell por setContext). Indexada por i % 5 nos charts. */
export const PALETTE = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)',
];

/* Texto fixo do recurso Superset ilustrativo (design (j), FR-10). */
const SUPERSET_LABEL = 'Dashboard Superset (simulado)';
const SUPERSET_NOTE =
  'Conteúdo incorporado simulado. Integração, autenticação e recursos disponíveis dependem de validação técnica.';

/* Rótulo legível da regra de cálculo a partir do measureKind. */
function calcRuleLabel(meta) {
  switch (meta && meta.measureKind) {
    case 'rate': return 'Taxa: numerador ÷ denominador × 100 (nunca média de percentuais).';
    case 'distribution': return 'Distribuição de um todo; percentuais reconciliados para somar exatamente 100.';
    case 'count': return 'Contagem das linhas-base do recorte.';
    case 'total': return 'Soma das linhas-base do recorte.';
    default: return 'Regra de cálculo não especificada.';
  }
}

/* Significado conceitual: vem do léxico quando a análise o traz; senão, texto
   neutro derivado do measureKind. O léxico explica significado, não números. */
function conceptMeaning(analysis, meta) {
  if (analysis && analysis.meta && analysis.meta.notion) return String(analysis.meta.notion);
  if (meta && meta.notion) return String(meta.notion);
  if (analysis && analysis.lexicon) return String(analysis.lexicon);
  return 'Significado conceitual conforme o léxico do contexto.';
}

/* Rodapé de metadados (quatro campos distintos — design (k), FR-11) +
   descrição textual acessível. Sempre anexado a qualquer viz. */
function metadataFooter(analysis, result) {
  const meta = (result && result.meta) || {};
  const significado = conceptMeaning(analysis, meta);
  const calculo = calcRuleLabel(meta);
  const fonte = meta.sourceLabel || 'Base fictícia';
  const atualizacao = meta.updatedAt || 'data fictícia';
  const unidade = meta.unit ? `<span><b>Unidade:</b> ${esc(meta.unit)}</span>` : '';
  const periodo = meta.period ? `<span><b>Período:</b> ${esc(meta.period)}</span>` : '';
  return `<div class="viz-meta" role="group" aria-label="Metadados da visualização">
    <div class="p-foot">
      <span><b>Significado:</b> ${esc(significado)}</span>
      <span><b>Cálculo:</b> ${esc(calculo)}</span>
      <span><b>Fonte:</b> ${esc(fonte)}</span>
      <span><b>Atualização:</b> ${esc(atualizacao)}</span>
      ${unidade}${periodo}
    </div>
  </div>`;
}

/* Estado "sem dados" com o recorte que o causou (design (k)). */
function emptyState(result) {
  const applied = (result && result.appliedFilters) || {};
  const entries = Object.entries(applied);
  const recorte = entries.length
    ? entries.map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(' · ')
    : 'nenhum filtro aplicado';
  return `<div class="state state-empty" role="status">
    <p><span aria-hidden="true">▢</span> Sem dados para este recorte.</p>
    <p class="small muted">Recorte: ${recorte}</p>
  </div>`;
}

/* Placeholder do recurso Superset (sem iframe, sem token — design (j)). */
function supersetPlaceholder(analysis) {
  const legenda = analysis && analysis.description ? esc(analysis.description) : '';
  return `<div class="embed-placeholder" role="img" aria-label="${esc(SUPERSET_LABEL)}. ${esc(SUPERSET_NOTE)}">
    <div class="embed-frame">
      <div class="embed-label"><span aria-hidden="true">▦</span> ${esc(SUPERSET_LABEL)}</div>
      <p class="embed-note">${esc(SUPERSET_NOTE)}</p>
      ${legenda ? `<p class="small muted">${legenda}</p>` : ''}
    </div>
  </div>`;
}

/* Métrica/indicador: valor único a partir de result (shape categorical). */
function metricViz(result) {
  const rows = (result && result.rows) || [];
  const first = rows[0];
  const value = first ? first.value : 0;
  const unit = (result.meta && result.meta.unit) || '';
  const delta = result.meta && result.meta.delta;
  const deltaHtml = (delta != null)
    ? `<div class="metric-delta ${delta >= 0 ? 'up' : 'down'}">
        <span aria-hidden="true">${delta >= 0 ? '▲' : '▼'}</span> ${esc(Math.abs(delta))}% vs. período anterior</div>`
    : '';
  return `<div class="metric">
    <div class="metric-value" style="color:var(--accent)">${esc(Number(value).toLocaleString('pt-BR'))}</div>
    <div class="metric-unit small muted">${esc(unit)}</div>
    ${deltaHtml}
  </div>`;
}

/* Corpo da visualização (sem o rodapé de metadados). */
function vizBody(analysis, result) {
  const viz = analysis && analysis.viz;

  // Recurso incorporado simulado (Superset): placeholder, nunca iframe/token.
  if (viz === 'embed' || (analysis && analysis.origin === 'superset_demo')) {
    return supersetPlaceholder(analysis);
  }

  if (result && result.empty) return emptyState(result);

  // Série temporal -> linha multissérie (paleta por i%5).
  if (result && result.shape === 'series') {
    const s = result.series || { labels: [], datasets: [] };
    const datasets = (s.datasets || []).map((d) => ({ key: d.key, label: d.label, data: d.data }));
    return lineChart(s.labels || [], datasets, {
      unit: (result.meta && result.meta.unit) || '',
      palette: PALETTE,
    });
  }

  // Categórica -> bar / donut / metric / table conforme analysis.viz.
  const rows = (result && result.rows) || [];
  const columns = (result && result.columns) || [];

  if (viz === 'table') {
    return tableChart(rows, columns, {});
  }
  if (viz === 'donut') {
    // Repassa valor BRUTO (arco) e pct RECONCILIADO (único) por fatia.
    const slices = rows.map((r) => ({ label: r.label, value: r.value, pct: r.pct }));
    return donutChart(slices, { palette: PALETTE });
  }
  if (viz === 'metric') {
    return metricViz(result);
  }
  // Padrão categórico: barras horizontais (medida única -> accent).
  return barChart(rows, { valueKey: 'value', labelKey: 'label', palette: PALETTE });
}

/* -------------------------------------------------------------------------
   renderAnalysis(analysis, result) — porta única de renderização.
   Devolve uma string HTML: corpo da viz + rodapé de metadados/acessibilidade.
   ------------------------------------------------------------------------- */
export function renderAnalysis(analysis, result) {
  const body = vizBody(analysis, result);
  const footer = metadataFooter(analysis, result);
  return `<div class="analysis-render">${body}${footer}</div>`;
}
