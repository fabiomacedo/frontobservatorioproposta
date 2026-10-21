/* =========================================================================
   analysis.js — Modelo de análise único (manual + IA) (design (d)).
   ---------------------------------------------------------------------------
   Fonte única da forma de Analysis usada por editor manual e IA roteirizada:
     emptyAnalysis(ctx)             -> def inicial coerente com o contexto.
     normalizeText(s, max)          -> trim + corte defensivo (ver limites).
     normalizeAnalysisText(def)     -> aplica trim aos campos de texto.
     validateAnalysis(def, ctx)     -> { ok, errors:[{field,msg}] }.

   Regras de texto (MEDIUM-4):
     - título: trim 1–120, obrigatório não-vazio.
     - descrição e blocos texto/título: trim 0–2000.
     - valores SEMPRE armazenados já com trim() (snapshots byte-estáveis).

   Compatibilidade viz × measureKind (design (d)):
     distribution        -> donut | table
     rate/total (por dim) -> bar | line | metric | table
   ========================================================================= */

export const TITLE_MIN = 1;
export const TITLE_MAX = 120;
export const TEXT_MAX = 2000;

/* Viz permitidos por measureKind. */
const VIZ_BY_KIND = {
  distribution: ['donut', 'table'],
  total: ['bar', 'line', 'metric', 'table'],
  count: ['bar', 'line', 'metric', 'table'],
  rate: ['bar', 'line', 'metric', 'table'],
};

/* Normaliza um texto: trim e corte ao limite (defensivo; validate reporta). */
export function normalizeText(s, max = TEXT_MAX) {
  const t = String(s ?? '').trim();
  return max != null && t.length > max ? t.slice(0, max) : t;
}

/* def inicial coerente: primeira medida/dimensão do contexto, filtros limpos. */
export function emptyAnalysis(ctx) {
  const measure = ctx && ctx.measures && ctx.measures[0] ? ctx.measures[0].key : null;
  const dimension = ctx && ctx.dimensions && ctx.dimensions[0] ? ctx.dimensions[0].key : null;
  const measureCfg = ctx && measure ? ctx.measures.find((m) => m.key === measure) : null;
  const viz = measureCfg ? (VIZ_BY_KIND[measureCfg.kind] || ['table'])[0] : 'table';
  return {
    title: '',
    description: '',
    measure,
    dimension,
    filters: {},
    sort: 'desc',
    viz,
  };
}

/* Aplica trim a título/descrição de um def (armazenamento byte-estável). */
export function normalizeAnalysisText(def) {
  const d = { ...(def || {}) };
  if ('title' in d) d.title = normalizeText(d.title, TITLE_MAX);
  if ('description' in d) d.description = normalizeText(d.description, TEXT_MAX);
  return d;
}

/* -------------------------------------------------------------------------
   validateAnalysis — retorna { ok, errors:[{field,msg}] }.
   ------------------------------------------------------------------------- */
export function validateAnalysis(def, ctx) {
  const errors = [];
  def = def || {};
  ctx = ctx || {};
  const measures = ctx.measures || [];
  const dimensions = ctx.dimensions || [];
  const filtersCfg = ctx.filters || [];

  // --- Título: trim 1–120 obrigatório não-vazio ---
  const title = String(def.title ?? '').trim();
  if (title.length < TITLE_MIN) {
    errors.push({ field: 'title', msg: 'Informe um título.' });
  } else if (title.length > TITLE_MAX) {
    errors.push({ field: 'title', msg: `O título deve ter no máximo ${TITLE_MAX} caracteres.` });
  }

  // --- Descrição: trim 0–2000 ---
  const description = String(def.description ?? '').trim();
  if (description.length > TEXT_MAX) {
    errors.push({ field: 'description', msg: `A descrição deve ter no máximo ${TEXT_MAX} caracteres.` });
  }

  // --- Medida ∈ ctx.measures ---
  const measureCfg = measures.find((m) => m.key === def.measure);
  if (!measureCfg) {
    errors.push({ field: 'measure', msg: 'Selecione uma medida válida.' });
  }

  // --- Dimensão ∈ ctx.dimensions ---
  const dimCfg = dimensions.find((d) => d.key === def.dimension);
  if (!dimCfg) {
    errors.push({ field: 'dimension', msg: 'Selecione uma dimensão válida.' });
  }

  // --- Filtros ∈ ctx.filters e compatíveis com a medida (appliesTo) ---
  const filters = def.filters || {};
  for (const key of Object.keys(filters)) {
    const fCfg = filtersCfg.find((f) => f.key === key);
    if (!fCfg) {
      errors.push({ field: `filter:${key}`, msg: `Filtro "${key}" não existe neste contexto.` });
      continue;
    }
    const value = filters[key];
    // Valor deve ser uma das opções declaradas (clearedTo é sempre opção válida).
    if (value != null && value !== '' && !(fCfg.options || []).includes(value)) {
      errors.push({ field: `filter:${key}`, msg: `Valor inválido para o filtro "${fCfg.label}".` });
    }
    // Incompatível com a medida: válido no contexto mas fora do appliesTo.
    if (measureCfg && !(measureCfg.appliesTo || []).includes(key)) {
      errors.push({ field: `filter:${key}`, msg: `O filtro "${fCfg.label}" não se aplica a esta medida.` });
    }
  }

  // --- viz compatível com measureKind ---
  if (measureCfg) {
    const allowed = VIZ_BY_KIND[measureCfg.kind] || [];
    if (!allowed.includes(def.viz)) {
      errors.push({ field: 'viz', msg: 'Tipo de visualização incompatível com a medida.' });
    }
  }

  return { ok: errors.length === 0, errors };
}

/* Expõe a tabela de compatibilidade para a UI filtrar selects (design (d)). */
export function allowedVizForKind(kind) {
  return (VIZ_BY_KIND[kind] || []).slice();
}
