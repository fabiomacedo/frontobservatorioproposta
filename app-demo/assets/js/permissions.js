/* =========================================================================
   permissions.js — Permissões simuladas centralizadas (design (i)).
   ---------------------------------------------------------------------------
   Simulação no navegador apenas. A implementação real exigirá validação no
   backend. Assinatura única: can(action, state) -> boolean.

   action ∈ {'view','edit','compose','publish'}
   state.activeProfileId ∈ {consumer, author_nopub, author_pub}

   Matriz (design (i)):
     perfil         | view | edit | compose | publish
     consumer       |  ✓   |  ✗   |   ✗     |   ✗
     author_nopub   |  ✓   |  ✓   |   ✓     |   ✗
     author_pub     |  ✓   |  ✓   |   ✓     |   ✓

   `view` é RESERVADA: true para todos os perfis (leitura sempre liberada na
   demo); declarada para futuro gatilho, nenhum mutador atual a consome.
   ========================================================================= */

export const PROFILES = ['consumer', 'author_nopub', 'author_pub'];

export const ACTIONS = ['view', 'edit', 'compose', 'publish'];

/* Matriz de permissões por perfil. */
export const PERMISSION_MATRIX = {
  consumer: { view: true, edit: false, compose: false, publish: false },
  author_nopub: { view: true, edit: true, compose: true, publish: false },
  author_pub: { view: true, edit: true, compose: true, publish: true },
};

/* -------------------------------------------------------------------------
   can(action, state) -> boolean. Padroniza a assinatura (MEDIUM-5).
   Perfil ausente/desconhecido => sem permissão (exceto nada: default deny),
   mas `view` nunca é negada quando o perfil é conhecido.
   ------------------------------------------------------------------------- */
export function can(action, state) {
  const profileId = state && state.activeProfileId;
  const row = PERMISSION_MATRIX[profileId];
  if (!row) return false; // perfil desconhecido => default deny
  return row[action] === true;
}

/* -------------------------------------------------------------------------
   Mapeamento ação-do-store -> permissão (design (i), tabela 1:1).
   Reusado pelo store (FEAT-002) e pela visibilidade de botões (FEAT-004).
   Valor null => navegação/estado de UI, SEM checagem de permissão.
   ------------------------------------------------------------------------- */
export const ACTION_PERMISSION = {
  // edição de análise
  saveAnalysis: 'edit',
  updateAnalysis: 'edit',
  // composição (compositor)
  addBlock: 'compose',
  removeBlock: 'compose',
  moveBlock: 'compose',
  applyTemplate: 'compose',
  setDevice: 'compose',
  setBlockProps: 'compose',
  // publicação
  publish: 'publish',
  // navegação / estado de UI (sem checagem)
  setContext: null,
  setFilter: null,
  clearFilters: null,
  setCatalogQuery: null,
  setProfile: null,
  reset: null,
};

/* Permissão exigida por uma ação do store (undefined se desconhecida). */
export function permissionForStoreAction(action) {
  return ACTION_PERMISSION[action];
}
