/* Página 9 — Roadmap e aceite [DOC-09] */
import { ROADMAP } from '../assets/js/data.js';
import { reqPill, esc, anchor, academicRef } from '../assets/js/components.js';

export function render() {
  return `
  <div class="page-head">
    <div class="doc">DOC-09 · Roadmap e aceite</div>
    <h2>Roadmap e aceite ${anchor('09-roadmap')}</h2>
    <p class="lead">Etapas organizadas por dependências, não por datas. Critérios de aceite verificáveis
    com IDs relacionados.</p>
  </div>

  <div class="callout">
    Sem datas inventadas. A sequência é guiada por dependências técnicas: cada etapa só é plenamente
    verificável quando a anterior entrega seus insumos.
  </div>

  <section class="block">
    <div class="timeline">
      ${ROADMAP.map((e) => `
        <div class="tl-step" id="${esc(e.id)}">
          <h4><code>${esc(e.id)}</code> · ${esc(e.title)} ${anchor(e.id)}</h4>
          <p class="deps"><strong>Dependências:</strong> ${esc(e.deps)}</p>
          <p class="small"><strong>Critério de aceite:</strong> ${esc(e.accept)}</p>
          <div class="btn-row">${e.reqs.map(reqPill).join(' ')}</div>
        </div>`).join('')}
    </div>
  </section>

  <section class="block">
    <h3>Critérios de aceite da apresentação</h3>
    <ul class="small">
      <li>Fica evidente o que é atual, proposto e desconhecido.</li>
      <li>Papéis de LAL, ETL e Observatório estão separados.</li>
      <li>Superset não aparece como executor já escolhido.</li>
      <li>Cada recomendação tem indicação prática de implementação.</li>
      <li>Componentes e jornadas têm IDs e referências navegáveis.</li>
      <li>Autoria manual e com IA convergem para a mesma análise.</li>
      <li>A publicação é demonstrável sem chamadas externas.</li>
      <li>O diagnóstico permanece preenchível sem respostas inventadas.</li>
      <li>A demonstração alterna entre dois contextos fictícios sem página à parte.</li>
      <li>Funciona localmente, com instruções de execução no README.</li>
    </ul>
    <p class="small muted" style="margin-top:10px">O LAL preservado (PR-08) é o descrito
    academicamente na dissertação que fundamenta o modelo. ${academicRef('LAL preservado (PR-08)')}</p>
  </section>`;
}
