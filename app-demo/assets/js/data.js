/* =========================================================================
   data.js — Dados FICTÍCIOS do Observatório IFRJ (demonstração).
   Nada aqui é real. Números são sintéticos e coerentes apenas na demo.
   IFRJ = Instituto Federal de Educação, Ciência e Tecnologia do Rio de Janeiro.
   ========================================================================= */

export const ORG = {
  name: 'Observatório IFRJ',
  full: 'Instituto Federal do Rio de Janeiro',
  user: { name: 'Ana Moreira', role: 'Analista institucional', initials: 'AM' },
};

// Campi fictícios (nomes reais de localidades, dados 100% sintéticos).
export const CAMPI = [
  'Todos os campi', 'Rio de Janeiro', 'Nilópolis', 'Volta Redonda',
  'Paracambi', 'Mesquita', 'Duque de Caxias', 'São Gonçalo', 'Realengo',
];

export const PERIODS = ['2026.1', '2025.2', '2025.1', '2024.2', '2024.1'];

export const MODALIDADES = ['Todas', 'Técnico integrado', 'Técnico subsequente', 'Graduação', 'Pós-graduação'];

// KPIs de visão geral (fictícios).
export const KPIS = [
  { id: 'matriculas', label: 'Matrículas ativas', value: 18420, fmt: 'int', delta: +3.4, spark: [164,168,171,175,179,181,184] },
  { id: 'ingressantes', label: 'Ingressantes no período', value: 3127, fmt: 'int', delta: +6.1, spark: [26,27,28,29,30,30,31] },
  { id: 'evasao', label: 'Taxa de evasão', value: 11.8, fmt: 'pct', delta: -0.9, good: 'down', spark: [13.1,12.9,12.6,12.3,12.1,12.0,11.8] },
  { id: 'conclusao', label: 'Taxa de conclusão', value: 68.2, fmt: 'pct', delta: +1.7, spark: [64,65,65.5,66.4,67,67.5,68.2] },
];

// Série temporal: matrículas por período (fictícia).
export const SERIES_MATRICULAS = {
  labels: ['2024.1', '2024.2', '2025.1', '2025.2', '2026.1'],
  datasets: [
    { name: 'Técnico integrado', color: 'var(--chart-1)', data: [6100, 6240, 6380, 6520, 6710] },
    { name: 'Técnico subsequente', color: 'var(--chart-2)', data: [3200, 3180, 3260, 3340, 3410] },
    { name: 'Graduação', color: 'var(--chart-3)', data: [4800, 4920, 5010, 5180, 5320] },
    { name: 'Pós-graduação', color: 'var(--chart-4)', data: [2600, 2710, 2780, 2900, 2980] },
  ],
};

// Matrículas por campus (fictício) — para barras.
export const POR_CAMPUS = [
  { campus: 'Rio de Janeiro', valor: 4120 },
  { campus: 'Nilópolis', valor: 3010 },
  { campus: 'Volta Redonda', valor: 2480 },
  { campus: 'Duque de Caxias', valor: 1990 },
  { campus: 'Paracambi', valor: 1560 },
  { campus: 'Realengo', valor: 1740 },
  { campus: 'São Gonçalo', valor: 1720 },
  { campus: 'Mesquita', valor: 1800 },
];

// Evasão por curso (fictício) — tabela.
export const EVASAO_CURSO = [
  { curso: 'Informática (Integrado)', campus: 'Rio de Janeiro', evasao: 8.2, matriculas: 820 },
  { curso: 'Química (Integrado)', campus: 'Nilópolis', evasao: 9.6, matriculas: 640 },
  { curso: 'Eng. de Produção', campus: 'Volta Redonda', evasao: 14.1, matriculas: 510 },
  { curso: 'Administração (Subsequente)', campus: 'Mesquita', evasao: 18.7, matriculas: 430 },
  { curso: 'Gestão Ambiental', campus: 'Duque de Caxias', evasao: 12.3, matriculas: 380 },
  { curso: 'Fisioterapia', campus: 'Realengo', evasao: 6.9, matriculas: 290 },
  { curso: 'Produção Cultural', campus: 'São Gonçalo', evasao: 15.4, matriculas: 260 },
];

