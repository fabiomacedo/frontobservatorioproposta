# Observatório — Proposta visual técnica

Apresentação web navegável da proposta de evolução do Observatório, dirigida às equipes de
Produto, UX/UI, Frontend, Backend, Dados, Arquitetura e Segurança.

> **Esta entrega NÃO é a interface de produção.** É um artefato visual de comunicação e discussão
> técnica. Usa dados fictícios, não se conecta a serviços reais e não usa credenciais.

## Como executar localmente

A apresentação usa apenas HTML, CSS e JavaScript (ES modules). Não há build, dependências nem CDN.
Como usa `import`/`export`, precisa ser servida por HTTP (abrir o `index.html` direto via `file://`
não funciona por restrição dos ES modules nos navegadores).

Escolha um servidor estático qualquer na raiz do projeto:

```bash
# Python 3 (pré-instalado na maioria dos sistemas)
python -m http.server 8137

# ou Node, se preferir
npx --yes serve -l 8137
```

Depois abra: <http://localhost:8137/>

### Navegação por teclado
- `Tab` / `Shift+Tab`: percorre links, botões e campos; o foco é sempre visível.
- `Enter` / `Espaço`: ativa componentes (inclusive os nós clicáveis dos diagramas).
- Setas `←` / `→`: alternam as abas de jornadas (Página 3).
- `Esc`: fecha o painel de detalhes técnicos.
- Link "Pular para o conteúdo" no topo.

## Estrutura de arquivos

```
index.html                       Shell e ponto de entrada
README.md                        Este arquivo
assets/
  css/styles.css                 Design system (verde institucional, neutros, estados)
  js/
    app.js                       Navegação, roteamento por hash, painel de detalhes, contexto
    data.js                      Dados FICTÍCIOS, PR-01..10, DOC-01..09, contratos, checklist
    state.js                     Estado do compositor + localStorage + troca de contexto
    components.js                Helpers de UI (chips de estado, cards, widgets, gráfico SVG)
    diagrams.js                  Diagramas SVG interativos (atual / proposto)
pages/
  01-visao-executiva.js          [DOC-01]
  02-arquitetura.js              [DOC-02]
  03-jornadas.js                 [DOC-03]
  04-laboratorio.js              [DOC-04]
  05-ia.js                       [DOC-05]
  06-composicao.js               [DOC-04, DOC-06]
  07-contratos.js                [DOC-06]
  08-seguranca-diagnostico.js    [DOC-07, DOC-08]
  09-roadmap.js                  [DOC-09]
```

## Como a distinção de estados é preservada

Toda informação técnica é classificada em um de três estados, sempre com **rótulo + símbolo + cor**
(a cor nunca é o único indicador):

| Estado | Significado |
|---|---|
| **Confirmado por relato** | Informado no direcionamento. Não significa auditado em código. |
| **Proposto** | Recomendação para validação. |
| **A confirmar** | Comportamento atual ainda não verificado. |

Rotas, payloads, entidades e tipos são **propostas** ou **ilustrativas** — nunca representados como
contratos reais. O Superset aparece em duas hipóteses distintas (incorporação proposta; execução de
consultas em avaliação) e **nunca** como motor de consulta já escolhido.

## Itens SIMULADOS da apresentação (sem efeito real)

- **Troca de contexto fictício** demonstra generalização (PR-10) com a mesma estrutura.
- **Checklist técnico** e **matriz de autorização**: preenchíveis; valores marcados como locais e não
  auditados.
- O estado da apresentação é salvo em `localStorage` (chave `observatorio_proposta_demo_v1`), com
  **"Restaurar demonstração"** na barra lateral.

---

# Aplicação demonstrativa — `/app-demo/`

Além da apresentação, o repositório inclui em **`app-demo/`** uma **aplicação demonstrativa** que
exercita a experiência do usuário de ponta a ponta, com **dados fictícios e persistência local**.
Mesma stack vanilla (HTML/CSS/JS, ES modules, sem build, sem dependências, sem CDN).

> **Demonstração com dados fictícios e armazenamento local. Sem integração com serviços reais.**
> Sem backend, sem APIs reais, sem credenciais, sem chamadas externas.

Abrir em: <http://localhost:8137/app-demo/> (com o servidor estático rodando na raiz).

## Jornada demonstrada

Selecionar contexto → criar análise → ajustar → salvar → abrir no catálogo → adicionar à
publicação → contextualizar (conversa) → pré-visualizar → publicar localmente → consumir
(rota `#publicacao/{id}`).

## Dois contextos genéricos (mesma estrutura, por configuração)

- **A. Panorama acadêmico** (origem IFRJ: campi, modalidades, matrículas, evasão, conclusão, cotas).
- **B. Cobertura de entrevistas de um programa territorial** (territórios, status de entrevista,
  metas e taxa de cobertura).

O produto chama-se apenas **"Observatório"** (neutro). O IFRJ é um dos contextos, não a marca do
app. Trocar o contexto atualiza identificação, conjuntos de dados, medidas, dimensões, filtros,
sugestões da IA, catálogo e definições — tudo pelos **mesmos componentes e renderizadores**.

## Modelo de estado local

