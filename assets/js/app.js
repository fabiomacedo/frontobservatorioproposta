/* =========================================================================
   app.js — Shell: navegação, roteamento por hash, painel de detalhes,
   troca de contexto e "Restaurar demonstração".
   ========================================================================= */

import { store } from './state.js';
import { CONTEXTS, CONTEXT_KEYS, DOCS } from './data.js';

import * as P1 from '../../pages/01-visao-executiva.js';
import * as P2 from '../../pages/02-arquitetura.js';
import * as P3 from '../../pages/03-jornadas.js';
import * as P4 from '../../pages/04-laboratorio.js';
import * as P5 from '../../pages/05-ia.js';
import * as P6 from '../../pages/06-composicao.js';
import * as P7 from '../../pages/07-contratos.js';
import * as P8 from '../../pages/08-seguranca-diagnostico.js';
import * as P9 from '../../pages/09-roadmap.js';

const PAGES = [
  { id: '01-visao-executiva', num: 'P1', label: 'Visão executiva', mod: P1 },
  { id: '02-arquitetura', num: 'P2', label: 'Arquitetura e integrações', mod: P2 },
  { id: '03-jornadas', num: 'P3', label: 'Jornadas e modos', mod: P3 },
  { id: '04-laboratorio', num: 'P4', label: 'Laboratório de componentes', mod: P4 },
  { id: '05-ia', num: 'P5', label: 'Autoria e conversa com IA', mod: P5 },
  { id: '06-composicao', num: 'P6', label: 'Composição e consumo', mod: P6 },
  { id: '07-contratos', num: 'P7', label: 'Contratos ilustrativos', mod: P7 },
  { id: '08-seguranca-diagnostico', num: 'P8', label: 'Segurança e diagnóstico', mod: P8 },
  { id: '09-roadmap', num: 'P9', label: 'Roadmap e aceite', mod: P9 },
];

const byId = (id) => PAGES.find((p) => p.id === id);

let contentEl, mainEl, navEl, detailEl;

// ---- Painel de detalhes (exportado para as páginas) ----------------------
export function openDetail({ pid, title, bodyHtml }) {
  detailEl.querySelector('.dp-head h3').textContent = title || 'Detalhes técnicos';
  detailEl.querySelector('.dp-head .pid').textContent = pid || '';
  detailEl.querySelector('.dp-body').innerHTML = bodyHtml || '';
  mainEl.classList.add('with-detail');
  detailEl.querySelector('.dp-close').focus();
}
export function closeDetail() {
  mainEl.classList.remove('with-detail');
}

// ---- Roteamento ----------------------------------------------------------
function currentRoute() {
  const raw = (location.hash || '#01-visao-executiva').slice(1);
  // Suporta "#page" e "#page" com âncora interna já no mesmo id.
  const pageId = raw.split('?')[0];
  return byId(pageId) ? pageId : (byId(raw) ? raw : '01-visao-executiva');
}

function renderPage() {
  const id = currentRoute();
  const page = byId(id);
  closeDetail();

  const rerender = () => {
    contentEl.innerHTML = page.mod.render();
    if (typeof page.mod.afterRender === 'function') page.mod.afterRender(contentEl, rerender);
  };
  rerender();

  // Marca item ativo na navegação
  navEl.querySelectorAll('a[data-page]').forEach((a) =>
    a.classList.toggle('active', a.getAttribute('data-page') === id));

  // Foco e topo
  contentEl.setAttribute('tabindex', '-1');
  contentEl.focus({ preventScroll: true });
  // Se houver âncora adicional (link direto), tenta rolar até ela.
  window.scrollTo({ top: 0 });
  document.title = `Observatório · ${page.label} (proposta)`;
}

// ---- Montagem do shell ---------------------------------------------------
function buildShell() {
  const app = document.getElementById('app');

  const navLinks = PAGES.map((p) => `
    <a href="#${p.id}" data-page="${p.id}"><span class="num">${p.num}</span><span>${p.label}</span></a>`).join('');

  const ctxOptions = CONTEXT_KEYS.map((k) =>
    `<option value="${k}">${CONTEXTS[k].name}</option>`).join('');

  app.innerHTML = `
  <a class="skip-link" href="#main-content">Pular para o conteúdo</a>
  <aside class="sidebar" aria-label="Navegação da apresentação">
    <div class="brand">
      <h1>Observatório — Proposta visual técnica</h1>
      <span class="tag">Demonstração · dados fictícios</span>
      <div class="warn-strip">Não é a interface de produção. Nenhuma conexão com serviços reais.</div>
      <a href="app-demo/index.html" class="btn small" style="margin-top:10px;width:100%;justify-content:center;background:#15603f;border-color:#15603f;color:#fff">▶ Abrir demo da interface (IFRJ)</a>
    </div>
    <nav class="nav">
      <div class="ctx-switch">
        <label for="ctx-select">Contexto fictício (PR-10)</label>
        <select id="ctx-select">${ctxOptions}</select>
        <div class="hint">A mesma estrutura, dois domínios de demonstração.</div>
      </div>
      ${navLinks}
      <div class="ctx-switch" style="margin-top:6px">
        <button class="btn small" id="restore-btn" type="button" style="width:100%">↺ Restaurar demonstração</button>
        <div class="hint">Limpa o estado salvo no navegador (localStorage).</div>
      </div>
    </nav>
  </aside>

  <div class="main" id="main">
    <main class="content" id="main-content" role="main"></main>
    <aside class="detail-panel" aria-label="Detalhes técnicos">
      <div class="dp-head">
        <div><h3>Detalhes técnicos</h3><span class="pid"></span></div>
        <button class="dp-close" type="button" aria-label="Fechar detalhes">Fechar ✕</button>
      </div>
      <div class="dp-body"></div>
    </aside>
  </div>`;

  contentEl = app.querySelector('#main-content');
  mainEl = app.querySelector('#main');
  navEl = app.querySelector('.nav');
  detailEl = app.querySelector('.detail-panel');

  // Contexto
  const ctxSel = app.querySelector('#ctx-select');
  ctxSel.value = store.get().context;
  ctxSel.addEventListener('change', () => { store.setContext(ctxSel.value); });

  // Restaurar
  app.querySelector('#restore-btn').addEventListener('click', () => {
    store.restore();
    const sel = app.querySelector('#ctx-select');
    if (sel) sel.value = store.get().context;
    renderPage();
  });

  // Fechar painel
  detailEl.querySelector('.dp-close').addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mainEl.classList.contains('with-detail')) closeDetail();
  });
}

// Re-renderiza a página atual apenas quando o CONTEXTO fictício muda.
// Ações internas das páginas (ex.: compositor) gerenciam seu próprio re-render,
// evitando renderização dupla.
function wireStore() {
  let lastContext = store.get().context;
  store.subscribe(() => {
    const now = store.get().context;
    const sel = document.getElementById('ctx-select');
    if (sel && sel.value !== now) sel.value = now;
    if (now !== lastContext) {
      lastContext = now;
      if (document.getElementById('main-content')) renderPage();
    }
  });
}

function boot() {
  store.init();
  buildShell();
  wireStore();
  window.addEventListener('hashchange', renderPage);
  renderPage();
}

document.addEventListener('DOMContentLoaded', boot);

// Útil para depuração manual; não essencial.
export { PAGES, DOCS };