// Catálogo de análises salvas (fictício).
export const CATALOGO = [
  { id: 'an-01', title: 'Matrículas por modalidade', type: 'Série temporal', author: 'Ana Moreira', updated: 'há 2 dias', tag: 'Oficial' },
  { id: 'an-02', title: 'Distribuição por campus', type: 'Barras', author: 'Carlos Dias', updated: 'há 5 dias', tag: 'Oficial' },
  { id: 'an-03', title: 'Evasão por curso', type: 'Tabela', author: 'Ana Moreira', updated: 'há 1 semana', tag: 'Rascunho' },
  { id: 'an-04', title: 'Ingressantes x concluintes', type: 'Linhas', author: 'Marina Souza', updated: 'há 2 semanas', tag: 'Oficial' },
  { id: 'an-05', title: 'Ocupação de vagas', type: 'Indicador', author: 'Carlos Dias', updated: 'há 3 semanas', tag: 'Rascunho' },
  { id: 'an-06', title: 'Perfil de ingresso por cota', type: 'Pizza', author: 'Marina Souza', updated: 'há 1 mês', tag: 'Oficial' },
];

// Definições do léxico (LAL) fictícias, para a gaveta de metodologia.
export const LEXICO = {
  'Matrículas ativas': {
    notion: 'Vínculo acadêmico vigente de um estudante com um curso no período de referência.',
    formula: 'contagem de vínculos com situação "ativo" no período',
    source: 'Léxico institucional IFRJ (fictício) · termo "matrícula"',
    relations: ['relaciona-se a "ingressante"', 'agrega em "curso" e "campus"'],
  },
  'Taxa de evasão': {
    notion: 'Proporção de estudantes que deixaram o curso sem concluí-lo no intervalo analisado.',
    formula: '(evadidos no período) ÷ (matrículas no início do período) × 100',
    source: 'Léxico institucional IFRJ (fictício) · termo "evasão"',
    relations: ['oposto conceitual de "retenção"', 'recorta por "modalidade"'],
  },
  'Taxa de conclusão': {
    notion: 'Proporção de ingressantes de uma coorte que concluíram o curso.',
    formula: '(concluintes da coorte) ÷ (ingressantes da coorte) × 100',
    source: 'Léxico institucional IFRJ (fictício) · termo "conclusão"',
    relations: ['relaciona-se a "coorte de ingresso"'],
  },
};

// Roteiro do assistente de IA (fictício e determinístico).
// Cada cenário: gatilhos (palavras), eventual esclarecimento, e a análise gerada.
export const AI_SCRIPTS = [
  {
    match: ['evas', 'abandon', 'desist'],
    clarify: 'Quer a evasão por <strong>curso</strong> ou por <strong>campus</strong>? E qual período de referência?',
    followHint: 'Ex.: "por curso, 2026.1"',
    result: {
      title: 'Evasão por curso — 2026.1',
      understanding: { medida: 'Taxa de evasão (%)', agrupamento: 'curso', periodo: '2026.1', filtros: 'modalidade: todas', fonte: 'Léxico IFRJ · "evasão" (fictício)' },
      viz: 'evasao-bars',
      note: 'Cursos ordenados da maior para a menor taxa (dados fictícios).',
    },
  },
  {
    match: ['matr', 'modalidade', 'cresc', 'evolu'],
    result: {
      title: 'Matrículas por modalidade ao longo do tempo',
      understanding: { medida: 'Matrículas ativas', agrupamento: 'modalidade, período', periodo: '2024.1–2026.1', filtros: 'campus: todos', fonte: 'Léxico IFRJ · "matrícula" (fictício)' },
      viz: 'matriculas-lines',
      note: 'Série temporal com quatro modalidades (dados fictícios).',
    },
  },
  {
    match: ['campus', 'campi', 'unidade', 'distrib'],
    result: {
      title: 'Matrículas por campus — 2026.1',
      understanding: { medida: 'Matrículas ativas', agrupamento: 'campus', periodo: '2026.1', filtros: 'modalidade: todas', fonte: 'Léxico IFRJ · "matrícula" (fictício)' },
      viz: 'campus-bars',
      note: 'Comparação entre campi (dados fictícios).',
    },
  },
];

export const AI_SUGGESTIONS = [
  'Como está a evasão?',
  'Mostra a evolução das matrículas por modalidade',
  'Compara as matrículas entre os campi',
];

// Formatação de números no padrão pt-BR.
export const fmtInt = (n) => n.toLocaleString('pt-BR');
export const fmtPct = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
export function fmtValue(v, fmt) { return fmt === 'pct' ? fmtPct(v) : fmtInt(v); }
