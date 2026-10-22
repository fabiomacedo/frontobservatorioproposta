/* =========================================================================
   components.selftest.js — Auto-teste de LÓGICA PURA (sem DOM) dos helpers de
   `assets/js/components.js` do site RAIZ.
   ---------------------------------------------------------------------------
   ES module OPCIONAL: NÃO é importado por nenhum módulo de produção; a app não
   depende dele. Cobre as funções puras que retornam string — em especial o
   acesso à definição do símbolo do LAL (lexiconDisclosure / dimensionDefsDisclosure)
   e a integração opcional nos widgets (metricWidget / chartWidget).

   Uso: `node tests/components.selftest.js`
     - imprime 'SELFTEST OK' e sai 0 quando todos os asserts passam;
     - imprime um resumo das falhas e define process.exitCode=1 se algum falha.

   Sem dependências (stack proíbe): usa apenas console.assert + um contador
   próprio de falhas (console.assert não altera o exit code por si só).
   Mesmo padrão de app-demo/tests/selftest.js (check()/eq()).
   ========================================================================= */

let failures = 0;
const failMsgs = [];
function check(cond, msg) {
  console.assert(cond, msg);
  if (!cond) { failures += 1; failMsgs.push(msg); }
}
function eq(a, b, msg) {
  check(a === b, `${msg} (esperado ${JSON.stringify(b)}, obtido ${JSON.stringify(a)})`);
}

