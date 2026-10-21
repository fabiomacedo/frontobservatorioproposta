/* =========================================================================
   data.js — Catálogo de configuração por contexto do Observatório (demo).
   ---------------------------------------------------------------------------
   TUDO AQUI É FICTÍCIO. Números sintéticos, coerentes apenas na demonstração.
   Sem rede, sem APIs, sem Superset real: os recursos "superset_demo" são
   ilustrativos (sem iframe/token). Nenhuma sincronização com Superset.

   Estrutura (design seções b, c, d, i):
     APP        -> identidade neutra de nível de aplicação + usuário.
     CONTEXTS   -> dois contextos de MESMA forma: 'acad' e 'entrevistas'.
     datasets   -> tabelas-base determinísticas por contexto (fonte do runQuery).
     FAKE_CLOCK -> timestamps fictícios pré-formatados (sem Date).
     fmtInt/fmtPct/fmtValue -> helpers de formatação (assinaturas preservadas).
   ========================================================================= */

/* Identidade de nível de aplicação (marca neutra + usuário). NÃO por contexto. */
export const APP = {
  name: 'Observatório',
  tagline: 'Demonstração · dados fictícios · armazenamento local',
  user: { name: 'Ana Moreira', role: 'Analista institucional', initials: 'AM' },
};

/* -------------------------------------------------------------------------
   Datasets-base determinísticos por contexto.
   Cada linha é um fato; runQuery (query.js) filtra/agrupa/calcula sobre elas.
   NENHUMA aleatoriedade; mesmos números a cada leitura (NFR-2).
   ------------------------------------------------------------------------- */

/* Contexto A — acadêmico: linhas por campus × modalidade × período.
   Colunas de fato: matriculas, ingressantes, evadidos, concluintes,
   ingressantes_cota, matriculas_inicio, ingressantes_coorte. */
function buildAcadDataset() {
  const campi = ['Rio de Janeiro', 'Nilópolis', 'Volta Redonda'];
  const modalidades = ['Técnico integrado', 'Graduação', 'Pós-graduação'];
  const periods = ['2024.1', '2024.2', '2025.1', '2025.2', '2026.1'];

  // Bases determinísticas por (campus, modalidade); o período aplica um
  // incremento fixo e coerente. Sem random: tudo derivado de tabelas fixas.
  const baseMatriculas = {
    'Rio de Janeiro|Técnico integrado': 820,
    'Rio de Janeiro|Graduação': 940,
    'Rio de Janeiro|Pós-graduação': 360,
    'Nilópolis|Técnico integrado': 640,
    'Nilópolis|Graduação': 520,
    'Nilópolis|Pós-graduação': 240,
    'Volta Redonda|Técnico integrado': 510,
    'Volta Redonda|Graduação': 430,
    'Volta Redonda|Pós-graduação': 180,
  };
  // Incremento fixo por índice de período (crescimento determinístico).
  const periodBump = [0, 40, 85, 130, 180];

  const rows = [];
  for (const campus of campi) {
    for (const modalidade of modalidades) {
      const base = baseMatriculas[`${campus}|${modalidade}`];
      for (let pi = 0; pi < periods.length; pi++) {
        const matriculas = base + periodBump[pi];
        const matriculas_inicio = base + periodBump[pi] + 60; // início > ativas
        const ingressantes = Math.round(base * 0.18) + pi * 3;
        const ingressantes_coorte = ingressantes + 20;
        const evadidos = Math.round(matriculas_inicio * 0.11) + (pi % 2);
        const concluintes = Math.round(ingressantes_coorte * 0.62) + pi;
        const ingressantes_cota = Math.round(ingressantes * 0.45);
        // Ampla concorrência = complemento dos ingressantes por cota (distribuição exaustiva).
        const ingressantes_ampla = ingressantes - ingressantes_cota;
        rows.push({
          campus,
          modalidade,
          periodo: periods[pi],
          matriculas,
          ingressantes,
          evadidos,
          concluintes,
          ingressantes_cota,
          ingressantes_ampla,
          matriculas_inicio,
          ingressantes_coorte,
        });
      }
    }
  }
  return rows;
}

