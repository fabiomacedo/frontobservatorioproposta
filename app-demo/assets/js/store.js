/* =========================================================================
   store.js — Store relacional versionado do Observatório (demo).
   ---------------------------------------------------------------------------
   Modelo de estado local versionado `observatorio_demo_v2` (design (a)).
   Tudo em localStorage; NENHUMA chamada externa, nenhum dado sai do navegador.
   Logging é só `console` local (sem rede/telemetria), coerente com NFR-1.

   Garantias (FEAT-002):
     - Migração/segurança: descarta a chave antiga v1; cai em seed() quando v2
       ausente/corrompido/incompatível; nunca deixa exceção apagar a UI (NFR-3).
     - localStorage indisponível (modo privado) => opera em memória + toast.
     - Ações mutáveis checam can(action, state) ANTES de mutar e retornam
       { ok, denied?, errors? }; negado/ inválido => retorno cedo sem save/emit.
     - publish() cria publishedSnapshot versionado com cópia das análises.
     - Determinismo (NFR-2): IDs via uiState.uidSeq; timestamps via FAKE_CLOCK
       + uiState.clockSeq. NUNCA Math.random()/Date.now()/new Date().
   ========================================================================= */

import { CONTEXTS, datasets, FAKE_CLOCK } from './data.js';
import { can, PROFILES } from './permissions.js';
import { validateAnalysis, normalizeText, TITLE_MAX, TEXT_MAX } from './analysis.js';

const KEY = 'observatorio_demo_v2';
const LEGACY_KEY = 'observatorio_ifrj_demo_v1';
const VERSION = 2;

const listeners = new Set();

/* `memoryOnly` fica true quando o localStorage está indisponível (modo
   privado); o estado passa a viver só em memória e não sobrevive a reload. */
let memoryOnly = false;
/* Fila de toasts informativos para o app.js consumir após init(). */
let pendingToast = null;

let state = null;

/* =========================================================================
   Seed — estado coerente completo (design (a) item 3).
   ========================================================================= */

/* Clona via JSON para isolar o seed das constantes de data.js (sem mutar a
   configuração módulo-constante). Determinístico: sem datas/aleatoriedade. */
function clone(v) { return JSON.parse(JSON.stringify(v)); }

/* Extrai o sufixo numérico de um ID semente ('an-acad-1' -> 1; sem número
   => 0), para reiniciar uidSeq acima do maior ID numérico existente. */
function idNum(id) {
  const m = /(\d+)\s*$/.exec(String(id || ''));
  return m ? parseInt(m[1], 10) : 0;
}

function seed() {
  const contexts = {};
  const analyses = {};
  const publications = {};
  const filtersByContext = {};
  let maxId = 100;

  for (const ctxId of Object.keys(CONTEXTS)) {
    const ctx = CONTEXTS[ctxId];
    // Config do contexto (sem os seeds, que viram entidades de topo).
    const { seedAnalyses, seedPublication, ...ctxConfig } = ctx;
    contexts[ctxId] = clone(ctxConfig);

    // Análises semente (inclui 1 superset_demo por contexto — já em data.js).
    for (const an of seedAnalyses || []) {
      analyses[an.id] = clone(an);
      maxId = Math.max(maxId, idNum(an.id));
    }

    // 1 publicação rascunho por contexto.
    if (seedPublication) {
      publications[seedPublication.id] = clone(seedPublication);
      maxId = Math.max(maxId, idNum(seedPublication.id));
      for (const b of seedPublication.draft?.blocks || []) {
        maxId = Math.max(maxId, idNum(b.id));
      }
    }

    // Filtros do contexto no seu recorte limpo (clearedTo de cada filtro).
    const cleared = {};
    for (const f of ctx.filters || []) cleared[f.key] = f.clearedTo;
    filtersByContext[ctxId] = cleared;
  }

  return {
    version: VERSION,
    activeContextId: 'acad',
    activeProfileId: 'author_pub',
    contexts,
    datasets: clone(datasets),
    analyses,
    publications,
    conversations: {},
    uiState: {
      filtersByContext,
      composer: {},
      editor: {},
      catalogQuery: '',
      uidSeq: maxId + 1, // reinicia acima do maior ID semente
      clockSeq: 0,
    },
  };
}

/* =========================================================================
   Persistência: load / migração / save.
   ========================================================================= */

/* Valida as invariantes mínimas da forma persistida (design (a) item 2). */
function isValidState(p) {
  if (!p || typeof p !== 'object') return false;
  if (p.version !== VERSION) return false;
  const rootKeys = [
    'activeContextId', 'activeProfileId', 'contexts', 'datasets',
    'analyses', 'publications', 'conversations', 'uiState',
  ];
  for (const k of rootKeys) {
    if (!(k in p) || p[k] == null) return false;
  }
  if (typeof p.uiState !== 'object') return false;
  if (!p.uiState.filtersByContext || typeof p.uiState.filtersByContext !== 'object') return false;
  if (typeof p.uiState.uidSeq !== 'number' || typeof p.uiState.clockSeq !== 'number') return false;
  return true;
}

