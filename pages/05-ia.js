/* Página 5 — Autoria e conversa com IA [DOC-05] */
import { store } from '../assets/js/state.js';
import { stateChip, esc, anchor, chartWidget, academicRef } from '../assets/js/components.js';

export function render() {
  const ctx = store.getContext();

  return `
  <div class="page-head">
    <div class="doc">DOC-05 · IA</div>
    <h2>Autoria e conversa com IA ${anchor('05-ia')}</h2>
    <p class="lead">Fluxo: pergunta → contexto LAL/ETL → proposta analítica → validação → consulta →
    prévia → salvar. A IA acelera, mas não publica sozinha.</p>
  </div>

  <div class="callout">
    <strong>A confirmar.</strong> A execução de consultas, a segurança e o contexto efetivo recebido
    pela IA ainda precisam ser verificados (Q06, Q07). Nada aqui é afirmação sobre o comportamento atual.
  </div>

  <section class="block" id="fluxo">
    <h3>Fluxo de autoria assistida ${anchor('fluxo')}</h3>
    <ol class="small">
      <li>Pergunta em linguagem natural.</li>
      <li>Reunião de contexto no LAL/ETL ${stateChip('verify', 'contexto efetivo a confirmar')}.</li>
      <li>Proposta analítica com medida, agrupamento e filtros entendidos.</li>
      <li>Validação humana explícita (nada é publicado automaticamente).</li>
      <li>Consulta ${stateChip('verify', 'execução a confirmar')} e prévia.</li>
      <li>Salvar análise como objeto reutilizável.</li>
    </ol>
    <p class="small muted">A IA é alimentada pelo contexto semântico do LAL: noção, impacto e relações
    dos símbolos orientam o entendimento da pergunta. O framework de léxico tem base acadêmica
    ${academicRef('framework de LAL')}; já aplicá-lo a um assistente conversacional é uma extensão
    deste projeto — a dissertação (2019) é anterior ao uso de IA generativa.
    ${stateChip('proposed', 'uso do LAL com IA')}</p>
  </section>

  <section class="block" id="conversa">
    <h3>Conversa simulada ${anchor('conversa')}</h3>
    <p class="sub">Demonstra pergunta ambígua, pedido de esclarecimento e a distinção entre explicar o
    resultado atual e executar uma nova análise.</p>

    <div class="chat">
      <div class="thread">
        <div class="bubble user"><div class="who">Usuário</div>Mostra a evolução por aqui.</div>

        <div class="bubble ai clarify">
          <div class="who">Assistente · esclarecimento</div>
          “Por aqui” é ambíguo. Você quer dizer por <strong>região</strong> ou por
          <strong>período</strong>? E qual recorte de tempo?
        </div>

        <div class="bubble user"><div class="who">Usuário</div>Por região, últimos 6 meses.</div>

        <div class="bubble ai">
          <div class="who">Assistente · proposta analítica</div>
          Entendi. Proponho uma série temporal agrupada por região. Veja o entendimento ao lado antes
          de executar. <span class="small muted">(Sem confiança percentual inventada.)</span>
        </div>

        <div class="btn-row" style="margin-top:4px">
          <button class="btn small" type="button" data-sim="ajustar">Ajustar</button>
          <button class="btn small primary" type="button" data-sim="salvar">Salvar análise</button>
          <button class="btn small" type="button" data-sim="add">Adicionar à publicação</button>
        </div>
        <p class="small muted" data-sim-out aria-live="polite"></p>
      </div>

      <div class="thread">
        <div class="understanding">
          <strong class="small">O que a IA entendeu</strong>
          <div class="u-row"><span class="u-k">Medida</span><span>contagem (demo)</span></div>
          <div class="u-row"><span class="u-k">Agrupamento</span><span>região, semana</span></div>
          <div class="u-row"><span class="u-k">Filtros</span><span>${ctx.filters.map((f) => esc(f.k + ': ' + f.v)).join(' · ')}</span></div>
          <div class="u-row"><span class="u-k">Fonte conceitual</span><span>${esc(ctx.chart.source)}</span></div>
          <p class="small muted" style="margin:10px 0 0">Distinção: <em>explicar</em> o resultado atual
          é diferente de <em>executar</em> uma nova análise. A execução depende de verificação (Q07).</p>
        </div>
        <div style="margin-top:14px">${chartWidget(ctx.chart)}</div>
      </div>
    </div>

    <div class="callout proposed" style="margin-top:16px">
      <strong>Convergência (PR-02).</strong> O resultado da conversa é a <em>mesma</em> definição de
      análise que seria criada manualmente — mesmo objeto salvo, mesmo formato de contrato ilustrativo.
    </div>
  </section>`;
}

export function afterRender(root) {
  const out = root.querySelector('[data-sim-out]');
  const msg = {
    ajustar: 'Simulação: painel de ajuste abriria para refinar medida, agrupamento e filtros. Nada foi alterado.',
    salvar: 'Simulação: análise salva localmente como objeto reutilizável. Nenhuma persistência em backend.',
    add: 'Simulação: referência da análise adicionada a uma publicação. Publicação não é automática.',
  };
  root.querySelectorAll('[data-sim]').forEach((b) =>
    b.addEventListener('click', () => { if (out) out.textContent = msg[b.getAttribute('data-sim')] || ''; }));
}
