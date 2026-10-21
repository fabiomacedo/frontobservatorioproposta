/* =========================================================================
   diagrams.js — Diagramas SVG nativos e interativos (Página 2).
   Linha SÓLIDA = relação informada no relato.
   Linha TRACEJADA = relação proposta ou pendente.
   Todos os rótulos são explícitos. Clique abre detalhes do componente.
   ========================================================================= */

import { esc } from './components.js';

// Metadados clicáveis de cada nó dos diagramas (responsabilidade/E/S/dep/perguntas).
export const NODE_INFO = {
  front: {
    title: 'Frontend (Observatório)', state: 'confirmed',
    resp: 'Interface de consulta e exibição. Hoje consulta a API do ETL.',
    inputs: ['Interação do usuário', 'Respostas da API do ETL'],
    outputs: ['Telas, gráficos e listagens'],
    deps: ['API do ETL'],
    questions: ['Quais endpoints do ETL são consumidos? (Q01)', 'Os filtros são aplicados no front ou no backend? (Q02)'],
  },
  etl: {
    title: 'ETL / API do ETL', state: 'confirmed',
    resp: 'Extrai e transforma dados e associa o léxico às tabelas/campos do datalake. Expõe a API consumida pelo front.',
    inputs: ['Datalake', 'Vínculos com o léxico (LAL)'],
    outputs: ['Respostas de dados para o front'],
    deps: ['Datalake', 'LAL'],
    questions: ['Retorna dados prontos ou aceita medidas/agrupamentos? (Q02)', 'Onde ocorrem agregações e limites? (Q03)'],
  },
  lal: {
    title: 'LAL (Léxico)', state: 'confirmed',
    resp: 'Constrói a semântica dos símbolos dos domínios: noção, impacto, sinônimos, contextos, fontes e relações.',
    inputs: ['Definições de domínio'],
    outputs: ['Símbolos semânticos associáveis aos dados'],
    deps: [],
    questions: ['Como os símbolos são referenciados? Há versionamento consumível? (Q04)', 'O vínculo do ETL inclui fórmulas e relações? (Q05)'],
  },
  datalake: {
    title: 'Datalake', state: 'confirmed',
    resp: 'Armazenamento de dados. Produção e HMG utilizam o mesmo datalake.',
    inputs: ['Fontes de dados (não detalhadas)'],
    outputs: ['Tabelas e campos consumidos pelo ETL'],
    deps: [],
    questions: ['Limites, cache e comportamento em consulta demorada? (Q12)'],
  },
  obsx: {
    title: 'Experiência Observatório (proposta)', state: 'proposed',
    resp: 'Camada de exploração, autoria, interpretação, organização e publicação de análises. Estrutura genérica, conteúdo contextualizado.',
    inputs: ['Análises salvas', 'Entrada do usuário', 'Assistência da IA'],
    outputs: ['Análises, publicações e narrativas'],
    deps: ['Backend (responsabilidade lógica proposta)', 'LAL', 'ETL'],
    questions: ['O que é salvo em uma análise e como editar? (Q08)', 'Como separar rascunho de publicado? (Q11)'],
  },
  backend: {
    title: 'Backend (responsabilidade lógica proposta)', state: 'proposed',
    resp: 'Responsabilidade lógica para persistir análises, publicações e autorização. NÃO implica necessariamente um novo serviço.',
    inputs: ['Definições de análise', 'Configurações de publicação'],
    outputs: ['Objetos salvos e decisões de autorização'],
    deps: ['A definir — pode reusar componentes existentes'],
    questions: ['Autorização de identidade/organização/dados/publicação? (Q10)', 'Dados dinâmicos ou recortes preservados? (Q13)'],
  },
  ia: {
    title: 'Assistente de IA', state: 'verify',
    resp: 'Acelera autoria e interpretação. Comportamento interno, contexto efetivo e execução ainda precisam ser verificados.',
    inputs: ['Pergunta do usuário', 'Contexto LAL/ETL (A CONFIRMAR)'],
    outputs: ['Proposta analítica para validação humana'],
    deps: ['LAL', 'ETL', 'Validação humana'],
    questions: ['Gera SQL, configuração ou outro artefato? Quem valida? (Q06)', 'Recebe resultados reais e executa consultas? (Q07)'],
  },
  superset: {
    title: 'Superset', state: 'verify',
    resp: 'Presente no cenário. Duas possibilidades DISTINTAS: (a) incorporação de análises — PROPOSTA; (b) execução de consultas — EM AVALIAÇÃO.',
    inputs: ['A confirmar'],
    outputs: ['Conteúdo incorporável (proposto)'],
    deps: ['A confirmar'],
    questions: ['Versão do Superset e integrações existentes? (Q09)', 'Papel como executor de consultas? (EM ABERTO)'],
  },
};

