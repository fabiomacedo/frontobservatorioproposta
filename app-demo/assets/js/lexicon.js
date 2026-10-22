/* =========================================================================
   lexicon.js — Montagem do CONTEXTO do LAL para o drawer de metodologia.
   ---------------------------------------------------------------------------
   Módulo PURO: sem imports, sem DOM. Opera só sobre os dados passados por
   parâmetro (paridade com a Opção C do site, idiomático à estrutura da demo).

   buildLexiconContext(measureCfg, contextCfg, term) -> { dimensoes, relacionados }
     - measureCfg: { appliesTo?: string[], ... } ou null. O CHAMADOR (wireMethod
       em views.js) resolve a medida a partir do term (lexicon) via
       (c.measures||[]).find(m => m.lexicon === term) ANTES de chamar. measureCfg
       do views.js resolve por m.key e NÃO serve aqui. Tolera measureCfg null.
     - contextCfg: { dimensions?: [{key,label}], methodology?: {[term]:{...,relations?}} }.
     - term: o lexicon da medida (chave de methodology).
   Retorna SEMPRE a mesma forma; ambas as listas podem ser [] (guard de vazio).
   ========================================================================= */

export function buildLexiconContext(measureCfg, contextCfg, term) {
  const dims = (measureCfg && measureCfg.appliesTo) || [];
  const dimensoes = dims.map((k) => {
    const d = ((contextCfg && contextCfg.dimensions) || []).find((x) => x.key === k);
    return { key: k, label: d ? d.label : k }; // fallback: a própria key como rótulo
  });
  const def = (contextCfg && contextCfg.methodology && contextCfg.methodology[term]) || null;
  const rel = (def && Array.isArray(def.relations)) ? def.relations : [];
  const relacionados = rel.map((r) => String(r));
  return { dimensoes, relacionados }; // ambas podem ser []
}
