/* =========================================================================
   charts.js — Gráficos SVG nativos (sem biblioteca). Acessíveis (role=img).
   ========================================================================= */

export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Mini sparkline para KPIs.
export function sparkline(series, color = 'var(--accent)') {
  const w = 120, h = 34, p = 3;
  const max = Math.max(...series), min = Math.min(...series), span = (max - min) || 1;
  const step = (w - p * 2) / (series.length - 1);
  const pts = series.map((v, i) => [p + i * step, h - p - ((v - min) / span) * (h - p * 2)]);
  const d = pts.map((pt, i) => (i ? 'L' : 'M') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1)).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="tendência">
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2"></path>
  </svg>`;
}

// Paleta ordenada padrão (CSS vars do contexto ativo). O chamador
// (renderAnalysis) repassa a mesma lista; a cor da série/fatia de índice i é
// palette[i % palette.length]. Série/valor único usa var(--accent).
const DEFAULT_PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

// Cor de uma série/fatia por índice: única série -> accent; senão paleta i%n.
function seriesColor(palette, i, count) {
  if (count <= 1) return 'var(--accent)';
  const pal = palette && palette.length ? palette : DEFAULT_PALETTE;
  return pal[i % pal.length];
}

// Gráfico de linhas multi-série com eixos simples.
export function lineChart(labels, datasets, { unit = '', height = 280, palette = DEFAULT_PALETTE } = {}) {
  const w = 680, h = height, L = 44, R = 12, T = 16, B = 34;
  const all = datasets.flatMap((d) => d.data);
  const max = Math.max(...all) * 1.08, min = Math.min(0, ...all);
  const span = (max - min) || 1;
  const xStep = (w - L - R) / (labels.length - 1);
  const x = (i) => L + i * xStep;
  const y = (v) => T + (1 - (v - min) / span) * (h - T - B);

  const gridVals = 4;
  const grid = Array.from({ length: gridVals + 1 }, (_, i) => {
    const v = min + (span * i) / gridVals;
    const yy = y(v);
    return `<line x1="${L}" y1="${yy.toFixed(1)}" x2="${w - R}" y2="${yy.toFixed(1)}" stroke="var(--line-2)"></line>
      <text x="${L - 7}" y="${(yy + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="var(--ink-400)">${Math.round(v).toLocaleString('pt-BR')}</text>`;
  }).join('');

  const xlabels = labels.map((lb, i) =>
    `<text x="${x(i).toFixed(1)}" y="${h - 10}" text-anchor="middle" font-size="10.5" fill="var(--ink-500)">${esc(lb)}</text>`).join('');

  const lines = datasets.map((d, di) => {
    const color = d.color || seriesColor(palette, di, datasets.length);
    const path = d.data.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    const dots = d.data.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="${color}"></circle>`).join('');
    return `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.5"></path>${dots}`;
  }).join('');

  const nameOf = (d) => d.label ?? d.name ?? d.key ?? '';
  const desc = datasets.map((d) => `${nameOf(d)}: ${d.data.join(', ')}`).join(' | ');
  const legend = `<div class="legend-row">${datasets.map((d, di) =>
    `<span class="lg"><span class="sw" style="background:${d.color || seriesColor(palette, di, datasets.length)}"></span>${esc(nameOf(d))}</span>`).join('')}</div>`;

  return `<div class="chart">
    <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Gráfico de linhas. ${esc(desc)}">
      ${grid}${lines}${xlabels}
    </svg>${legend}
    <p class="sr-only">${esc(desc)} ${esc(unit)}</p>
  </div>`;
}

// Gráfico de barras horizontais.
export function barChart(items, { valueKey = 'valor', labelKey = 'campus', color = 'var(--accent)', unit = '', palette = DEFAULT_PALETTE } = {}) {
  const max = Math.max(...items.map((i) => i[valueKey]));
  const rows = items.map((it) => {
    const pct = (it[valueKey] / max) * 100;
    return `<tr>
      <td>${esc(it[labelKey])}</td>
      <td class="bar-cell num" style="width:62%">
        <span class="bar" style="width:${pct.toFixed(1)}%"></span>
        <span>${it[valueKey].toLocaleString('pt-BR')}${unit}</span>
      </td>
    </tr>`;
  }).join('');
  return `<table class="dt" role="img" aria-label="Gráfico de barras">
    <tbody>${rows}</tbody>
  </table>`;
}

