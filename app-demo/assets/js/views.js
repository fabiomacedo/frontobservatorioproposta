/* =========================================================================
   views.js — Telas da interface SIMULADA do Observatório.
   ---------------------------------------------------------------------------
   Monta as jornadas completas sobre a fundação (data/store/query/analysis/
   permissions/charts/render). Cada view exporta render() -> HTML e, quando
   precisa, afterRender(root) que faz o wiring (padrão data-* no DOM).

   Contrato de render/update e foco (design, HIGH-1/NIT-5):
     - Estado de trabalho do editor/compositor é LOCAL à view (editorState,
       composerSelection), NUNCA no store.
     - A prévia do editor atualiza só a sub-árvore (previewEl.innerHTML), sem
       disparar store.*.
     - O store só é escrito no Salvar explícito.
     - A região aria-live do chat é PERSISTENTE: rerenderAI troca só o innerHTML
       interno de #chat-scroll (não recria o container).

   Tudo via esc()/renderAnalysis; zero rede.
   ========================================================================= */

import { fmtInt, fmtPct } from './data.js';
import { esc, barChart, donutChart, sparkline } from './charts.js';
import { runQuery } from './query.js';
import { renderAnalysis } from './render.js';
import { emptyAnalysis, validateAnalysis, allowedVizForKind, normalizeText, TITLE_MAX, TEXT_MAX } from './analysis.js';
import { can } from './permissions.js';
import { store } from './store.js';
import {
  openMethodology, openConfirm, openEditorOverlay, closeOverlay,
  toast, navigate, setPublicationOrigin,
} from './app.js';

/* =========================================================================
   Helpers de contexto/estado.
   ========================================================================= */
function ctx() { return store.activeContext() || {}; }
function measureCfg(c, key) { return (c.measures || []).find((m) => m.key === key) || null; }
function dimLabel(c, key) { const d = (c.dimensions || []).find((x) => x.key === key); return d ? d.label : key; }

/* Rótulos amigáveis de origem (design (e)/(j)). */
const ORIGIN_LABEL = { manual: 'Manual', ai: 'IA', superset_demo: 'Superset' };
/* Rótulos amigáveis de tipo de bloco (design (g)). */
const BLOCK_LABEL = {
  title: 'Título', text: 'Texto', metric: 'Indicador', chart: 'Gráfico',
  table: 'Tabela', methodology: 'Metodologia', embed: 'Dashboard incorporado',
};

/* Resultado de runQuery a partir de uma Analysis (def + recorte embutido). */
function resultFor(analysis) {
  const d = analysis.def || {};
  return runQuery({
    contextId: analysis.contextId,
    measure: d.measure,
    dimension: d.dimension,
    filters: d.filters || {},
    sort: d.sort,
  });
}

/* =========================================================================
   stateView(kind, detail) — estados comuns (design (k), FR-12).
   Cada estado tem texto + ícone; nenhum botão aparenta ação inexistente.
   ========================================================================= */
export function stateView(kind, detail = '') {
  const map = {
    loading: { icon: '◌', title: 'Carregando…', msg: detail || 'Preparando a visualização.' },
    empty: { icon: '▢', title: 'Sem dados', msg: detail || 'Nenhum resultado para este recorte.' },
    missing: { icon: '∅', title: 'Recurso inexistente', msg: detail || 'O recurso solicitado não foi encontrado nesta demonstração.' },
    invalid: { icon: '⚠', title: 'Referência inválida', msg: detail || 'A análise referenciada foi removida ou não existe mais.' },
    denied: { icon: '🔒', title: 'Acesso negado (simulado)', msg: detail || 'Seu perfil simulado não tem permissão para esta ação. A implementação real exigirá validação no backend.' },
  };
  const s = map[kind] || map.missing;
  return `<div class="state state-${esc(kind)}" role="status">
    <div class="state-icon" aria-hidden="true">${s.icon}</div>
    <h3>${esc(s.title)}</h3>
    <p class="muted">${esc(s.msg)}</p>
  </div>`;
}

/* =========================================================================
   DASHBOARD — filtros REAIS via runQuery + renderAnalysis (design (b), AC-01/02).
   ========================================================================= */
function filterBar() {
  const c = ctx();
  const f = store.activeFilters();
  const filters = c.filters || [];
  const flds = filters.map((flt) => {
    const cur = f[flt.key] != null ? f[flt.key] : flt.clearedTo;
    const opts = (flt.options || []).map((o) =>
      `<option${String(o) === String(cur) ? ' selected' : ''}>${esc(o)}</option>`).join('');
    return `<div class="fld"><label for="f-${esc(flt.key)}">${esc(flt.label)}</label>
      <select id="f-${esc(flt.key)}" data-filter="${esc(flt.key)}">${opts}</select></div>`;
  }).join('');
  return `<div class="filterbar">
    ${flds}
    <div class="chips" style="margin-left:auto">
      ${activeChips(c, f)}
      <button class="btn sm ghost" data-clear>Limpar</button>
    </div>
  </div>`;
}
function activeChips(c, f) {
  const chips = [];
  for (const flt of c.filters || []) {
    const v = f[flt.key];
    if (v != null && v !== '' && v !== flt.clearedTo) chips.push([flt.key, v]);
  }
  if (!chips.length) return `<span class="chip chip-muted">Sem filtros</span>`;
  return chips.map(([k, v]) =>
    `<span class="chip">${esc(v)} <button data-remove="${esc(k)}" aria-label="Remover filtro ${esc(k)}">×</button></span>`).join('');
}

/* Painel de uma análise semente/seed para o dashboard. */
function dashPanel(analysis, extraFilters) {
  const c = ctx();
  const d = analysis.def || {};
  const mergedFilters = { ...(d.filters || {}), ...(extraFilters || {}) };
  const result = runQuery({
    contextId: c.id, measure: d.measure, dimension: d.dimension,
    filters: mergedFilters, sort: d.sort,
  });
  const m = measureCfg(c, d.measure);
  const ignored = Object.keys(result.ignoredFilters || {});
  const ignoredNote = ignored.length
    ? `<p class="small warn-text">Filtro ${esc(ignored.join(', '))} não se aplica a esta visualização.</p>`
    : '';
  return `<div class="panel">
    <div class="p-head"><div><h3>${esc(analysis.title)}</h3>
      <div class="p-sub">${esc((m && m.label) || '')} · por ${esc(dimLabel(c, d.dimension))}</div></div>
      ${m ? `<button class="btn sm" data-method="${esc(m.lexicon)}">Metodologia</button>` : ''}</div>
    <div class="p-body">${ignoredNote}${renderAnalysis(analysis, result)}</div>
  </div>`;
}

