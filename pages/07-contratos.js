/* Página 7 — Contratos ilustrativos [DOC-06] */
import { CONTRACTS } from '../assets/js/data.js';
import { legend, stateChip, esc, anchor } from '../assets/js/components.js';

export function render() {
  return `
  <div class="page-head">
    <div class="doc">DOC-06 · Contratos</div>
    <h2>Contratos ilustrativos ${anchor('07-contratos')}</h2>
    <p class="lead">Formatos propostos para discussão. Não usam nomes de rotas como se já existissem.</p>
  </div>

  ${legend()}

  <div class="callout danger">
    <strong>Atenção.</strong> Estes são contratos <em>ilustrativos</em>, não executáveis. Nenhum
    identificador aqui corresponde a uma rota real da aplicação. Dados de demonstração não equivalem a
    contratos de produção.
  </div>

  ${CONTRACTS.map((c) => `
    <section class="block" id="${esc(c.id)}">
      <div class="row" style="justify-content:space-between">
        <h3 style="margin:0">${esc(c.title)} ${anchor(c.id)}</h3>
        ${stateChip(c.state)}
      </div>
      <p class="sub">${esc(c.note)}</p>
      <details class="collapsible">
        <summary>Ver estrutura ilustrativa</summary>
        <div class="cbody"><pre>${esc(c.body)}</pre></div>
      </details>
    </section>`).join('')}

  <section class="block">
    <h3>Regras de leitura dos contratos</h3>
    <ul class="small">
      <li><code>provider</code> não determina automaticamente permissão.</li>
      <li><code>visibility</code> não equivale a autorização de publicação.</li>
      <li>Estes tipos não descrevem todos os campos necessários à produção.</li>
    </ul>
  </section>`;
}
