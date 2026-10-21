/* =========================================================================
   views.js — Telas da interface SIMULADA do Observatório IFRJ.
   Cada view exporta render() -> HTML e, quando precisa, afterRender(root).
   ========================================================================= */

import {
  KPIS, SERIES_MATRICULAS, POR_CAMPUS, EVASAO_CURSO, CATALOGO, CAMPI, PERIODS,
  MODALIDADES, LEXICO, AI_SCRIPTS, AI_SUGGESTIONS, fmtValue, fmtInt,
} from './data.js';
import { lineChart, barChart, donutChart, sparkline, esc } from './charts.js';
import { store } from './store.js';
import { openMethodology, toast } from './app.js';

/* ---------- helpers ---------- */
function kpiCard(k) {
  const good = k.good === 'down' ? k.delta < 0 : k.delta > 0;
  const arrow = k.delta >= 0 ? '▲' : '▼';
  return `<div class="kpi">
    <div class="k-lbl">${esc(k.label)}
      <button class="btn ghost sm" style="padding:1px 5px" data-method="${esc(k.label)}" aria-label="Metodologia de ${esc(k.label)}" title="Metodologia">ⓘ</button>
    </div>
    <div class="k-val">${fmtValue(k.value, k.fmt)}</div>
    <div class="k-delta ${good ? 'up' : 'down'}">${arrow} ${Math.abs(k.delta).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}% <span class="muted">vs. período anterior</span></div>
    <div class="k-spark">${sparkline(k.spark, good ? 'var(--ifrj-green)' : 'var(--chart-5)')}</div>
  </div>`;
}

function filterBar() {
  const f = store.get().filters;
  const opt = (arr, cur) => arr.map((x) => `<option${x === cur ? ' selected' : ''}>${esc(x)}</option>`).join('');
  return `<div class="filterbar">
    <div class="fld"><label for="f-campus">Campus</label><select id="f-campus" data-filter="campus">${opt(CAMPI, f.campus)}</select></div>
    <div class="fld"><label for="f-period">Período</label><select id="f-period" data-filter="period">${opt(PERIODS, f.period)}</select></div>
    <div class="fld"><label for="f-mod">Modalidade</label><select id="f-mod" data-filter="modalidade">${opt(MODALIDADES, f.modalidade)}</select></div>
    <div class="chips" style="margin-left:auto">
      ${activeChips(f)}
      <button class="btn sm ghost" data-clear>Limpar</button>
    </div>
  </div>`;
}
function activeChips(f) {
  const chips = [];
  if (f.campus !== 'Todos os campi') chips.push(['campus', f.campus]);
  if (f.modalidade !== 'Todas') chips.push(['modalidade', f.modalidade]);
  chips.push(['period', f.period]);
  return chips.map(([k, v]) => `<span class="chip">${esc(v)}${k !== 'period' ? ` <button data-remove="${k}" aria-label="Remover">×</button>` : ''}</span>`).join('');
}

