/* Página 3 — Jornadas e modos [DOC-03] */
import { JOURNEYS } from '../assets/js/data.js';
import { stateChip, esc, anchor } from '../assets/js/components.js';

const MODES = Object.keys(JOURNEYS);

export function render() {
  const tabs = MODES.map((m, i) => `
    <button type="button" role="tab" id="tab-${m}" aria-controls="panel-journey"
            aria-selected="${i === 0}" data-mode="${esc(m)}">${esc(m)}</button>`).join('');

  return `
  <div class="page-head">
    <div class="doc">DOC-03 · Jornadas</div>
    <h2>Jornadas e modos ${anchor('03-jornadas')}</h2>
    <p class="lead">Trilhas de uso do Observatório. Modo de uso é separado de autorização.</p>
  </div>

  <div class="callout">
    <strong>Modo de uso ≠ autorização.</strong> Estar autenticado não equivale a permissão de editar
    ou publicar. A autorização é decidida fora da interface (PR-07).
  </div>

  <section class="block">
    <div class="journey-tabs" role="tablist" aria-label="Modos de uso">${tabs}</div>
    <div id="panel-journey" role="tabpanel" aria-labelledby="tab-${MODES[0]}">
      ${renderSteps(MODES[0])}
    </div>
  </section>`;
}

function renderSteps(mode) {
  const steps = JOURNEYS[mode] || [];
  return `<div class="journey-steps">
    ${steps.map((s, i) => `
      <div class="journey-step">
        <div class="js-n">${i + 1}</div>
        <div>
          <div class="row" style="justify-content:space-between">
            <strong>${esc(s.action)}</strong>
            ${stateChip(s.state)}
          </div>
          <div class="js-grid">
            <div><b>Usuário</b>${esc(s.user)}</div>
            <div><b>Componente</b>${esc(s.component)}</div>
            <div><b>Integração</b>${esc(s.integration)}</div>
            <div><b>Critério de aceite</b>${esc(s.accept)}</div>
          </div>
        </div>
      </div>`).join('')}
  </div>`;
}

export function afterRender(root) {
  const panel = root.querySelector('#panel-journey');
  root.querySelectorAll('.journey-tabs [role="tab"]').forEach((tab) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const tabs = [...root.querySelectorAll('.journey-tabs [role="tab"]')];
      const i = tabs.indexOf(tab);
      if (e.key === 'ArrowRight') { e.preventDefault(); select(tabs[(i + 1) % tabs.length]); tabs[(i + 1) % tabs.length].focus(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i - 1 + tabs.length) % tabs.length]); tabs[(i - 1 + tabs.length) % tabs.length].focus(); }
    });
  });

  function select(tab) {
    root.querySelectorAll('.journey-tabs [role="tab"]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    panel.setAttribute('aria-labelledby', tab.id);
    panel.innerHTML = renderSteps(tab.getAttribute('data-mode'));
  }
}
