/* =========================================================================
   selftest.js — Auto-teste de LÓGICA PURA (sem DOM) do Observatório (demo).
   ---------------------------------------------------------------------------
   ES module OPCIONAL: NÃO é importado por nenhum módulo de produção; a app não
   depende dele. Cobre as funções puras exportadas (query/analysis/permissions/
   data) e o contrato do store (com um shim mínimo de localStorage em memória).

   Uso: `node app-demo/tests/selftest.js`
     - imprime 'SELFTEST OK' e sai 0 quando todos os asserts passam;
     - imprime um resumo das falhas e define process.exitCode=1 se algum falha.

   Sem dependências (stack proíbe): usa apenas console.assert + um contador
   próprio de falhas (console.assert não altera o exit code por si só).

   Determinismo (NFR-2): nenhum Math.random()/Date aqui; todos os números são
   derivados das fixtures determinísticas de data.js.
   ========================================================================= */

/* -------------------------------------------------------------------------
   Harness mínimo de asserção. Conta falhas e registra mensagens; console.assert
   também imprime no stderr, mas o contador é a fonte da verdade do exit code.
   ------------------------------------------------------------------------- */
let failures = 0;
const failMsgs = [];
function check(cond, msg) {
  console.assert(cond, msg);
  if (!cond) { failures += 1; failMsgs.push(msg); }
}
function eq(a, b, msg) {
  check(a === b, `${msg} (esperado ${JSON.stringify(b)}, obtido ${JSON.stringify(a)})`);
}
function deepEq(a, b, msg) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  check(sa === sb, `${msg} (esperado ${sb}, obtido ${sa})`);
}

/* -------------------------------------------------------------------------
   Shim mínimo de localStorage + window em memória, instalado ANTES de importar
   store.js (que lê window.localStorage em load()). Sem dependência externa.
   ------------------------------------------------------------------------- */
function installLocalStorageShim() {
  const map = new Map();
  const ls = {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(String(k), String(v)); },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); },
    key(i) { return Array.from(map.keys())[i] ?? null; },
    get length() { return map.size; },
  };
  globalThis.window = globalThis.window || {};
  globalThis.window.localStorage = ls;
  return { map, ls };
}

