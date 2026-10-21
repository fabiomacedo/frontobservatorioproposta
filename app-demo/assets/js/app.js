/* =========================================================================
   app.js — Shell da interface SIMULADA do Observatório IFRJ.
   Navegação por hash, metodologia (drawer), toasts, re-render reativo.
   ========================================================================= */

import { ORG } from './data.js';
import { store } from './store.js';
import { esc } from './charts.js';
import { dashboard, catalog, assistant, composer, resetAssistant } from './views.js';

const ROUTES = [
  { id: 'dashboard', label: 'Visão geral', icon: '▦', group: 'Explorar', view: dashboard },
  { id: 'catalog', label: 'Catálogo', icon: '▤', group: 'Explorar', view: catalog },
  { id: 'assistant', label: 'Criar com IA', icon: '✨', group: 'Criar', view: assistant },
  { id: 'composer', label: 'Nova publicação', icon: '▥', group: 'Criar', view: composer },
];
const byId = (id) => ROUTES.find((r) => r.id === id);

let mainEl, navEl;
let currentId = null;

/* ---------- Drawer de metodologia (exportado) ---------- */
export function openMethodology(term, def) {
  const bd = document.getElementById('drawer-backdrop');
  const dr = document.getElementById('drawer');
  const body = dr.querySelector('.d-body');
  dr.querySelector('h3').textContent = 'Metodologia · ' + term;
  if (def) {
    body.innerHTML = `
      <dl>
        <dt>Definição (léxico)</dt><dd>${esc(def.notion)}</dd>
        <dt>Como é calculado</dt><dd>${esc(def.formula)}</dd>
        <dt>Fonte conceitual</dt><dd>${esc(def.source)}</dd>
        <dt>Relações</dt><dd>${def.relations.map(esc).join('; ')}</dd>
      </dl>
      <p class="small muted" style="margin-top:16px">Dados e definições fictícios, para demonstração.</p>`;
  } else {
    body.innerHTML = `<p class="muted">Definição não disponível nesta demonstração.</p>`;
  }
  bd.classList.add('open'); dr.classList.add('open');
  dr.querySelector('.d-close').focus();
}
export function closeMethodology() {
  document.getElementById('drawer-backdrop').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
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

/* ---------- Render ---------- */
function renderRoute() {
  const id = (location.hash || '#dashboard').slice(1);
  const route = byId(id) || ROUTES[0];
  if (currentId === 'assistant' && route.id !== 'assistant') resetAssistant();
  currentId = route.id;

  mainEl.innerHTML = route.view.render();
  if (typeof route.view.afterRender === 'function') route.view.afterRender(mainEl);

  navEl.querySelectorAll('a[data-route]').forEach((a) =>
    a.classList.toggle('active', a.getAttribute('data-route') === route.id));
  document.title = `${ORG.name} · ${route.label}`;
  mainEl.setAttribute('tabindex', '-1');
  window.scrollTo({ top: 0 });
}

function buildShell() {
  const app = document.getElementById('app');
  const groups = [...new Set(ROUTES.map((r) => r.group))];
  const navHtml = groups.map((g) => `
    <div class="grp">${esc(g)}</div>
    ${ROUTES.filter((r) => r.group === g).map((r) => `
      <a href="#${r.id}" data-route="${r.id}"><span class="ic" aria-hidden="true">${r.icon}</span>${esc(r.label)}</a>`).join('')}
  `).join('');

  app.innerHTML = `
  <a class="skip-link" href="#main">Pular para o conteúdo</a>
  <div class="shell">
    <div class="demo-banner">Demonstração · interface simulada com dados fictícios · nenhuma conexão com serviços reais</div>

    <aside class="sidebar">
      <div class="logo">
        <div class="mark">IFRJ</div>
        <div class="txt"><strong>${esc(ORG.name)}</strong><span>${esc(ORG.full)}</span></div>
      </div>
      <nav id="nav" aria-label="Navegação principal">${navHtml}</nav>
      <div class="side-foot">
        <button class="btn sm ghost" id="reset-btn" style="width:100%;justify-content:center">↺ Restaurar demonstração</button>
        <p style="margin:10px 0 0">Protótipo não funcional de produção.<br><a href="../index.html">← Ver apresentação técnica</a></p>
      </div>
    </aside>

    <header class="topbar">
      <div class="search">
        <span class="mi" aria-hidden="true">🔎</span>
        <input type="search" placeholder="Buscar análises, cursos, indicadores…" aria-label="Buscar">
      </div>
      <div class="user">
        <div class="nm" style="text-align:right">${esc(ORG.user.name)}<small>${esc(ORG.user.role)}</small></div>
        <div class="av" aria-hidden="true">${esc(ORG.user.initials)}</div>
      </div>
    </header>

    <main class="main" id="main" role="main"></main>
  </div>

  <div class="drawer-backdrop" id="drawer-backdrop"></div>
  <aside class="drawer" id="drawer" aria-label="Metodologia" role="dialog" aria-modal="true">
    <div class="d-head"><h3>Metodologia</h3><button class="btn ghost sm d-close" aria-label="Fechar">Fechar ✕</button></div>
    <div class="d-body"></div>
  </aside>
  <div class="toast-host" id="toast-host" aria-live="polite"></div>`;

  mainEl = app.querySelector('#main');
  navEl = app.querySelector('#nav');

  app.querySelector('.d-close').addEventListener('click', closeMethodology);
  app.querySelector('#drawer-backdrop').addEventListener('click', closeMethodology);
  app.querySelector('#reset-btn').addEventListener('click', () => { store.reset(); resetAssistant(); renderRoute(); toast('Demonstração restaurada'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMethodology(); });
}

function boot() {
  store.init();
  buildShell();
  // Re-render quando o estado muda (filtros, composição) — mantém a view viva.
  store.subscribe(() => renderRoute());
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}

document.addEventListener('DOMContentLoaded', boot);
