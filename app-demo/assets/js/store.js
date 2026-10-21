/* =========================================================================
   store.js — Estado da demo IFRJ (filtros, composição). localStorage local.
   Nenhuma chamada externa; nenhum dado sai do navegador.
   ========================================================================= */

const KEY = 'observatorio_ifrj_demo_v1';
const listeners = new Set();

const initial = () => ({
  filters: { campus: 'Todos os campi', period: '2026.1', modalidade: 'Todas' },
  composer: {
    device: 'desktop',
    blocks: [
      { id: 'b1', type: 'title', content: 'Panorama acadêmico IFRJ — 2026.1' },
      { id: 'b2', type: 'metric', ref: 'matriculas' },
      { id: 'b3', type: 'chart', ref: 'matriculas-lines' },
      { id: 'b4', type: 'text', content: 'Síntese: crescimento consistente das matrículas em todas as modalidades (dados fictícios).' },
    ],
    status: 'draft',
  },
});

let state = initial();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      state = { ...initial(), ...p };
      if (!state.filters) state.filters = initial().filters;
      if (!state.composer || !Array.isArray(state.composer.blocks)) state.composer = initial().composer;
    }
  } catch { state = initial(); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
function emit() { listeners.forEach((f) => f(state)); }
let uidN = 100;
const uid = () => 'b' + (++uidN) + Math.random().toString(36).slice(2, 5);

export const store = {
  init() { load(); },
  get() { return state; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  setFilter(k, v) { state.filters[k] = v; save(); emit(); },
  clearFilters() { state.filters = initial().filters; save(); emit(); },

  addBlock(type, extra = {}) {
    const b = { id: uid(), type, ...extra };
    if (type === 'text') b.content = b.content || 'Novo parágrafo (texto fictício).';
    if (type === 'title') b.content = b.content || 'Novo título';
    state.composer.blocks.push(b); state.composer.status = 'draft'; save(); emit();
  },
  removeBlock(id) { state.composer.blocks = state.composer.blocks.filter((b) => b.id !== id); state.composer.status = 'draft'; save(); emit(); },
  moveBlock(id, dir) {
    const a = state.composer.blocks; const i = a.findIndex((b) => b.id === id);
    const j = dir === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; save(); emit();
  },
  setDevice(d) { state.composer.device = d; save(); emit(); },
  setStatus(s) { state.composer.status = s; save(); emit(); },
  reset() { state = initial(); save(); emit(); },
};
