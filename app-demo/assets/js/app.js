/* =========================================================================
   app.js — Shell da interface SIMULADA do Observatório.
   ---------------------------------------------------------------------------
   Responsabilidades (design seções (c) e "Contrato de render/update e foco"):
     - Header/sidebar com APP.name ("Observatório", neutro) + identidade do
       contexto ativo; seletor de CONTEXTO e seletor de PERFIL.
     - setContext aplica identidade e define --accent + --chart-1..5 no .shell
       a partir de context.palette (sobrescreve os defaults do :root).
     - Roteamento por hash, incluindo a rota parametrizada #publicacao/{id},
       que esconde o chrome de autoria.
     - Camada de OVERLAY irmã de .shell (drawer de metodologia, modal de
       confirmação, editor de análise) com guarda overlayOpen que impede
       renderRoute enquanto um overlay está aberto.
     - trapFocus(container) único, reusado por drawer/modal/editor.
     - guardLeaveEditor(onConfirm): toda navegação que sai de um editor com
       rascunho não salvo passa por um único modal de confirmação acessível.
     - Busca do topbar SEMPRE roteia para #catalog aplicando setCatalogQuery.
     - "Restaurar demonstração" é destrutivo => confirma antes de store.reset().

   Zero rede: nenhum fetch/XHR/iframe/CDN. Tudo em localStorage via store.
   ========================================================================= */

import { APP, CONTEXTS } from './data.js';
import { store } from './store.js';
import { esc } from './charts.js';
import { PROFILES } from './permissions.js';
import {
  dashboard, catalog, assistant, composer, publicationView,
  resetAssistant, hasUnsavedEditor, closeEditorState,
} from './views.js';

const ROUTES = [
  { id: 'dashboard', label: 'Visão geral', icon: '▦', group: 'Explorar', view: dashboard },
  { id: 'catalog', label: 'Catálogo', icon: '▤', group: 'Explorar', view: catalog },
  { id: 'assistant', label: 'Criar com IA', icon: '✨', group: 'Criar', view: assistant },
  { id: 'composer', label: 'Nova publicação', icon: '▥', group: 'Criar', view: composer },
];
const byId = (id) => ROUTES.find((r) => r.id === id);

/* Rótulos amigáveis dos perfis simulados (design (i)). */
const PROFILE_LABELS = {
  consumer: 'Consumidor (só leitura)',
  author_nopub: 'Autor sem publicação',
  author_pub: 'Autor com publicação',
};

let mainEl, navEl;
let currentId = null;

/* Guarda: enquanto um overlay está aberto, renderRoute() não roda e não
   destrói o DOM com que o usuário interage (design, contrato item 2). */
let overlayOpen = false;

/* Origem da navegação para a visão de consumo: 'authoring' quando o usuário
   chega pela autoria (mostra "Voltar ao editor"); null quando chega pela URL. */
let publicationOrigin = null;
export function setPublicationOrigin(v) { publicationOrigin = v; }

/* =========================================================================
   Contenção de foco — helper único trapFocus(container) (contrato item 3).
   Contém Tab/Shift+Tab ciclando; Esc fecha; guarda o acionador em lastTrigger
   e devolve o foco a ele ao fechar.
   ========================================================================= */
const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

let lastTrigger = null;
let activeTrap = null; // { container, keyHandler, onClose }

function focusables(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE))
    .filter((el) => el.offsetParent !== null || el === document.activeElement);
}

/* Instala o trap em container; onClose() é chamado por Esc. */
export function trapFocus(container, onClose) {
  lastTrigger = document.activeElement;
  const first = focusables(container)[0];
  if (first) first.focus(); else container.focus();

  const keyHandler = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); if (onClose) onClose(); return; }
    if (e.key !== 'Tab') return;
    const items = focusables(container);
    if (!items.length) { e.preventDefault(); return; }
    const firstEl = items[0];
    const lastEl = items[items.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault(); lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault(); firstEl.focus();
    }
  };
  container.addEventListener('keydown', keyHandler);
  activeTrap = { container, keyHandler, onClose };
}

function releaseTrap() {
  if (activeTrap) {
    activeTrap.container.removeEventListener('keydown', activeTrap.keyHandler);
    activeTrap = null;
  }
  if (lastTrigger && typeof lastTrigger.focus === 'function') {
    try { lastTrigger.focus(); } catch { /* acionador pode ter saído do DOM */ }
  }
  lastTrigger = null;
}

