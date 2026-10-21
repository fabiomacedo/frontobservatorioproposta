/* =========================================================================
   data.js — Dados FICTÍCIOS e catálogos de rastreabilidade.
   NADA aqui descreve a implementação real. Rotas, payloads e entidades são
   PROPOSTAS ou ILUSTRATIVAS. Números são coerentes apenas dentro da demo.
   ========================================================================= */

// Estados de evidência — rótulo + glifo (forma/texto) + classe de cor.
// A cor NUNCA é o único indicador: sempre acompanha rótulo e glifo.
export const STATES = {
  confirmed: { key: 'confirmed', label: 'Confirmado por relato', glyph: '●', cls: 'confirmed' },
  proposed:  { key: 'proposed',  label: 'Proposto',              glyph: '◆', cls: 'proposed' },
  verify:    { key: 'verify',    label: 'A confirmar',           glyph: '?', cls: 'verify' },
};

// Requisitos PR-01..PR-10 (âncoras de rastreabilidade).
export const REQUIREMENTS = [
  { id: 'PR-01', subject: 'Contexto compreensível dos dados',
    desc: 'Todo número exibido traz unidade, período, fonte e definição associada ao LAL.' },
  { id: 'PR-02', subject: 'Autoria manual e com IA',
    desc: 'Criar análises à mão ou via assistente, convergindo para a mesma definição.' },
  { id: 'PR-03', subject: 'Análises salvas e reutilizáveis',
    desc: 'Uma análise vira objeto nomeado, reaproveitável em catálogo e publicações.' },
  { id: 'PR-04', subject: 'Catálogo e histórias visuais complementares',
    desc: 'Navegar por análises salvas e compor narrativas temáticas sobre elas.' },
  { id: 'PR-05', subject: 'Consistência visual e metadados',
    desc: 'Mesma linguagem visual e metadados mínimos em todos os conteúdos.' },
  { id: 'PR-06', subject: 'Composição e publicação sem código específico',
    desc: 'Montar e publicar páginas por configuração, sem desenvolvimento dedicado.' },
  { id: 'PR-07', subject: 'Autorização independente da interface',
    desc: 'Quem pode consultar, editar, compor, publicar e consumir é decidido fora da UI.' },
  { id: 'PR-08', subject: 'Preservação de LAL, ETL e APIs existentes',
    desc: 'Evoluir reaproveitando o investimento; não reconstruir o produto.' },
  { id: 'PR-09', subject: 'Incorporação de conteúdo Superset',
    desc: 'Exibir análises do Superset dentro do Observatório de forma proposta.' },
  { id: 'PR-10', subject: 'Generalização validada em segundo contexto',
    desc: 'A mesma estrutura funciona em um segundo domínio fictício sem telas à parte.' },
];

export const reqById = (id) => REQUIREMENTS.find((r) => r.id === id);

// Documentos locais DOC-01..DOC-09 (âncoras de navegação, não citações).
export const DOCS = [
  { id: 'DOC-01', title: 'Resumo',              page: '01-visao-executiva' },
  { id: 'DOC-02', title: 'Arquitetura',         page: '02-arquitetura' },
  { id: 'DOC-03', title: 'Jornadas',            page: '03-jornadas' },
  { id: 'DOC-04', title: 'Componentes',         page: '04-laboratorio' },
  { id: 'DOC-05', title: 'IA',                  page: '05-ia' },
  { id: 'DOC-06', title: 'Contratos',           page: '07-contratos' },
  { id: 'DOC-07', title: 'Segurança',           page: '08-seguranca-diagnostico' },
  { id: 'DOC-08', title: 'Diagnóstico',         page: '08-seguranca-diagnostico' },
  { id: 'DOC-09', title: 'Roadmap e aceite',    page: '09-roadmap' },
];

