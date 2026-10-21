/* Página 8 — Segurança e diagnóstico [DOC-07, DOC-08] */
import { AUTH_MATRIX, CHECKLIST } from '../assets/js/data.js';
import { store } from '../assets/js/state.js';
import { legend, esc, anchor } from '../assets/js/components.js';

const STATUS_OPTS = [
  ['nv', 'Não verificado'],
  ['cf', 'Confirmado'],
  ['pa', 'Parcial'],
  ['ix', 'Inexistente'],
];
const STATUS_CLASS = { nv: 'nv', cf: 'cf', pa: 'pa', ix: 'ix' };
const STATUS_LABEL = Object.fromEntries(STATUS_OPTS);

export function render() {
  return `
  <div class="page-head">
    <div class="doc">DOC-07 · DOC-08 · Segurança e diagnóstico</div>
    <h2>Segurança e diagnóstico ${anchor('08-seguranca-diagnostico')}</h2>
    <p class="lead">Matriz de autorização com perfis de teste ilustrativos e checklist técnico
    preenchível, sem respostas inventadas.</p>
  </div>

  ${legend()}

  <section class="block" id="matriz">
    <h3>Matriz de autorização ${anchor('matriz')}</h3>
    <p class="sub">Separar modo de uso de autorização (PR-07). Perfis de teste ilustrativos.</p>
    ${matrix()}
    <p class="small muted">Legenda: ● permitido · — não · ? a confirmar. ${esc(AUTH_MATRIX.note)}</p>
  </section>

  <section class="block" id="checklist">
    <h3>Checklist técnico ${anchor('checklist')}</h3>
    <p class="sub">14 questões para o diagnóstico. Preenchimentos ficam apenas no seu navegador e são
    marcados como não auditados.</p>
    <div class="callout">Não preencher respostas presumidas. Cada item começa em “Não verificado”.</div>
    <div id="checklist-host">${checklist()}</div>
  </section>`;
}

function matrix() {
  const head = `<tr><th>Perfil (teste)</th>${AUTH_MATRIX.capabilities.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>`;
  const rows = AUTH_MATRIX.profiles.map((p) => `
    <tr><td><strong>${esc(p)}</strong></td>${AUTH_MATRIX.capabilities.map((cap) => {
      const v = AUTH_MATRIX.grid[p][cap];
      const txt = v === '●' ? 'permitido' : v === '—' ? 'não' : 'a confirmar';
      return `<td><span aria-hidden="true">${v}</span> <span class="small muted">${txt}</span></td>`;
    }).join('')}</tr>`).join('');
  return `<table class="grid"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

function checklist() {
  return CHECKLIST.map((item) => {
    const cur = store.getChecklist(item.id);
    const opts = STATUS_OPTS.map(([v, l]) => `<option value="${v}"${v === cur.status ? ' selected' : ''}>${esc(l)}</option>`).join('');
    const badgeCls = STATUS_CLASS[cur.status] || 'nv';
    return `
    <div class="cl-item" data-q="${esc(item.id)}">
      <div class="cl-head">
        <div class="cl-q"><code>${esc(item.id)}</code> · ${esc(item.question)}</div>
        <div class="row">
          <span class="cl-badge ${badgeCls}" data-badge>${esc(STATUS_LABEL[cur.status] || 'Não verificado')}</span>
          <label class="small">Estado
            <select data-field="status" aria-label="Estado do item ${esc(item.id)}">${opts}</select>
          </label>
        </div>
      </div>
      <div class="cl-fields">
        <div><label>Evidência</label><textarea rows="2" data-field="evidence" placeholder="request/response saneado, print, link…">${esc(cur.evidence)}</textarea></div>
        <div><label>Responsável</label><input data-field="owner" value="${esc(cur.owner)}" placeholder="pessoa/equipe"></div>
        <div><label>Impacto</label><input data-field="impact" value="${esc(cur.impact)}" placeholder="alto/médio/baixo"></div>
        <div><label>Encaminhamento</label><input data-field="routing" value="${esc(cur.routing)}" placeholder="próximo passo"></div>
      </div>
      <p class="unaudited">Preenchimento local, não auditado.</p>
    </div>`;
  }).join('');
}

export function afterRender(root) {
  const host = root.querySelector('#checklist-host');
  if (!host) return;
  host.querySelectorAll('.cl-item').forEach((el) => {
    const id = el.getAttribute('data-q');
    el.querySelectorAll('[data-field]').forEach((input) => {
      const field = input.getAttribute('data-field');
      input.addEventListener('change', () => {
        store.setChecklist(id, { [field]: input.value });
        if (field === 'status') {
          const badge = el.querySelector('[data-badge]');
          badge.className = 'cl-badge ' + (STATUS_CLASS[input.value] || 'nv');
          badge.textContent = STATUS_LABEL[input.value] || 'Não verificado';
        }
      });
    });
  });
}