/* =========================================================================
   Camada de overlay — drawer de metodologia, modal de confirmação, editor.
   Vive em #overlay-root (irmão de .shell). overlayOpen bloqueia renderRoute.
   ========================================================================= */
function overlayRoot() { return document.getElementById('overlay-root'); }

function openOverlay(html, { onClose, labelledBy } = {}) {
  const root = overlayRoot();
  overlayOpen = true;
  root.innerHTML = `
    <div class="ov-backdrop" data-ov-close></div>
    <div class="ov-panel" role="dialog" aria-modal="true" ${labelledBy ? `aria-labelledby="${labelledBy}"` : ''} tabindex="-1">
      ${html}
    </div>`;
  const panel = root.querySelector('.ov-panel');
  root.classList.add('open');
  const close = () => closeOverlay(onClose);
  // Qualquer elemento [data-ov-close] (backdrop e botões "Fechar") fecha.
  root.querySelectorAll('[data-ov-close]').forEach((el) => el.addEventListener('click', close));
  trapFocus(panel, close);
  return { root, panel, close };
}

export function closeOverlay(onClose) {
  const root = overlayRoot();
  root.classList.remove('open');
  root.innerHTML = '';
  overlayOpen = false;
  releaseTrap();
  if (typeof onClose === 'function') onClose();
}

/* ---------- Drawer de metodologia (overlay) ---------- */
export function openMethodology(term, def) {
  const body = def
    ? `<dl>
        <dt>Definição (léxico)</dt><dd>${esc(def.notion)}</dd>
        <dt>Como é calculado</dt><dd>${esc(def.formula)}</dd>
        <dt>Fonte conceitual</dt><dd>${esc(def.source)}</dd>
        <dt>Relações</dt><dd>${(def.relations || []).map(esc).join('; ')}</dd>
      </dl>
      <p class="small muted" style="margin-top:16px">Dados e definições fictícios, para demonstração.</p>`
    : `<p class="muted">Definição não disponível nesta demonstração.</p>`;
  openOverlay(`
    <aside class="drawer-inner" aria-label="Metodologia">
      <div class="d-head"><h3 id="ov-title">Metodologia · ${esc(term)}</h3>
        <button class="btn ghost sm" data-ov-close aria-label="Fechar">Fechar ✕</button></div>
      <div class="d-body">${body}</div>
    </aside>`, { labelledBy: 'ov-title' });
}

/* ---------- Modal de confirmação acessível (overlay) ---------- */
export function openConfirm({ title, body, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm }) {
  openOverlay(`
    <div class="confirm" role="document">
      <h3 id="ov-title">${esc(title)}</h3>
      <p>${esc(body)}</p>
      <div class="confirm-actions">
        <button class="btn" data-confirm-cancel>${esc(cancelLabel)}</button>
        <button class="btn primary" data-confirm-ok>${esc(confirmLabel)}</button>
      </div>
    </div>`, { labelledBy: 'ov-title' });
  const root = overlayRoot();
  root.querySelector('[data-confirm-cancel]').addEventListener('click', () => closeOverlay());
  root.querySelector('[data-confirm-ok]').addEventListener('click', () => {
    closeOverlay();
    if (typeof onConfirm === 'function') onConfirm();
  });
}

/* ---------- Editor de análise (overlay com trapFocus) ---------- */
/* A view fornece o HTML e o wiring; app.js só hospeda e contém o foco.
   onClose é chamado ao fechar (Esc/backdrop/cancelar) para limpar o editorState
   local da view. */
export function openEditorOverlay(html, { onMount, onClose, labelledBy = 'ov-title' } = {}) {
  const { root, panel } = openOverlay(`<div class="editor-shell">${html}</div>`, {
    labelledBy,
    onClose,
  });
  if (typeof onMount === 'function') onMount(panel);
  return { root, panel };
}

/* =========================================================================
   Guarda de rascunho não salvo — guardLeaveEditor(onConfirm) (design (e)).
   Chamada por TODA navegação que sai de um editor aberto com rascunho não
   salvo: busca do topbar, nav, data-goto, troca de contexto/perfil, modelos.
   ========================================================================= */
export function guardLeaveEditor(onProceed) {
  if (hasUnsavedEditor()) {
    openConfirm({
      title: 'Descartar alterações não salvas?',
      body: 'Você tem um rascunho de análise não salvo. Sair do editor descartará essas alterações.',
      confirmLabel: 'Descartar e sair',
      cancelLabel: 'Continuar editando',
      onConfirm: () => { closeEditorState(); onProceed(); },
    });
    return;
  }
  onProceed();
}

