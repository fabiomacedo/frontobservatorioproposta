/* =========================================================================
   state.js — Estado em memória da demonstração.
   - Contexto fictício ativo (A ou B) para demonstrar generalização (PR-10).
   - Estado do compositor simulado (blocos), persistido em localStorage.
   NENHUM dado é enviado a backend. localStorage = armazenamento LOCAL do navegador.
   ========================================================================= */

import { CONTEXTS, CONTEXT_KEYS } from './data.js';

const LS_KEY = 'observatorio_proposta_demo_v1';

const listeners = new Set();

const defaultComposer = () => ({
  model: 'Análise rápida',
  device: 'desktop',
  preview: false,
  status: 'draft', // draft | published (apenas rótulo da demo)
  message: '',     // feedback transitório da simulação (não é persistido com sentido real)
  blocks: [
    { id: 'blk-1', type: 'text', content: 'Introdução editorial (texto fictício).' },
    { id: 'blk-2', type: 'metric', analysisId: 'auto-metric' },
    { id: 'blk-3', type: 'visualization', analysisId: 'auto-chart' },
  ],
});

const initial = () => ({
  context: CONTEXT_KEYS[0],
  composer: defaultComposer(),
  checklist: {}, // { Q01: { status, evidence, owner, impact, routing } }
});

let state = initial();

// ---- persistência local -------------------------------------------------
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state = { ...initial(), ...parsed };
    if (!CONTEXTS[state.context]) state.context = CONTEXT_KEYS[0];
    if (!state.composer || !Array.isArray(state.composer.blocks)) state.composer = defaultComposer();
    else state.composer.message = ''; // feedback transitório não reaparece ao recarregar
    if (!state.checklist) state.checklist = {};
  } catch {
    state = initial();
  }
}
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function emit() { listeners.forEach((fn) => fn(state)); }

// ---- API pública ---------------------------------------------------------
export const store = {
  init() { load(); },
  get() { return state; },
  getContext() { return CONTEXTS[state.context]; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  setContext(key) {
    if (!CONTEXTS[key]) return;
    state.context = key;
    save(); emit();
  },

  // composer ---------------------------------------------------------------
  setComposerModel(model) {
    const presets = {
      'Análise rápida': [
        { id: uid(), type: 'metric', analysisId: 'auto-metric' },
        { id: uid(), type: 'visualization', analysisId: 'auto-chart' },
      ],
      'Monitoramento': [
        { id: uid(), type: 'metric', analysisId: 'auto-metric' },
        { id: uid(), type: 'visualization', analysisId: 'auto-chart' },
        { id: uid(), type: 'embedded_dashboard', analysisId: 'ss-01' },
      ],
      'História temática': [
        { id: uid(), type: 'text', content: 'Abertura da narrativa (texto fictício).' },
        { id: uid(), type: 'visualization', analysisId: 'auto-chart' },
        { id: uid(), type: 'methodology' },
        { id: uid(), type: 'text', content: 'Fechamento com ressalva (texto fictício).' },
      ],
    };
    state.composer.model = model;
    state.composer.blocks = presets[model] || [];
    state.composer.message = '';
    save(); emit();
  },
  setDevice(device) { state.composer.device = device; save(); emit(); },
  setPreview(on) { state.composer.preview = !!on; save(); emit(); },
  addBlock(type) {
    const b = { id: uid(), type };
    if (type === 'text') b.content = 'Novo texto editorial (fictício).';
    if (type === 'visualization') b.analysisId = 'auto-chart';
    if (type === 'metric') b.analysisId = 'auto-metric';
    if (type === 'embedded_dashboard') b.analysisId = 'ss-01';
    state.composer.blocks.push(b);
    state.composer.message = '';
    save(); emit();
  },
  removeBlock(id) {
    state.composer.blocks = state.composer.blocks.filter((b) => b.id !== id);
    state.composer.message = '';
    save(); emit();
  },
  moveBlock(id, dir) {
    const arr = state.composer.blocks;
    const i = arr.findIndex((b) => b.id === id);
    if (i < 0) return;
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    save(); emit();
  },
  setComposerStatus(status, message = '') {
    state.composer.status = status;
    state.composer.message = message;
    save(); emit();
  },

  // checklist --------------------------------------------------------------
  setChecklist(id, patch) {
    state.checklist[id] = { ...(state.checklist[id] || {}), ...patch };
    save(); emit();
  },
  getChecklist(id) {
    return state.checklist[id] || { status: 'nv', evidence: '', owner: '', impact: '', routing: '' };
  },

  // restaurar demonstração -------------------------------------------------
  restore() {
    state = initial();
    save(); emit();
  },
};

function uid() { return 'blk-' + Math.random().toString(36).slice(2, 8); }