export const dashboard = {
  render() {
    const c = ctx();
    const f = store.activeFilters();
    // KPIs: primeiras medidas total/rate como indicadores; delta só condicional.
    const kpiMeasures = (c.measures || []).filter((m) => m.kind === 'total' || m.kind === 'rate').slice(0, 3);
    const kpis = kpiMeasures.map((m) => {
      const dim = (c.dimensions || [])[0];
      const result = runQuery({
        contextId: c.id, measure: m.key, dimension: dim ? dim.key : null,
        filters: f, sort: 'desc',
      });
      const total = (result.rows || []).reduce((s, r) => s + (Number(r.value) || 0), 0);
      const val = m.kind === 'rate'
        ? (result.rows && result.rows.length ? (result.rows.reduce((s, r) => s + r.value, 0) / result.rows.length) : 0)
        : total;
      const delta = result.meta && result.meta.delta;
      const deltaHtml = (delta != null)
        ? `<div class="k-delta ${delta >= 0 ? 'up' : 'down'}"><span aria-hidden="true">${delta >= 0 ? '▲' : '▼'}</span> ${esc(Math.abs(delta))}% <span class="muted">vs. período anterior</span></div>`
        : `<div class="k-delta muted small">sem comparação de período</div>`;
      const spark = (result.rows || []).map((r) => r.value);
      return `<div class="kpi">
        <div class="k-lbl">${esc(m.label)}
          <button class="btn ghost sm" style="padding:1px 5px" data-method="${esc(m.lexicon)}" aria-label="Metodologia de ${esc(m.label)}" title="Metodologia">ⓘ</button></div>
        <div class="k-val">${m.kind === 'rate' ? fmtPct(val) : fmtInt(Math.round(val))}</div>
        ${deltaHtml}
        <div class="k-spark">${spark.length > 1 ? sparkline(spark) : ''}</div>
      </div>`;
    }).join('');

    const analyses = store.listAnalyses({ contextId: c.id }).filter((a) => a.origin !== 'superset_demo' && a.def);
    const panels = analyses.slice(0, 4).map((a) => dashPanel(a, f)).join('');

    return `
    <div class="page-title">
      <div><h1>Visão geral</h1><p>${esc((c.identity && c.identity.subtitle) || '')} — indicadores do recorte selecionado (dados fictícios).</p></div>
      <div class="page-actions">
        <button class="btn" data-goto="assistant"><span class="ic">✨</span> Criar com IA</button>
        <button class="btn primary" data-goto="composer"><span class="ic">▥</span> Nova publicação</button>
      </div>
    </div>
    ${filterBar()}
    <div class="kpis">${kpis || `<p class="muted">Nenhum indicador disponível.</p>`}</div>
    <div class="grid-2">${panels || stateView('empty', 'Nenhuma análise neste contexto.')}</div>`;
  },
  afterRender(root) { wireFilters(root); wireMethod(root); wireGoto(root); },
};

/* =========================================================================
   CATÁLOGO — busca real + filtro por contexto/origem (design (e), AC-04/06/07/08/18).
   ========================================================================= */
let catalogOriginFilter = ''; // '', 'manual', 'ai', 'superset_demo'

export const catalog = {
  render() {
    const c = ctx();
    const st = store.get();
    const q = (st && st.uiState && st.uiState.catalogQuery) || '';
    const list = store.listAnalyses({
      contextId: c.id,
      origin: catalogOriginFilter || undefined,
      q,
    });
    const originBtns = ['', 'manual', 'ai', 'superset_demo'].map((o) =>
      `<button class="btn sm ${catalogOriginFilter === o ? 'primary' : 'ghost'}" data-origin="${esc(o)}">${o ? esc(ORIGIN_LABEL[o]) : 'Todas as origens'}</button>`).join('');

    const cards = list.map((a) => {
      const own = a.origin !== 'superset_demo';
      const originTag = `<span class="badge ${a.origin === 'superset_demo' ? 'blue' : 'gray'}">${esc(ORIGIN_LABEL[a.origin] || a.origin)}</span>`;
      return `<div class="an-card">
        <div class="ac-vis">${miniViz(a)}</div>
        <div class="ac-body">
          <h4>${esc(a.title)}</h4>
          <div class="ac-meta">${esc(a.description || '')}</div>
          <div class="ac-meta">Atualizada ${esc(a.updatedAt || '')}</div>
          <div>${originTag}</div>
        </div>
        <div class="ac-foot">
          <button class="btn sm" data-open-an="${esc(a.id)}">Abrir</button>
          ${own ? `<button class="btn sm ghost" data-edit-an="${esc(a.id)}"${can('edit', st) ? '' : ' disabled title="Perfil sem permissão de edição"'}>Editar</button>` : ''}
          <button class="btn sm ghost" data-add-an="${esc(a.id)}"${can('compose', st) ? '' : ' disabled title="Perfil sem permissão de composição"'}>+ Publicação</button>
        </div>
      </div>`;
    }).join('');

    return `
    <div class="page-title">
      <div><h1>Catálogo de análises</h1><p>Análises salvas e reutilizáveis (contexto ativo · dados fictícios).</p></div>
      <div class="page-actions"><button class="btn" data-goto="assistant"><span class="ic">✨</span> Criar com IA</button></div>
    </div>
    <div class="catalog-toolbar">
      <div class="fld"><label for="catalog-search">Buscar no catálogo</label>
        <input type="search" id="catalog-search" data-catalog-search placeholder="Título ou descrição…" value="${esc(q)}"></div>
      <div class="origin-filter" role="group" aria-label="Filtrar por origem">${originBtns}</div>
    </div>
    ${list.length ? `<div class="catalog">${cards}</div>` : stateView('empty', q ? `Nenhuma análise corresponde a "${q}".` : 'Nenhuma análise neste contexto.')}
    <div id="catalog-open-host"></div>`;
  },
  afterRender(root) {
    wireGoto(root);
    wireMethod(root);

    const search = root.querySelector('[data-catalog-search]');
    if (search) {
      search.addEventListener('input', () => { store.setCatalogQuery(search.value); });
    }
    root.querySelectorAll('[data-origin]').forEach((b) => b.addEventListener('click', () => {
      // Filtro de origem é estado de UI da view: re-render local sem tocar o store.
      catalogOriginFilter = b.getAttribute('data-origin');
      const host = root.id === 'main' ? root : (root.closest('#main') || root);
      catalog.afterRenderReRender(host);
    }));
    root.querySelectorAll('[data-open-an]').forEach((b) => b.addEventListener('click', () => openCatalogAnalysis(root, b.getAttribute('data-open-an'))));
    root.querySelectorAll('[data-edit-an]').forEach((b) => b.addEventListener('click', () => openAnalysisEditor(b.getAttribute('data-edit-an'))));
    root.querySelectorAll('[data-add-an]').forEach((b) => b.addEventListener('click', () => addAnalysisToPublication(b.getAttribute('data-add-an'))));
  },
  /* Re-render local (filtro de origem é estado de UI da view, não do store). */
  afterRenderReRender(mainHost) {
    mainHost.innerHTML = catalog.render();
    catalog.afterRender(mainHost);
  },
};

function miniViz(a) {
  if (a.origin === 'superset_demo' || a.viz === 'embed') {
    return `<div class="muted small" style="padding:12px"><span aria-hidden="true">▦</span> Superset (simulado)</div>`;
  }
  const result = resultFor(a);
  if (a.viz === 'donut') {
    const slices = (result.rows || []).map((r) => ({ label: r.label, value: r.value, pct: r.pct }));
    return donutChart(slices, { size: 90 });
  }
  if (a.viz === 'metric') {
    const v = result.rows && result.rows[0] ? result.rows[0].value : 0;
    return `<div style="font-size:26px;font-weight:800;color:var(--accent)">${esc(fmtInt(Math.round(v)))}</div>`;
  }
  if (result.shape === 'series') {
    const data = ((result.series && result.series.datasets[0] && result.series.datasets[0].data) || []);
    return sparkline(data.length > 1 ? data : [1, 2, 2, 3]);
  }
  return barChart((result.rows || []).slice(0, 4), { valueKey: 'value', labelKey: 'label' });
}