/* ===================== DASHBOARD (Explorar) ===================== */
export const dashboard = {
  render() {
    return `
    <div class="page-title">
      <div><h1>Visão geral</h1><p>Panorama acadêmico institucional — indicadores do período selecionado.</p></div>
      <div class="page-actions">
        <button class="btn" data-goto="assistant"><span class="ic">✨</span> Criar com IA</button>
        <button class="btn primary" data-goto="composer"><span class="ic">▤</span> Nova publicação</button>
      </div>
    </div>
    ${filterBar()}
    <div class="kpis">${KPIS.map(kpiCard).join('')}</div>

    <div class="grid-2">
      <div class="panel span-2">
        <div class="p-head"><div><h3>Matrículas por modalidade</h3><div class="p-sub">Série temporal · 2024.1 a 2026.1</div></div>
          <button class="btn sm" data-method="Matrículas ativas">Metodologia</button></div>
        <div class="p-body">${lineChart(SERIES_MATRICULAS.labels, SERIES_MATRICULAS.datasets, { unit: 'matrículas' })}</div>
        <div class="p-foot"><span><b>Unidade:</b> matrículas ativas</span><span><b>Fonte:</b> Léxico IFRJ (fictício)</span><span><b>Atualização:</b> há 3 h (demo)</span></div>
      </div>

      <div class="panel">
        <div class="p-head"><div><h3>Matrículas por campus</h3><div class="p-sub">2026.1 · valores fictícios</div></div></div>
        <div class="p-body">${barChart(POR_CAMPUS, { valueKey: 'valor', labelKey: 'campus' })}</div>
      </div>

      <div class="panel">
        <div class="p-head"><div><h3>Perfil de ingresso</h3><div class="p-sub">Distribuição por forma de ingresso (fictícia)</div></div></div>
        <div class="p-body">${donutChart([
          { label: 'Ampla concorrência', value: 52 },
          { label: 'Cotas sociais', value: 28 },
          { label: 'Cotas raciais', value: 14 },
          { label: 'PcD', value: 6 },
        ])}</div>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="p-head"><div><h3>Evasão por curso</h3><div class="p-sub">Ordenado por maior taxa · 2026.1</div></div>
        <button class="btn sm" data-method="Taxa de evasão">Metodologia</button></div>
      <div class="p-body" style="padding:0">
        <table class="dt">
          <thead><tr><th>Curso</th><th>Campus</th><th class="num">Matrículas</th><th class="num">Evasão</th></tr></thead>
          <tbody>${[...EVASAO_CURSO].sort((a,b)=>b.evasao-a.evasao).map((r)=>`
            <tr><td>${esc(r.curso)}</td><td>${esc(r.campus)}</td>
              <td class="num">${fmtInt(r.matriculas)}</td>
              <td class="num"><span class="badge ${r.evasao>14?'amber':'green'}">${r.evasao.toLocaleString('pt-BR',{minimumFractionDigits:1})}%</span></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  },
  afterRender(root) { wireFilters(root); wireMethod(root); wireGoto(root); },
};

/* ===================== CATÁLOGO ===================== */
export const catalog = {
  render() {
    const tag = (t) => t === 'Oficial' ? 'green' : 'gray';
    return `
    <div class="page-title">
      <div><h1>Catálogo de análises</h1><p>Análises salvas e reutilizáveis em publicações e painéis.</p></div>
      <div class="page-actions"><button class="btn" data-goto="assistant"><span class="ic">✨</span> Criar com IA</button></div>
    </div>
    <div class="catalog">
      ${CATALOGO.map((a) => `
        <div class="an-card">
          <div class="ac-vis">${miniViz(a.type)}</div>
          <div class="ac-body">
            <h4>${esc(a.title)}</h4>
            <div class="ac-meta">${esc(a.type)} · ${esc(a.author)}</div>
            <div class="ac-meta">Atualizada ${esc(a.updated)}</div>
            <div><span class="badge ${tag(a.tag)}">${esc(a.tag)}</span></div>
          </div>
          <div class="ac-foot">
            <button class="btn sm" data-open-an="${esc(a.id)}">Abrir</button>
            <button class="btn sm ghost" data-add-an="${esc(a.title)}">+ Publicação</button>
          </div>
        </div>`).join('')}
    </div>`;
  },
  afterRender(root) {
    wireGoto(root);
    root.querySelectorAll('[data-open-an]').forEach((b) => b.addEventListener('click', () => toast('Abrindo análise (simulação)', 'Nenhuma chamada externa é feita.')));
    root.querySelectorAll('[data-add-an]').forEach((b) => b.addEventListener('click', () => {
      store.addBlock('chart', { ref: 'matriculas-lines', label: b.getAttribute('data-add-an') });
      toast('Adicionada à publicação', 'Veja em "Nova publicação".');
    }));
  },
};
function miniViz(type) {
  if (type === 'Barras') return barChart(POR_CAMPUS.slice(0,4), {});
  if (type === 'Tabela') return '<div class="muted small" style="padding:12px">▤ pré-visualização de tabela</div>';
  if (type === 'Indicador') return '<div style="font-size:26px;font-weight:800;color:var(--ifrj-green)">92%</div>';
  if (type === 'Pizza') return donutChart([{label:'A',value:6},{label:'B',value:3},{label:'C',value:2}], { size: 90 });
  return sparkline([3,4,3,5,6,6,7], 'var(--ifrj-green)');
}