// ---------------------------------------------------------------------------
// Dois CONTEXTOS fictícios para demonstrar generalização (PR-10).
// A mesma estrutura de componentes é alimentada por qualquer um deles.
// ---------------------------------------------------------------------------
export const CONTEXTS = {
  mobilidade: {
    key: 'mobilidade',
    name: 'Contexto fictício A — Mobilidade urbana',
    datasetLabel: 'Viagens monitoradas (demo)',
    datasets: ['Viagens monitoradas (demo)', 'Pontos de embarque (demo)', 'Incidentes de via (demo)'],
    source: 'Fonte conceitual: léxico LAL "Mobilidade" (fictício)',
    numericSource: 'Fonte dos números: conjunto sintético gerado para a demo',
    metric: { value: '18,4 mil', label: 'Viagens / dia (demo)', delta: '+4,2%', dir: 'up' },
    chart: {
      title: 'Viagens monitoradas por semana',
      unit: 'viagens/semana', period: 'Jan–Jun (fictício)',
      source: 'Léxico LAL "Mobilidade" (conceitual)', updated: 'atualizado há 3 h (demo)',
      series: [120, 138, 131, 150, 162, 158, 171, 168, 180, 176, 190, 184],
    },
    filters: [
      { k: 'Período', v: '6 meses' }, { k: 'Região', v: 'Zona central' }, { k: 'Modo', v: 'Coletivo' },
    ],
    definition: {
      term: 'Viagem monitorada',
      notion: 'Deslocamento individual registrado por um ponto de captura (definição fictícia).',
      impact: 'Indicador de demanda e cobertura da rede.',
      synonyms: ['trajeto monitorado', 'deslocamento registrado'],
      relations: ['vincula-se a "Ponto de embarque"', 'agrega em "Linha"'],
    },
    catalog: [
      { id: 'an-mob-01', title: 'Demanda semanal por região', type: 'visualization' },
      { id: 'an-mob-02', title: 'Pontos com maior saturação', type: 'visualization' },
      { id: 'an-mob-03', title: 'Síntese de cobertura', type: 'metric' },
    ],
  },
  saude: {
    key: 'saude',
    name: 'Contexto fictício B — Atenção à saúde',
    datasetLabel: 'Atendimentos registrados (demo)',
    datasets: ['Atendimentos registrados (demo)', 'Unidades ativas (demo)', 'Encaminhamentos (demo)'],
    source: 'Fonte conceitual: léxico LAL "Saúde" (fictício)',
    numericSource: 'Fonte dos números: conjunto sintético gerado para a demo',
    metric: { value: '9,7 mil', label: 'Atendimentos / dia (demo)', delta: '-1,8%', dir: 'down' },
    chart: {
      title: 'Atendimentos registrados por semana',
      unit: 'atendimentos/semana', period: 'Jan–Jun (fictício)',
      source: 'Léxico LAL "Saúde" (conceitual)', updated: 'atualizado há 5 h (demo)',
      series: [88, 95, 92, 101, 99, 110, 104, 112, 108, 118, 114, 121],
    },
    filters: [
      { k: 'Período', v: '6 meses' }, { k: 'Nível', v: 'Atenção básica' }, { k: 'Faixa', v: 'Adultos' },
    ],
    definition: {
      term: 'Atendimento registrado',
      notion: 'Evento de assistência vinculado a uma unidade e a um profissional (definição fictícia).',
      impact: 'Indicador de volume e capilaridade da atenção.',
      synonyms: ['consulta registrada', 'contato assistencial'],
      relations: ['vincula-se a "Unidade ativa"', 'agrega em "Território"'],
    },
    catalog: [
      { id: 'an-sau-01', title: 'Volume semanal por nível', type: 'visualization' },
      { id: 'an-sau-02', title: 'Unidades com maior demanda', type: 'visualization' },
      { id: 'an-sau-03', title: 'Síntese de capilaridade', type: 'metric' },
    ],
  },
};

export const CONTEXT_KEYS = Object.keys(CONTEXTS);

// ---------------------------------------------------------------------------
// Jornadas / modos (Página 3). Modo de uso ≠ autorização.
// ---------------------------------------------------------------------------
export const JOURNEYS = {
  Explorar: [
    { user: 'Analista', action: 'Seleciona contexto e conjunto', component: 'Cabeçalho de contexto', integration: 'API do ETL (A CONFIRMAR como consulta)', accept: 'Contexto e fonte visíveis no topo', state: 'verify' },
    { user: 'Analista', action: 'Aplica filtros', component: 'Filtros ativos', integration: 'Parâmetros aceitos? (A CONFIRMAR)', accept: 'Filtros refletidos no gráfico e removíveis', state: 'verify' },
  ],
  Criar: [
    { user: 'Autor', action: 'Define medida, agrupamento e filtros', component: 'Editor de análise', integration: 'Definição salva como objeto (PROPOSTO)', accept: 'Análise nomeada e reabrível', state: 'proposed' },
    { user: 'Autor', action: 'Pré-visualiza resultado', component: 'Contêiner de gráfico', integration: 'Execução de consulta (A CONFIRMAR)', accept: 'Prévia coerente com a definição', state: 'verify' },
  ],
  Conversar: [
    { user: 'Autor', action: 'Faz uma pergunta em linguagem natural', component: 'Assistente IA', integration: 'Contexto LAL/ETL efetivo (A CONFIRMAR)', accept: 'Entendimento explícito antes de executar', state: 'verify' },
    { user: 'Autor', action: 'Valida a proposta analítica', component: 'Painel de entendimento', integration: 'Validação humana (PROPOSTO)', accept: 'Nada é publicado automaticamente', state: 'proposed' },
  ],
  Organizar: [
    { user: 'Curador', action: 'Agrupa análises no catálogo', component: 'Card de catálogo', integration: 'Referência por ID (PROPOSTO)', accept: 'Mesma análise referenciada em vários lugares', state: 'proposed' },
  ],
  Publicar: [
    { user: 'Editor', action: 'Compõe blocos e publica', component: 'Compositor', integration: 'Publicação simulada (sem backend)', accept: 'Autorização verificada fora da UI (PR-07)', state: 'proposed' },
  ],
  Consumir: [
    { user: 'Leitor', action: 'Abre uma publicação', component: 'Publicação renderizada', integration: 'Visibilidade ≠ autorização (A CONFIRMAR)', accept: 'Acesso negado tratado com estado próprio', state: 'verify' },
  ],
};

