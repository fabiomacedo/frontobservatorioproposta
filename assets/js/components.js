/* =========================================================================
   components.js — Helpers de UI reutilizáveis (sem framework).
   Todas as funções retornam string HTML ou um Element. Conteúdo é fictício.
   ========================================================================= */

import { STATES, reqById } from './data.js';

// Escapa texto para evitar HTML indesejado em conteúdo dinâmico.
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Chip de estado: rótulo + glifo + cor (cor nunca é o único indicador).
export function stateChip(stateKey, extraLabel) {
  const s = STATES[stateKey] || STATES.verify;
  const label = extraLabel ? `${s.label} — ${extraLabel}` : s.label;
  return `<span class="state ${s.cls}"><span class="glyph" aria-hidden="true">${s.glyph}</span>${esc(label)}</span>`;
}

// Caminho do PDF relativo à raiz do site (mesma base das URLs de hash).
export const DISSERTACAO_PDF = 'assets/docs/macedo-2019-bi-lexico-institutos-federais.pdf';
export const DISSERTACAO_REF =
  'MACÊDO, F. C. Abordagem de Business Intelligence associada a indicadores regulamentados por ' +
  'leis brasileiras com suporte em léxico: o caso dos Institutos Federais de Educação. ' +
  'Dissertação (Mestrado em Gestão e Estratégia) — UFRRJ, Seropédica, 2019.';

// Chip de fundamentação acadêmica + link para o PDF.
// NÃO é um estado de evidência (não entra em STATES nem na legenda global):
// é um fato externo (dissertação publicada), não uma classificação da implementação.
export function academicRef(linkLabel = 'fundamentação acadêmica') {
  return `<a class="state academic" href="${DISSERTACAO_PDF}" target="_blank" rel="noopener" title="${esc(DISSERTACAO_REF)}"><span class="glyph" aria-hidden="true">§</span>${esc('Fundamentação acadêmica — ' + linkLabel)}</a>`;
}

// Legenda dos três estados.
export function legend() {
  return `
  <div class="legend" role="note" aria-label="Legenda de estados de evidência">
    <strong class="small">Estados:</strong>
    ${Object.values(STATES).map((s) => `
      <span class="legend-item">
        ${stateChip(s.key)}
      </span>`).join('')}
    <small class="muted">A cor nunca é o único indicador: há sempre rótulo e símbolo.</small>
  </div>`;
}

// Pílula de requisito PR-xx que linka para a visão executiva.
export function reqPill(id) {
  const r = reqById(id);
  const title = r ? r.subject : id;
  return `<a class="pid" href="#01-visao-executiva" title="${esc(title)}">${esc(id)}</a>`;
}

// Cartão genérico.
export function card({ pid, title, body, cls = '' }) {
  return `
  <div class="card ${cls}">
    ${pid ? `<span class="pid">${esc(pid)}</span>` : ''}
    <h5>${esc(title)}</h5>
    <p>${body}</p>
  </div>`;
}

// Bloco <details> colapsável.
export function collapsible(summary, bodyHtml, open = false) {
  return `
  <details class="collapsible"${open ? ' open' : ''}>
    <summary>${summary}</summary>
    <div class="cbody">${bodyHtml}</div>
  </details>`;
}

// Âncora de link direto por hash (para rastreabilidade).
export function anchor(hashId) {
  return `<a class="anchor-link" href="#${esc(hashId)}" title="Link direto">#</a>`;
}

// ---- Widgets de demonstração (dados fictícios) ---------------------------

// Gráfico de linha em SVG nativo (sem biblioteca). Inclui descrição textual.
export function sparkChart(series, { unit = '', descId = 'chart-desc' } = {}) {
  const w = 560, h = 180, pad = 24;
  const max = Math.max(...series), min = Math.min(...series);
  const span = (max - min) || 1;
  const step = (w - pad * 2) / (series.length - 1);
  const pts = series.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = `M${pad} ${h - pad} ` + pts.map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ` L${(w - pad)} ${h - pad} Z`;
  const dots = pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5" fill="#15603f"></circle>`).join('');
  const desc = `Série fictícia de ${series.length} pontos, variando de ${min} a ${max} ${esc(unit)}.`;
  return `
  <svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${descId}" style="width:100%;height:auto">
    <title id="${descId}">${desc}</title>
    <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#d9e0ea"></line>
    <path d="${area}" fill="#e4f1ea"></path>
    <path d="${path}" fill="none" stroke="#15603f" stroke-width="2.5"></path>
    ${dots}
  </svg>
  <p class="small muted" style="margin:6px 0 0">${desc}</p>`;
}

