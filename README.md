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

## Itens SIMULADOS (sem efeito real)

- **Troca de contexto fictício** (A: Mobilidade urbana / B: Atenção à saúde) demonstra generalização
  (PR-10) com a mesma estrutura.
- **Filtros ativos**: remover chip / limpar afeta só o estado visual da demo.
- **Conversa com IA**: diálogo roteirizado; os botões Ajustar / Salvar / Adicionar apenas exibem
  mensagens de simulação. Sem confiança percentual inventada.
- **Compositor**: adicionar, remover e reordenar blocos; prévia; alternância desktop/mobile.
  "Salvar rascunho" e "Publicar" **não** persistem em backend — só mudam o rótulo de status.
- **Dashboard incorporado**: placeholder explícito, sem `iframe` e sem chamadas externas.
- **Checklist técnico** e **matriz de autorização**: preenchíveis; valores são marcados como locais e
  não auditados.

### Armazenamento local
O compositor e o checklist são salvos no `localStorage` do navegador (chave
`observatorio_proposta_demo_v1`). Isso é armazenamento **local**, não um backend. O botão
**"Restaurar demonstração"** (barra lateral) limpa esse estado.

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