// ---------------------------------------------------------------------------
// Componentes do laboratório (Página 4) — detalhes técnicos ILUSTRATIVOS.
// ---------------------------------------------------------------------------
export const LAB_COMPONENTS = [
  {
    id: 'CMP-ctx-header', name: 'Cabeçalho de contexto + seletor de conjunto', pr: 'PR-01', state: 'proposed',
    resp: 'Fixar, no topo, o contexto ativo, o conjunto de dados e a fonte conceitual.',
    props: ['context: string', 'datasets: string[]', 'activeDataset: string', 'source: string'],
    events: ['onChangeDataset(datasetId)'],
    data: ['Rótulo do contexto', 'Lista de conjuntos (fictícia)', 'Fonte conceitual (LAL)'],
    deps: ['Estado de contexto global', 'Catálogo de conjuntos (A CONFIRMAR)'],
    tests: ['Troca de conjunto emite evento', 'Fonte sempre visível', 'Navegável por teclado'],
    note: 'Ilustrativo. Os conjuntos reais e sua origem ainda precisam ser verificados.',
  },
  {
    id: 'CMP-catalog-card', name: 'Card de catálogo', pr: 'PR-03', state: 'proposed',
    resp: 'Representar uma análise salva, reutilizável por referência.',
    props: ['analysisId: string', 'title: string', 'type: text|metric|visualization', 'provider: etl_api|superset|unspecified'],
    events: ['onOpen(analysisId)', 'onAddToPublication(analysisId)'],
    data: ['Análise fictícia', 'Tipo', 'Provedor ilustrativo'],
    deps: ['Objeto AnalysisReference (ilustrativo)'],
    tests: ['Mesma análise aparece em catálogo e publicação', 'Rótulo de provedor não implica permissão'],
    note: 'provider é ilustrativo e NÃO determina permissão (ver PR-07).',
  },
  {
    id: 'CMP-metric', name: 'Indicador de síntese', pr: 'PR-01', state: 'proposed',
    resp: 'Exibir um número-síntese com rótulo, variação e contexto mínimo.',
    props: ['value: string', 'label: string', 'delta?: string', 'dir?: up|down'],
    events: [],
    data: ['Valor fictício', 'Rótulo', 'Variação (demo)'],
    deps: ['Resposta de dados + metadados (ilustrativa)'],
    tests: ['Variação tem sinal e cor + texto (não só cor)', 'Coerência com gráfico e tabela da demo'],
    note: 'Número coerente apenas dentro da demonstração.',
  },
  {
    id: 'CMP-chart', name: 'Contêiner de gráfico', pr: 'PR-01, PR-05', state: 'proposed',
    resp: 'Envolver uma visualização com título, unidade, período, fonte e atualização.',
    props: ['title', 'unit', 'period', 'source', 'updated', 'series: number[]'],
    events: ['onInspect()'],
    data: ['Série sintética', 'Metadados mínimos (PR-05)'],
    deps: ['Biblioteca gráfica (A CONFIRMAR — não assumida)'],
    tests: ['Metadados sempre presentes', 'Descrição textual acompanha o gráfico'],
    note: 'Renderizado em SVG nativo só para a demo; a biblioteca gráfica real não é assumida.',
  },
  {
    id: 'CMP-filters', name: 'Filtros ativos + limpar', pr: 'PR-01', state: 'proposed',
    resp: 'Mostrar filtros aplicados como chips removíveis, com ação de limpar.',
    props: ['filters: {k,v}[]'],
    events: ['onRemove(k)', 'onClear()'],
    data: ['Filtros fictícios'],
    deps: ['Se a API aceita parâmetros (A CONFIRMAR)'],
    tests: ['Remover chip atualiza o estado', 'Limpar restaura o padrão'],
    note: 'Se os filtros são aplicados no backend ou no front ainda precisa ser verificado.',
  },
  {
    id: 'CMP-methodology', name: 'Metodologia + definição do LAL', pr: 'PR-01, PR-05', state: 'proposed',
    resp: 'Expor como o número foi obtido e a definição semântica associada ao LAL.',
    props: ['methodology: string', 'definition: {term, notion, impact, synonyms, relations}'],
    events: ['onToggle()'],
    data: ['Definição fictícia do LAL'],
    deps: ['Referência semântica versionada (A CONFIRMAR)'],
    tests: ['Fonte conceitual e fonte dos números aparecem separadas'],
    note: 'O versionamento consumível de símbolos do LAL ainda precisa ser verificado.',
  },
  {
    id: 'CMP-embed', name: 'Dashboard incorporado (placeholder)', pr: 'PR-09', state: 'verify',
    resp: 'Reservar espaço para conteúdo do Superset, sem iframe real.',
    props: ['label: string'],
    events: [],
    data: ['Nenhum — placeholder explícito'],
    deps: ['Integração Superset (PROPOSTA)', 'Papel executor do Superset (EM ABERTO)'],
    tests: ['Nenhuma chamada externa', 'Placeholder claramente identificado'],
    note: 'Sem iframe real. O papel do Superset como executor NÃO está decidido.',
  },
  {
    id: 'CMP-editorial', name: 'Texto editorial + ressalva', pr: 'PR-04', state: 'proposed',
    resp: 'Permitir narrativa curta entre análises, com seção e ressalva opcional.',
    props: ['title?', 'body', 'caveat?'],
    events: [],
    data: ['Texto fictício'],
    deps: ['Bloco de publicação do tipo text'],
    tests: ['Ressalva visível quando presente'],
    note: 'Conteúdo fictício para ilustrar composição editorial.',
  },
  {
    id: 'CMP-states', name: 'Estados: carregando, vazio, erro, acesso negado', pr: 'PR-05, PR-07', state: 'proposed',
    resp: 'Padronizar estados de borda da experiência.',
    props: ['state: loading|empty|error|denied'],
    events: ['onRetry()'],
    data: ['N/A'],
    deps: ['Autorização fora da UI (PR-07)'],
    tests: ['"Acesso negado" é distinto de "erro"', 'Cada estado tem texto + ícone, não só cor'],
    note: 'Acesso negado reflete autorização externa, não um erro de rede.',
  },
];