/* Contexto B — entrevistas: linhas por território × equipe × período.
   Colunas de fato: previstas, realizadas, agendada, recusada, pendente.
   (realizada = coluna 'realizadas' para a distribuição de status.)
   A distribuição "status de entrevista" é a FIXTURE NÃO-EXATA pinada: ao
   somar sobre o recorte semente completo ela reduz a {5,3,3,1} normalizada
   — ver seedAnalysis 'status' e fixtureStatusCounts abaixo. */
function buildEntrevistasDataset() {
  const territorios = ['Zona Norte', 'Baixada', 'Litoral'];
  const equipes = ['Equipe A', 'Equipe B'];
  const periods = ['2025-T3', '2025-T4', '2026-T1'];

  // Bases determinísticas por (território, equipe).
  const basePrevistas = {
    'Zona Norte|Equipe A': 40,
    'Zona Norte|Equipe B': 32,
    'Baixada|Equipe A': 28,
    'Baixada|Equipe B': 24,
    'Litoral|Equipe A': 20,
    'Litoral|Equipe B': 16,
  };
  const periodBump = [0, 6, 12];

  const rows = [];
  for (const territorio of territorios) {
    for (const equipe of equipes) {
      const base = basePrevistas[`${territorio}|${equipe}`];
      for (let pi = 0; pi < periods.length; pi++) {
        const previstas = base + periodBump[pi];
        const realizadas = Math.round(previstas * 0.72);
        const agendada = Math.round(previstas * 0.14);
        const recusada = Math.round(previstas * 0.09);
        const pendente = Math.max(0, previstas - realizadas - agendada - recusada);
        rows.push({
          territorio,
          equipe,
          periodo: periods[pi],
          previstas,
          realizadas,
          agendada,
          recusada,
          pendente,
        });
      }
    }
  }
  return rows;
}

export const datasets = {
  acad: buildAcadDataset(),
  entrevistas: buildEntrevistasDataset(),
};

/* -------------------------------------------------------------------------
   FIXTURE NÃO-EXATA pinada (design (b) rev-iter2 #7).
   Distribuição "status de entrevista": contagens inteiras {5,3,3,1}/12,
   percentuais ingênuos 41,67/25/25/8,33. runQuery reconcilia pelo método do
   maior resto para {42,25,25,8} (soma exatamente 100). Exposta para que o
   seedAnalysis de status do contexto B use esta fixture fixa (não o dataset
   agregado, cuja soma varia), garantindo o caminho de reconciliação não-vácuo.
   ------------------------------------------------------------------------- */
export const fixtureStatusCounts = { agendada: 5, realizada: 3, recusada: 3, pendente: 1 };

/* -------------------------------------------------------------------------
   Relógio fictício (design (a) rev-iter2 #8).
   Array módulo-constante de strings já formatadas, em ordem cronológica
   fictícia CRESCENTE. fakeStamp() (store.js, FEAT-002) lê por clockSeq % N.
   Sem new Date()/aritmética de data: determinístico e sem timezone.
   ------------------------------------------------------------------------- */
export const FAKE_CLOCK = [
  '10/03/2026 14:20 (data fictícia)',
  '10/03/2026 15:05 (data fictícia)',
  '11/03/2026 09:12 (data fictícia)',
  '11/03/2026 10:48 (data fictícia)',
  '12/03/2026 08:30 (data fictícia)',
  '12/03/2026 13:17 (data fictícia)',
  '13/03/2026 09:55 (data fictícia)',
  '13/03/2026 16:40 (data fictícia)',
  '14/03/2026 11:05 (data fictícia)',
  '14/03/2026 17:22 (data fictícia)',
  '15/03/2026 10:10 (data fictícia)',
  '16/03/2026 09:00 (data fictícia)',
  '16/03/2026 14:35 (data fictícia)',
  '17/03/2026 08:48 (data fictícia)',
];

/* -------------------------------------------------------------------------
   CONTEXTS — dois contextos de MESMA forma (design (c)).
   ------------------------------------------------------------------------- */