export function metricWidget(m) {
  return `
  <div class="metric">
    <span class="m-val">${esc(m.value)}</span>
    <span class="m-lbl">${esc(m.label)}</span>
    <span class="m-delta ${m.dir === 'down' ? 'down' : 'up'}">${m.dir === 'down' ? '▼' : '▲'} ${esc(m.delta)} <span class="muted">(demo)</span></span>
  </div>`;
}

export function chartWidget(chart) {
  return `
  <div class="chart-box">
    <div class="cb-head">
      <div class="cb-title">${esc(chart.title)}</div>
      <div class="cb-meta">
        <span><b>Unidade:</b> ${esc(chart.unit)}</span>
        <span><b>Período:</b> ${esc(chart.period)}</span>
        <span><b>Fonte conceitual:</b> ${esc(chart.source)}</span>
        <span><b>Atualização:</b> ${esc(chart.updated)}</span>
      </div>
    </div>
    <div class="cb-body">${sparkChart(chart.series, { unit: chart.unit })}</div>
  </div>`;
}

export function filtersWidget(filters, { interactive = false } = {}) {
  const chips = filters.map((f) => `
    <span class="chip">${esc(f.k)}: <strong>${esc(f.v)}</strong>${interactive ? ` <button type="button" data-remove="${esc(f.k)}" aria-label="Remover filtro ${esc(f.k)}">×</button>` : ''}</span>`).join('');
  return `
  <div class="filters" role="group" aria-label="Filtros ativos">
    ${chips}
    ${interactive ? '<button type="button" class="btn small ghost" data-clear>Limpar filtros</button>' : ''}
  </div>`;
}

export function embedPlaceholder(label) {
  return `
  <div class="placeholder-embed" role="img" aria-label="Espaço reservado para dashboard incorporado do Superset. Sem conteúdo real.">
    <div class="pe-title">Dashboard incorporado (placeholder)</div>
    <p class="small">${esc(label || 'Conteúdo do Superset apareceria aqui.')}</p>
    <p class="small muted">Sem iframe e sem chamadas externas. Incorporação é PROPOSTA; o papel do Superset como executor está EM ABERTO.</p>
  </div>`;
}

export function stateBoxes() {
  return `
  <div class="state-demos">
    <div class="state-box" aria-label="Estado de carregamento">
      <strong class="small">⟳ Carregando…</strong>
      <div class="skeleton w80"></div><div class="skeleton w60"></div><div class="skeleton w40"></div>
    </div>
    <div class="state-box empty" aria-label="Estado vazio">
      <strong class="small">∅ Sem resultados</strong>
      <span class="small">Nenhum dado para os filtros atuais (demo).</span>
    </div>
    <div class="state-box err" aria-label="Estado de erro">
      <strong class="small">✕ Erro ao carregar</strong>
      <span class="small">Falha fictícia. <button class="btn small ghost" type="button">Tentar de novo</button></span>
    </div>
    <div class="state-box denied" aria-label="Estado de acesso negado">
      <strong class="small">⊘ Acesso negado</strong>
      <span class="small">Autorização decidida fora da UI (PR-07). Distinto de erro.</span>
    </div>
  </div>`;
}

// ---- Painel de detalhes técnicos -----------------------------------------
// Gera o HTML do corpo do painel a partir de um componente do laboratório.
export function techDetailBody(c) {
  const list = (arr) => `<ul>${arr.map((x) => `<li><code>${esc(x)}</code></li>`).join('')}</ul>`;
  const listPlain = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `
  <dl class="dl-tech">
    <dt>Estado</dt><dd>${stateChip(c.state)}</dd>
    <dt>Responsabilidade</dt><dd>${esc(c.resp)}</dd>
    <dt>Requisitos relacionados</dt><dd>${c.pr.split(',').map((p) => reqPill(p.trim())).join(' ')}</dd>
    <dt>Propriedades (ilustrativas)</dt><dd>${c.props.length ? list(c.props) : '<span class="muted">—</span>'}</dd>
    <dt>Eventos</dt><dd>${c.events.length ? list(c.events) : '<span class="muted">—</span>'}</dd>
    <dt>Dados necessários</dt><dd>${listPlain(c.data)}</dd>
    <dt>Dependências</dt><dd>${listPlain(c.deps)}</dd>
    <dt>Testes sugeridos</dt><dd>${listPlain(c.tests)}</dd>
    <dt>Observação</dt><dd class="small muted">${esc(c.note)}</dd>
  </dl>`;
}