async function main() {
  const {
    esc, lexiconDisclosure, dimensionDefsDisclosure, contextGroup, metricWidget, chartWidget,
  } = await import('../assets/js/components.js');
  const { CONTEXTS } = await import('../assets/js/data.js');

  const def = {
    term: 'Viagem monitorada',
    notion: 'n',
    impact: 'i',
    synonyms: ['a', 'b'],
    relations: ['x', 'y'],
  };
  const m = { value: '18,4 mil', label: 'Viagens / dia (demo)', delta: '+4,2%', dir: 'up' };
  const chart = {
    title: 'Viagens por semana', unit: 'viagens/semana', period: 'Jan–Jun',
    source: 'LAL', updated: 'demo', series: [1, 2, 3],
  };

  // (a) lexiconDisclosure padrão: <details>, term escapado, quatro rótulos, SEM academicRef.
  const sym = lexiconDisclosure(def);
  check(sym.includes('<details'), 'lexiconDisclosure gera <details>');
  check(sym.includes('Viagem monitorada'), 'lexiconDisclosure inclui o term');
  check(sym.includes('Noção') && sym.includes('Impacto') && sym.includes('Sinônimos') && sym.includes('Relações'),
    'lexiconDisclosure traz os quatro rótulos');
  check(!sym.includes('state academic'), 'lexiconDisclosure sem showAcademicRef NÃO inclui academicRef');
  check(sym.includes('rastreabilidade documental'), 'sem academicRef, inclui a linha sóbria da Fonte');
  check(!sym.includes('summary>?') && !sym.includes('>?<'), 'summary não usa glifo "?"');

  // (b) showAcademicRef:true inclui o chip academicRef.
  const symAcad = lexiconDisclosure(def, { showAcademicRef: true });
  check(symAcad.includes('state academic'), 'lexiconDisclosure com showAcademicRef inclui academicRef');

  // (c) saneamento do idSeed.
  const seeded = lexiconDisclosure(def, { idSeed: 'a b/c' });
  check(seeded.includes('id="lex-a-b-c"'), 'idSeed saneado para id="lex-a-b-c"');

  // (d) kind:dimension muda summary e intro.
  const dim = lexiconDisclosure(def, { kind: 'dimension' });
  check(dim.includes('Ver definição da dimensão no LAL'), 'kind=dimension usa summary de dimensão');
  check(dim.includes('Definição fictícia'), 'kind=dimension traz intro com "Definição fictícia"');

  // (e) integração opcional nos widgets (guard por `definition`).
  check(!metricWidget(m).includes('lex-'), 'metricWidget sem 2º arg NÃO contém lex-');
  check(metricWidget(m, { definition: def }).includes('lex-'), 'metricWidget com definition contém lex-');
  check(!chartWidget(chart).includes('lex-'), 'chartWidget sem 2º arg NÃO contém lex-');
  check(chartWidget(chart, { definition: def }).includes('lex-'), 'chartWidget com definition contém lex-');

  // (f) dimensionDefsDisclosure: summary agrupado (novo rótulo) + rotulagem
  // fictícia por dimensão.
  const dims = dimensionDefsDisclosure({ Período: def });
  check(dims.includes('Ver símbolos de contexto no LAL (dimensões e relacionados)'), 'dimensionDefsDisclosure summary agrupado (novo rótulo)');
  check(dims.includes('Definição fictícia, ilustrativa.'), 'dimensionDefsDisclosure rotula cada dimensão como fictícia');

  // (h) dimensionDefsDisclosure com RELACIONADOS: term do relacionado +
  // stateChip('proposed') + parágrafo FIXO de origem (substring estável).
  const withRel = dimensionDefsDisclosure({ Período: def }, { related: [{ term: 'Ponto de embarque', note: 'x' }] });
  check(withRel.includes('Ponto de embarque'), 'relacionados: inclui o term do relacionado');
  check(withRel.includes('state proposed'), 'relacionados: inclui stateChip proposed (classe)');
  check(withRel.includes('relacionados por similaridade vetorial'), 'relacionados: inclui o rótulo do subgrupo');
  check(withRel.includes('related-origin') && withRel.includes('não executa busca vetorial'),
    'relacionados: inclui o parágrafo fixo de origem (.related-origin / "não executa busca vetorial")');

  // (i) guard de vazio: sem dimensões e sem relacionados → '' (não emite <details>).
  check(dimensionDefsDisclosure({}, { related: [] }) === '', 'guard vazio: {} + [] retorna ""');
  check(dimensionDefsDisclosure({}) === '', 'guard vazio: {} sem related retorna ""');
  check(!dimensionDefsDisclosure({}, { related: [] }).includes('<details'), 'guard vazio: não contém <details');

  // (j) related não-array / item sem term: dimensões renderizam, nenhum bloco
  // de relacionados; lista que esvazia sem dimensões → ''.
  const relBad = dimensionDefsDisclosure({ Período: def }, { related: 'oops' });
  check(relBad.includes('<details') && !relBad.includes('related-block'), 'related não-array: dimensões sem bloco de relacionados');
  check(dimensionDefsDisclosure({}, { related: [{ note: 'sem term' }] }) === '', 'item sem term é filtrado; lista vazia + sem dimensões → ""');

  // (k) open: emite <details ... open; sem open, não.
  const opened = dimensionDefsDisclosure({ Período: def }, { open: true });
  check(/<details[^>]* open/.test(opened), 'open:true emite <details ... open');
  check(!/<details[^>]* open/.test(dims), 'sem open NÃO emite atributo open');

  // (l) contextGroup: contêiner .lex-context, rótulo textual, id sufixado e term.
  const cg = contextGroup({ Período: def }, [{ term: 'X', note: 'n' }], { idSeed: 's' });
  check(cg.includes('class="lex-context"'), 'contextGroup: contêiner .lex-context');
  check(cg.includes('Contexto do símbolo'), 'contextGroup: rótulo textual "Contexto do símbolo"');
  check(cg.includes('id="lex-s-ctx"'), 'contextGroup: id sufixado com -ctx');
  check(cg.includes('X'), 'contextGroup: inclui o term do relacionado');
  check(contextGroup({}, [], { idSeed: 's' }) === '', 'contextGroup sem conteúdo retorna ""');

  // (m) context nos widgets: sem context (nem definition) não há lex-context;
  // com context, disclosure principal (lex-s) + grupo (lex-s-ctx).
  const ctxArg = { dimensoes: { Período: def }, relacionados: [{ term: 'r', note: 'n' }] };
  check(!metricWidget(m).includes('lex-context'), 'metricWidget sem context NÃO contém lex-context');
  check(!metricWidget(m, { definition: def }).includes('lex-context'), 'metricWidget só com definition NÃO contém lex-context');
  const mCtx = metricWidget(m, { definition: def, context: ctxArg, idSeed: 's' });
  check(mCtx.includes('lex-context') && mCtx.includes('id="lex-s"') && mCtx.includes('id="lex-s-ctx"'),
    'metricWidget com context: principal (lex-s) + grupo (lex-s-ctx)');
  check(!chartWidget(chart).includes('lex-context'), 'chartWidget sem context NÃO contém lex-context');
  const cCtx = chartWidget(chart, { definition: def, context: ctxArg, idSeed: 's' });
  check(cCtx.includes('lex-context') && cCtx.includes('id="lex-s"') && cCtx.includes('id="lex-s-ctx"'),
    'chartWidget com context: principal (lex-s) + grupo (lex-s-ctx)');

  // (n) invariante de dados: todo contexto tem definition (objeto) e
  // dimensionDefs (não vazio); relatedSymbols, quando presente, é array de
  // itens com `term` string.
  for (const key of Object.keys(CONTEXTS)) {
    const c = CONTEXTS[key];
    check(c && typeof c.definition === 'object' && c.definition !== null, `CONTEXTS.${key}: definition é objeto`);
    check(c && c.dimensionDefs && Object.keys(c.dimensionDefs).length > 0, `CONTEXTS.${key}: dimensionDefs não vazio`);
    if (c && c.relatedSymbols !== undefined) {
      check(Array.isArray(c.relatedSymbols), `CONTEXTS.${key}: relatedSymbols é array`);
      check(c.relatedSymbols.every((r) => r && typeof r.term === 'string'), `CONTEXTS.${key}: relatedSymbols têm term string`);
    }
  }

  // (g) esc — sanidade do pilar de segurança.
  eq(esc('<b>&"'), '&lt;b&gt;&amp;&quot;', 'esc escapa <, >, &, "');

  if (failures > 0) {
    process.exitCode = 1;
    console.error(`\nSELFTEST FALHOU: ${failures} asserção(ões) falharam:`);
    for (const msg of failMsgs) console.error(`  - ${msg}`);
  } else {
    console.log('SELFTEST OK');
  }
}

main().catch((e) => {
  process.exitCode = 1;
  console.error('SELFTEST FALHOU (exceção não tratada):', e && e.stack ? e.stack : e);
});