function load() {
  // Probe de disponibilidade do localStorage (modo privado pode lançar).
  let ls = null;
  try {
    ls = window.localStorage;
    const probe = '__obs_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
  } catch {
    ls = null;
  }

  if (!ls) {
    // Armazenamento indisponível: opera em memória.
    memoryOnly = true;
    pendingToast = {
      title: 'Armazenamento local indisponível',
      detail: 'Alterações não sobrevivem a reload.',
    };
    state = seed();
    return;
  }

  // Descarte seguro da chave antiga v1 — NUNCA interpretada como v2.
  try {
    if (ls.getItem(KEY) == null && ls.getItem(LEGACY_KEY) != null) {
      ls.removeItem(LEGACY_KEY);
      console.info('estado antigo descartado');
    }
  } catch { /* leitura/remoção da chave antiga é best-effort */ }

  let parsed = null;
  try {
    const raw = ls.getItem(KEY);
    if (raw != null) parsed = JSON.parse(raw);
  } catch {
    parsed = null; // corrompido => seed
  }

  if (isValidState(parsed)) {
    state = parsed;
  } else {
    state = seed();
    save();
  }
}

function save() {
  if (memoryOnly) return; // sem persistência em modo memória
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // Quota ou indisponibilidade: silencioso, só log local (sem rede).
    console.warn('store.save falhou (quota/indisponível):', e && e.name);
  }
}

function emit() { listeners.forEach((f) => f(state)); }

/* =========================================================================
   Helpers determinísticos (design (a) item 4): uid() e fakeStamp().
   ========================================================================= */

/* uid(prefix) deriva de uiState.uidSeq (persistido). NUNCA Math.random(). */
function uid(prefix) {
  const n = state.uiState.uidSeq++;
  return `${prefix}${n}`;
}

/* fakeStamp(): relógio fictício por clockSeq % FAKE_CLOCK.length; incrementa
   clockSeq e salva. Campo DISTINTO de uidSeq; sem aritmética de data. */
function fakeStamp() {
  const seq = state.uiState.clockSeq;
  const stamp = FAKE_CLOCK[seq % FAKE_CLOCK.length];
  state.uiState.clockSeq = seq + 1;
  save();
  return stamp;
}

/* =========================================================================
   Seletores tolerantes a ausência (design (a) item 5).
   Nenhum seletor lança exceção que apague a tela.
   ========================================================================= */

function activeContext() {
  return (state && state.contexts && state.contexts[state.activeContextId]) || null;
}

function getAnalysis(id) {
  return (state && state.analyses && state.analyses[id]) || null;
}

function getPublication(id) {
  return (state && state.publications && state.publications[id]) || null;
}