// Donut / pizza simples (fictício) com legenda.
// Cada fatia traz o valor BRUTO (geometria do arco) E o pct JÁ RECONCILIADO
// (de result.rows[].pct, soma exata = 100 feita no runQuery). O MESMO pct é
// usado no arco (legenda/descrição) e no texto acessível; não há mais
// Math.round(value/total) em lugar algum (rev-iter2 #2 / HIGH-2).
export function donutChart(slices, { size = 200, palette = DEFAULT_PALETTE } = {}) {
  const total = slices.reduce((s, x) => s + (Number(x.value) || 0), 0) || 1;
  const cx = size / 2, cy = size / 2, r = size / 2 - 10, rr = r * 0.58;
  let a0 = -Math.PI / 2;
  const colorAt = (i) => seriesColor(palette, i, slices.length);
  const paths = slices.map((s, i) => {
    const a1 = a0 + ((Number(s.value) || 0) / total) * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (ang, rad) => [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad];
    const [x0, y0] = p(a0, r), [x1, y1] = p(a1, r);
    const [x2, y2] = p(a1, rr), [x3, y3] = p(a0, rr);
    const d = `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} A${rr} ${rr} 0 ${large} 0 ${x3.toFixed(1)} ${y3.toFixed(1)} Z`;
    a0 = a1;
    return `<path d="${d}" fill="${colorAt(i)}"></path>`;
  }).join('');
  const pctOf = (s) => Number(s.pct) || 0; // pct reconciliado único
  const legend = `<div class="legend-row">${slices.map((s, i) =>
    `<span class="lg"><span class="sw" style="background:${colorAt(i)}"></span>${esc(s.label)} (${pctOf(s)}%)</span>`).join('')}</div>`;
  const desc = slices.map((s) => `${s.label}: ${pctOf(s)}%`).join(', ');
  return `<div class="chart" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Gráfico de pizza. ${esc(desc)}">${paths}</svg>
    <div>${legend}</div>
    <p class="sr-only">Distribuição: ${esc(desc)}</p>
  </div>`;
}

/* -------------------------------------------------------------------------
   tableChart(rows, columns, opts) — TABELA REAL (design (g)/(k), FR-7, NIT-6).
   columns: [{ key, label, type:'text'|'num'|'pct' }]. Renderiza <thead> real;
   num/pct alinhados à direita; células de STATUS levam prefixo de ícone/texto
   além da cor (NIT-6); todo texto por esc(). Substitui o hack em que o bloco
   'table' do compositor chamava barChart.
   ------------------------------------------------------------------------- */
// Prefixo de ícone/texto por status (nada apenas por cor — NIT-6).
const STATUS_GLYPH = {
  agendada: '◷', realizada: '✓', recusada: '✗', pendente: '…',
};
function statusCell(raw) {
  const key = String(raw ?? '').trim().toLowerCase();
  const glyph = STATUS_GLYPH[key];
  const label = esc(raw);
  return glyph ? `<span class="status-tag status-${esc(key)}"><span aria-hidden="true">${glyph}</span> ${label}</span>` : label;
}
function fmtCell(value, type) {
  if (value == null || value === '') return '';
  if (type === 'num') return Number(value).toLocaleString('pt-BR');
  if (type === 'pct') return `${Number(value).toLocaleString('pt-BR')}%`;
  return esc(value);
}
export function tableChart(rows, columns, { caption = '', statusKey = 'status' } = {}) {
  const cols = columns || [];
  const head = `<thead><tr>${cols.map((c) =>
    `<th scope="col" class="${c.type === 'num' || c.type === 'pct' ? 'num' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${(rows || []).map((row) =>
    `<tr>${cols.map((c) => {
      const isNum = c.type === 'num' || c.type === 'pct';
      const content = c.key === statusKey
        ? statusCell(row[c.key])
        : fmtCell(row[c.key], c.type);
      return `<td class="${isNum ? 'num' : ''}">${content}</td>`;
    }).join('')}</tr>`).join('')}</tbody>`;
  const cap = caption ? `<caption>${esc(caption)}</caption>` : '';
  return `<table class="dt">${cap}${head}${body}</table>`;
}
