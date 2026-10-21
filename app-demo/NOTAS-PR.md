# Notas técnicas — PR-01 … PR-10 na aplicação demonstrativa

Este documento liga cada requisito **PR-01 … PR-10** da apresentação técnica (ver
`pages/01-visao-executiva.js` na raiz) aos **componentes e fluxos** implementados na aplicação
demonstrativa em `app-demo/`.

> **Demonstração com dados fictícios e armazenamento local. Sem integração com serviços reais.**
> Tudo aqui é implementação local, integração simulada ou capacidade futura — nunca um serviço real.

Legenda de maturidade usada nas notas:
- **[local]** funcionalidade implementada localmente na demo;
- **[simulado]** integração simulada e identificada como tal;
- **[futuro]** capacidade futura ou em avaliação (não implementada).

---

## PR-01 — Contexto compreensível dos dados

**Como aparece:** todo número traz unidade, período, significado conceitual, regra de cálculo, fonte
e atualização; os filtros do recorte são visíveis.

- **[local]** `query.js → runQuery({contextId, measure, dimension, filters, sort})` retorna, além das
  linhas, `meta.unit`, `meta.period`, `meta.measureKind`, `meta.sourceLabel`, `appliedFilters` e
  `ignoredFilters`. É a **única** fonte de dados da demo (determinística, sem aleatoriedade).
- **[local]** `render.js → metadataFooter()` sempre anexa quatro campos distintos: **significado**
  (do léxico), **cálculo** (rótulo por `measureKind`), **fonte** (base fictícia) e **atualização**
  (timestamp fictício). O léxico explica o significado; os números vêm da base — fontes separadas.
- **[local]** `views.js → filterBar()` / `activeChips()` mostram o recorte efetivamente aplicado;
  filtros ignorados por não se aplicarem à medida são sinalizados (`ignoredFilters`).

## PR-02 — Autoria manual e com IA

**Como aparece:** criar análise à mão ou pelo assistente converge para o **mesmo modelo**.

- **[local]** `analysis.js → emptyAnalysis()`, `validateAnalysis()`, `normalizeText()` definem o
  modelo e o validador **únicos**.
- **[local]** Editor manual: `views.js → openAnalysisEditor()`, `editorFormHtml()`, `wireEditor()`,
  `saveEditor()`. Usa o mesmo validador, a mesma `runQuery` para prévia e a mesma persistência.
- **[simulado]** Assistente roteirizado: `views.js → handleUser()`, `proposeDef()`, `renderProposed()`.
  A proposta da IA gera o **mesmo** objeto de análise; "Ajustar" (`wirePreviewActions`) abre o editor
  com essa definição. Sem porcentagem de confiança inventada; nada é publicado automaticamente.

## PR-03 — Análises salvas e reutilizáveis

**Como aparece:** uma análise vira objeto nomeado, reaproveitável.

- **[local]** `store.js → saveAnalysis(def)` e `updateAnalysis(id, def)` persistem em
  `state.analyses` (chave `observatorio_demo_v2`), com `createdAt`/`updatedAt` (relógio fictício).
- **[local]** `views.js → duplicateAnalysis(id)` cria nova a partir de existente, evitando duplicação
  acidental (atualizar explícito × duplicar).
- **[local]** Referência por ID estável; a mesma análise é reaproveitada no catálogo e na publicação.

## PR-04 — Catálogo e histórias visuais complementares

**Como aparece:** navegar por análises salvas e compor narrativas sobre elas.

- **[local]** Catálogo sobre o estado local: `store.js → listAnalyses({contextId, origin, q})` com
  **busca por título/descrição** e filtro por contexto/origem. UI em `views.js` (seção catálogo) +
  `openCatalogAnalysis()`, `miniViz()`.
- **[local]** Compositor (história visual): `views.js → templates()`, `renderBlocks()`,
  `blockBody()`; blocos referenciam análises por ID via `addAnalysisToPublication(id)` (preserva o
  item escolhido — sem referência fixa).

## PR-05 — Consistência visual e metadados

**Como aparece:** mesma linguagem visual e metadados mínimos em todos os conteúdos.

- **[local]** `render.js → renderAnalysis(analysis, result)` é a **porta única** de renderização
  (dashboard, catálogo, editor/prévia, compositor e consumo), garantindo consistência.
- **[local]** `charts.js` concentra os renderizadores (linha, barra, donut reconciliado, **tabela
  real** `tableChart`), com paleta ordenada por contexto (`PALETTE`, índice `i % 5`).