export const CONTEXTS = {
  /* ===================== A — Panorama acadêmico (IFRJ) ===================== */
  acad: {
    id: 'acad',
    label: 'Panorama acadêmico',
    identity: {
      brandMark: 'IFRJ',
      brandName: 'Panorama acadêmico',
      subtitle: 'Instituto Federal do Rio de Janeiro (fictício)',
    },
    palette: {
      accent: '#0a7d3c',
      series: ['#0a7d3c', '#2f8fd6', '#c98a1b', '#8457c9', '#c0504d'],
    },
    periods: ['2024.1', '2024.2', '2025.1', '2025.2', '2026.1'],
    measures: [
      {
        key: 'matriculas',
        label: 'Matrículas ativas',
        kind: 'total',
        unit: 'matrículas',
        appliesTo: ['campus', 'modalidade', 'periodo'],
        lexicon: 'Matrículas ativas',
      },
      {
        key: 'ingressantes',
        label: 'Ingressantes',
        kind: 'total',
        unit: 'ingressantes',
        appliesTo: ['campus', 'modalidade', 'periodo'],
        lexicon: 'Ingressantes',
      },
      {
        key: 'evasao',
        label: 'Taxa de evasão',
        kind: 'rate',
        unit: '%',
        numerator: 'evadidos',
        denominator: 'matriculas_inicio',
        appliesTo: ['campus', 'modalidade', 'periodo'],
        lexicon: 'Taxa de evasão',
      },
      {
        key: 'conclusao',
        label: 'Taxa de conclusão',
        kind: 'rate',
        unit: '%',
        numerator: 'concluintes',
        denominator: 'ingressantes_coorte',
        appliesTo: ['campus', 'modalidade', 'periodo'],
        lexicon: 'Taxa de conclusão',
      },
      {
        key: 'ingresso_cota',
        label: 'Ingresso por cota',
        kind: 'distribution',
        unit: 'ingressantes',
        // Categorias exclusivas e exaustivas da distribuição.
        categories: [
          { key: 'ingressantes_cota', label: 'Por cota' },
          { key: 'ingressantes_ampla', label: 'Ampla concorrência' },
        ],
        appliesTo: ['campus', 'modalidade', 'periodo'],
        lexicon: 'Ingresso por cota',
      },
    ],
    dimensions: [
      { key: 'campus', label: 'Campus' },
      { key: 'modalidade', label: 'Modalidade' },
      { key: 'periodo', label: 'Período' },
    ],
    filters: [
      {
        key: 'campus',
        label: 'Campus',
        options: ['Todos os campi', 'Rio de Janeiro', 'Nilópolis', 'Volta Redonda'],
        clearedTo: 'Todos os campi',
      },
      {
        key: 'periodo',
        label: 'Período',
        options: ['Todos os períodos', '2024.1', '2024.2', '2025.1', '2025.2', '2026.1'],
        clearedTo: 'Todos os períodos',
      },
      {
        key: 'modalidade',
        label: 'Modalidade',
        options: ['Todas', 'Técnico integrado', 'Graduação', 'Pós-graduação'],
        clearedTo: 'Todas',
      },
    ],
    aiScripts: [
      {
        match: ['evas', 'abandon', 'desist'],
        clarify: 'Quer a evasão por campus ou por modalidade?',
        followHint: 'Ex.: "por campus, 2026.1"',
        def: { measure: 'evasao', dimension: 'campus', filters: {}, sort: 'desc' },
        viz: 'bar',
      },
      {
        match: ['matr', 'modalidade', 'cresc', 'evolu'],
        def: { measure: 'matriculas', dimension: 'periodo', filters: {}, sort: 'asc' },
        viz: 'line',
      },
      {
        match: ['campus', 'campi', 'unidade', 'distrib'],
        def: { measure: 'matriculas', dimension: 'campus', filters: {}, sort: 'desc' },
        viz: 'bar',
      },
    ],
    methodology: {
      'Matrículas ativas': {
        notion: 'Vínculo acadêmico vigente de um estudante com um curso no período de referência.',
        formula: 'contagem de vínculos com situação "ativo" no período',
        source: 'Léxico institucional (fictício) · termo "matrícula"',
        relations: ['relaciona-se a "ingressante"', 'agrega em "campus" e "modalidade"'],
      },
      'Ingressantes': {
        notion: 'Estudantes que iniciaram vínculo no período de referência.',
        formula: 'contagem de novos vínculos no período',
        source: 'Léxico institucional (fictício) · termo "ingresso"',
        relations: ['relaciona-se a "coorte de ingresso"'],
      },
      'Taxa de evasão': {
        notion: 'Proporção de estudantes que deixaram o curso sem concluí-lo no intervalo analisado.',
        formula: '(evadidos no período) ÷ (matrículas no início do período) × 100',
        source: 'Léxico institucional (fictício) · termo "evasão"',
        relations: ['oposto conceitual de "retenção"', 'recorta por "modalidade"'],
      },
      'Taxa de conclusão': {
        notion: 'Proporção de ingressantes de uma coorte que concluíram o curso.',
        formula: '(concluintes da coorte) ÷ (ingressantes da coorte) × 100',
        source: 'Léxico institucional (fictício) · termo "conclusão"',
        relations: ['relaciona-se a "coorte de ingresso"'],
      },
      'Ingresso por cota': {
        notion: 'Composição dos ingressantes entre reserva de vagas (cota) e ampla concorrência.',
        formula: 'contagem por forma de ingresso, reconciliada a 100% pelo maior resto',
        source: 'Léxico institucional (fictício) · termo "forma de ingresso"',
        relations: ['categorias mutuamente exclusivas e exaustivas'],
      },
    },
    seedAnalyses: [
      {
        id: 'an-acad-1',
        contextId: 'acad',
        title: 'Matrículas ativas por campus',
        description: 'Comparação do total de matrículas ativas entre campi (dados fictícios).',
        origin: 'manual',
        def: { measure: 'matriculas', dimension: 'campus', filters: {}, sort: 'desc' },
        viz: 'bar',
        semanticRefs: ['Matrículas ativas'],
        meta: { unit: 'matrículas', period: '2026.1', sourceLabel: 'Base acadêmica (fictícia)' },
        createdAt: '10/03/2026 14:20 (data fictícia)',
        updatedAt: '10/03/2026 14:20 (data fictícia)',
      },
      {
        id: 'an-acad-2',
        contextId: 'acad',
        title: 'Evolução das matrículas por período',
        description: 'Série temporal de matrículas ativas (dados fictícios).',
        origin: 'manual',
        def: { measure: 'matriculas', dimension: 'periodo', filters: {}, sort: 'asc' },
        viz: 'line',
        semanticRefs: ['Matrículas ativas'],
        meta: { unit: 'matrículas', period: '2024.1–2026.1', sourceLabel: 'Base acadêmica (fictícia)' },
        createdAt: '11/03/2026 09:12 (data fictícia)',
        updatedAt: '11/03/2026 09:12 (data fictícia)',
      },
      {
        id: 'an-acad-superset',
        contextId: 'acad',
        title: 'Painel acadêmico (Superset — simulado)',
        description: 'Recurso ilustrativo. Integração, autenticação e recursos reais dependem de validação técnica.',
        origin: 'superset_demo',
        def: null,
        viz: 'embed',
        semanticRefs: [],
        meta: { unit: '', period: '', sourceLabel: 'Dashboard Superset (simulado)' },
        createdAt: '12/03/2026 08:30 (data fictícia)',
        updatedAt: '12/03/2026 08:30 (data fictícia)',
      },
    ],
    seedPublication: {
      id: 'pub-acad-1',
      contextId: 'acad',
      title: 'Panorama acadêmico — rascunho',
      description: 'Publicação exemplo (fictícia) do contexto acadêmico.',
      visibility: 'privada',
      draft: {
        blocks: [
          { id: 'b-acad-1', type: 'title', content: 'Panorama acadêmico' },
          { id: 'b-acad-2', type: 'text', content: 'Visão geral das matrículas ativas por campus (dados fictícios).' },
          { id: 'b-acad-3', type: 'chart', analysisId: 'an-acad-1' },
        ],
      },
      publishedSnapshot: null,
    },
    supersetResource: {
      analysisId: 'an-acad-superset',
      label: 'Dashboard Superset (simulado)',
      note: 'Conteúdo incorporado simulado. Integração, autenticação e recursos disponíveis dependem de validação técnica.',
    },
  },

  /* =============== B — Cobertura de entrevistas territorial =============== */
  entrevistas: {
    id: 'entrevistas',
    label: 'Cobertura de entrevistas',
    identity: {
      brandMark: 'PT',
      brandName: 'Programa territorial',
      subtitle: 'Cobertura de entrevistas territorial (fictício)',
    },
    palette: {
      accent: '#15607f',
      series: ['#15607f', '#2aa39a', '#e08a2e', '#9b5aa6', '#b4453f'],
    },
    periods: ['2025-T3', '2025-T4', '2026-T1'],
    measures: [
      {
        key: 'previstas',
        label: 'Entrevistas previstas',
        kind: 'total',
        unit: 'entrevistas',
        appliesTo: ['territorio', 'equipe', 'periodo'],
        lexicon: 'Entrevistas previstas',
      },
      {
        key: 'realizadas',
        label: 'Entrevistas realizadas',
        kind: 'total',
        unit: 'entrevistas',
        appliesTo: ['territorio', 'equipe', 'periodo'],
        lexicon: 'Entrevistas realizadas',
      },
      {
        key: 'taxa_realizacao',
        label: 'Taxa de realização',
        kind: 'rate',
        unit: '%',
        numerator: 'realizadas',
        denominator: 'previstas',
        appliesTo: ['territorio', 'equipe', 'periodo'],
        lexicon: 'Taxa de realização',
      },
      {
        key: 'status_entrevista',
        label: 'Status da entrevista',
        kind: 'distribution',
        unit: 'entrevistas',
        // Categorias exclusivas e exaustivas; usa a FIXTURE pinada {5,3,3,1}.
        categories: [
          { key: 'agendada', label: 'Agendada' },
          { key: 'realizada', label: 'Realizada' },
          { key: 'recusada', label: 'Recusada' },
          { key: 'pendente', label: 'Pendente' },
        ],
        fixture: 'status', // runQuery usa fixtureStatusCounts (não-exata)
        appliesTo: ['territorio', 'equipe', 'periodo'],
        lexicon: 'Status da entrevista',
      },
      {
        key: 'meta_cobertura',
        label: 'Meta de cobertura',
        kind: 'rate',
        unit: '%',
        numerator: 'realizadas',
        denominator: 'previstas',
        appliesTo: ['territorio', 'equipe', 'periodo'],
        lexicon: 'Meta de cobertura',
      },
    ],
    dimensions: [
      { key: 'territorio', label: 'Território/região' },
      { key: 'periodo', label: 'Período' },
      { key: 'equipe', label: 'Equipe' },
    ],
    filters: [
      {
        key: 'territorio',
        label: 'Território',
        options: ['Todos os territórios', 'Zona Norte', 'Baixada', 'Litoral'],
        clearedTo: 'Todos os territórios',
      },
      {
        key: 'periodo',
        label: 'Período',
        options: ['Todos os períodos', '2025-T3', '2025-T4', '2026-T1'],
        clearedTo: 'Todos os períodos',
      },
      {
        key: 'equipe',
        label: 'Equipe',
        options: ['Todas as equipes', 'Equipe A', 'Equipe B'],
        clearedTo: 'Todas as equipes',
      },
    ],
    aiScripts: [
      {
        match: ['realiz', 'taxa', 'cobertura'],
        clarify: 'Quer a taxa de realização por território ou por equipe?',
        followHint: 'Ex.: "por território, 2026-T1"',
        def: { measure: 'taxa_realizacao', dimension: 'territorio', filters: {}, sort: 'desc' },
        viz: 'bar',
      },
      {
        match: ['status', 'agendad', 'recus', 'pendent'],
        def: { measure: 'status_entrevista', dimension: 'territorio', filters: {}, sort: 'desc' },
        viz: 'donut',
      },
      {
        match: ['previst', 'evolu', 'period'],
        def: { measure: 'previstas', dimension: 'periodo', filters: {}, sort: 'asc' },
        viz: 'line',
      },
    ],
    methodology: {
      'Entrevistas previstas': {
        notion: 'Número de entrevistas planejadas para o recorte no período de referência.',
        formula: 'soma das entrevistas planejadas',
        source: 'Plano de campo territorial (fictício)',
        relations: ['base da "taxa de realização"'],
      },
      'Entrevistas realizadas': {
        notion: 'Entrevistas efetivamente realizadas no recorte.',
        formula: 'soma das entrevistas com status "realizada"',
        source: 'Registro de campo (fictício)',
        relations: ['numerador da "taxa de realização"'],
      },
      'Taxa de realização': {
        notion: 'Proporção das entrevistas previstas que foram realizadas.',
        formula: '(realizadas) ÷ (previstas) × 100',
        source: 'Registro de campo (fictício)',
        relations: ['relaciona-se à "meta de cobertura"'],
      },
      'Status da entrevista': {
        notion: 'Composição das entrevistas entre agendada, realizada, recusada e pendente.',
        formula: 'contagem por status, reconciliada a 100% pelo maior resto',
        source: 'Registro de campo (fictício)',
        relations: ['categorias mutuamente exclusivas e exaustivas'],
      },
      'Meta de cobertura': {
        notion: 'Percentual de cobertura alcançado frente ao previsto.',
        formula: '(realizadas) ÷ (previstas) × 100',
        source: 'Plano de campo territorial (fictício)',
        relations: ['relaciona-se à "taxa de realização"'],
      },
    },
    seedAnalyses: [
      {
        id: 'an-ent-1',
        contextId: 'entrevistas',
        title: 'Taxa de realização por território',
        description: 'Comparação da taxa de realização entre territórios (dados fictícios).',
        origin: 'manual',
        def: { measure: 'taxa_realizacao', dimension: 'territorio', filters: {}, sort: 'desc' },
        viz: 'bar',
        semanticRefs: ['Taxa de realização'],
        meta: { unit: '%', period: '2026-T1', sourceLabel: 'Registro de campo (fictício)' },
        createdAt: '13/03/2026 09:55 (data fictícia)',
        updatedAt: '13/03/2026 09:55 (data fictícia)',
      },
      {
        id: 'an-ent-status',
        contextId: 'entrevistas',
        title: 'Status das entrevistas',
        description: 'Distribuição de status (fixture não-exata {5,3,3,1}; percentuais reconciliados).',
        origin: 'manual',
        def: { measure: 'status_entrevista', dimension: 'territorio', filters: {}, sort: 'desc' },
        viz: 'donut',
        semanticRefs: ['Status da entrevista'],
        meta: { unit: 'entrevistas', period: '2026-T1', sourceLabel: 'Registro de campo (fictício)' },
        createdAt: '14/03/2026 11:05 (data fictícia)',
        updatedAt: '14/03/2026 11:05 (data fictícia)',
      },
      {
        id: 'an-ent-superset',
        contextId: 'entrevistas',
        title: 'Painel de cobertura (Superset — simulado)',
        description: 'Recurso ilustrativo. Integração, autenticação e recursos reais dependem de validação técnica.',
        origin: 'superset_demo',
        def: null,
        viz: 'embed',
        semanticRefs: [],
        meta: { unit: '', period: '', sourceLabel: 'Dashboard Superset (simulado)' },
        createdAt: '15/03/2026 10:10 (data fictícia)',
        updatedAt: '15/03/2026 10:10 (data fictícia)',
      },
    ],
    seedPublication: {
      id: 'pub-ent-1',
      contextId: 'entrevistas',
      title: 'Cobertura de entrevistas — rascunho',
      description: 'Publicação exemplo (fictícia) do contexto de entrevistas.',
      visibility: 'privada',
      draft: {
        blocks: [
          { id: 'b-ent-1', type: 'title', content: 'Cobertura de entrevistas' },
          { id: 'b-ent-2', type: 'text', content: 'Distribuição de status das entrevistas (dados fictícios).' },
          { id: 'b-ent-3', type: 'chart', analysisId: 'an-ent-status' },
        ],
      },
      publishedSnapshot: null,
    },
    supersetResource: {
      analysisId: 'an-ent-superset',
      label: 'Dashboard Superset (simulado)',
      note: 'Conteúdo incorporado simulado. Integração, autenticação e recursos disponíveis dependem de validação técnica.',
    },
  },
};

/* -------------------------------------------------------------------------
   Formatação de números no padrão pt-BR (assinaturas preservadas).
   ------------------------------------------------------------------------- */
export const fmtInt = (n) => n.toLocaleString('pt-BR');
export const fmtPct = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
export function fmtValue(v, fmt) { return fmt === 'pct' ? fmtPct(v) : fmtInt(v); }