/* Busca real por título + descrição; filtra por contexto e origem. */
function listAnalyses({ contextId, origin, q } = {}) {
  const all = Object.values((state && state.analyses) || {});
  const needle = String(q || '').trim().toLowerCase();
  return all.filter((a) => {
    if (contextId && a.contextId !== contextId) return false;
    if (origin && a.origin !== origin) return false;
    if (needle) {
      const hay = `${a.title || ''} ${a.description || ''}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

function getContext(id) {
  return (state && state.contexts && state.contexts[id]) || null;
}

function listPublications({ contextId } = {}) {
  const all = Object.values((state && state.publications) || {});
  return contextId ? all.filter((p) => p.contextId === contextId) : all;
}

function activeFilters() {
  const byCtx = (state && state.uiState && state.uiState.filtersByContext) || {};
  return byCtx[state.activeContextId] || {};
}

/* Filtros limpos (clearedTo) do contexto informado. */
function clearedFiltersFor(ctxId) {
  const ctx = getContext(ctxId);
  const cleared = {};
  for (const f of (ctx && ctx.filters) || []) cleared[f.key] = f.clearedTo;
  return cleared;
}

/* =========================================================================
   Ações de UI/navegação — SEM checagem de permissão (design (i)).
   ========================================================================= */

function setContext(id) {
  if (!getContext(id)) return; // id desconhecido => no-op
  state.activeContextId = id;
  // Repovoa filtros a partir do recorte do contexto destino (não mistura
  // filtros incompatíveis); usa o guardado em filtersByContext ou o limpo.
  if (!state.uiState.filtersByContext[id]) {
    state.uiState.filtersByContext[id] = clearedFiltersFor(id);
  }
  save();
  emit();
}

function setProfile(id) {
  if (!PROFILES.includes(id)) return; // inválido => no-op
  state.activeProfileId = id;
  save();
  emit();
}

function setFilter(k, v) {
  const ctxId = state.activeContextId;
  if (!state.uiState.filtersByContext[ctxId]) {
    state.uiState.filtersByContext[ctxId] = clearedFiltersFor(ctxId);
  }
  state.uiState.filtersByContext[ctxId][k] = v;
  save();
  emit();
}

function clearFilters() {
  const ctxId = state.activeContextId;
  state.uiState.filtersByContext[ctxId] = clearedFiltersFor(ctxId);
  save();
  emit();
}

function setCatalogQuery(q) {
  state.uiState.catalogQuery = String(q || '');
  save();
  emit();
}

/* reset() == seed() + save() + emit(). DESTRUTIVO: descarta análises,
   publicações e conversas criadas pelo usuário (design HIGH-3). */
function reset() {
  state = seed();
  save();
  emit();
}

/* =========================================================================
   Ações mutáveis — checam can(action, state) ANTES de mutar e retornam
   { ok, denied?, errors? } (design (i)). Negado/ inválido => retorno cedo
   sem save()/emit() (estado intocado).
   ========================================================================= */

/* saveAnalysis(def) — cria uma nova Analysis no contexto ativo. */
function saveAnalysis(def) {
  if (!can('edit', state)) return { ok: false, denied: true };

  const ctx = activeContext();
  const v = validateAnalysis(def, ctx || {});
  if (!v.ok) return { ok: false, errors: v.errors };

  const id = uid('an-');
  const stamp = fakeStamp(); // avança o relógio fictício e salva
  const measureCfg = (ctx && (ctx.measures || []).find((m) => m.key === def.measure)) || null;
  state.analyses[id] = {
    id,
    contextId: state.activeContextId,
    title: normalizeText(def.title, TITLE_MAX),
    description: normalizeText(def.description, TEXT_MAX),
    origin: 'manual',
    def: {
      measure: def.measure,
      dimension: def.dimension,
      filters: { ...(def.filters || {}) },
      sort: def.sort || 'desc',
    },
    viz: def.viz,
    semanticRefs: measureCfg ? [measureCfg.lexicon] : [],
    meta: {
      unit: measureCfg ? measureCfg.unit : '',
      period: '',
      sourceLabel: (ctx && ctx.identity && ctx.identity.subtitle) || '',
    },
    createdAt: stamp,
    updatedAt: stamp,
  };
  save();
  emit();
  return { ok: true, id };
}

/* updateAnalysis(id, def) — atualiza uma Analysis existente (própria). */
function updateAnalysis(id, def) {
  if (!can('edit', state)) return { ok: false, denied: true };

  const existing = getAnalysis(id);
  if (!existing) return { ok: false, errors: [{ field: 'id', msg: 'Análise inexistente.' }] };

  const ctx = getContext(existing.contextId) || activeContext();
  const v = validateAnalysis(def, ctx || {});
  if (!v.ok) return { ok: false, errors: v.errors };

  const measureCfg = (ctx && (ctx.measures || []).find((m) => m.key === def.measure)) || null;
  existing.title = normalizeText(def.title, TITLE_MAX);
  existing.description = normalizeText(def.description, TEXT_MAX);
  existing.def = {
    measure: def.measure,
    dimension: def.dimension,
    filters: { ...(def.filters || {}) },
    sort: def.sort || 'desc',
  };
  existing.viz = def.viz;
  if (measureCfg) {
    existing.semanticRefs = [measureCfg.lexicon];
    existing.meta = { ...(existing.meta || {}), unit: measureCfg.unit };
  }
  existing.updatedAt = fakeStamp();
  save();
  emit();
  return { ok: true, id };
}

/* =========================================================================
   Ações do compositor — checam can('compose', state).
   ========================================================================= */

function pubDraftBlocks(pubId) {
  const pub = getPublication(pubId);
  if (!pub) return null;
  if (!pub.draft) pub.draft = { blocks: [] };
  if (!Array.isArray(pub.draft.blocks)) pub.draft.blocks = [];
  return pub;
}

function addBlock(pubId, type, extra = {}) {
  if (!can('compose', state)) return { ok: false, denied: true };
  const pub = pubDraftBlocks(pubId);
  if (!pub) return { ok: false, errors: [{ field: 'pubId', msg: 'Publicação inexistente.' }] };

  const b = { id: uid('b'), type, ...extra };
  if (type === 'text' && b.content == null) b.content = '';
  if (type === 'title' && b.content == null) b.content = '';
  pub.draft.blocks.push(b);
  save();
  emit();
  return { ok: true, id: b.id };
}

function removeBlock(pubId, blockId) {
  if (!can('compose', state)) return { ok: false, denied: true };
  const pub = pubDraftBlocks(pubId);
  if (!pub) return { ok: false, errors: [{ field: 'pubId', msg: 'Publicação inexistente.' }] };

  const before = pub.draft.blocks.length;
  pub.draft.blocks = pub.draft.blocks.filter((b) => b.id !== blockId);
  if (pub.draft.blocks.length === before) {
    return { ok: false, errors: [{ field: 'blockId', msg: 'Bloco inexistente.' }] };
  }
  save();
  emit();
  return { ok: true };
}

function moveBlock(pubId, blockId, dir) {
  if (!can('compose', state)) return { ok: false, denied: true };
  const pub = pubDraftBlocks(pubId);
  if (!pub) return { ok: false, errors: [{ field: 'pubId', msg: 'Publicação inexistente.' }] };

  const a = pub.draft.blocks;
  const i = a.findIndex((b) => b.id === blockId);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= a.length) {
    return { ok: false, errors: [{ field: 'blockId', msg: 'Movimento inválido.' }] };
  }
  [a[i], a[j]] = [a[j], a[i]];
  save();
  emit();
  return { ok: true };
}

/* applyTemplate(pubId, blocks) — substitui os blocos do rascunho por um
   conjunto de modelo. O diálogo de confirmação é responsabilidade da view. */
function applyTemplate(pubId, blocks) {
  if (!can('compose', state)) return { ok: false, denied: true };
  const pub = pubDraftBlocks(pubId);
  if (!pub) return { ok: false, errors: [{ field: 'pubId', msg: 'Publicação inexistente.' }] };

  pub.draft.blocks = (blocks || []).map((b) => ({ id: b.id || uid('b'), ...b }));
  save();
  emit();
  return { ok: true };
}

/* =========================================================================
   publish(pubId) — design (h). Valida, checa permissão, cria snapshot
   versionado com cópia das análises referenciadas.
   ========================================================================= */

function publish(pubId) {
  const pub = getPublication(pubId);
  if (!pub) return { ok: false, errors: [{ field: 'pubId', msg: 'Publicação inexistente.' }] };

  // (1) Validação: título não-vazio, >=1 bloco, referências resolvem.
  const errors = [];
  const title = String(pub.title || '').trim();
  if (title.length < 1) errors.push({ field: 'title', msg: 'Informe um título.' });
  if (title.length > TITLE_MAX) {
    errors.push({ field: 'title', msg: `O título deve ter no máximo ${TITLE_MAX} caracteres.` });
  }

  const blocks = (pub.draft && Array.isArray(pub.draft.blocks)) ? pub.draft.blocks : [];
  if (blocks.length < 1) errors.push({ field: 'blocks', msg: 'Adicione ao menos um bloco.' });

  const analysesCopy = {};
  for (const b of blocks) {
    if (b && b.analysisId != null) {
      const an = getAnalysis(b.analysisId);
      if (!an) {
        errors.push({ field: 'analysisId', msg: `Referência de análise inválida: ${b.analysisId}.` });
      } else {
        analysesCopy[b.analysisId] = clone(an);
      }
    }
  }

  if (errors.length) return { ok: false, errors };

  // (2) Permissão simulada — centralizada, não só no botão.
  if (!can('publish', state)) return { ok: false, denied: true };

  // (3) Snapshot versionado com cópia das análises e savedAt fictício.
  const prevVersion = (pub.publishedSnapshot && pub.publishedSnapshot.version) || 0;
  pub.publishedSnapshot = {
    version: prevVersion + 1,
    blocks: clone(blocks),
    analysesCopy,
    savedAt: fakeStamp(),
  };
  save();
  emit();
  return { ok: true, version: pub.publishedSnapshot.version };
}

/* =========================================================================
   API pública — assinatura compatível com app.js (init/get/subscribe).
   ========================================================================= */

export const store = {
  init() {
    load();
    // Entrega o toast pendente (modo memória) ao primeiro subscriber ciclo.
    return { toast: pendingToast };
  },
  get() { return state; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  // Informativos/diagnóstico de inicialização.
  takePendingToast() { const t = pendingToast; pendingToast = null; return t; },
  isMemoryOnly() { return memoryOnly; },

  // Seletores.
  activeContext,
  getContext,
  getAnalysis,
  getPublication,
  listAnalyses,
  listPublications,
  activeFilters,

  // Helpers determinísticos.
  fakeStamp,

  // Ações de UI/navegação (sem permissão).
  setContext,
  setProfile,
  setFilter,
  clearFilters,
  setCatalogQuery,
  reset,

  // Ações mutáveis (checam permissão; retornam {ok,denied?,errors?}).
  saveAnalysis,
  updateAnalysis,
  addBlock,
  removeBlock,
  moveBlock,
  applyTemplate,
  publish,
};