// ---------------------------------------------------------------------------
// Contratos ILUSTRATIVOS (Página 7). Nomes de rota são placeholders fictícios.
// ---------------------------------------------------------------------------
export const CONTRACTS = [
  {
    id: 'CT-semantic', title: 'Referência semântica (ilustrativo)', state: 'proposed',
    note: 'Formato PROPOSTO. O versionamento consumível do LAL ainda precisa ser verificado.',
    body: `{
  "kind": "semantic_reference",   // ilustrativo
  "symbolId": "lal:mobilidade/viagem-monitorada",
  "version": "fictícia-0.0",
  "notion": "Deslocamento individual registrado...",
  "relations": ["ponto-embarque", "linha"]
}`,
  },
  {
    id: 'CT-analysis', title: 'Definição de análise (ilustrativo)', state: 'proposed',
    note: 'Define o que é salvo. provider NÃO determina permissão.',
    body: `{
  "id": "an-mob-01",
  "title": "Demanda semanal por região",
  "semanticSymbolId": "lal:mobilidade/viagem-monitorada",
  "provider": "unspecified",       // etl_api | superset | unspecified
  "measure": "contagem",
  "groupBy": ["regiao", "semana"],
  "filters": { "periodo": "6m", "modo": "coletivo" }
}`,
  },
  {
    id: 'CT-data', title: 'Resposta de dados + metadados (ilustrativo)', state: 'verify',
    note: 'Se a API retorna dados prontos ou aceita medidas/agrupamentos ainda precisa ser verificado.',
    body: `{
  "meta": {
    "unit": "viagens/semana",
    "period": "Jan–Jun (fictício)",
    "source": "léxico LAL (conceitual)",
    "updatedAt": "demo"
  },
  "rows": [ { "semana": 1, "valor": 120 }, { "semana": 2, "valor": 138 } ]
}`,
  },
  {
    id: 'CT-publication', title: 'Configuração de publicação (ilustrativo)', state: 'proposed',
    note: 'Visibilidade ≠ autorização de publicação. schemaVersion fixo na demo.',
    body: `{
  "schemaVersion": 1,
  "title": "Panorama de mobilidade (demo)",
  "status": "draft",               // draft | published
  "visibility": "authenticated",   // private | authenticated | public
  "blocks": [
    { "id": "b1", "type": "text", "content": "..." },
    { "id": "b2", "type": "visualization", "analysisId": "an-mob-01" },
    { "id": "b3", "type": "embedded_dashboard", "analysisId": "ss-01" }
  ]
}`,
  },
];