/* Navegação única que respeita a guarda de rascunho. Força re-render quando
   o hash alvo é igual ao atual (hashchange não dispara nesse caso). */
export function navigate(hash) {
  guardLeaveEditor(() => {
    if (location.hash === hash) { publicationOrigin = null; renderRoute(); }
    else location.hash = hash;
  });
}

/* ---------- Toast (exportado) ---------- */
export function toast(msg, sub) {
  const host = document.getElementById('toast-host');
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `${esc(msg)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}`;
  host.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
  setTimeout(() => el.remove(), 3000);
}

/* =========================================================================
   setContext / setProfile aplicados à identidade e à paleta do .shell.
   ========================================================================= */
function applyIdentity() {
  const ctx = store.activeContext();
  const identity = (ctx && ctx.identity) || {};
  const shell = document.querySelector('.shell');

  // Paleta por contexto: --accent + --chart-1..5 no .shell (design (c) #1).
  const palette = (ctx && ctx.palette) || {};
  if (shell && palette.accent) shell.style.setProperty('--accent', palette.accent);
  const series = palette.series || [];
  for (let i = 0; i < 5; i++) {
    if (shell && series[i]) shell.style.setProperty(`--chart-${i + 1}`, series[i]);
  }

  // Marca do contexto no sidebar; APP.name neutro no header/sidebar.
  const mark = document.getElementById('brand-mark');
  const sub = document.getElementById('brand-sub');
  if (mark) mark.textContent = identity.brandMark || '';
  if (sub) sub.textContent = identity.subtitle || '';
}

/* =========================================================================
   Render de rota.
   ========================================================================= */
function parsePublication(hash) {
  const m = /^#publicacao\/(.+)$/.exec(hash || '');
  return m ? decodeURIComponent(m[1]) : null;
}

function renderRoute() {
  if (overlayOpen) return; // guarda: overlay aberto não dispara re-render

  const hash = location.hash || '#dashboard';
  const shell = document.querySelector('.shell');

  // Rota de consumo #publicacao/{id}: esconde o chrome de autoria.
  const pubId = parsePublication(hash);
  if (pubId != null) {
    if (shell) shell.classList.add('consumption');
    const view = publicationView(pubId, publicationOrigin === 'authoring');
    mainEl.innerHTML = view.render();
    if (typeof view.afterRender === 'function') view.afterRender(mainEl);
    document.title = `${APP.name} · Publicação`;
    mainEl.setAttribute('tabindex', '-1');
    window.scrollTo({ top: 0 });
    return;
  }

  if (shell) shell.classList.remove('consumption');
  const id = hash.slice(1);
  const route = byId(id) || ROUTES[0];
  if (currentId === 'assistant' && route.id !== 'assistant') resetAssistant();
  currentId = route.id;

  applyIdentity();
  mainEl.innerHTML = route.view.render();
  if (typeof route.view.afterRender === 'function') route.view.afterRender(mainEl);

  navEl.querySelectorAll('a[data-route]').forEach((a) =>
    a.classList.toggle('active', a.getAttribute('data-route') === route.id));
  syncHeaderControls();
  document.title = `${APP.name} · ${route.label}`;
  mainEl.setAttribute('tabindex', '-1');
  window.scrollTo({ top: 0 });
}

/* Mantém os selects de contexto/perfil em sincronia com o estado. */
function syncHeaderControls() {
  const st = store.get();
  const ctxSel = document.getElementById('ctx-select');
  const profSel = document.getElementById('profile-select');
  if (ctxSel && st) ctxSel.value = st.activeContextId;
  if (profSel && st) profSel.value = st.activeProfileId;
}

/* =========================================================================
   Shell.
   ========================================================================= */