/* "Abrir" uma análise: renderiza o def com "Conversar" e, se própria, "Editar". */
function openCatalogAnalysis(root, id) {
  const a = store.getAnalysis(id);
  const host = root.querySelector('#catalog-open-host');
  if (!host) return;
  if (!a) { host.innerHTML = stateView('invalid'); return; }
  const result = resultFor(a);
  const own = a.origin !== 'superset_demo';
  host.innerHTML = `
    <div class="panel" style="margin-top:18px" id="open-analysis">
      <div class="p-head"><div><h3>${esc(a.title)}</h3><div class="p-sub">${esc(ORIGIN_LABEL[a.origin] || a.origin)} · atualizada ${esc(a.updatedAt || '')}</div></div>
        <div class="row">
          <button class="btn sm" data-talk-an="${esc(a.id)}">Conversar sobre esta análise</button>
          ${own ? `<button class="btn sm ghost" data-dup-an="${esc(a.id)}"${can('edit', store.get()) ? '' : ' disabled'}>Duplicar como nova</button>` : ''}
          ${own ? `<button class="btn sm primary" data-edit-an2="${esc(a.id)}"${can('edit', store.get()) ? '' : ' disabled'}>Editar</button>` : ''}
        </div></div>
      <div class="p-body">${renderAnalysis(a, result)}</div>
    </div>`;
  const talk = host.querySelector('[data-talk-an]');
  if (talk) talk.addEventListener('click', () => startConversation(a.id));
  const dup = host.querySelector('[data-dup-an]');
  if (dup) dup.addEventListener('click', () => duplicateAnalysis(a.id));
  const edit = host.querySelector('[data-edit-an2]');
  if (edit) edit.addEventListener('click', () => openAnalysisEditor(a.id));
  host.querySelector('#open-analysis').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* "Adicionar à publicação": grava o bloco com o analysisId EXATO (AC-08). */
function addAnalysisToPublication(id) {
  const a = store.getAnalysis(id);
  if (!a) { toast('Análise inexistente'); return; }
  const pub = defaultPublication();
  if (!pub) { toast('Nenhuma publicação disponível'); return; }
  const type = a.viz === 'embed' ? 'embed' : (a.viz === 'table' ? 'table' : (a.viz === 'metric' ? 'metric' : 'chart'));
  const res = store.addBlock(pub.id, type, { analysisId: a.id });
  if (res.denied) { toast('Ação não permitida', 'Perfil sem permissão de composição.'); return; }
  if (!res.ok) { toast('Não foi possível adicionar'); return; }
  toast('Adicionada à publicação', 'Veja em "Nova publicação".');
}

/* Publicação padrão do contexto ativo (primeira do contexto). */
function defaultPublication() {
  const c = ctx();
  const list = store.listPublications({ contextId: c.id });
  return list[0] || null;
}

/* =========================================================================
   EDITOR DE ANÁLISE — estado LOCAL à view (editorState), overlay (HIGH-1).
   ========================================================================= */
/* editorState guarda o def/seleção corrente; NUNCA no store. null => fechado. */
let editorState = null;
let editorDirty = false;
let editorAnalysisId = null; // id quando editando/duplicando existente
let editorOnSaved = null;    // callback opcional após salvar

export function hasUnsavedEditor() { return editorState != null && editorDirty; }
export function closeEditorState() { editorState = null; editorDirty = false; editorAnalysisId = null; editorOnSaved = null; }

/* Abre o editor a partir de uma análise existente (edição). */
function openAnalysisEditor(id) {
  const a = id ? store.getAnalysis(id) : null;
  const c = a ? (store.getContext(a.contextId) || ctx()) : ctx();
  const def = a
    ? { title: a.title, description: a.description, measure: a.def.measure, dimension: a.def.dimension, filters: { ...(a.def.filters || {}) }, sort: a.def.sort, viz: a.viz }
    : emptyAnalysis(c);
  editorAnalysisId = a ? a.id : null;
  openEditorWithDef(def, c);
}

/* Abre o editor com um def já proposto (IA "Ajustar" ou novo). */
function openEditorWithDef(def, c, { onSaved } = {}) {
  editorState = { ...def, filters: { ...(def.filters || {}) } };
  editorDirty = false;
  editorOnSaved = onSaved || null;
  const html = editorFormHtml(c);
  openEditorOverlay(html, {
    labelledBy: 'editor-title',
    onMount: (panel) => wireEditor(panel, c),
    onClose: () => { /* editorState limpo por guardLeaveEditor/closeEditorState */ closeEditorState(); },
  });
}

function editorFormHtml(c) {
  const es = editorState;
  const m = measureCfg(c, es.measure);
  const measures = (c.measures || []).map((mm) =>
    `<option value="${esc(mm.key)}"${mm.key === es.measure ? ' selected' : ''}>${esc(mm.label)}</option>`).join('');
  const dims = (c.dimensions || []).map((d) =>
    `<option value="${esc(d.key)}"${d.key === es.dimension ? ' selected' : ''}>${esc(d.label)}</option>`).join('');
  const allowedViz = m ? allowedVizForKind(m.kind) : ['table'];
  const vizOpts = allowedViz.map((v) =>
    `<option value="${esc(v)}"${v === es.viz ? ' selected' : ''}>${esc(vizLabel(v))}</option>`).join('');
  // Filtros compatíveis com a medida (appliesTo).
  const compatFilters = (c.filters || []).filter((f) => !m || (m.appliesTo || []).includes(f.key));
  const filterFlds = compatFilters.map((f) => {
    const cur = es.filters[f.key] != null ? es.filters[f.key] : f.clearedTo;
    const opts = (f.options || []).map((o) => `<option${String(o) === String(cur) ? ' selected' : ''}>${esc(o)}</option>`).join('');
    return `<div class="fld"><label for="e-f-${esc(f.key)}">${esc(f.label)}</label>
      <select id="e-f-${esc(f.key)}" data-edit-filter="${esc(f.key)}">${opts}</select></div>`;
  }).join('');

  return `
    <div class="editor-head">
      <h3 id="editor-title">Editor de análise</h3>
      <button class="btn ghost sm" data-editor-cancel aria-label="Fechar editor">Fechar ✕</button>
    </div>
    <div class="editor-body">
      <form class="editor-form" id="editor-form">
        <div class="fld"><label for="e-title">Título</label>
          <input id="e-title" data-edit="title" value="${esc(es.title || '')}" maxlength="${TITLE_MAX}">
          <span class="err" data-err="title"></span></div>
        <div class="fld"><label for="e-desc">Descrição</label>
          <textarea id="e-desc" data-edit="description" maxlength="${TEXT_MAX}" rows="2">${esc(es.description || '')}</textarea>
          <span class="err" data-err="description"></span></div>
        <div class="fld"><label for="e-measure">Medida</label>
          <select id="e-measure" data-edit="measure">${measures}</select></div>
        <div class="fld"><label for="e-dim">Dimensão</label>
          <select id="e-dim" data-edit="dimension">${dims}</select></div>
        <div class="fld"><label for="e-viz">Tipo de visualização</label>
          <select id="e-viz" data-edit="viz">${vizOpts}</select>
          <span class="err" data-err="viz"></span></div>
        <fieldset class="edit-filters"><legend>Filtros compatíveis</legend>${filterFlds || '<p class="muted small">Sem filtros compatíveis com esta medida.</p>'}</fieldset>
      </form>
      <div class="editor-preview">
        <h4>Prévia ao vivo</h4>
        <div id="editor-preview-el" aria-live="polite"></div>
      </div>
    </div>
    <div class="editor-foot">
      <button class="btn" data-editor-cancel>Cancelar</button>
      <button class="btn primary" data-editor-save>Salvar</button>
    </div>`;
}

function vizLabel(v) {
  return ({ line: 'Linha', bar: 'Barras', donut: 'Pizza/Donut', table: 'Tabela', metric: 'Indicador', embed: 'Incorporado' })[v] || v;
}

function wireEditor(panel, c) {
  const previewEl = panel.querySelector('#editor-preview-el');
  const updatePreview = () => {
    const es = editorState;
    const result = runQuery({ contextId: c.id, measure: es.measure, dimension: es.dimension, filters: es.filters, sort: es.sort });
    // Prévia atualiza SÓ a sub-árvore (previewEl.innerHTML), sem tocar o store.
    previewEl.innerHTML = renderAnalysis({ title: es.title, viz: es.viz, origin: 'manual', meta: {} }, result);
  };

  // Ao trocar a medida, re-renderiza o form (viz/filtros compatíveis mudam).
  panel.querySelectorAll('[data-edit]').forEach((el) => {
    const field = el.getAttribute('data-edit');
    const evt = (el.tagName === 'SELECT') ? 'change' : 'input';
    el.addEventListener(evt, () => {
      editorDirty = true;
      editorState[field] = el.value;
      if (field === 'measure') {
        // viz compatível pode mudar: reconstrói o form preservando valores.
        const m = measureCfg(c, editorState.measure);
        const allowed = m ? allowedVizForKind(m.kind) : ['table'];
        if (!allowed.includes(editorState.viz)) editorState.viz = allowed[0];
        rebuildEditorForm(panel, c, updatePreview);
        return;
      }
      updatePreview();
    });
  });
  panel.querySelectorAll('[data-edit-filter]').forEach((sel) => {
    sel.addEventListener('change', () => {
      editorDirty = true;
      editorState.filters[sel.getAttribute('data-edit-filter')] = sel.value;
      updatePreview();
    });
  });

  // Cancelar/fechar o editor é uma ação EXPLÍCITA de descarte do próprio
  // editor (a navegação para fora já fica bloqueada pelo overlay). Para não
  // empilhar overlays, descarta direto e limpa o editorState.
  panel.querySelectorAll('[data-editor-cancel]').forEach((b) =>
    b.addEventListener('click', () => closeOverlay(closeEditorState)));
  const saveBtn = panel.querySelector('[data-editor-save]');
  if (saveBtn) saveBtn.addEventListener('click', () => saveEditor(panel, c));

  updatePreview();
}

/* Reconstrói o form (quando a medida muda os selects dependentes). */
function rebuildEditorForm(panel, c, _updatePreview) {
  // Preserva o container do overlay; reescreve só o conteúdo interno do editor.
  const shell = panel.querySelector('.editor-shell') || panel;
  shell.innerHTML = editorFormHtml(c);
  wireEditor(panel, c);
}

function saveEditor(panel, c) {
  const es = editorState;
  es.title = normalizeText(es.title, TITLE_MAX);
  es.description = normalizeText(es.description, TEXT_MAX);
  const v = validateAnalysis(es, c);
  // Limpa erros anteriores.
  panel.querySelectorAll('[data-err]').forEach((n) => { n.textContent = ''; });
  if (!v.ok) {
    for (const err of v.errors) {
      const node = panel.querySelector(`[data-err="${err.field}"]`);
      if (node) node.textContent = err.msg;
    }
    // erros sem campo visível caem no título como fallback legível
    const unmapped = v.errors.filter((e) => !panel.querySelector(`[data-err="${e.field}"]`));
    if (unmapped.length) toast('Não foi possível salvar', unmapped.map((e) => e.msg).join(' '));
    return;
  }
  const def = { title: es.title, description: es.description, measure: es.measure, dimension: es.dimension, filters: es.filters, sort: es.sort, viz: es.viz };
  const res = editorAnalysisId ? store.updateAnalysis(editorAnalysisId, def) : store.saveAnalysis(def);
  if (res.denied) { toast('Ação não permitida', 'Perfil sem permissão de edição.'); return; }
  if (!res.ok) {
    for (const err of (res.errors || [])) {
      const node = panel.querySelector(`[data-err="${err.field}"]`);
      if (node) node.textContent = err.msg;
    }
    return;
  }
  const savedId = res.id || editorAnalysisId;
  const cb = editorOnSaved;
  // Salvo com sucesso: fecha o editor (sem guarda — já persistido).
  closeOverlay(closeEditorState);
  toast('Análise salva', 'Disponível no catálogo (armazenamento local).');
  if (typeof cb === 'function') cb(savedId);
}

/* "Duplicar como nova": abre o editor com o def existente mas sem id. */
function duplicateAnalysis(id) {
  const a = store.getAnalysis(id);
  if (!a) { toast('Análise inexistente'); return; }
  const c = store.getContext(a.contextId) || ctx();
  editorAnalysisId = null; // novo id ao salvar
  openEditorWithDef({
    title: `${a.title} (cópia)`, description: a.description,
    measure: a.def.measure, dimension: a.def.dimension, filters: { ...(a.def.filters || {}) }, sort: a.def.sort, viz: a.viz,
  }, c);
}

/* =========================================================================
   ASSISTENTE IA — roteiros por contexto; mesmo modelo/validador/renderizador.
   Região aria-live do chat PERSISTENTE (NIT-5): rerenderAI troca só o interno.
   ========================================================================= */
let aiState = { messages: [], pendingClarify: null, proposed: null, conversation: null };

export function resetAssistant() { aiState = { messages: [], pendingClarify: null, proposed: null, conversation: null }; }

export const assistant = {
  render() {
    const c = ctx();
    const suggestions = (c.aiScripts || []).map((s) =>
      s.clarify || (s.def && `Mostrar ${measureLabel(c, s.def.measure)} por ${dimLabel(c, s.def.dimension)}`)).filter(Boolean);
    return `
    <div class="page-title">
      <div><h1>Criar com IA</h1><p>Converse com os dados em linguagem natural. A IA propõe; você valida antes de salvar. Simulação roteirizada, sem confiança percentual.</p></div>
    </div>
    <div class="assistant">
      <div class="chat-col">
        <div class="chat-window">
          <div class="chat-scroll" id="chat-scroll" aria-live="polite">${renderMessages()}</div>
          <div class="suggestions" id="ai-suggestions">
            ${suggestions.map((s) => `<button data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}
          </div>
          <form class="chat-input" id="chat-form">
            <textarea id="chat-text" placeholder="Pergunte algo sobre os dados (fictícios)…" aria-label="Mensagem"></textarea>
            <button class="btn primary" type="submit">Enviar</button>
          </form>
        </div>
        <p class="small muted" style="margin-top:8px">Demonstração: roteiro fictício. Nada é publicado automaticamente; a IA usa o mesmo modelo de análise do editor manual.</p>
      </div>
      <div class="preview-col">
        <div class="panel" id="ai-preview">${renderProposed()}</div>
      </div>
    </div>`;
  },
  afterRender(root) {
    const form = root.querySelector('#chat-form');
    const text = root.querySelector('#chat-text');
    const send = (msg) => handleUser(msg, root);
    form.addEventListener('submit', (e) => { e.preventDefault(); const v = text.value.trim(); if (v) { text.value = ''; send(v); } });
    text.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    root.querySelectorAll('[data-suggest]').forEach((b) => b.addEventListener('click', () => send(b.getAttribute('data-suggest'))));
    wireChat(root);
    wirePreviewActions(root);
    wireMethod(root);
  },
};

function measureLabel(c, key) { const m = measureCfg(c, key); return m ? m.label : key; }

function renderMessages() {
  const c = ctx();
  if (!aiState.messages.length) {
    const intro = aiState.conversation
      ? `Conversa sobre a análise selecionada. Posso <strong>explicar o resultado atual</strong> ou rodar uma <strong>nova consulta</strong> sobre este recorte.`
      : `Olá! Posso montar análises sobre ${esc((c.measures || [])[0] ? c.measures[0].label.toLowerCase() : 'os dados')} e mais. O que você quer ver? <span class="muted">(dados fictícios)</span>`;
    return `<div class="msg ai"><div class="who">Assistente</div>${intro}</div>`;
  }
  return aiState.messages.map((m) => {
    if (m.typing) return `<div class="msg ai typing"><div class="who">Assistente</div><span class="dots"><i></i><i></i><i></i></span></div>`;
    const opts = m.options
      ? `<div class="clarify-opts">${m.options.map((o) => `<button class="btn sm" data-clarify-opt="${esc(o.value)}">${esc(o.label)}</button>`).join('')}</div>`
      : '';
    return `<div class="msg ${m.role}${m.clarify ? ' clarify' : ''}"><div class="who">${m.role === 'user' ? 'Você' : 'Assistente'}</div>${m.html}${opts}</div>`;
  }).join('');
}

function renderProposed() {
  if (!aiState.proposed) {
    return `<div class="p-head"><h3>Prévia da análise</h3></div>
      <div class="p-body"><div class="empty-preview"><div class="big">📊</div><p>A proposta da IA aparece aqui para você validar antes de salvar.</p></div></div>`;
  }
  const c = ctx();
  const def = aiState.proposed;
  const result = runQuery({ contextId: c.id, measure: def.measure, dimension: def.dimension, filters: def.filters || {}, sort: def.sort });
  const analysis = { title: def.title, viz: def.viz, origin: 'ai', meta: {} };
  const st = store.get();
  return `
    <div class="p-head"><div><h3>${esc(def.title)}</h3><div class="p-sub">Proposta da IA — valide antes de salvar</div></div>
      <button class="btn sm" data-method="${esc((measureCfg(c, def.measure) || {}).lexicon || '')}">Metodologia</button></div>
    <div class="p-body">${renderAnalysis(analysis, result)}</div>
    <div class="p-foot" style="justify-content:flex-end;gap:8px">
      <button class="btn sm" data-ai="ajustar">Ajustar</button>
      <button class="btn sm" data-ai="add"${can('compose', st) ? '' : ' disabled title="Perfil sem permissão de composição"'}>Adicionar à publicação</button>
      <button class="btn sm primary" data-ai="salvar"${can('edit', st) ? '' : ' disabled title="Perfil sem permissão de edição"'}>Salvar análise</button>
    </div>`;
}

function handleUser(msg, root) {
  const c = ctx();
  aiState.messages.push({ role: 'user', html: esc(msg) });
  rerenderAI(root);

  // Esclarecimento pendente: resposta deve bater com uma das OPÇÕES (botões).
  if (aiState.pendingClarify) {
    const clarify = aiState.pendingClarify;
    const matched = (clarify.options || []).find((o) => msg.toLowerCase().includes(o.value.toLowerCase()) || msg.toLowerCase().includes(o.label.toLowerCase()));
    if (!matched) {
      pushTyping(root, () => {
        aiState.messages.push({ role: 'ai', clarify: true, html: 'Preciso que você escolha uma das opções abaixo para eu seguir.', options: clarify.options });
        rerenderAI(root);
      });
      return;
    }
    aiState.pendingClarify = null;
    const def = { ...clarify.script.def, dimension: matched.value, title: proposalTitle(c, clarify.script.def.measure, matched.value) };
    pushTyping(root, () => { proposeDef(def, clarify.script.viz, root); });
    return;
  }

  const lower = msg.toLowerCase();
  const script = (c.aiScripts || []).find((s) => (s.match || []).some((mm) => lower.includes(mm)));
  if (!script) {
    pushTyping(root, () => {
      const list = (c.measures || []).slice(0, 3).map((m) => m.label).join(', ');
      aiState.messages.push({ role: 'ai', html: `Posso ajudar com ${esc(list)}. Tente uma dessas (dados fictícios).` });
      rerenderAI(root);
    });
    return;
  }
  if (script.clarify) {
    // Monta opções explícitas a partir das dimensões do contexto.
    const options = (c.dimensions || []).map((d) => ({ value: d.key, label: d.label }));
    aiState.pendingClarify = { script, options };
    pushTyping(root, () => {
      aiState.messages.push({ role: 'ai', clarify: true, html: `${esc(script.clarify)}`, options });
      rerenderAI(root);
    });
    return;
  }
  const def = { ...script.def, title: proposalTitle(c, script.def.measure, script.def.dimension) };
  pushTyping(root, () => { proposeDef(def, script.viz, root); });
}

function proposalTitle(c, measure, dimension) {
  return `${measureLabel(c, measure)} por ${dimLabel(c, dimension)}`;
}

function proposeDef(def, viz, root) {
  aiState.proposed = { ...def, viz, description: def.description || `Proposta da IA (fictícia).` };
  aiState.messages.push({ role: 'ai', html: `Gerei <strong>${esc(def.title)}</strong>. Veja a prévia ao lado e valide antes de salvar.` });
  rerenderAI(root);
}

function pushTyping(root, done) {
  aiState.messages.push({ typing: true });
  rerenderAI(root);
  setTimeout(() => { aiState.messages = aiState.messages.filter((m) => !m.typing); done(); }, 500);
}

/* rerenderAI: troca SÓ o innerHTML interno de #chat-scroll (persistente, NIT-5)
   e o conteúdo do painel de prévia; nunca recria os containers aria-live. */
function rerenderAI(root) {
  const scroll = root.querySelector('#chat-scroll');
  if (scroll) { scroll.innerHTML = renderMessages(); scroll.scrollTop = scroll.scrollHeight; }
  const prev = root.querySelector('#ai-preview');
  if (prev) prev.innerHTML = renderProposed();
  wireChat(root);
  wirePreviewActions(root);
  wireMethod(root);
}

function wireChat(root) {
  root.querySelectorAll('[data-clarify-opt]').forEach((b) => b.addEventListener('click', () => {
    handleUser(b.getAttribute('data-clarify-opt'), root);
  }));
  root.querySelectorAll('[data-run-local]').forEach((b) => b.addEventListener('click', () => runConversationQuery(root)));
  root.querySelectorAll('[data-explain]').forEach((b) => b.addEventListener('click', () => explainCurrent(root)));
  root.querySelectorAll('[data-save-local]').forEach((b) => b.addEventListener('click', () => saveConversationAnalysis(root)));
}

function wirePreviewActions(root) {
  const c = ctx();
  root.querySelectorAll('[data-ai]').forEach((b) => b.addEventListener('click', () => {
    const a = b.getAttribute('data-ai');
    const def = aiState.proposed;
    if (!def) return;
    if (a === 'ajustar') {
      // Abre o analysisEditor com o def proposto (mesmo modelo).
      openEditorWithDef(
        { title: def.title, description: def.description || '', measure: def.measure, dimension: def.dimension, filters: { ...(def.filters || {}) }, sort: def.sort, viz: def.viz },
        c,
        { onSaved: () => { toast('Análise salva pelo editor'); } },
      );
    }
    if (a === 'salvar') {
      const res = store.saveAnalysis({ title: def.title, description: def.description || '', measure: def.measure, dimension: def.dimension, filters: def.filters || {}, sort: def.sort, viz: def.viz });
      if (res.denied) { toast('Ação não permitida', 'Perfil sem permissão de edição.'); return; }
      if (!res.ok) { toast('Não foi possível salvar', (res.errors || []).map((e) => e.msg).join(' ')); return; }
      toast('Análise salva', 'Disponível no catálogo.');
    }
    if (a === 'add') {
      // Salva primeiro (grava bloco com analysisId exato), depois adiciona.
      const res = store.saveAnalysis({ title: def.title, description: def.description || '', measure: def.measure, dimension: def.dimension, filters: def.filters || {}, sort: def.sort, viz: def.viz });
      if (res.denied) { toast('Ação não permitida'); return; }
      if (!res.ok) { toast('Não foi possível adicionar', (res.errors || []).map((e) => e.msg).join(' ')); return; }
      addAnalysisToPublication(res.id);
    }
  }));
}

/* ---------- Conversa contextual "Conversar sobre esta análise" (design (f)) ---------- */
function startConversation(analysisId) {
  const a = store.getAnalysis(analysisId);
  if (!a) { toast('Análise inexistente'); return; }
  resetAssistant();
  aiState.conversation = { analysisId, recorte: { ...(a.def.filters || {}) }, def: { ...a.def, title: a.title, viz: a.viz } };
  const c = store.getContext(a.contextId) || ctx();
  const result = resultFor(a);
  aiState.messages.push({
    role: 'ai',
    html: `Conversando sobre <strong>${esc(a.title)}</strong> (${esc(measureLabel(c, a.def.measure))}, recorte: ${esc(recorteLabel(a.def.filters))}).`,
  });
  aiState.messages.push({
    role: 'ai',
    html: `Escolha um modo:<div class="clarify-opts">
      <button class="btn sm" data-explain>Explicar o resultado atual</button>
      <button class="btn sm" data-run-local>Nova consulta sobre este recorte</button></div>`,
  });
  navigate('#assistant');
}

function recorteLabel(filters) {
  const entries = Object.entries(filters || {});
  if (!entries.length) return 'sem filtros';
  return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
}

/* Modo (A): explicar o result corrente — afirmações numéricas, sem causalidade. */
function explainCurrent(root) {
  const conv = aiState.conversation;
  if (!conv) return;
  const a = store.getAnalysis(conv.analysisId);
  if (!a) { aiState.messages.push({ role: 'ai', html: stateViewInline('invalid') }); rerenderAI(root); return; }
  const c = store.getContext(a.contextId) || ctx();
  const result = resultFor(a);
  let facts;
  if (result.empty) {
    facts = 'O recorte atual não retorna dados.';
  } else if (result.shape === 'series') {
    const ds = result.series.datasets[0];
    const first = ds.data[0], last = ds.data[ds.data.length - 1];
    facts = `A série vai de ${fmtInt(first)} a ${fmtInt(last)} ao longo de ${ds.data.length} períodos.`;
  } else {
    const rows = result.rows || [];
    const top = rows[0];
    facts = top ? `Maior valor: ${esc(top.label)} com ${result.meta.measureKind === 'rate' ? fmtPct(top.value) : fmtInt(top.value)}.` : 'Sem categorias.';
  }
  aiState.messages.push({ role: 'ai', html: `${facts} <span class="muted small">(afirmação numérica sobre o recorte exibido; sem inferência causal)</span>` });
  rerenderAI(root);
}

/* Modo (B): nova consulta local; oferece "Salvar como nova análise" (novo id). */
function runConversationQuery(root) {
  const conv = aiState.conversation;
  if (!conv) return;
  const a = store.getAnalysis(conv.analysisId);
  if (!a) { aiState.messages.push({ role: 'ai', html: stateViewInline('invalid') }); rerenderAI(root); return; }
  const c = store.getContext(a.contextId) || ctx();
  // Nova consulta: altera o sort como exemplo de def alterado, sem tocar a origem.
  const altered = { ...a.def, sort: a.def.sort === 'asc' ? 'desc' : 'asc' };
  const result = runQuery({ contextId: c.id, measure: altered.measure, dimension: altered.dimension, filters: altered.filters || {}, sort: altered.sort });
  aiState.proposed = { title: `${a.title} (nova consulta)`, measure: altered.measure, dimension: altered.dimension, filters: altered.filters, sort: altered.sort, viz: a.viz, description: 'Nova consulta local sobre o recorte (fictícia).' };
  aiState.messages.push({
    role: 'ai',
    html: `Rodei uma nova consulta local (ordenação alterada) sem modificar a análise de origem. Veja a prévia ao lado.
      <div class="clarify-opts"><button class="btn sm primary" data-save-local>Salvar como nova análise</button></div>`,
  });
  rerenderAI(root);
}

function saveConversationAnalysis(root) {
  const def = aiState.proposed;
  if (!def) return;
  const res = store.saveAnalysis({ title: def.title, description: def.description || '', measure: def.measure, dimension: def.dimension, filters: def.filters || {}, sort: def.sort, viz: def.viz });
  if (res.denied) { toast('Ação não permitida', 'Perfil sem permissão de edição.'); return; }
  if (!res.ok) { toast('Não foi possível salvar', (res.errors || []).map((e) => e.msg).join(' ')); return; }
  aiState.messages.push({ role: 'ai', html: `Salvo como nova análise (origem preservada). Disponível no catálogo.` });
  rerenderAI(root);
}

function stateViewInline(kind) { return stateView(kind); }

/* =========================================================================
   COMPOSITOR + PAINEL DE PROPRIEDADES — seleção LOCAL (composerSelection).
   ========================================================================= */
let composerSelection = null; // id do bloco selecionado (estado de UI da view)

/* Modelos (design (g)): substituem blocos => confirmação antes de aplicar. */
function templates(c) {
  const list = store.listAnalyses({ contextId: c.id }).filter((a) => a.def);
  const firstChart = list.find((a) => a.viz !== 'embed');
  const chartId = firstChart ? firstChart.id : null;
  return {
    rapida: {
      label: 'Análise rápida',
      blocks: [
        { type: 'title', content: 'Análise rápida' },
        ...(chartId ? [{ type: 'chart', analysisId: chartId }] : []),
      ],
    },
    monitoramento: {
      label: 'Monitoramento',
      blocks: [
        { type: 'title', content: 'Monitoramento' },
        { type: 'text', content: 'Acompanhamento periódico dos indicadores (dados fictícios).' },
        ...(chartId ? [{ type: 'metric', analysisId: chartId }, { type: 'chart', analysisId: chartId }] : []),
      ],
    },
    tematica: {
      label: 'História temática',
      blocks: [
        { type: 'title', content: 'História temática' },
        { type: 'text', content: 'Narrativa temática com dados de apoio (fictícios).' },
        ...(chartId ? [{ type: 'table', analysisId: chartId }] : []),
        { type: 'methodology', content: '' },
      ],
    },
  };
}

export const composer = {
  render() {
    const c = ctx();
    const st = store.get();
    const pub = defaultPublication();
    if (!pub) return `<div class="page-title"><h1>Nova publicação</h1></div>${stateView('empty', 'Nenhuma publicação neste contexto.')}`;
    const blocks = (pub.draft && pub.draft.blocks) || [];
    const canCompose = can('compose', st);
    const canPublish = can('publish', st);
    const tpls = templates(c);

    return `
    <div class="page-title">
      <div><h1>Nova publicação</h1><p>${esc(pub.title)} — monte a página combinando blocos (dados fictícios).</p></div>
      <div class="page-actions">
        <button class="btn" data-pub-preview>Pré-visualizar</button>
        <button class="btn primary" data-pub-publish${canPublish ? '' : ' disabled title="Perfil sem permissão de publicação"'}>Publicar</button>
      </div>
    </div>
    <div class="composer-3">
      <div class="palette">
        <h4>Adicionar bloco</h4>
        ${['title', 'text', 'metric', 'chart', 'table', 'methodology'].map((t) =>
          `<button class="btn sm pbtn" data-add="${t}"${canCompose ? '' : ' disabled'}>${esc(BLOCK_LABEL[t])}</button>`).join('')}
        <hr class="soft">
        <h4>Modelos</h4>
        ${Object.entries(tpls).map(([k, t]) =>
          `<button class="btn sm pbtn" data-template="${esc(k)}"${canCompose ? '' : ' disabled'}>${esc(t.label)}</button>`).join('')}
        <p class="small muted" style="margin-top:8px">Aplicar um modelo substitui os blocos atuais (pede confirmação).</p>
      </div>
      <div class="canvas" id="canvas">${renderBlocks(blocks, pub)}</div>
      <aside class="props" id="props-panel" aria-label="Propriedades do bloco">${renderProps(pub)}</aside>
    </div>`;
  },
  afterRender(root) {
    const pub = defaultPublication();
    if (!pub) return;
    root.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
      const res = store.addBlock(pub.id, b.getAttribute('data-add'), {});
      if (res.denied) toast('Ação não permitida', 'Perfil sem permissão de composição.');
      else composerSelection = res.id;
    }));
    root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      const res = store.removeBlock(pub.id, b.getAttribute('data-del'));
      if (res.denied) toast('Ação não permitida');
      else if (composerSelection === b.getAttribute('data-del')) composerSelection = null;
    }));
    root.querySelectorAll('[data-move]').forEach((b) => b.addEventListener('click', () => {
      const res = store.moveBlock(pub.id, b.getAttribute('data-id'), b.getAttribute('data-move'));
      if (res.denied) toast('Ação não permitida');
    }));
    root.querySelectorAll('[data-select-block]').forEach((b) => b.addEventListener('click', () => {
      composerSelection = b.getAttribute('data-select-block');
      refreshProps(root, pub);
    }));
    root.querySelectorAll('[data-template]').forEach((b) => b.addEventListener('click', () => confirmTemplate(b.getAttribute('data-template'), pub)));
    root.querySelector('[data-pub-preview]')?.addEventListener('click', () => previewPublication(pub.id));
    root.querySelector('[data-pub-publish]')?.addEventListener('click', () => doPublish(pub.id));
    wirePropsPanel(root, pub);
    wireMethod(root);
  },
};

function renderBlocks(blocks, pub) {
  if (!blocks.length) return '<p class="muted small">Sem blocos. Use a paleta ao lado.</p>';
  return blocks.map((b, i) => `
    <div class="pub-block${composerSelection === b.id ? ' selected' : ''}" data-block="${esc(b.id)}">
      <div class="pb-bar">
        <button class="pb-type" data-select-block="${esc(b.id)}" aria-label="Selecionar bloco ${esc(BLOCK_LABEL[b.type] || b.type)}">${esc(BLOCK_LABEL[b.type] || b.type)}</button>
        <div class="pb-ctrl">
          <button class="btn ghost sm" data-move="up" data-id="${esc(b.id)}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">▲</button>
          <button class="btn ghost sm" data-move="down" data-id="${esc(b.id)}" ${i === blocks.length - 1 ? 'disabled' : ''} aria-label="Descer">▼</button>
          <button class="btn ghost sm" data-del="${esc(b.id)}" aria-label="Remover">✕</button>
        </div>
      </div>
      <div class="pb-body">${blockBody(b)}</div>
    </div>`).join('');
}

/* Renderiza o corpo de um bloco usando renderAnalysis para viz referenciadas. */
function blockBody(b) {
  switch (b.type) {
    case 'title': return `<h2 style="margin:0;font-size:22px">${esc(b.content || 'Título')}</h2>`;
    case 'text': return `<p style="margin:0">${esc(b.content || 'Texto do bloco.')}</p>`;
    case 'methodology': return `<div class="muted small">Bloco de metodologia (léxico/cálculo/fonte do contexto).</div>`;
    case 'metric':
    case 'chart':
    case 'table':
    case 'embed': {
      if (!b.analysisId) return `<div class="muted small">${esc(BLOCK_LABEL[b.type])}: selecione uma análise no painel de propriedades.</div>`;
      const a = store.getAnalysis(b.analysisId);
      if (!a) return stateView('invalid');
      const viz = b.type === 'table' ? 'table' : (b.type === 'metric' ? 'metric' : a.viz);
      const result = resultFor(a);
      return renderAnalysis({ ...a, viz }, result);
    }
    default: return esc(b.type);
  }
}

/* Painel de propriedades do bloco selecionado (design (g)). */
function renderProps(pub) {
  const blocks = (pub.draft && pub.draft.blocks) || [];
  const b = blocks.find((x) => x.id === composerSelection);
  if (!b) return `<h4>Propriedades</h4><p class="muted small">Selecione um bloco para editar suas propriedades.</p>`;
  const c = ctx();
  const analysisBlock = ['metric', 'chart', 'table', 'embed'].includes(b.type);
  const isEmbed = b.type === 'embed' || (b.analysisId && (store.getAnalysis(b.analysisId) || {}).origin === 'superset_demo');
  const anList = store.listAnalyses({ contextId: c.id }).filter((a) => a.def); // próprias (não embed) para escolher
  const anOptions = `<option value="">—</option>` + anList.map((a) =>
    `<option value="${esc(a.id)}"${a.id === b.analysisId ? ' selected' : ''}>${esc(a.title)}</option>`).join('');

  let fields = '';
  if (b.type === 'title' || b.type === 'text') {
    fields = `<div class="fld"><label for="prop-content">${esc(BLOCK_LABEL[b.type])}</label>
      <textarea id="prop-content" data-prop="content" rows="3" maxlength="${TEXT_MAX}">${esc(b.content || '')}</textarea></div>`;
  } else if (analysisBlock && !isEmbed) {
    fields = `<div class="fld"><label for="prop-analysis">Análise referenciada</label>
      <select id="prop-analysis" data-prop="analysisId">${anOptions}</select></div>`;
  } else if (isEmbed) {
    fields = `<p class="muted small">Dashboard incorporado (Superset simulado): não é editável pelo editor de gráficos. Apenas posição, remoção e legenda.</p>
      <div class="fld"><label for="prop-content">Legenda</label><input id="prop-content" data-prop="content" value="${esc(b.content || '')}" maxlength="${TEXT_MAX}"></div>`;
  }

  return `<h4>Propriedades · ${esc(BLOCK_LABEL[b.type] || b.type)}</h4>
    ${fields}
    <details class="prop-details"><summary>Detalhes técnicos</summary>
      <p class="small muted">ID do bloco: ${esc(b.id)}${b.analysisId ? ` · análise: ${esc(b.analysisId)}` : ''}</p></details>`;
}

function refreshProps(root, pub) {
  const panel = root.querySelector('#props-panel');
  if (panel) { panel.innerHTML = renderProps(pub); wirePropsPanel(root, pub); }
  // Reflete seleção visual no canvas sem re-render completo.
  root.querySelectorAll('.pub-block').forEach((el) =>
    el.classList.toggle('selected', el.getAttribute('data-block') === composerSelection));
}

function wirePropsPanel(root, pub) {
  const panel = root.querySelector('#props-panel');
  if (!panel) return;
  panel.querySelectorAll('[data-prop]').forEach((el) => {
    const field = el.getAttribute('data-prop');
    el.addEventListener('change', () => {
      const blocks = (pub.draft && pub.draft.blocks) || [];
      const b = blocks.find((x) => x.id === composerSelection);
      if (!b) return;
      // Persiste a propriedade do bloco via store (mutação de composição).
      const extra = field === 'analysisId' ? { analysisId: el.value || null } : { content: el.value };
      const res = store.setBlockProps(pub.id, b.id, extra);
      if (res && res.denied) toast('Ação não permitida', 'Perfil sem permissão de composição.');
    });
  });
}

function confirmTemplate(key, pub) {
  const c = ctx();
  const tpls = templates(c);
  const tpl = tpls[key];
  if (!tpl) return;
  const apply = () => {
    const res = store.applyTemplate(pub.id, tpl.blocks.map((b) => ({ ...b })));
    if (res.denied) { toast('Ação não permitida', 'Perfil sem permissão de composição.'); return; }
    composerSelection = null;
    toast('Modelo aplicado', tpl.label);
  };
  const hasBlocks = ((pub.draft && pub.draft.blocks) || []).length > 0;
  if (hasBlocks) {
    openConfirm({
      title: `Aplicar "${tpl.label}"?`,
      body: 'Isso substitui os blocos atuais do rascunho. O conteúdo atual será perdido.',
      confirmLabel: 'Substituir',
      onConfirm: apply,
    });
  } else {
    apply();
  }
}

/* =========================================================================
   PUBLICAÇÃO + CONSUMO (design (h), AC-13/14/15/16).
   ========================================================================= */
function previewPublication(pubId) {
  // Pré-visualização = render do rascunho com os mesmos componentes do consumo.
  const pub = store.getPublication(pubId);
  if (!pub) { toast('Publicação inexistente'); return; }
  const blocks = (pub.draft && pub.draft.blocks) || [];
  const body = blocks.map((b) => `<div class="pub-render-block">${consumptionBlock(b, (id) => store.getAnalysis(id))}</div>`).join('');
  openEditorOverlay(`
    <div class="editor-head"><h3 id="ov-title">Pré-visualização do rascunho</h3>
      <button class="btn ghost sm" data-ov-close2 aria-label="Fechar">Fechar ✕</button></div>
    <div class="editor-body preview-body">${body || stateView('empty', 'Rascunho sem blocos.')}</div>`, {
    labelledBy: 'ov-title',
    onMount: (panel) => { panel.querySelector('[data-ov-close2]')?.addEventListener('click', () => closeOverlay()); },
  });
}

function doPublish(pubId) {
  const res = store.publish(pubId);
  if (res.denied) {
    // Perfil sem publish: a UI mostra stateView('denied') (AC-16).
    const main = document.getElementById('main');
    if (main) main.insertAdjacentHTML('afterbegin', `<div class="denied-banner">${stateView('denied', 'Seu perfil simulado não pode publicar. A validação real ocorre no backend.')}</div>`);
    toast('Publicação negada', 'Perfil sem permissão.');
    return;
  }
  if (!res.ok) { toast('Não foi possível publicar', (res.errors || []).map((e) => e.msg).join(' ')); return; }
  toast('Publicação criada', `Versão ${res.version}. Rota de consumo disponível.`);
  setPublicationOrigin('authoring');
  location.hash = `#publicacao/${encodeURIComponent(pubId)}`;
}

/* publicationView(id, fromAuthoring) — renderiza o publishedSnapshot (design (h)). */
export function publicationView(id, fromAuthoring) {
  return {
    render() {
      const pub = store.getPublication(id);
      if (!pub) return wrapConsumption(stateView('missing', 'Publicação não encontrada nesta demonstração.'), false);
      const snap = pub.publishedSnapshot;
      if (!snap) return wrapConsumption(stateView('missing', 'Esta publicação ainda não foi publicada.'), fromAuthoring);
      const resolve = (anId) => (snap.analysesCopy && snap.analysesCopy[anId]) || null; // SEMPRE via snapshot (NIT-1)
      const body = (snap.blocks || []).map((b) => `<div class="pub-render-block">${consumptionBlock(b, resolve)}</div>`).join('');
      const header = `
        <div class="pub-consume-head">
          <div class="demo-banner" style="border-radius:8px">Demonstração · dados fictícios · nenhuma conexão com serviços reais</div>
          <h1>${esc(pub.title)}</h1>
          <p class="muted">${esc(pub.description || '')}</p>
          <p class="small muted">Versão ${esc(snap.version)} · publicada ${esc(snap.savedAt || '')}</p>
          <p class="small muted">Este link depende do armazenamento local deste navegador e não é compartilhado com outros usuários ou dispositivos.</p>
        </div>`;
      return wrapConsumption(`${header}<div class="pub-consume-body">${body || stateView('empty', 'Publicação sem blocos.')}</div>`, fromAuthoring);
    },
    afterRender(root) {
      root.querySelector('[data-back-editor]')?.addEventListener('click', () => { setPublicationOrigin(null); location.hash = '#composer'; });
      wireMethod(root);
    },
  };
}

function wrapConsumption(inner, fromAuthoring) {
  const back = fromAuthoring
    ? `<div class="pub-consume-top"><button class="btn sm" data-back-editor>← Voltar ao editor</button></div>`
    : '';
  return `<div class="pub-consume">${back}${inner}</div>`;
}

/* Bloco na visão de consumo/preview: resolve análise via resolver fornecido. */
function consumptionBlock(b, resolve) {
  switch (b.type) {
    case 'title': return `<h2>${esc(b.content || '')}</h2>`;
    case 'text': return `<p>${esc(b.content || '')}</p>`;
    case 'methodology': return `<div class="muted small">Metodologia (léxico/cálculo/fonte do contexto · fictício).</div>`;
    case 'metric':
    case 'chart':
    case 'table':
    case 'embed': {
      if (!b.analysisId) return stateView('invalid', 'Bloco sem análise referenciada.');
      const a = resolve(b.analysisId);
      if (!a) return stateView('invalid');
      const viz = b.type === 'table' ? 'table' : (b.type === 'metric' ? 'metric' : a.viz);
      const result = resultFor(a);
      return renderAnalysis({ ...a, viz }, result);
    }
    default: return '';
  }
}

/* =========================================================================
   Wiring compartilhado.
   ========================================================================= */
function wireFilters(root) {
  root.querySelectorAll('[data-filter]').forEach((sel) =>
    sel.addEventListener('change', () => store.setFilter(sel.getAttribute('data-filter'), sel.value)));
  root.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => {
    const k = b.getAttribute('data-remove');
    const c = ctx();
    const flt = (c.filters || []).find((f) => f.key === k);
    store.setFilter(k, flt ? flt.clearedTo : '');
  }));
  const clr = root.querySelector('[data-clear]');
  if (clr) clr.addEventListener('click', () => store.clearFilters());
}
function wireMethod(root) {
  const c = ctx();
  root.querySelectorAll('[data-method]').forEach((b) => b.addEventListener('click', () => {
    const term = b.getAttribute('data-method');
    openMethodology(term, (c.methodology || {})[term]);
  }));
}
function wireGoto(root) {
  root.querySelectorAll('[data-goto]').forEach((b) =>
    b.addEventListener('click', () => navigate('#' + b.getAttribute('data-goto'))));
}

/* Expor o editor para outras views (duplicar). */
export { openAnalysisEditor, duplicateAnalysis };
