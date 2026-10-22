/* Página 1 — Visão executiva técnica [DOC-01] */
import { REQUIREMENTS } from '../assets/js/data.js';
import { legend, card, stateChip, esc, anchor, academicRef } from '../assets/js/components.js';

export function render() {
  const reqCards = REQUIREMENTS.map((r) => card({
    pid: r.id, title: r.subject, body: esc(r.desc),
  })).join('');

  return `
  <div class="page-head">
    <div class="doc">DOC-01 · Resumo</div>
    <h2>Visão executiva técnica ${anchor('01-visao-executiva')}</h2>
    <p class="lead">Artefato visual de comunicação e discussão técnica da proposta de evolução do
    Observatório. Esta entrega não é a interface de produção e não se conecta a serviços reais.</p>
  </div>

  ${legend()}

  <div class="callout danger">
    <strong>Destaque.</strong> Não há decisão de adotar um novo motor de consulta. O Superset aparece
    apenas como hipótese de incorporação (proposta) e, separadamente, como possível executor de
    consultas (em avaliação) — nunca como opção já escolhida.
  </div>

  <section class="block">
    <h3>Problema</h3>
    <p class="sub">A interface atual é orientada principalmente à listagem e exibição de dashboards.</p>
    <p>Isso limita a exploração dos dados, a autoria de novas análises, a interpretação contextualizada
    e a publicação de conteúdos sem desenvolvimento dedicado.</p>
  </section>

  <section class="block">
    <h3>Mudança proposta</h3>
    <p>Evoluir para uma plataforma genérica de <strong>exploração, criação, interpretação, organização
    e publicação</strong> de análises. A estrutura é genérica; a comunicação de cada conteúdo é
    contextualizada. A IA acelera autoria e interpretação sem substituir clareza, governança e
    consistência visual.</p>
  </section>

  <section class="block">
    <h3>Preservações e não objetivos</h3>
    <div class="row" style="align-items:stretch">
      <div class="callout confirmed" style="flex:1;min-width:260px">
        <strong>Preservar.</strong> LAL, ETL e as APIs existentes. A evolução reaproveita o
        investimento; não reconstrói o produto.
      </div>
      <div class="callout" style="flex:1;min-width:260px">
        <strong>Não objetivos.</strong> Não é a interface de produção; não conecta a serviços reais;
        não decide motor de consulta; não define papéis organizacionais definitivos.
      </div>
    </div>
  </section>

  <section class="block" id="ferramentas">
    <h3>As três ferramentas ${anchor('ferramentas')}</h3>
    <p class="sub">Papéis separados, conforme confirmado por relato.</p>
    <div class="cards">
      <div class="card tool-card lal">
        <span class="pid">LAL</span>
        <h5>Léxico</h5>
        <p>Constrói a semântica dos símbolos dos domínios: noção, impacto, sinônimos, contextos,
        fontes e relações.</p>
        ${stateChip('confirmed', 'por relato')}
        <p class="small muted" style="margin:8px 0 0">O conceito de LAL (Léxico Ampliado de Linguagem)
        tem base na dissertação de mestrado do autor (UFRRJ, 2019).</p>
        ${academicRef('conceito de LAL')}
      </div>
      <div class="card tool-card etl">
        <span class="pid">ETL</span>
        <h5>Extração e vínculo</h5>
        <p>Extrai e transforma dados e associa o léxico às tabelas e campos do datalake. O frontend
        atual consulta a API do ETL.</p>
        ${stateChip('confirmed', 'por relato')}
        <p class="small muted" style="margin:8px 0 0">Acoplar o léxico à camada de dados tem base
        acadêmica ${academicRef('LAL acoplado ao datamart')}: na dissertação (2019) o LAL vira um
        datamart próprio, ligado ao datamart de negócio pela dimensão de símbolo. Aqui é a mesma ideia
        transposta do datamart relacional para o datalake. ${stateChip('proposed', 'léxico sobre datalake')}</p>
      </div>
      <div class="card tool-card obs">
        <span class="pid">Observatório</span>
        <h5>Experiência</h5>
        <p>Consulta, cria, interpreta, organiza e publica análises. Deve atender diferentes contextos
        de dados. Criação com IA e conversa com os dados são capacidades centrais.</p>
        ${stateChip('confirmed', 'por relato')}
      </div>
    </div>
    <p class="small muted" style="margin-top:12px">
      Confirmado por relato não significa auditado em código. Não foi confirmado como a API do ETL
      calcula, agrega ou filtra os dados.
    </p>
  </section>

  <section class="block" id="requisitos">
    <h3>Requisitos rastreáveis ${anchor('requisitos')}</h3>
    <p class="sub">Identificadores PR-01 a PR-10 usados em toda a apresentação. Links diretos por hash.</p>
    <div class="cards">${reqCards}</div>
  </section>`;
}