Entidades relacionais com IDs estáveis, persistidas em `localStorage` sob a chave versionada
**`observatorio_demo_v2`** (migração segura: estado antigo/incompatível é descartado com segurança,
nunca causa tela em branco). Entidades: `contexts`, `datasets`, `analyses`, `publications`,
`conversations`, `uiState`. Publicar gera um `publishedSnapshot` versionado (cópia das análises
necessárias), de modo que editar o rascunho depois **não** altera a versão publicada até uma
republicação explícita. **"Restaurar demonstração"** volta a um estado-semente coerente.

## O que é implementado localmente × simulado × futuro

- **Implementado localmente:** consulta determinística com filtros que realmente alteram os
  resultados; editor de análise (manual) com validação; catálogo navegável com busca; conversa
  contextual sobre uma análise e seu recorte; compositor editável (título, texto, indicador,
  gráfico, **tabela real**, metodologia); publicação com snapshot e rota de consumo; permissões
  simuladas (consumidor / autor sem publicação / autor com publicação).
- **Integração simulada:** o assistente de IA é **roteirizado** (sem modelo real) e explicitamente
  identificado; o recurso **Superset** aparece como placeholder (sem `iframe`, sem token) com o aviso
  "Conteúdo incorporado simulado. Integração, autenticação e recursos disponíveis dependem de
  validação técnica."
- **Capacidade futura / em avaliação:** execução analítica real, backend de persistência e
  autorização, integração efetiva com LAL/ETL/Superset/IA.

> As **permissões** são apenas de demonstração: "Permissões simuladas no navegador. A implementação
> real exigirá validação no backend." Login, modo de uso, visibilidade e permissão de publicar não
> são sinônimos. A visão de consumo (`#publicacao/{id}`) depende do armazenamento **local** e **não**
> compartilha conteúdo com outros usuários ou dispositivos.

## Estrutura de `app-demo/`

```
app-demo/
  index.html
  assets/
    css/app.css
    js/
      data.js          Configuração dos dois contextos + datasets fictícios + relógio fictício
      query.js         runQuery único e determinístico (regras explícitas: total/contagem/taxa/distribuição)
      analysis.js      Modelo de análise + validador (compartilhado por editor manual e IA)
      permissions.js   Perfis fictícios + can(ação, estado) + mapa ação→permissão
      store.js         Estado relacional versionado (observatorio_demo_v2) + persistência + snapshot
      charts.js        Renderizadores SVG + tabela real
      render.js        renderAnalysis(): porta única de renderização + metadados + estados
      views.js         Telas (dashboard, catálogo, editor, assistente, compositor, consumo)
      app.js           Shell, roteamento por hash (inclui #publicacao/{id}), foco e acessibilidade
  tests/
    selftest.js        Autoteste de lógica pura (node)
    browser-validate.mjs  Harness de validação E2E headless (não importado pela app)
```

## Verificação executada (navegador real)

- `node --check` nos 9 módulos: OK.
- `node app-demo/tests/selftest.js`: **SELFTEST OK**.
- Validação E2E em **Google Chrome headless** (DevTools Protocol): critérios AC-01…AC-20 exercitados
  por manipulação de DOM/estado — **zero exceções de console** e **zero requisições externas** (só os
  10 recursos locais da app). O único 404 observado é o `/favicon.ico` automático do navegador, não
  referenciado pela aplicação.

## Metadados e linguagem

O **léxico explica o significado** de cada medida; os **números vêm da base fictícia** — são fontes
distintas (o léxico nunca é apresentado como fonte dos valores). Datas usam **timestamps fictícios
explícitos**, não expressões relativas sem correspondência. Nomes técnicos aparecem só em detalhes.

## Decisões que NÃO foram tomadas (deliberadamente)

- **Motor de consulta**: não há decisão de adotar um novo. O papel do Superset como executor está em
  aberto.
- **Novo serviço de backend**: o "backend" nos diagramas é uma **responsabilidade lógica proposta**;
  não afirma que a evolução exige um serviço novo.
- **Papéis organizacionais**: a matriz usa **perfis de teste ilustrativos**, não papéis definitivos.
- **Comportamento da API do ETL**: como calcula, agrega ou filtra os dados **não** foi confirmado.
- **Contexto efetivo e execução da IA**: ainda precisam ser verificados.
- **Versionamento consumível do LAL** e detalhes dos vínculos do ETL: a confirmar.

As perguntas técnicas em aberto estão listadas na **Página 8 — Checklist técnico** (Q01–Q14) e não
foram preenchidas com respostas presumidas.

## Rastreabilidade

- **PR-01 … PR-10**: requisitos, exibidos em cards e detalhes, com link direto por hash.
- **DOC-01 … DOC-09**: âncoras de navegação entre páginas (não são citações externas nem números de
  seção do documento original).
- **CMP-***, **CT-***, **Q***, **E***: identificadores de componentes, contratos, questões do
  checklist e etapas do roadmap.

## Fonte de verdade e conflitos

Este material foi construído a partir do briefing fornecido. Quando houver acesso ao documento
completo da proposta, ele deve ser usado como fonte complementar; conflitos devem ser **apontados**,
não resolvidos silenciosamente.