- **[local]** Metadados mínimos sempre presentes via `metadataFooter()` (PR-01).

## PR-06 — Composição e publicação sem código específico

**Como aparece:** montar e publicar páginas por configuração.

- **[local]** Compositor por blocos: `store.js → addBlock/removeBlock/moveBlock/setBlockProps/
  applyTemplate(pubId, …)`; painel de propriedades em `views.js → renderProps()`, `wirePropsPanel()`.
  Rótulos legíveis (Título, Texto, Indicador, Gráfico, Tabela, Metodologia, Dashboard incorporado).
- **[local]** Troca de modelo pede confirmação antes de substituir blocos: `confirmTemplate()`.
- **[local]** Publicação: `store.js → publish(pubId)` valida e gera `publishedSnapshot` versionado;
  `views.js → previewPublication()`, `doPublish()`, `publicationView()`, rota `#publicacao/{id}`.

## PR-07 — Autorização independente da interface

**Como aparece:** quem pode consultar, editar, compor, publicar e consumir é decidido fora da UI.

- **[simulado]** `permissions.js → can(action, state)` + matriz de perfis (consumidor / autor sem
  publicação / autor com publicação) e mapa ação→permissão. As checagens estão **nas ações do store**
  (`saveAnalysis`, `addBlock`, `publish`…), não só na visibilidade dos botões.
- **[local]** Seletor de perfil: `store.js → setProfile(id)` (persistido; re-avalia `can()`).
- **[futuro]** Aviso explícito de que a autorização real exige validação no backend. Login, modo de
  uso, visibilidade e permissão de publicar são tratados como coisas distintas.

## PR-08 — Preservação de LAL, ETL e APIs existentes

**Como aparece:** evoluir reaproveitando o investimento; não reconstruir.

- **[simulado/futuro]** A demo **não** chama LAL/ETL. O léxico fictício fornece apenas o **significado
  conceitual** (`render.js → conceptMeaning()`), separado da **fonte dos números** (base fictícia).
  A arquitetura mantém a camada de dados isolada (`runQuery`) para que um executor real possa
  substituí-la sem tocar a UI — a decisão de executor permanece em aberto (apresentação, DOC-02).

## PR-09 — Incorporação de conteúdo Superset

**Como aparece:** exibir análises do Superset dentro do Observatório.

- **[simulado]** Recurso de catálogo com `origin === 'superset_demo'`; `render.js → vizBody()`
  curto-circuita para `supersetPlaceholder()` **antes** de qualquer `runQuery` (sem `iframe`, sem
  token). Aviso: "Conteúdo incorporado simulado. Integração, autenticação e recursos disponíveis
  dependem de validação técnica."
- **[local]** Pode ser aberto e adicionado à publicação como qualquer análise, mas **não** é editável
  pelo editor de gráficos próprios (configuração da apresentação externa ≠ edição no provedor).

## PR-10 — Generalização validada em segundo contexto

**Como aparece:** a mesma estrutura funciona em um segundo domínio, sem telas à parte.

- **[local]** `data.js → CONTEXTS` define **dois** contextos por configuração: **A. Panorama
  acadêmico** e **B. Cobertura de entrevistas de programa territorial** (medidas, dimensões, filtros,
  sugestões da IA, catálogo e léxico vêm de dados, não de código por tela).
- **[local]** `store.js → setContext(id)` troca contexto (paleta `--chart-*` + `--accent` no `.shell`)
  mantendo os **mesmos** componentes/renderizadores; análises e publicações ficam associadas ao seu
  contexto e não se misturam.

---

## Rastreabilidade AC → PR (resumo)

- Consulta/filtros (AC-01, AC-02) → **PR-01**.
- Autoria manual+IA mesmo modelo (AC-03, AC-07) → **PR-02**.
- Salvar/recarregar/abrir (AC-04, AC-05, AC-06) → **PR-03**.
- Catálogo e add-à-publicação (AC-08) → **PR-04**.
- Tabela real / renderização consistente (AC-10, AC-13) → **PR-05**.
- Composição e publicação (AC-09, AC-14, AC-15) → **PR-06**.
- Permissões (AC-16) → **PR-07**.
- Léxico × números separados → **PR-08**.
- Superset simulado (AC-18) → **PR-09**.
- Segundo contexto (AC-17) + conversa contextual (AC-11, AC-12) → **PR-10 / PR-02**.
- Sem chamadas externas (AC-19) e restauração coerente (AC-20) → requisitos transversais.
