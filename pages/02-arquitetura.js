/* Página 2 — Arquitetura e integrações [DOC-02] */
import { currentDiagram, proposedDiagram, NODE_INFO } from '../assets/js/diagrams.js';
import { legend, stateChip, esc, anchor } from '../assets/js/components.js';
import { openDetail } from '../assets/js/app.js';

export function render() {
  return `
  <div class="page-head">
    <div class="doc">DOC-02 · Arquitetura</div>
    <h2>Arquitetura e integrações ${anchor('02-arquitetura')}</h2>
    <p class="lead">Diferencia o que é informado pelo relato do que é proposto ou pendente. Separa
    relação conceitual de fluxo real de chamadas.</p>
  </div>

  ${legend()}

  <div class="callout">
    Linha <strong>sólida</strong> = relação informada no relato. Linha <strong>tracejada</strong> =
    relação proposta ou pendente. Todos os vínculos têm rótulo. Clique (ou Enter) em um componente
    para ver responsabilidade, entradas, saídas, dependências e perguntas.
  </div>

  <section class="block" id="arq-atual">
    <h3>Diagrama atual ${anchor('arq-atual')}</h3>
    <p class="sub">Somente relações confirmadas por relato.</p>
    ${currentDiagram()}
  </section>

  <section class="block" id="arq-proposta">
    <h3>Diagrama proposto de responsabilidades ${anchor('arq-proposta')}</h3>
    <p class="sub">LAL, vínculos do ETL, integração de backend, experiência Observatório e Superset.</p>
    ${proposedDiagram()}
  </section>

  <section class="block" id="superset">
    <h3>Superset — duas possibilidades distintas ${anchor('superset')}</h3>
    <div class="row" style="align-items:stretch">
      <div class="callout proposed" style="flex:1;min-width:260px">
        <strong>Incorporação de análises.</strong> Exibir conteúdo do Superset dentro do Observatório.
        ${stateChip('proposed')} <span class="small">(PR-09)</span>
      </div>
      <div class="callout" style="flex:1;min-width:260px">
        <strong>Execução de consultas.</strong> Papel do Superset como executor está em aberto.
        ${stateChip('verify', 'em avaliação')}
      </div>
    </div>
    <p class="small muted" style="margin-top:10px">
      O backend aparece como responsabilidade lógica proposta. Isso não afirma que a evolução exige um
      novo serviço: pode reusar componentes existentes.
    </p>
  </section>`;
}

// Liga cliques nos nós do SVG ao painel de detalhes.
export function afterRender(root) {
  root.querySelectorAll('.diagram .node').forEach((el) => {
    const key = el.getAttribute('data-node');
    const info = NODE_INFO[key];
    if (!info) return;
    const open = () => openDetail({
      pid: key.toUpperCase(),
      title: info.title,
      bodyHtml: nodeBody(info),
    });
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}

function nodeBody(info) {
  const ul = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `
  <dl class="dl-tech">
    <dt>Estado</dt><dd>${stateChip(info.state, info.state === 'confirmed' ? 'por relato' : '')}</dd>
    <dt>Responsabilidade</dt><dd>${esc(info.resp)}</dd>
    <dt>Entradas</dt><dd>${ul(info.inputs)}</dd>
    <dt>Saídas</dt><dd>${ul(info.outputs)}</dd>
    <dt>Dependências</dt><dd>${info.deps.length ? ul(info.deps) : '<span class="muted">—</span>'}</dd>
    <dt>Perguntas em aberto</dt><dd>${ul(info.questions)}</dd>
  </dl>`;
}
