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
    esc, lexiconDisclosure, dimensionDefsDisclosure, metricWidget, chartWidget,
  } = await import('../assets/js/components.js');

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

  // (f) dimensionDefsDisclosure: summary agrupado + rotulagem fictícia por dimensão.
  const dims = dimensionDefsDisclosure({ Período: def });
  check(dims.includes('Ver definições das dimensões no LAL (fictícias)'), 'dimensionDefsDisclosure summary agrupado');
  check(dims.includes('Definição fictícia, ilustrativa.'), 'dimensionDefsDisclosure rotula cada dimensão como fictícia');

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
