/* Página 6 — Composição e consumo [DOC-04, DOC-06] */
import { store } from '../assets/js/state.js';
import {
  esc, anchor, metricWidget, chartWidget, embedPlaceholder,
} from '../assets/js/components.js';

const MODELS = ['Análise rápida', 'Monitoramento', 'História temática'];

export function render() {
  const ctx = store.getContext();
  const c = store.get().composer;

  const modelBtns = MODELS.map((m) => `
    <button type="button" class="btn small ${m === c.model ? 'primary' : ''}" data-model="${esc(m)}">${esc(m)}</button>`).join('');

  return `
  <div class="page-head">
    <div class="doc">DOC-04 · DOC-06 · Composição</div>
    <h2>Composição e consumo ${anchor('06-composicao')}</h2>
    <p class="lead">Compositor simulado. Adicionar, remover e reordenar blocos; prévia e alternância
    desktop/mobile. Nenhuma ação é persistida em backend.</p>
  </div>

  <div class="callout">
    <strong>Armazenamento local.</strong> O rascunho é salvo apenas no <code>localStorage</code> do seu
    navegador. Use “Restaurar demonstração” na barra lateral para voltar ao estado inicial. Nenhuma
    chamada externa é feita.
  </div>

  <section class="block">
    <div class="row" style="justify-content:space-between">
      <div class="btn-row"><strong class="small">Modelo:</strong> ${modelBtns}</div>
      <div class="btn-row">
        <button type="button" class="btn small" data-device="desktop" aria-pressed="${c.device === 'desktop'}">Desktop</button>
        <button type="button" class="btn small" data-device="mobile" aria-pressed="${c.device === 'mobile'}">Mobile</button>
        <button type="button" class="btn small ${c.preview ? 'primary' : ''}" data-preview>${c.preview ? 'Sair da prévia' : 'Prévia'}</button>
      </div>
    </div>

    <hr class="soft">

    <div class="composer">
      <div class="palette" ${c.preview ? 'hidden' : ''}>
        <h4>Adicionar bloco</h4>
        <div class="btn-row" style="flex-direction:column;align-items:stretch">
          <button class="btn small" type="button" data-add="text">+ Texto editorial</button>
          <button class="btn small" type="button" data-add="metric">+ Indicador</button>
          <button class="btn small" type="button" data-add="visualization">+ Gráfico</button>
          <button class="btn small" type="button" data-add="methodology">+ Metodologia</button>
          <button class="btn small" type="button" data-add="embedded_dashboard">+ Dashboard incorporado</button>
        </div>
        <p class="small muted" style="margin-top:12px">Arrastar é opcional; aqui a reordenação é por
        botões ▲ ▼, acessível por teclado.</p>
      </div>

      <div class="canvas ${c.device === 'mobile' ? 'mobile' : ''}" id="composer-canvas">
        ${renderBlocks(ctx, c)}
      </div>
    </div>

    <hr class="soft">

    <div class="row" style="justify-content:space-between">
      <div class="small muted">Status: <strong>${esc(c.status)}</strong> ·
        a mesma análise aparece por referência no catálogo (PR-03/PR-04).</div>
      <div class="btn-row">
        <button class="btn" type="button" data-act="draft">Salvar rascunho</button>
        <button class="btn primary" type="button" data-act="publish">Publicar</button>
      </div>
    </div>
    <p class="small" data-compose-out aria-live="polite" style="color:var(--warn)">${esc(c.message || '')}</p>
  </section>`;
}

function renderBlocks(ctx, c) {
  if (!c.blocks.length) return '<p class="muted small">Sem blocos. Adicione um bloco na paleta.</p>';
  return c.blocks.map((b, i) => `
    <div class="block-item" data-id="${esc(b.id)}">
      <div class="bi-head">
        <span class="bi-type">${esc(b.type)}</span>
        ${c.preview ? '' : `<div class="bi-ctrls">
          <button class="btn small ghost" type="button" data-move="up" data-id="${esc(b.id)}" aria-label="Mover para cima" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="btn small ghost" type="button" data-move="down" data-id="${esc(b.id)}" aria-label="Mover para baixo" ${i === c.blocks.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="btn small danger" type="button" data-del="${esc(b.id)}" aria-label="Remover bloco">Remover</button>
        </div>`}
      </div>
      <div class="bi-body">${blockBody(ctx, b)}</div>
    </div>`).join('');
}

function blockBody(ctx, b) {
  switch (b.type) {
    case 'text': return `<p>${esc(b.content || 'Texto editorial (fictício).')}</p>`;
    case 'metric': return metricWidget(ctx.metric);
    case 'visualization': return chartWidget(ctx.chart);
    case 'embedded_dashboard': return embedPlaceholder('Bloco incorporado (placeholder).');
    case 'methodology': return `<p class="small muted">Metodologia: contagem sintética por semana. Definição no LAL: <code>${esc(ctx.definition.term)}</code> (fictícia).</p>`;
    default: return `<p class="muted small">${esc(b.type)}</p>`;
  }
}

export function afterRender(root, rerender) {
  const refresh = () => rerender();

  root.querySelectorAll('[data-model]').forEach((b) =>
    b.addEventListener('click', () => { store.setComposerModel(b.getAttribute('data-model')); refresh(); }));
  root.querySelectorAll('[data-add]').forEach((b) =>
    b.addEventListener('click', () => { store.addBlock(b.getAttribute('data-add')); refresh(); }));
  root.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', () => { store.removeBlock(b.getAttribute('data-del')); refresh(); }));
  root.querySelectorAll('[data-move]').forEach((b) =>
    b.addEventListener('click', () => { store.moveBlock(b.getAttribute('data-id'), b.getAttribute('data-move')); refresh(); }));
  root.querySelectorAll('[data-device]').forEach((b) =>
    b.addEventListener('click', () => { store.setDevice(b.getAttribute('data-device')); refresh(); }));

  const prev = root.querySelector('[data-preview]');
  if (prev) prev.addEventListener('click', () => { store.setPreview(!store.get().composer.preview); refresh(); });

  root.querySelectorAll('[data-act]').forEach((b) =>
    b.addEventListener('click', () => {
      const act = b.getAttribute('data-act');
      const msg = act === 'publish'
        ? 'Simulação: publicação registrada apenas localmente. Nenhuma ação persistida no backend; nenhuma chamada externa.'
        : 'Simulação: rascunho salvo no armazenamento local do navegador.';
      // A mensagem vai para o estado e é re-renderizada: sobrevive ao refresh().
      store.setComposerStatus(act === 'publish' ? 'published' : 'draft', msg);
      refresh();
      const out = root.querySelector('[data-compose-out]');
      if (out && out.scrollIntoView) out.scrollIntoView({ block: 'nearest' });
    }));
}