function buildShell() {
  const app = document.getElementById('app');
  const groups = [...new Set(ROUTES.map((r) => r.group))];
  const navHtml = groups.map((g) => `
    <div class="grp">${esc(g)}</div>
    ${ROUTES.filter((r) => r.group === g).map((r) => `
      <a href="#${r.id}" data-route="${r.id}" data-nav><span class="ic" aria-hidden="true">${r.icon}</span>${esc(r.label)}</a>`).join('')}
  `).join('');

  const ctxOptions = Object.values(CONTEXTS).map((c) =>
    `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');
  const profOptions = PROFILES.map((p) =>
    `<option value="${esc(p)}">${esc(PROFILE_LABELS[p] || p)}</option>`).join('');

  app.innerHTML = `
  <a class="skip-link" href="#main">Pular para o conteúdo</a>
  <div class="shell">
    <div class="demo-banner">Demonstração · interface simulada com dados fictícios · nenhuma conexão com serviços reais</div>

    <aside class="sidebar">
      <div class="logo">
        <div class="mark" id="brand-mark"></div>
        <div class="txt"><strong>${esc(APP.name)}</strong><span id="brand-sub"></span></div>
      </div>
      <nav id="nav" aria-label="Navegação principal">${navHtml}</nav>
      <div class="side-foot">
        <button class="btn sm ghost" id="reset-btn" style="width:100%;justify-content:center">↺ Restaurar demonstração</button>
        <p style="margin:10px 0 0">Protótipo não funcional de produção.<br><a href="../index.html">← Ver apresentação técnica</a></p>
      </div>
    </aside>

    <header class="topbar">
      <div class="ctx">
        <label for="ctx-select">Contexto</label>
        <select id="ctx-select" aria-label="Contexto">${ctxOptions}</select>
      </div>
      <div class="ctx">
        <label for="profile-select">Perfil</label>
        <select id="profile-select" aria-label="Perfil simulado" title="Permissões simuladas no navegador. A implementação real exigirá validação no backend.">${profOptions}</select>
      </div>
      <form class="search" id="search-form" role="search">
        <span class="mi" aria-hidden="true">🔎</span>
        <input type="search" id="search-input" placeholder="Buscar análises, indicadores…" aria-label="Buscar análises">
      </form>
      <div class="user">
        <div class="nm" style="text-align:right">${esc(APP.user.name)}<small>${esc(APP.user.role)}</small></div>
        <div class="av" aria-hidden="true">${esc(APP.user.initials)}</div>
      </div>
    </header>

    <main class="main" id="main" role="main"></main>
  </div>

  <div class="overlay-root" id="overlay-root" aria-live="polite"></div>
  <div class="toast-host" id="toast-host" aria-live="polite"></div>`;

  mainEl = app.querySelector('#main');
  navEl = app.querySelector('#nav');

  // Nav com guarda de rascunho.
  navEl.querySelectorAll('a[data-nav]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(a.getAttribute('href'));
    });
  });

  // Seletor de contexto (guarda de rascunho antes de trocar).
  const ctxSel = app.querySelector('#ctx-select');
  ctxSel.addEventListener('change', () => {
    const target = ctxSel.value;
    syncHeaderControls(); // restaura visual até confirmar
    guardLeaveEditor(() => { store.setContext(target); });
  });

  // Seletor de perfil (guarda de rascunho antes de trocar).
  const profSel = app.querySelector('#profile-select');
  profSel.addEventListener('change', () => {
    const target = profSel.value;
    syncHeaderControls();
    guardLeaveEditor(() => { store.setProfile(target); });
  });

  // Busca do topbar: SEMPRE roteia para #catalog aplicando setCatalogQuery.
  const searchForm = app.querySelector('#search-form');
  const searchInput = app.querySelector('#search-input');
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInput.value;
    guardLeaveEditor(() => {
      store.setCatalogQuery(q);
      if (location.hash !== '#catalog') location.hash = '#catalog';
      else renderRoute();
    });
  });

  // Restaurar demonstração: destrutivo => confirma antes (design HIGH-3).
  app.querySelector('#reset-btn').addEventListener('click', () => {
    guardLeaveEditor(() => {
      openConfirm({
        title: 'Restaurar demonstração?',
        body: 'Isso descarta todas as análises, publicações e conversas criadas nesta sessão e recria o estado semente (contexto A, perfil padrão, filtros limpos).',
        confirmLabel: 'Restaurar',
        onConfirm: () => { store.reset(); resetAssistant(); renderRoute(); toast('Demonstração restaurada'); },
      });
    });
  });
}

function boot() {
  const { toast: pending } = store.init() || {};
  buildShell();
  applyIdentity();
  store.subscribe(() => renderRoute());
  window.addEventListener('hashchange', () => { publicationOrigin = null; renderRoute(); });
  renderRoute();
  const t = (pending || store.takePendingToast());
  if (t) toast(t.title, t.detail);
}

document.addEventListener('DOMContentLoaded', boot);