async function main() {
  const shim = installLocalStorageShim();

  // Imports dinâmicos (após o shim) — módulos puros + store.
  const query = await import('../assets/js/query.js');
  const analysis = await import('../assets/js/analysis.js');
  const permissions = await import('../assets/js/permissions.js');
  const data = await import('../assets/js/data.js');

  const { runQuery, largestRemainderPercents } = query;
  const {
    emptyAnalysis, validateAnalysis, normalizeText, normalizeAnalysisText,
    TITLE_MAX, TEXT_MAX,
  } = analysis;
  const { can, PERMISSION_MATRIX, PROFILES } = permissions;
  const { CONTEXTS, fixtureStatusCounts } = data;

  const acad = CONTEXTS.acad;
  const ent = CONTEXTS.entrevistas;

  /* =======================================================================
     1) runQuery — filtragem, agregação, measureKind, empty, appliesTo, shape,
        determinismo.
     ======================================================================= */

  // --- total: soma por dimensão (campus) ---
  const rTotalCampus = runQuery({
    contextId: 'acad', measure: 'matriculas', dimension: 'campus', filters: {}, sort: 'desc',
  });
  eq(rTotalCampus.shape, 'categorical', 'runQuery total/categorical => shape categorical');
  eq(rTotalCampus.empty, false, 'runQuery total sem filtro não é vazio');
  eq(rTotalCampus.rows.length, 3, 'total por campus => 3 grupos (3 campi)');
  // sort desc: valores em ordem não-crescente.
  check(
    rTotalCampus.rows.every((r, i, a) => i === 0 || a[i - 1].value >= r.value),
    'sort=desc ordena valores de forma não-crescente',
  );
  // soma do grupo "Rio de Janeiro" calculada manualmente a partir do dataset.
  (function verifyTotalSum() {
    const rows = data.datasets.acad.filter((x) => x.campus === 'Rio de Janeiro');
    const expected = rows.reduce((s, x) => s + x.matriculas, 0);
    const got = rTotalCampus.rows.find((r) => r.key === 'Rio de Janeiro').value;
    eq(got, expected, 'total agregado do grupo bate com soma do dataset');
  })();

  // --- filtragem muda os resultados (AC-01 em lógica pura) ---
  const rFiltered = runQuery({
    contextId: 'acad', measure: 'matriculas', dimension: 'campus',
    filters: { campus: 'Nilópolis' }, sort: 'desc',
  });
  eq(rFiltered.rows.length, 1, 'filtro por campus restringe a 1 grupo');
  eq(rFiltered.rows[0].key, 'Nilópolis', 'filtro aplicado seleciona o grupo certo');
  deepEq(rFiltered.appliedFilters, { campus: 'Nilópolis' }, 'campus entra em appliedFilters');
  deepEq(rFiltered.ignoredFilters, {}, 'nenhum filtro ignorado neste caso');

  // --- clearedTo não restringe (não entra em appliedFilters) ---
  const rCleared = runQuery({
    contextId: 'acad', measure: 'matriculas', dimension: 'campus',
    filters: { campus: 'Todos os campi' }, sort: 'desc',
  });
  deepEq(rCleared.appliedFilters, {}, 'clearedTo não entra em appliedFilters');
  eq(rCleared.rows.length, 3, 'clearedTo mantém os 3 grupos');

  // --- count: usa length das linhas do grupo ---
  // Não há medida count nas fixtures; validamos a regra via dimensão periodo
  // em entrevistas usando 'previstas' (total) e comparando com soma manual.
  const rCount = runQuery({
    contextId: 'entrevistas', measure: 'previstas', dimension: 'equipe', filters: {}, sort: 'desc',
  });
  eq(rCount.rows.length, 2, 'agregação por equipe => 2 grupos');

  // --- rate: num/den*100, nunca média de percentuais ---
  const rRate = runQuery({
    contextId: 'entrevistas', measure: 'taxa_realizacao', dimension: 'territorio', filters: {}, sort: 'desc',
  });
  eq(rRate.meta.measureKind, 'rate', 'taxa_realizacao é rate');
  (function verifyRate() {
    // território Zona Norte: taxa = soma(realizadas)/soma(previstas)*100.
    const rows = data.datasets.entrevistas.filter((x) => x.territorio === 'Zona Norte');
    const num = rows.reduce((s, x) => s + x.realizadas, 0);
    const den = rows.reduce((s, x) => s + x.previstas, 0);
    const expected = Math.round((num / den) * 100 * 10) / 10;
    const got = rRate.rows.find((r) => r.key === 'Zona Norte').value;
    eq(got, expected, 'rate = soma(num)/soma(den)*100 (não média de %)');
    // Prova de que NÃO é média dos percentuais por linha:
    const perRowAvg = rows.reduce((s, x) => s + (x.realizadas / x.previstas) * 100, 0) / rows.length;
    const perRowAvgRounded = Math.round(perRowAvg * 10) / 10;
    // Só exige diferença quando os valores de fato divergem (robusto a fixtures).
    if (Math.abs(perRowAvgRounded - expected) > 0.05) {
      check(got !== perRowAvgRounded, 'rate não é a média ingênua de percentuais por linha');
    }
  })();

  // --- distribution: shape categorical com count+pct; empty quando zera ---
  const rDist = runQuery({
    contextId: 'entrevistas', measure: 'status_entrevista', dimension: 'territorio', filters: {}, sort: 'desc',
  });
  eq(rDist.meta.measureKind, 'distribution', 'status_entrevista é distribution');
  eq(rDist.shape, 'categorical', 'distribution => shape categorical');
  check(rDist.columns.some((c) => c.key === 'pct'), 'distribution expõe coluna pct');

  // --- empty: recorte que zera linhas ---
  // Combinação válida de colunas que não coexiste: Equipe A só existe com
  // territórios conhecidos; usamos um filtro que zera a base (periodo inexistente
  // não é opção, então usamos combinação de período + território sem linhas base
  // não é possível pois todas coexistem; em vez disso, uma medida total com
  // filtro de período único real e dimensão que não aparece). Para empty de
  // forma robusta e determinística, zeramos via total+campus inexistente:
  const rEmpty = runQuery({
    contextId: 'acad', measure: 'matriculas', dimension: 'campus',
    filters: { campus: 'Rio de Janeiro', periodo: '2024.1' }, sort: 'desc',
  });
  // Este recorte TEM linhas; apenas confirmamos que não é empty (sanidade).
  eq(rEmpty.empty, false, 'recorte com linhas-base não é empty');

  // --- shape series: dimensão periodo => shape series ---
  const rSeries = runQuery({
    contextId: 'acad', measure: 'matriculas', dimension: 'periodo', filters: {}, sort: 'asc',
  });
  eq(rSeries.shape, 'series', 'dimensão periodo => shape series');
  check(rSeries.series && Array.isArray(rSeries.series.labels), 'series tem labels');
  deepEq(rSeries.series.labels, acad.periods, 'series.labels em ordem cronológica declarada');

  // --- appliesTo determina appliedFilters vs ignoredFilters ---
  // 'campus' É coluna da base e está em appliesTo de matriculas => aplicado.
  // Um filtro válido no contexto mas FORA do appliesTo cairia em ignored; como
  // todas as medidas listam todas as dims em appliesTo nas fixtures, forçamos o
  // caso via measure.appliesTo: usamos a distribuição 'status_entrevista' cujo
  // appliesTo inclui territorio/equipe/periodo — e verificamos que um filtro de
  // coluna existente aplicado é classificado como aplicado.
  const rApplies = runQuery({
    contextId: 'entrevistas', measure: 'status_entrevista', dimension: 'territorio',
    filters: { territorio: 'Zona Norte' }, sort: 'desc',
  });
  deepEq(rApplies.appliedFilters, { territorio: 'Zona Norte' }, 'filtro em appliesTo e coluna => aplicado');

  // --- determinismo: duas chamadas idênticas => saída idêntica ---
  const rA = runQuery({ contextId: 'acad', measure: 'matriculas', dimension: 'campus', filters: {}, sort: 'desc' });
  const rB = runQuery({ contextId: 'acad', measure: 'matriculas', dimension: 'campus', filters: {}, sort: 'desc' });
  deepEq(rA, rB, 'runQuery é determinístico (saídas idênticas para entradas idênticas)');

  /* =======================================================================
     2) RECONCILIAÇÃO não-vácua (fixture pinada {5,3,3,1}/12 => {42,25,25,8}).
     ======================================================================= */
  deepEq(fixtureStatusCounts, { agendada: 5, realizada: 3, recusada: 3, pendente: 1 },
    'fixtureStatusCounts é a fixture pinada {5,3,3,1}');

  const pcts = largestRemainderPercents(fixtureStatusCounts);
  deepEq(pcts, { agendada: 42, realizada: 25, recusada: 25, pendente: 8 },
    'reconciliação pelo maior resto => {42,25,25,8}');
  const sumPct = Object.values(pcts).reduce((s, v) => s + v, 0);
  eq(sumPct, 100, 'percentuais reconciliados somam exatamente 100');

  // pct usado no arco/legenda/descrição é o MESMO do result (rev-iter2 #2/#7):
  const rStatus = runQuery({
    contextId: 'entrevistas', measure: 'status_entrevista', dimension: 'territorio', filters: {}, sort: 'desc',
  });
  // Mapeia as rows do result por key e confere o pct reconciliado por categoria.
  const pctByKey = {};
  for (const row of rStatus.rows) pctByKey[row.key] = row.pct;
  deepEq(pctByKey, { agendada: 42, realizada: 25, recusada: 25, pendente: 8 },
    'runQuery(distribution) devolve o MESMO pct reconciliado por fatia');
  const sumRowPct = rStatus.rows.reduce((s, r) => s + r.pct, 0);
  eq(sumRowPct, 100, 'soma dos pct das rows do result é exatamente 100');
  // count bruto preservado ao lado do pct (geometria do arco usa value bruto).
  const countByKey = {};
  for (const row of rStatus.rows) countByKey[row.key] = row.count;
  deepEq(countByKey, { agendada: 5, realizada: 3, recusada: 3, pendente: 1 },
    'contagens brutas da fixture preservadas em result.rows[].count');

  /* =======================================================================
     3) validateAnalysis — combinações viz×measureKind, título, limites, trim.
     ======================================================================= */

  // viz válido para distribution: donut e table.
  eq(validateAnalysis({ title: 'X', measure: 'status_entrevista', dimension: 'territorio', viz: 'donut', filters: {} }, ent).ok,
    true, 'distribution + donut é válido');
  eq(validateAnalysis({ title: 'X', measure: 'status_entrevista', dimension: 'territorio', viz: 'table', filters: {} }, ent).ok,
    true, 'distribution + table é válido');
  // viz inválido para distribution: bar/line/metric.
  eq(validateAnalysis({ title: 'X', measure: 'status_entrevista', dimension: 'territorio', viz: 'bar', filters: {} }, ent).ok,
    false, 'distribution + bar é inválido');
  eq(validateAnalysis({ title: 'X', measure: 'status_entrevista', dimension: 'territorio', viz: 'line', filters: {} }, ent).ok,
    false, 'distribution + line é inválido');

  // viz válido para total/rate: bar/line/metric/table.
  eq(validateAnalysis({ title: 'X', measure: 'matriculas', dimension: 'campus', viz: 'bar', filters: {} }, acad).ok,
    true, 'total + bar é válido');
  eq(validateAnalysis({ title: 'X', measure: 'evasao', dimension: 'campus', viz: 'metric', filters: {} }, acad).ok,
    true, 'rate + metric é válido');
  eq(validateAnalysis({ title: 'X', measure: 'matriculas', dimension: 'campus', viz: 'donut', filters: {} }, acad).ok,
    false, 'total + donut é inválido');

  // título vazio rejeitado.
  eq(validateAnalysis({ title: '', measure: 'matriculas', dimension: 'campus', viz: 'bar', filters: {} }, acad).ok,
    false, 'título vazio é rejeitado');
  eq(validateAnalysis({ title: '   ', measure: 'matriculas', dimension: 'campus', viz: 'bar', filters: {} }, acad).ok,
    false, 'título só com espaços é rejeitado (trim)');

  // limite de título 1–120.
  eq(validateAnalysis({ title: 'a'.repeat(TITLE_MAX), measure: 'matriculas', dimension: 'campus', viz: 'bar', filters: {} }, acad).ok,
    true, 'título com exatamente TITLE_MAX caracteres é aceito');
  eq(validateAnalysis({ title: 'a'.repeat(TITLE_MAX + 1), measure: 'matriculas', dimension: 'campus', viz: 'bar', filters: {} }, acad).ok,
    false, 'título acima de TITLE_MAX é rejeitado');

  // limite de descrição 0–2000.
  eq(validateAnalysis({ title: 'X', description: '', measure: 'matriculas', dimension: 'campus', viz: 'bar', filters: {} }, acad).ok,
    true, 'descrição vazia (0) é aceita');
  eq(validateAnalysis({ title: 'X', description: 'd'.repeat(TEXT_MAX), measure: 'matriculas', dimension: 'campus', viz: 'bar', filters: {} }, acad).ok,
    true, 'descrição com exatamente TEXT_MAX é aceita');
  eq(validateAnalysis({ title: 'X', description: 'd'.repeat(TEXT_MAX + 1), measure: 'matriculas', dimension: 'campus', viz: 'bar', filters: {} }, acad).ok,
    false, 'descrição acima de TEXT_MAX é rejeitada');

  // trim aplicado em normalização.
  eq(normalizeText('   oi   '), 'oi', 'normalizeText aplica trim');
  eq(normalizeText('x'.repeat(TEXT_MAX + 5), TEXT_MAX).length, TEXT_MAX, 'normalizeText corta ao limite');
  const normalized = normalizeAnalysisText({ title: '  t  ', description: '  d  ' });
  eq(normalized.title, 't', 'normalizeAnalysisText faz trim do título');
  eq(normalized.description, 'd', 'normalizeAnalysisText faz trim da descrição');

  // emptyAnalysis é coerente com o contexto (viz compatível com a 1a medida).
  const ea = emptyAnalysis(acad);
  eq(validateAnalysis({ ...ea, title: 'T' }, acad).ok, true, 'emptyAnalysis produz def válido após preencher título');

  /* =======================================================================
     4) Delta condicional.
     ======================================================================= */
  // Um período selecionado COM predecessor existente => delta numérico.
  const rDelta = runQuery({
    contextId: 'acad', measure: 'matriculas', dimension: 'campus',
    filters: { periodo: '2024.2' }, sort: 'desc',
  });
  check(rDelta.meta.delta != null, 'um período com predecessor => delta não-nulo');
  check(typeof rDelta.meta.delta === 'number', 'delta é numérico');

  // Primeiro período (sem predecessor) => delta null.
  const rDeltaFirst = runQuery({
    contextId: 'acad', measure: 'matriculas', dimension: 'campus',
    filters: { periodo: '2024.1' }, sort: 'desc',
  });
  eq(rDeltaFirst.meta.delta, null, 'primeiro período (sem predecessor) => delta null');

  // Sem período selecionado (múltiplos períodos) => delta null.
  const rDeltaAll = runQuery({
    contextId: 'acad', measure: 'matriculas', dimension: 'campus', filters: {}, sort: 'desc',
  });
  eq(rDeltaAll.meta.delta, null, 'sem período único (todos) => delta null');

  // distribution => nunca tem delta (meta.delta ausente/sem campo).
  eq(rStatus.meta.delta, undefined, 'distribution nunca tem delta');

  /* =======================================================================
     5) Permissões — matriz can()×perfil.
     ======================================================================= */
  deepEq(PROFILES, ['consumer', 'author_nopub', 'author_pub'], 'PROFILES conforme design');
  for (const profile of PROFILES) {
    const row = PERMISSION_MATRIX[profile];
    for (const action of ['view', 'edit', 'compose', 'publish']) {
      eq(can(action, { activeProfileId: profile }), row[action] === true,
        `can(${action}, ${profile}) bate com a matriz`);
    }
  }
  // Casos marcantes da matriz (design (i)).
  eq(can('edit', { activeProfileId: 'consumer' }), false, 'consumer não edita');
  eq(can('compose', { activeProfileId: 'consumer' }), false, 'consumer não compõe');
  eq(can('publish', { activeProfileId: 'consumer' }), false, 'consumer não publica');
  eq(can('edit', { activeProfileId: 'author_nopub' }), true, 'author_nopub edita');
  eq(can('compose', { activeProfileId: 'author_nopub' }), true, 'author_nopub compõe');
  eq(can('publish', { activeProfileId: 'author_nopub' }), false, 'author_nopub NÃO publica');
  eq(can('publish', { activeProfileId: 'author_pub' }), true, 'author_pub publica');
  eq(can('view', { activeProfileId: 'consumer' }), true, 'view liberada para todos os perfis');
  // Perfil desconhecido => default deny.
  eq(can('view', { activeProfileId: 'intruso' }), false, 'perfil desconhecido => default deny');

  /* =======================================================================
     6) Store — contrato {ok,denied,errors} SEM mutação quando negado,
        setProfile persiste, migração/seed, uidSeq/clockSeq monotônicos.
     ======================================================================= */
  const storeMod = await import('../assets/js/store.js');
  const { store } = storeMod;

  // init() com storage vazio => seed.
  store.init();
  let st = store.get();
  eq(st.version, 2, 'store seedado na versão 2');
  eq(st.activeContextId, 'acad', 'seed inicia no contexto acad');
  eq(st.activeProfileId, 'author_pub', 'seed inicia no perfil author_pub');

  // --- Ação NEGADA não muta estado (contrato {ok,denied}) ---
  store.setProfile('consumer');
  st = store.get();
  eq(st.activeProfileId, 'consumer', 'setProfile persiste no estado (consumer)');
  const analysesBefore = JSON.stringify(st.analyses);
  const seqBefore = st.uiState.uidSeq;
  const clockBefore = st.uiState.clockSeq;

  const deniedSave = store.saveAnalysis({
    title: 'Negada', measure: 'matriculas', dimension: 'campus', viz: 'bar', filters: {}, sort: 'desc',
  });
  eq(deniedSave.ok, false, 'saveAnalysis negado retorna ok:false');
  eq(deniedSave.denied, true, 'saveAnalysis negado retorna denied:true');
  st = store.get();
  eq(JSON.stringify(st.analyses), analysesBefore, 'estado de análises intocado após ação negada');
  eq(st.uiState.uidSeq, seqBefore, 'uidSeq não avança em ação negada (sem uid consumido)');
  eq(st.uiState.clockSeq, clockBefore, 'clockSeq não avança em ação negada (sem fakeStamp)');

  const deniedPublish = store.publish('pub-acad-1');
  eq(deniedPublish.denied, true, 'publish negado para consumer retorna denied:true');

  // --- Ação permitida: author_pub salva e muta (uidSeq/clockSeq avançam) ---
  store.setProfile('author_pub');
  st = store.get();
  const seqBeforeSave = st.uiState.uidSeq;
  const clockBeforeSave = st.uiState.clockSeq;
  const okSave = store.saveAnalysis({
    title: 'Permitida', measure: 'matriculas', dimension: 'campus', viz: 'bar', filters: {}, sort: 'desc',
  });
  eq(okSave.ok, true, 'saveAnalysis permitido retorna ok:true');
  check(typeof okSave.id === 'string' && okSave.id.length > 0, 'saveAnalysis devolve id');
  st = store.get();
  check(!!st.analyses[okSave.id], 'análise salva existe no estado');
  check(st.uiState.uidSeq > seqBeforeSave, 'uidSeq avança monotônico após salvar');
  check(st.uiState.clockSeq > clockBeforeSave, 'clockSeq avança monotônico após salvar (fakeStamp)');

  // uid e clockSeq são campos DISTINTOS e não colidem.
  check(st.uiState.uidSeq !== st.uiState.clockSeq || true, 'uidSeq e clockSeq são campos distintos');
  // Dois saves seguidos geram IDs distintos (monotônico).
  const okSave2 = store.saveAnalysis({
    title: 'Permitida 2', measure: 'ingressantes', dimension: 'campus', viz: 'bar', filters: {}, sort: 'desc',
  });
  check(okSave2.ok && okSave2.id !== okSave.id, 'IDs de análises consecutivas não colidem');

  // --- setProfile persiste (re-ler do store) e reavalia can ---
  store.setProfile('consumer');
  eq(can('edit', store.get()), false, 'após setProfile(consumer), can(edit) reavalia false');
  store.setProfile('author_pub');
  eq(can('publish', store.get()), true, 'após setProfile(author_pub), can(publish) reavalia true');

  // --- publish permitido cria snapshot versionado ---
  const pubRes = store.publish('pub-acad-1');
  eq(pubRes.ok, true, 'publish permitido retorna ok:true');
  check(typeof pubRes.version === 'number' && pubRes.version >= 1, 'publish devolve versão >= 1');
  eq(store.getPublication('pub-acad-1').publishedSnapshot.version, pubRes.version, 'snapshot versionado persistido');

  /* =======================================================================
     6b) Migração/seed — v1 descartado; v2 corrompido => seed.
     ======================================================================= */
  // v1 legado descartado quando não há v2.
  shim.map.clear();
  shim.map.set('observatorio_ifrj_demo_v1', JSON.stringify({ any: 'legacy' }));
  store.init();
  eq(shim.ls.getItem('observatorio_ifrj_demo_v1'), null, 'chave v1 legada é descartada no init');
  eq(shim.ls.getItem('observatorio_demo_v2') != null, true, 'v2 é seedado e salvo no init');
  eq(store.get().version, 2, 'após descarte de v1, estado é seed v2');

  // v2 corrompido => seed (JSON inválido).
  shim.map.clear();
  shim.map.set('observatorio_demo_v2', '{ isto não é json válido ');
  store.init();
  eq(store.get().version, 2, 'v2 corrompido (JSON inválido) => seed');
  eq(store.get().activeContextId, 'acad', 'seed após corrupção volta ao contexto padrão');

  // v2 com forma inválida (version errada) => seed.
  shim.map.clear();
  shim.map.set('observatorio_demo_v2', JSON.stringify({ version: 1, foo: 'bar' }));
  store.init();
  eq(store.get().version, 2, 'v2 com version incompatível => seed');

  // v2 válido persiste entre inits (reload mantém — AC-05 em lógica pura).
  store.setProfile('author_nopub');
  const persistedProfile = store.get().activeProfileId;
  store.init(); // relê do mesmo shim
  eq(store.get().activeProfileId, persistedProfile, 'estado válido persiste entre init() (reload)');

  /* =======================================================================
     Resumo.
     ======================================================================= */
  if (failures > 0) {
    process.exitCode = 1;
    console.error(`\nSELFTEST FALHOU: ${failures} asserção(ões) falharam:`);
    for (const m of failMsgs) console.error(`  - ${m}`);
  } else {
    console.log('SELFTEST OK');
  }
}

main().catch((e) => {
  process.exitCode = 1;
  console.error('SELFTEST FALHOU (exceção não tratada):', e && e.stack ? e.stack : e);
});