// ---------------------------------------------------------------------------
// Matriz de autorização (Página 8). Perfis de TESTE ilustrativos.
// ---------------------------------------------------------------------------
export const AUTH_MATRIX = {
  profiles: ['Perfil de teste α', 'Perfil de teste β', 'Perfil de teste γ'],
  capabilities: ['Consultar', 'Editar', 'Compor', 'Publicar', 'Consumir'],
  // valores ilustrativos: '●' permitido, '—' não, '?' a confirmar
  grid: {
    'Perfil de teste α': { Consultar: '●', Editar: '●', Compor: '●', Publicar: '?', Consumir: '●' },
    'Perfil de teste β': { Consultar: '●', Editar: '?', Compor: '—', Publicar: '—', Consumir: '●' },
    'Perfil de teste γ': { Consultar: '●', Editar: '—', Compor: '—', Publicar: '—', Consumir: '●' },
  },
  note: 'Perfis de teste ilustrativos. Papéis organizacionais definitivos NÃO foram definidos.',
};

// ---------------------------------------------------------------------------
// Checklist técnico (Página 8) — 14 questões da seção 8 do briefing.
// Respostas NÃO são preenchidas: começam em "não verificado".
// ---------------------------------------------------------------------------
export const CHECKLIST = [
  'Quais endpoints do ETL são consumidos pelo front? Solicitar request e response reais saneados.',
  'A API retorna dados prontos ou aceita medidas, agrupamentos e filtros?',
  'Onde ocorrem agregações, percentuais, ordenação e limites?',
  'Como símbolos do LAL são referenciados? Há versionamento consumível?',
  'O vínculo do ETL inclui condições discriminadoras, fórmulas e relacionamentos?',
  'A IA gera SQL, configuração estruturada ou outro artefato? Quem valida?',
  'O assistente recebe resultados reais, filtros e metadados? Executa novas consultas?',
  'O que é salvo em uma análise e como ocorre a edição?',
  'Qual é a versão do Superset e quais integrações já existem?',
  'Como identidade, organização, acesso aos dados e publicação são validados?',
  'Como rascunho e versão publicada são separados?',
  'Quais limites, cache, logs e comportamentos para consulta demorada existem?',
  'Publicações utilizam dados dinâmicos ou recortes preservados?',
  'Como tratar perda de autorização ou remoção de recurso referenciado?',
].map((q, i) => ({ id: `Q${String(i + 1).padStart(2, '0')}`, question: q }));

// ---------------------------------------------------------------------------
// Roadmap (Página 9) — dependências, não datas.
// ---------------------------------------------------------------------------
export const ROADMAP = [
  { id: 'E1', title: 'Diagnóstico', deps: 'Sem dependência prévia',
    accept: 'Checklist técnico com evidências coletadas; conflitos com o documento apontados.',
    reqs: ['PR-08'] },
  { id: 'E2', title: 'Consumo padronizado', deps: 'Depende de E1 (contratos de dados conhecidos)',
    accept: 'Todo número exibido com unidade, período, fonte e definição do LAL.',
    reqs: ['PR-01', 'PR-05'] },
  { id: 'E3', title: 'Autoria', deps: 'Depende de E2',
    accept: 'Criar análise manual e via IA convergindo para a mesma definição salva.',
    reqs: ['PR-02', 'PR-03'] },
  { id: 'E4', title: 'Composição', deps: 'Depende de E3 (análises salvas reutilizáveis)',
    accept: 'Montar páginas por configuração; mesma análise referenciada por ID.',
    reqs: ['PR-04', 'PR-06'] },
  { id: 'E5', title: 'Publicação', deps: 'Depende de E4 e de autorização externa (PR-07)',
    accept: 'Publicar com visibilidade; autorização verificada fora da UI; sem publicação automática.',
    reqs: ['PR-06', 'PR-07', 'PR-09'] },
  { id: 'E6', title: 'Segundo contexto', deps: 'Depende de E2–E5',
    accept: 'A mesma estrutura opera em um segundo domínio sem telas codificadas à parte.',
    reqs: ['PR-10'] },
];