/* ===================== ASSISTENTE DE IA ===================== */
let aiState = { messages: [], pendingClarify: null, result: null };

export const assistant = {
  render() {
    return `
    <div class="page-title">
      <div><h1>Criar com IA</h1><p>Converse com os dados em linguagem natural. A IA propõe a análise; você valida antes de salvar.</p></div>
    </div>
    <div class="assistant">
      <div class="chat-col">
        <div class="chat-window">
          <div class="chat-scroll" id="chat-scroll" aria-live="polite">${renderMessages()}</div>
          <div class="suggestions" id="ai-suggestions">
            ${AI_SUGGESTIONS.map((s) => `<button data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}
          </div>
          <form class="chat-input" id="chat-form">
            <textarea id="chat-text" placeholder="Pergunte algo sobre os dados do IFRJ…" aria-label="Mensagem"></textarea>
            <button class="btn primary" type="submit">Enviar</button>
          </form>
        </div>
        <p class="small muted" style="margin-top:8px">Demonstração: o assistente segue um roteiro fictício. Não há confiança percentual inventada e nada é publicado automaticamente.</p>
      </div>

      <div class="preview-col">
        <div class="panel" id="ai-preview">${renderPreview()}</div>
      </div>
    </div>`;
  },
  afterRender(root) {
    const form = root.querySelector('#chat-form');
    const text = root.querySelector('#chat-text');
    const send = (msg) => { handleUser(msg, root); };
    form.addEventListener('submit', (e) => { e.preventDefault(); const v = text.value.trim(); if (v) { text.value = ''; send(v); } });
    text.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    root.querySelectorAll('[data-suggest]').forEach((b) => b.addEventListener('click', () => send(b.getAttribute('data-suggest'))));
    wirePreviewActions(root);
    wireMethod(root);
  },
};

function renderMessages() {
  if (!aiState.messages.length) {
    return `<div class="msg ai"><div class="who">Assistente IFRJ</div>Olá! Posso montar análises sobre matrículas, evasão, campi e mais. O que você quer ver? <span class="muted">(dados fictícios)</span></div>`;
  }
  return aiState.messages.map((m) => {
    if (m.typing) return `<div class="msg ai typing"><div class="who">Assistente IFRJ</div><span class="dots"><i></i><i></i><i></i></span></div>`;
    return `<div class="msg ${m.role}${m.clarify ? ' clarify' : ''}"><div class="who">${m.role === 'user' ? 'Você' : 'Assistente IFRJ'}</div>${m.html}</div>`;
  }).join('');
}

function renderPreview() {
  if (!aiState.result) {
    return `<div class="p-head"><h3>Prévia da análise</h3></div>
      <div class="p-body"><div class="empty-preview"><div class="big">📊</div><p>A proposta da IA aparece aqui para você validar antes de salvar.</p></div></div>`;
  }
  const r = aiState.result;
  const u = r.understanding;
  return `
    <div class="p-head"><div><h3>${esc(r.title)}</h3><div class="p-sub">Proposta da IA — valide antes de salvar</div></div>
      <button class="btn sm" data-method="${esc((u.medida||'').replace(/\s*\(.*/, ''))}">Metodologia</button></div>
    <div class="p-body">
      <div class="understanding" style="margin-bottom:14px">
        ${Object.entries(u).map(([k, v]) => `<div class="u-row"><span class="u-k">${esc(cap(k))}</span><span class="u-v">${esc(v)}</span></div>`).join('')}
      </div>
      ${vizFor(r.viz)}
      <p class="small muted" style="margin-top:8px">${esc(r.note)}</p>
    </div>
    <div class="p-foot" style="justify-content:flex-end;gap:8px">
      <button class="btn sm" data-ai="ajustar">Ajustar</button>
      <button class="btn sm" data-ai="add">Adicionar à publicação</button>
      <button class="btn sm primary" data-ai="salvar">Salvar análise</button>
    </div>`;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function vizFor(key) {
  if (key === 'matriculas-lines') return lineChart(SERIES_MATRICULAS.labels, SERIES_MATRICULAS.datasets, {});
  if (key === 'campus-bars') return barChart(POR_CAMPUS, {});
  if (key === 'evasao-bars') return barChart([...EVASAO_CURSO].sort((a,b)=>b.evasao-a.evasao).map((e)=>({curso:e.curso,v:e.evasao})), { valueKey:'v', labelKey:'curso', unit:'%' });
  return '';
}

function handleUser(msg, root) {
  aiState.messages.push({ role: 'user', html: esc(msg) });
  // Esclarecimento pendente respondido?
  const lower = msg.toLowerCase();
  if (aiState.pendingClarify) {
    const script = aiState.pendingClarify;
    aiState.pendingClarify = null;
    pushTyping(root, () => { aiState.result = script.result; aiState.messages.push({ role: 'ai', html: `Pronto. Gerei <strong>${esc(script.result.title)}</strong>. Confira a prévia ao lado e valide.` }); rerenderAI(root); });
    rerenderAI(root);
    return;
  }
  const script = AI_SCRIPTS.find((s) => s.match.some((m) => lower.includes(m)));
  if (!script) {
    pushTyping(root, () => { aiState.messages.push({ role: 'ai', html: 'Posso ajudar com <strong>matrículas</strong>, <strong>evasão</strong> ou <strong>campi</strong>. Tente uma dessas (dados fictícios).' }); rerenderAI(root); });
    rerenderAI(root); return;
  }
  if (script.clarify) {
    aiState.pendingClarify = script;
    pushTyping(root, () => { aiState.messages.push({ role: 'ai', clarify: true, html: `${script.clarify}<br><span class="muted small">${esc(script.followHint||'')}</span>` }); rerenderAI(root); });
    rerenderAI(root); return;
  }
  pushTyping(root, () => { aiState.result = script.result; aiState.messages.push({ role: 'ai', html: `Gerei <strong>${esc(script.result.title)}</strong>. Veja a prévia ao lado e valide antes de salvar.` }); rerenderAI(root); });
  rerenderAI(root);
}
function pushTyping(root, done) {
  aiState.messages.push({ typing: true });
  rerenderAI(root);
  setTimeout(() => { aiState.messages = aiState.messages.filter((m) => !m.typing); done(); }, 650);
}
function rerenderAI(root) {
  const scroll = root.querySelector('#chat-scroll');
  if (scroll) { scroll.innerHTML = renderMessages(); scroll.scrollTop = scroll.scrollHeight; }
  const prev = root.querySelector('#ai-preview');
  if (prev) prev.innerHTML = renderPreview();
  wirePreviewActions(root); wireMethod(root);
}
function wirePreviewActions(root) {
  root.querySelectorAll('[data-ai]').forEach((b) => b.addEventListener('click', () => {
    const a = b.getAttribute('data-ai');
    if (a === 'salvar') toast('Análise salva', 'Disponível no catálogo (simulação local).');
    if (a === 'add') { store.addBlock('chart', { ref: aiState.result?.viz || 'matriculas-lines', label: aiState.result?.title }); toast('Adicionada à publicação', 'Veja em "Nova publicação".'); }
    if (a === 'ajustar') toast('Ajuste manual', 'Abriria o editor de análise. Nada foi alterado.');
  }));
}

/* ===================== COMPOSITOR / PUBLICAÇÃO ===================== */
export const composer = {
  render() {
    const c = store.get().composer;
    return `
    <div class="page-title">
      <div><h1>Nova publicação</h1><p>Monte uma página combinando títulos, indicadores, gráficos e textos.</p></div>
      <div class="page-actions">
        <button class="btn sm" data-dev="desktop" aria-pressed="${c.device==='desktop'}">Desktop</button>
        <button class="btn sm" data-dev="mobile" aria-pressed="${c.device==='mobile'}">Mobile</button>
        <button class="btn" data-pub="draft">Salvar rascunho</button>
        <button class="btn primary" data-pub="publish">Publicar</button>
      </div>
    </div>
    <div class="row small muted" style="margin:0 0 14px">Status atual: <span class="badge ${c.status==='published'?'green':'gray'}">${c.status==='published'?'Publicado':'Rascunho'}</span></div>
    <div class="composer">
      <div class="palette">
        <h4>Adicionar bloco</h4>
        <button class="btn sm pbtn" data-add="title"><span class="ic">H</span> Título</button>
        <button class="btn sm pbtn" data-add="text"><span class="ic">¶</span> Texto</button>
        <button class="btn sm pbtn" data-add="metric"><span class="ic">#</span> Indicador</button>
        <button class="btn sm pbtn" data-add="chart"><span class="ic">📈</span> Gráfico</button>
        <button class="btn sm pbtn" data-add="table"><span class="ic">▤</span> Tabela</button>
        <hr class="soft">
        <p class="small muted">Reordene com ▲ ▼. Rascunho salvo no navegador.</p>
      </div>
      <div class="canvas device-${c.device}" id="canvas">${renderBlocks(c)}</div>
    </div>`;
  },
  afterRender(root) {
    root.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => { store.addBlock(b.getAttribute('data-add')); }));
    root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => store.removeBlock(b.getAttribute('data-del'))));
    root.querySelectorAll('[data-move]').forEach((b) => b.addEventListener('click', () => store.moveBlock(b.getAttribute('data-id'), b.getAttribute('data-move'))));
    root.querySelectorAll('[data-dev]').forEach((b) => b.addEventListener('click', () => store.setDevice(b.getAttribute('data-dev'))));
    root.querySelectorAll('[data-pub]').forEach((b) => b.addEventListener('click', () => {
      const a = b.getAttribute('data-pub');
      store.setStatus(a === 'publish' ? 'published' : 'draft');
      toast(a === 'publish' ? 'Publicação simulada' : 'Rascunho salvo', 'Nada foi enviado a servidores. Armazenamento local.');
    }));
  },
};
function renderBlocks(c) {
  if (!c.blocks.length) return '<p class="muted small">Sem blocos. Use a paleta ao lado.</p>';
  return c.blocks.map((b, i) => `
    <div class="pub-block">
      <div class="pb-bar">
        <span class="pb-type">${esc(b.type)}</span>
        <div class="pb-ctrl">
          <button class="btn ghost sm" data-move="up" data-id="${esc(b.id)}" ${i===0?'disabled':''} aria-label="Subir">▲</button>
          <button class="btn ghost sm" data-move="down" data-id="${esc(b.id)}" ${i===c.blocks.length-1?'disabled':''} aria-label="Descer">▼</button>
          <button class="btn ghost sm" data-del="${esc(b.id)}" aria-label="Remover">✕</button>
        </div>
      </div>
      <div class="pb-body">${blockBody(b)}</div>
    </div>`).join('');
}
function blockBody(b) {
  switch (b.type) {
    case 'title': return `<h2 style="margin:0;font-size:22px">${esc(b.content)}</h2>`;
    case 'text': return `<p style="margin:0">${esc(b.content)}</p>`;
    case 'metric': { const k = KPIS.find((x) => x.id === b.ref) || KPIS[0]; return kpiCard(k); }
    case 'chart': return `${b.label ? `<div class="small muted" style="margin-bottom:6px">${esc(b.label)}</div>` : ''}${vizFor(b.ref || 'matriculas-lines') || lineChart(SERIES_MATRICULAS.labels, SERIES_MATRICULAS.datasets, {})}`;
    case 'table': return barChart(POR_CAMPUS, {});
    default: return esc(b.type);
  }
}

/* ---------- wiring compartilhado ---------- */
function wireFilters(root) {
  root.querySelectorAll('[data-filter]').forEach((sel) => sel.addEventListener('change', () => store.setFilter(sel.getAttribute('data-filter'), sel.value)));
  root.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => {
    const k = b.getAttribute('data-remove');
    store.setFilter(k, k === 'campus' ? 'Todos os campi' : 'Todas');
  }));
  const clr = root.querySelector('[data-clear]');
  if (clr) clr.addEventListener('click', () => store.clearFilters());
}
function wireMethod(root) {
  root.querySelectorAll('[data-method]').forEach((b) => b.addEventListener('click', () => {
    const term = b.getAttribute('data-method');
    openMethodology(term, LEXICO[term]);
  }));
}
function wireGoto(root) {
  root.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => { location.hash = '#' + b.getAttribute('data-goto'); }));
}

// Reseta o estado do assistente ao sair (chamado pelo router).
export function resetAssistant() { aiState = { messages: [], pendingClarify: null, result: null }; }