// --- helpers SVG ---
function node(id, x, y, w, h, label, cls) {
  const lines = label.split('\n');
  const text = lines.map((ln, i) =>
    `<tspan x="${x + w / 2}" dy="${i === 0 ? 0 : 15}">${esc(ln)}</tspan>`).join('');
  const fill = cls === 'confirmed' ? '#e4f1ea' : cls === 'proposed' ? '#fbeecd' : '#ebe8fb';
  const stroke = cls === 'confirmed' ? '#1a7a4f' : cls === 'proposed' ? '#9a5b00' : '#5b4fc0';
  return `
  <g class="node" data-node="${id}" tabindex="0" role="button"
     aria-label="${esc(label.replace(/\n/g, ' '))}. Clique para detalhes.">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"
          fill="${fill}" stroke="${stroke}" stroke-width="1.6"></rect>
    <text x="${x + w / 2}" y="${y + 24}" text-anchor="middle"
          font-size="12.5" font-weight="600" fill="#111826">${text}</text>
  </g>`;
}

function edge(x1, y1, x2, y2, label, dashed, labelDy = -6) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return `
  <g>
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
          stroke="#51607a" stroke-width="1.6"
          ${dashed ? 'stroke-dasharray="6 5"' : ''} marker-end="url(#arrow)"></line>
    <rect x="${mx - label.length * 3.4 - 6}" y="${my + labelDy - 11}" width="${label.length * 6.8 + 12}" height="18" rx="4" fill="#ffffff" stroke="#d9e0ea"></rect>
    <text x="${mx}" y="${my + labelDy + 2}" text-anchor="middle" font-size="11" fill="#2b3647">${esc(label)}</text>
  </g>`;
}

const defs = `
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#51607a"></path>
    </marker>
  </defs>`;

// Diagrama ATUAL — apenas o que o relato confirma. Front → API do ETL.
export function currentDiagram() {
  return `
  <div class="diagram-wrap">
    <div class="diagram">
      <svg viewBox="0 0 720 300" role="group" aria-label="Diagrama atual">
        ${defs}
        ${node('front', 40, 120, 160, 56, 'Frontend\n(Observatório)', 'confirmed')}
        ${node('etl', 290, 120, 150, 56, 'API do ETL', 'confirmed')}
        ${node('datalake', 530, 40, 150, 56, 'Datalake', 'confirmed')}
        ${node('lal', 530, 200, 150, 56, 'LAL (Léxico)', 'confirmed')}
        ${edge(200, 148, 290, 148, 'consulta', false)}
        ${edge(440, 140, 530, 80, 'lê dados', false)}
        ${edge(440, 156, 530, 220, 'associa léxico', false)}
      </svg>
    </div>
    <p class="diagram-desc">
      <strong>Descrição textual.</strong> O frontend consulta a API do ETL (relação informada).
      O ETL lê dados do datalake e associa o léxico (LAL) às tabelas e campos. Não foi confirmado
      como a API calcula, agrega ou filtra. Todas as linhas aqui são sólidas por refletirem o relato.
    </p>
  </div>`;
}

// Diagrama PROPOSTO de responsabilidades. Sólido = informado; tracejado = proposto/pendente.
export function proposedDiagram() {
  return `
  <div class="diagram-wrap">
    <div class="diagram">
      <svg viewBox="0 0 860 460" role="group" aria-label="Diagrama proposto de responsabilidades">
        ${defs}
        ${node('obsx', 40, 190, 190, 70, 'Experiência\nObservatório\n(proposta)', 'proposed')}
        ${node('ia', 40, 40, 190, 56, 'Assistente de IA', 'verify')}
        ${node('backend', 330, 190, 190, 70, 'Backend\n(resp. lógica\nproposta)', 'proposed')}
        ${node('etl', 620, 40, 190, 56, 'API do ETL', 'confirmed')}
        ${node('lal', 620, 150, 190, 56, 'LAL (Léxico)', 'confirmed')}
        ${node('datalake', 620, 260, 190, 56, 'Datalake', 'confirmed')}
        ${node('superset', 330, 350, 190, 70, 'Superset', 'verify')}

        ${edge(135, 190, 135, 96, 'autoria/interpretação', true, -6)}
        ${edge(230, 215, 330, 215, 'persiste/autoriza', true)}
        ${edge(520, 205, 620, 80, 'consulta dados', true, -6)}
        ${edge(520, 225, 620, 180, 'referência semântica', true, 10)}
        ${edge(715, 96, 715, 150, 'vincula', false)}
        ${edge(715, 206, 715, 260, 'lê', false)}
        ${edge(425, 260, 425, 350, 'incorpora (proposto)', true, -6)}
        ${edge(520, 390, 620, 300, 'executa? (em avaliação)', true, 12)}
      </svg>
    </div>
    <p class="diagram-desc">
      <strong>Descrição textual.</strong> Relações <strong>sólidas</strong> refletem o relato
      (ETL lê do datalake; ETL vincula o LAL). Relações <strong>tracejadas</strong> são propostas ou
      pendentes: a experiência Observatório delega persistência e autorização a uma responsabilidade
      lógica de backend (que não implica novo serviço); a IA acelera autoria sob validação humana;
      o Superset aparece em duas hipóteses distintas — incorporação (proposta) e execução de consultas
      (em avaliação, com rótulo de interrogação). Relação conceitual (referência semântica) está
      separada de fluxo real de chamadas (consulta de dados).
    </p>
  </div>`;
}
