/* Página 4 — Laboratório de componentes [DOC-04] */
import { LAB_COMPONENTS } from '../assets/js/data.js';
import { store } from '../assets/js/state.js';
import {
  legend, stateChip, esc, anchor, techDetailBody,
  metricWidget, chartWidget, filtersWidget, embedPlaceholder, stateBoxes,
} from '../assets/js/components.js';
import { openDetail } from '../assets/js/app.js';

export function render() {
  const ctx = store.getContext();

  return `
  <div class="page-head">
    <div class="doc">DOC-04 · Componentes</div>
    <h2>Laboratório de componentes ${anchor('04-laboratorio')}</h2>
    <p class="lead">Demonstração com dados fictícios, claramente identificados. Cada componente traz
    um botão “Detalhes técnicos”.</p>
  </div>

  ${legend()}

  <div class="callout">
    Todos os números são coerentes apenas dentro desta demonstração. O contexto ativo é
    <strong>${esc(ctx.name)}</strong>. Troque o contexto na barra lateral para ver a mesma estrutura
    com outro domínio fictício (PR-10).
  </div>

  ${labComp('CMP-ctx-header', ctxHeader(ctx))}
  ${labComp('CMP-catalog-card', catalogCards(ctx))}
  ${labComp('CMP-metric', metricWidget(ctx.metric))}
  ${labComp('CMP-chart', chartWidget(ctx.chart))}
  ${labComp('CMP-filters', filtersWidget(ctx.filters, { interactive: true }))}
  ${labComp('CMP-methodology', methodology(ctx))}
  ${labComp('CMP-embed', embedPlaceholder('Análise do Superset (fictícia) apareceria aqui.'))}
  ${labComp('CMP-editorial', editorial())}
  ${labComp('CMP-states', stateBoxes())}

  <section class="block" id="comparacao">
    <h3>Comparação esquemática ${anchor('comparacao')}</h3>
    <p class="sub">Ilustração, não reprodução fiel das telas de produção.</p>
    <div class="compare">
      <div class="c-col now">
        <div class="c-head">Modelo atual (esquemático)</div>
        <div class="c-body">
          <ul>
            <li>Listagem de dashboards prontos.</li>
            <li>Pouco contexto sobre a origem do número.</li>
            <li>Autoria e composição dependem de desenvolvimento.</li>
          </ul>
        </div>
      </div>
      <div class="c-col prop">
        <div class="c-head">Proposta</div>
        <div class="c-body">
          <ul>
            <li>Exploração e autoria sobre análises reutilizáveis.</li>
            <li>Todo número com unidade, período, fonte e definição do LAL.</li>
            <li>Composição e publicação por configuração (PR-06).</li>
          </ul>
        </div>
      </div>
    </div>
    <p class="small muted" style="margin-top:10px">
      Representação ilustrativa para discussão. Não corresponde pixel a pixel às telas reais.
    </p>
  </section>`;
}

function labComp(id, demoHtml) {
  const c = LAB_COMPONENTS.find((x) => x.id === id);
  if (!c) return '';
  return `
  <div class="lab-comp" id="${esc(id)}">
    <div class="lab-head">
      <div class="lh-title">
        <span>${esc(c.name)}</span>
        ${stateChip(c.state)}
      </div>
      <div class="row">
        <span class="pid">${esc(c.id)}</span>
        <button type="button" class="btn small" data-tech="${esc(c.id)}">Detalhes técnicos</button>
      </div>
    </div>
    <div class="lab-demo">${demoHtml}</div>
    <div class="lab-note">Fictício · ${esc(c.note)}</div>
  </div>`;
}

function ctxHeader(ctx) {
  const opts = ctx.datasets.map((d) => `<option${d === ctx.datasetLabel ? ' selected' : ''}>${esc(d)}</option>`).join('');
  return `
  <div class="ctx-header">
    <div>
      <div class="ch-title">${esc(ctx.name)}</div>
      <div class="ch-sub">${esc(ctx.source)} · ${esc(ctx.numericSource)}</div>
    </div>
    <label class="small">Conjunto de dados (demo)
      <select aria-label="Selecionar conjunto de dados">${opts}</select>
    </label>
  </div>`;
}

function catalogCards(ctx) {
  return `<div class="cards">${ctx.catalog.map((a) => `
    <div class="card">
      <span class="pid">${esc(a.id)}</span>
      <h5>${esc(a.title)}</h5>
      <p class="small muted">Tipo: ${esc(a.type)} · provedor ilustrativo: unspecified</p>
      <div class="btn-row">
        <button class="btn small ghost" type="button">Abrir</button>
        <button class="btn small ghost" type="button">Adicionar à publicação</button>
      </div>
    </div>`).join('')}</div>`;
}

function methodology(ctx) {
  const d = ctx.definition;
  return `
  <details class="collapsible" open>
    <summary>Metodologia e definição associada ao LAL</summary>
    <div class="cbody">
      <p class="small"><strong>Como o número foi obtido (demo):</strong> contagem sintética agregada por
      semana sobre o conjunto fictício selecionado. ${esc(ctx.numericSource)}.</p>
      <h4>Definição no LAL (fictícia) — <code>${esc(d.term)}</code></h4>
      <dl class="dl-tech">
        <dt>Noção</dt><dd>${esc(d.notion)}</dd>
        <dt>Impacto</dt><dd>${esc(d.impact)}</dd>
        <dt>Sinônimos</dt><dd>${d.synonyms.map(esc).join(', ')}</dd>
        <dt>Relações</dt><dd>${d.relations.map(esc).join('; ')}</dd>
      </dl>
      <p class="small muted">Fonte conceitual (LAL) e fonte dos números são informações diferentes.</p>
    </div>
  </details>`;
}

function editorial() {
  return `
  <div>
    <h4 style="margin-top:0">Panorama (texto editorial fictício)</h4>
    <p class="small">Trecho narrativo curto que contextualiza as análises vizinhas. Conteúdo meramente
    ilustrativo.</p>
    <div class="callout" style="margin-bottom:0"><strong>Ressalva.</strong> Interpretação sujeita a
    revisão; números são de demonstração.</div>
  </div>`;
}

export function afterRender(root) {
  // Botões "Detalhes técnicos" → painel lateral
  root.querySelectorAll('[data-tech]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const c = LAB_COMPONENTS.find((x) => x.id === btn.getAttribute('data-tech'));
      if (c) openDetail({ pid: c.id, title: c.name, bodyHtml: techDetailBody(c) });
    });
  });

  // Filtros interativos (remover chip / limpar) — apenas estado visual da demo
  const filterHost = root.querySelector('#CMP-filters .lab-demo');
  if (filterHost) {
    const ctx = store.getContext();
    let active = [...ctx.filters];
    const redraw = () => { filterHost.innerHTML = filtersWidget(active, { interactive: true }); bind(); };
    const bind = () => {
      filterHost.querySelectorAll('[data-remove]').forEach((b) =>
        b.addEventListener('click', () => { active = active.filter((f) => f.k !== b.getAttribute('data-remove')); redraw(); }));
      const clear = filterHost.querySelector('[data-clear]');
      if (clear) clear.addEventListener('click', () => { active = []; redraw(); });
    };
    bind();
  }
}
