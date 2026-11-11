/* ==========================================================================
   charts.js — gráficos autorais em SVG/HTML para dashboards premium
   Sem dependência. Cores vêm dos tokens (--accent, --ink, --ink-2, --ink-3,
   --context, --line, --bg). Cada gráfico já sai marcado com data-anim para o
   motion.js (chame Motion.play depois de desenhar) e expõe .update(dados).

   Charts.line(el, opts)   linha(s) com meta, área, anotações, rótulo direto e scrub
   Charts.bars(el, opts)   barras horizontais ordenadas (HTML), realce no hover, FLIP no update
   Charts.spark(el, opts)  sparkline
   Charts.bullet(el, opts) barra de meta com faixas, marca de meta e de "hoje"
   Charts.heat(el, opts)   faixa/mapa de calor (linhas × colunas)
   Charts.ring(el, opts)   anel fino de progresso
   Charts.stack(el, opts)  barra única 100% segmentada com legenda direta
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------- estilos base (sobrescreva no seu CSS se quiser) ---------- */
  const CSS = `
  .ch-svg{display:block;width:100%;overflow:visible}
  .ch-grid{stroke:var(--line,rgba(0,0,0,.12));stroke-width:1;shape-rendering:crispEdges}
  .ch-axis{fill:var(--ink-3,#888);font:500 11px/1 var(--font-text,system-ui);font-variant-numeric:tabular-nums}
  .ch-line{fill:none;stroke:var(--accent,#e0401c);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
  .ch-ctx{fill:none;stroke:var(--context,#bbb);stroke-width:1.25;stroke-linejoin:round}
  .ch-target{fill:none;stroke:var(--ink-2,#555);stroke-width:1;stroke-dasharray:3 4}
  .ch-dot{fill:var(--accent,#e0401c);stroke:var(--bg,#fff);stroke-width:2}
  .ch-dot-ctx{fill:var(--context,#bbb);stroke:var(--bg,#fff);stroke-width:2}
  .ch-end{font:600 13px/1 var(--font-num,system-ui);fill:var(--ink,#111);font-variant-numeric:tabular-nums}
  .ch-end-sub{font:500 11px/1 var(--font-text,system-ui);fill:var(--ink-3,#888)}
  .ch-end.ctx{fill:var(--ink-2,#666);font-weight:500}
  .ch-anno-line{stroke:var(--ink-2,#555);stroke-width:1}
  .ch-anno{font:italic 500 11.5px/1 var(--font-text,system-ui);fill:var(--ink-2,#555)}
  .ch-scrub-line{stroke:var(--ink,#111);stroke-width:1;stroke-opacity:.5}
  .ch-read{font:600 12px/1 var(--font-num,system-ui);fill:var(--ink,#111);font-variant-numeric:tabular-nums}
  .ch-read-sub{font:500 11px/1 var(--font-text,system-ui);fill:var(--ink-3,#888)}
  .ch-end,.ch-end-sub,.ch-anno,.ch-read,.ch-read-sub,.ch-axis{paint-order:stroke;stroke:var(--bg,#fff);stroke-width:4px;stroke-linejoin:round}
  .ch-hit{fill:transparent;cursor:crosshair;touch-action:pan-y}

  .ch-bars{display:grid;gap:2px}
  .ch-row{display:grid;grid-template-columns:minmax(110px,32%) 1fr auto;align-items:center;gap:14px;
    padding:9px 0;border-top:1px solid var(--line,rgba(0,0,0,.1));transition:opacity .16s ease}
  .ch-row:first-child{border-top:0}
  .ch-row-label{font-size:13.5px;color:var(--ink,#111);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ch-row-label small{display:block;font-size:11px;color:var(--ink-3,#888);margin-top:2px}
  .ch-track{position:relative;height:10px}
  .ch-bar{position:absolute;inset:0;background:var(--context,#bbb);transform-origin:left center;
    transition:transform .6s cubic-bezier(.16,1,.3,1),background-color .2s}
  .ch-row.is-hl .ch-bar{background:var(--accent,#e0401c)}
  .ch-mark{position:absolute;top:-4px;bottom:-4px;width:1.5px;background:var(--ink,#111)}
  .ch-row-val{font:600 13.5px/1 var(--font-num,system-ui);font-variant-numeric:tabular-nums;min-width:76px;text-align:right}
  .ch-bars.is-dim .ch-row:not(.is-hot){opacity:.38}

  .ch-bullet{position:relative;height:28px}
  .ch-bullet .rng{position:absolute;top:6px;bottom:6px;background:var(--context,#ccc)}
  .ch-bullet .val{position:absolute;left:0;top:10px;bottom:10px;background:var(--accent,#e0401c);transform-origin:left center}
  .ch-bullet .tgt{position:absolute;top:0;bottom:0;width:2px;background:var(--ink,#111)}
  .ch-bullet .now{position:absolute;top:2px;bottom:2px;width:0;border-left:1.5px dashed var(--ink-2,#555)}

  .ch-heat{display:grid;gap:3px;font:500 10.5px/1 var(--font-text,system-ui);color:var(--ink-3,#888)}
  .ch-heat .cell{position:relative;height:var(--cell-h,18px)}
  .ch-heat .cell::before{content:"";position:absolute;inset:0;background:var(--accent,#e0401c);opacity:var(--o,.1)}
  .ch-heat .cell:hover{outline:1.5px solid var(--ink,#111);outline-offset:1px}
  .ch-heat .rl{align-self:center;padding-right:6px;white-space:nowrap}
  .ch-heat .cl{text-align:center;padding-top:4px}

  .ch-ring-track{fill:none;stroke:var(--line,rgba(0,0,0,.12))}
  .ch-ring-val{fill:none;stroke:var(--accent,#e0401c);stroke-linecap:butt}

  .ch-stack .bar{display:flex;height:14px;gap:2px}
  .ch-stack .seg{background:var(--context,#bbb);transform-origin:left center}
  .ch-stack .seg:first-child{background:var(--accent,#e0401c)}
  .ch-stack .leg{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:10px;font-size:12.5px;color:var(--ink-2,#555)}
  .ch-stack .leg b{font:600 13px var(--font-num,system-ui);color:var(--ink,#111);font-variant-numeric:tabular-nums;margin-right:4px}
  `;
  if (!document.getElementById('charts-css')) {
    const s = document.createElement('style'); s.id = 'charts-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- utilidades ---------- */
  let uid = 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const defFmt = v => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v);
  const compact = v => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  const reduced = () => global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - t, 4);

  function niceScale(min, max, count) {
    if (min === max) { max = min + 1; }
    const raw = (max - min) / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const e = raw / mag;
    const step = (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * mag;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    const ticks = []; for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
    return { lo, hi, ticks };
  }

  // caminho com curva monotônica (não ultrapassa os pontos) ou reto
  function pathD(pts, smooth) {
    if (!pts.length) return '';
    if (!smooth || pts.length < 3) return 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
    const n = pts.length, dx = [], dy = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; dy[i] = pts[i + 1][1] - pts[i][1]; m[i] = dy[i] / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
      const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
      if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
    }
    let d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i] / 3;
      d += 'C' + (pts[i][0] + h).toFixed(1) + ',' + (pts[i][1] + h * t[i]).toFixed(1) + ' ' +
        (pts[i + 1][0] - h).toFixed(1) + ',' + (pts[i + 1][1] - h * t[i + 1]).toFixed(1) + ' ' +
        pts[i + 1][0].toFixed(1) + ',' + pts[i + 1][1].toFixed(1);
    }
    return d;
  }

  function tweenArrays(from, to, dur, onFrame) {
    if (reduced() || !from) { onFrame(to, 1); return; }
    const start = performance.now();
    const frame = now => {
      const t = Math.min(1, (now - start) / dur), k = ease(t);
      onFrame(to.map((arr, si) => arr.map((v, i) => {
        const a = from[si] && from[si][i];
        return v == null || a == null ? v : lerp(a, v, k);
      })), t);
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ======================================================================
     LINHA
     opts: series[{values, label, accent}], labels[], target{values,label},
           annotations[{index,text}], area, smooth, height, zero, ticks,
           format (valores), axisFormat (eixo), endLabels (default true),
           delay (ms, início da coreografia), onScrub(i|null, valores)
     ====================================================================== */
  function line(el, opts) {
    opts = Object.assign({ height: 260, area: true, smooth: true, endLabels: true, ticks: 4, delay: 300,
      format: defFmt, axisFormat: compact, annotations: [] }, opts);
    const id = 'ch' + (++uid);
    let state = opts.series.map(s => s.values.slice());
    let firstRender = true;
    el.style.position = el.style.position || 'relative';

    function geom(vals) {
      const W = Math.max(240, el.clientWidth || 600), H = opts.height;
      const all = vals.flat().concat(opts.target ? opts.target.values : []).filter(v => v != null);
      const sc = niceScale(opts.zero === false ? Math.min(...all) : Math.min(0, ...all), Math.max(...all), opts.ticks);
      const pad = { t: 28, r: opts.endLabels ? Math.min(110, W * .22) : 8, b: 24, l: 0 };
      const n = Math.max(...vals.map(v => v.length));
      const x = i => pad.l + (n === 1 ? 0 : i / (n - 1)) * (W - pad.l - pad.r);
      const y = v => pad.t + (1 - (v - sc.lo) / (sc.hi - sc.lo)) * (H - pad.t - pad.b);
      return { W, H, sc, pad, n, x, y };
    }
    const pointsOf = (arr, g) => arr.map((v, i) => (v == null ? null : [g.x(i), g.y(v)])).filter(Boolean);
    const lastIdx = arr => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return i; return -1; };

    function render(vals) {
      const g = geom(vals), A = firstRender && opts.animate !== false, D = opts.delay;
      const an = (kind, delay, extra = '') => (A ? ` data-anim="${kind}" data-delay="${delay}" ${extra}` : '');
      let s = `<svg class="ch-svg" viewBox="0 0 ${g.W} ${g.H}" height="${g.H}" role="img" aria-label="${esc(opts.ariaLabel || 'Gráfico de linha')}">`;
      s += `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style="stop-color:var(--accent);stop-opacity:.18"/>
        <stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>`;
      // grade
      s += `<g${an('fade', D - 300)}>`;
      g.sc.ticks.forEach((t, ti) => {
        const yy = Math.round(g.y(t)) + .5;
        s += `<line class="ch-grid" x1="0" x2="${g.W - g.pad.r + 8}" y1="${yy}" y2="${yy}"/>`;
        // a linha de base dispensa rótulo (e ele colidiria com o início da série)
        if (ti > 0) s += `<text class="ch-axis" x="0" y="${yy - 5}">${esc(opts.axisFormat(t))}</text>`;
      });
      // eixo X: ~6 rótulos
      if (opts.labels) {
        const step = Math.ceil(g.n / 6);
        for (let i = 0; i < g.n; i += step) {
          const anchor = i === 0 ? 'start' : 'middle';
          s += `<text class="ch-axis" x="${g.x(i)}" y="${g.H - 6}" text-anchor="${anchor}">${esc(opts.labels[i])}</text>`;
        }
      }
      s += `</g>`;
      // meta
      if (opts.target) s += `<path class="ch-target" d="${pathD(pointsOf(opts.target.values, g), false)}"${an('fade', D + 200)}/>`;
      // séries de contexto primeiro, acento por cima
      const order = opts.series.map((se, i) => i).sort((a, b) => (opts.series[a].accent ? 1 : 0) - (opts.series[b].accent ? 1 : 0));
      order.forEach(si => {
        const se = opts.series[si], pts = pointsOf(vals[si], g), d = pathD(pts, opts.smooth);
        if (se.accent && opts.area && pts.length > 1) {
          const base = g.y(Math.max(g.sc.lo, 0));
          s += `<path d="${d}L${pts[pts.length - 1][0].toFixed(1)},${base}L${pts[0][0].toFixed(1)},${base}Z" fill="url(#${id}g)"${an('fade', D + 450, 'data-dur="700"')}/>`;
        }
        s += `<path class="${se.accent ? 'ch-line' : 'ch-ctx'}" d="${d}"${an('draw', se.accent ? D : D - 100)}/>`;
      });
      // rótulos diretos na ponta (com anticolisão vertical)
      if (opts.endLabels) {
        const ends = opts.series.map((se, si) => {
          const li = lastIdx(vals[si]); if (li < 0 || !se.label) return null;
          return { se, si, li, x: g.x(li), y: g.y(vals[si][li]), v: vals[si][li] };
        }).filter(Boolean);
        if (opts.target && opts.target.label) {
          const tv = opts.target.values, li = lastIdx(tv);
          ends.push({ se: { label: opts.target.label }, target: true, li, x: g.x(li), y: g.y(tv[li]), v: tv[li] });
        }
        ends.sort((a, b) => a.y - b.y);
        for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 30) ends[i].ly = (ends[i - 1].ly || ends[i - 1].y) + 30;
        ends.forEach(e => {
          const ly = e.ly || e.y;
          const tx = Math.min(e.x + 10, g.W - g.pad.r + 12);
          if (!e.target) s += `<circle class="${e.se.accent ? 'ch-dot' : 'ch-dot-ctx'}" cx="${e.x}" cy="${e.y}" r="${e.se.accent ? 4.5 : 3}"${an('pop', D + 900)}/>`;
          s += `<g${an('fade', D + 950)}><text class="ch-end${e.se.accent ? '' : ' ctx'}" x="${tx}" y="${ly + 1}">${esc(opts.format(e.v))}</text>`;
          s += `<text class="ch-end-sub" x="${tx}" y="${ly + 15}">${esc(e.se.label)}</text></g>`;
        });
      }
      // anotações
      const acc = opts.series.findIndex(se => se.accent);
      (opts.annotations || []).forEach((a, k) => {
        const arr = vals[a.series != null ? a.series : Math.max(0, acc)];
        if (arr[a.index] == null) return;
        const px = g.x(a.index), py = g.y(arr[a.index]), top = Math.max(g.pad.t + 4, py - 34);
        const anchor = px < 60 ? 'start' : px > g.W - g.pad.r - 40 ? 'end' : 'middle';
        s += `<g${an('fade', D + 1000 + k * 80)}><line class="ch-anno-line" x1="${px}" x2="${px}" y1="${py - 7}" y2="${top}"/>`;
        s += `<circle cx="${px}" cy="${py}" r="2.5" fill="var(--ink)"/>`;
        s += `<text class="ch-anno" x="${px}" y="${top - 5}" text-anchor="${anchor}">${esc(a.text)}</text></g>`;
      });
      s += `<g class="ch-scrub" style="pointer-events:none"></g>`;
      s += `<rect class="ch-hit" x="0" y="0" width="${g.W - g.pad.r}" height="${g.H}"/>`;
      s += `</svg>`;
      el.innerHTML = s;
      el.__geom = g; el.__vals = vals;
      firstRender = false;
    }

    function scrubAt(clientX) {
      const g = el.__geom, vals = el.__vals; if (!g) return;
      const r = el.getBoundingClientRect();
      const px = (clientX - r.left) * (g.W / r.width);
      const i = Math.max(0, Math.min(g.n - 1, Math.round((px - g.pad.l) / (g.W - g.pad.l - g.pad.r) * (g.n - 1))));
      const grp = el.querySelector('.ch-scrub'); if (!grp) return;
      const x = g.x(i);
      let s = `<line class="ch-scrub-line" x1="${x}" x2="${x}" y1="${g.pad.t - 6}" y2="${g.H - g.pad.b}"/>`;
      const parts = [];
      opts.series.forEach((se, si) => {
        const v = vals[si][i]; if (v == null) return;
        s += `<circle class="${se.accent ? 'ch-dot' : 'ch-dot-ctx'}" cx="${x}" cy="${g.y(v)}" r="${se.accent ? 4.5 : 3.5}"/>`;
        parts.push({ se, v });
      });
      const anchor = x > g.W * .6 ? 'end' : 'start', tx = anchor === 'end' ? x - 8 : x + 8;
      s += `<text class="ch-read" x="${tx}" y="${g.pad.t - 12}" text-anchor="${anchor}">` +
        parts.map((p, k) => `<tspan${p.se.accent ? '' : ' style="fill:var(--ink-3)"'}>${k ? '  ·  ' : ''}${esc(opts.format(p.v))}</tspan>`).join('') + `</text>`;
      if (opts.labels) s += `<text class="ch-read-sub" x="${tx}" y="${g.pad.t - 26}" text-anchor="${anchor}">${esc(opts.labels[i])}</text>`;
      grp.innerHTML = s;
      el.classList.add('is-scrubbing');
      opts.onScrub && opts.onScrub(i, vals.map(v => v[i]));
    }
    function scrubEnd() {
      const grp = el.querySelector('.ch-scrub'); if (grp) grp.innerHTML = '';
      el.classList.remove('is-scrubbing');
      opts.onScrub && opts.onScrub(null);
    }
    el.addEventListener('pointermove', e => scrubAt(e.clientX));
    el.addEventListener('pointerdown', e => scrubAt(e.clientX));
    el.addEventListener('pointerleave', scrubEnd);
    el.tabIndex = el.tabIndex >= 0 ? el.tabIndex : 0;
    let kIdx = -1;
    el.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const g = el.__geom; e.preventDefault();
      kIdx = Math.max(0, Math.min(g.n - 1, (kIdx < 0 ? g.n - 1 : kIdx) + (e.key === 'ArrowRight' ? 1 : -1)));
      const r = el.getBoundingClientRect();
      scrubAt(r.left + g.x(kIdx) * r.width / g.W);
    });
    el.addEventListener('blur', () => { kIdx = -1; scrubEnd(); });

    render(state);
    if ('ResizeObserver' in global) {
      let w = el.clientWidth;
      new ResizeObserver(() => { if (Math.abs(el.clientWidth - w) > 2) { w = el.clientWidth; render(el.__vals || state); } }).observe(el);
    }

    return {
      el,
      update(next) {
        Object.assign(opts, next);
        const to = opts.series.map(s => s.values.slice());
        const sameShape = to.length === state.length && to.every((a, i) => a.length === state[i].length);
        if (!sameShape) { firstRender = true; state = to; render(state); global.Motion && Motion.play(el); return; }
        tweenArrays(state, to, 650, v => render(v));
        state = to;
      }
    };
  }

  /* ======================================================================
     BARRAS HORIZONTAIS (HTML)
     opts: items[{label, sub, value, target, highlight, key}], format, max,
           sort (default true), delay, stagger, onSelect(item)
     ====================================================================== */
  function bars(el, opts) {
    opts = Object.assign({ format: defFmt, sort: true, delay: 500, stagger: 45 }, opts);
    el.classList.add('ch-bars');
    let first = true;
    const rows = new Map();

    function draw() {
      const items = opts.items.slice();
      if (opts.sort) items.sort((a, b) => b.value - a.value);
      const max = opts.max || Math.max(...items.map(i => Math.max(i.value, i.target || 0)));
      const flipAnim = !first && global.Motion ? Motion.flip(Array.from(rows.values())) : null;
      items.forEach((it, idx) => {
        const key = it.key || it.label;
        let row = rows.get(key);
        if (!row) {
          row = document.createElement('div'); row.className = 'ch-row'; row.tabIndex = 0;
          row.innerHTML = `<span class="ch-row-label"></span><span class="ch-track"><span class="ch-bar"></span></span><span class="ch-row-val"></span>`;
          row.addEventListener('pointerenter', () => { el.classList.add('is-dim'); row.classList.add('is-hot'); });
          row.addEventListener('pointerleave', () => { el.classList.remove('is-dim'); row.classList.remove('is-hot'); });
          row.addEventListener('focus', () => { el.classList.add('is-dim'); row.classList.add('is-hot'); });
          row.addEventListener('blur', () => { el.classList.remove('is-dim'); row.classList.remove('is-hot'); });
          row.addEventListener('click', () => opts.onSelect && opts.onSelect(row.__item));
          rows.set(key, row);
        }
        row.__item = it;
        row.classList.toggle('is-hl', !!it.highlight);
        row.querySelector('.ch-row-label').innerHTML = esc(it.label) + (it.sub ? `<small>${esc(it.sub)}</small>` : '');
        const bar = row.querySelector('.ch-bar');
        bar.style.transform = `scaleX(${Math.max(0, it.value / max).toFixed(4)})`;
        let mark = row.querySelector('.ch-mark');
        if (it.target != null) {
          if (!mark) { mark = document.createElement('span'); mark.className = 'ch-mark'; row.querySelector('.ch-track').appendChild(mark); }
          mark.style.left = (100 * it.target / max).toFixed(2) + '%';
        } else if (mark) mark.remove();
        const val = row.querySelector('.ch-row-val');
        if (first) {
          val.textContent = opts.format(it.value); val.dataset.value = it.value;
          if (opts.animate !== false) {
            const d = opts.delay + Math.min(idx, 6) * opts.stagger;
            bar.dataset.anim = 'grow-x'; bar.dataset.delay = d;
            val.dataset.anim = 'fade'; val.dataset.delay = d + 200;
            row.querySelector('.ch-row-label').dataset.anim = 'fade';
            row.querySelector('.ch-row-label').dataset.delay = d;
          }
        } else if (global.Motion) Motion.tween(val, it.value, { format: opts.format });
        else val.textContent = opts.format(it.value);
        el.appendChild(row); // reordena
      });
      // remove os que saíram
      const keys = new Set(items.map(i => i.key || i.label));
      rows.forEach((row, k) => { if (!keys.has(k)) { row.remove(); rows.delete(k); } });
      if (flipAnim) flipAnim();
      first = false;
    }
    draw();
    return { el, update(next) { Object.assign(opts, next); draw(); } };
  }

  /* ======================================================================
     SPARKLINE — opts: values, accent, height, smooth, delay, dot (true)
     ====================================================================== */
  function spark(el, opts) {
    opts = Object.assign({ height: 32, accent: true, smooth: true, dot: true, delay: 600 }, opts);
    function draw(vals, animate) {
      const W = Math.max(60, el.clientWidth || 120), H = opts.height, p = 4;
      const v = vals.filter(x => x != null), lo = Math.min(...v), hi = Math.max(...v);
      const x = i => p + i / (vals.length - 1) * (W - 2 * p - (opts.dot ? 4 : 0));
      const y = val => p + (1 - (val - lo) / ((hi - lo) || 1)) * (H - 2 * p);
      const pts = vals.map((val, i) => (val == null ? null : [x(i), y(val)])).filter(Boolean);
      const last = pts[pts.length - 1];
      const an = (k, d) => (animate ? ` data-anim="${k}" data-delay="${d}"` : '');
      el.innerHTML = `<svg class="ch-svg" viewBox="0 0 ${W} ${H}" height="${H}" aria-hidden="true">
        <path class="${opts.accent ? 'ch-line' : 'ch-ctx'}" style="stroke-width:1.5" d="${pathD(pts, opts.smooth)}"${an('draw', opts.delay)} data-dur="800"/>
        ${opts.dot ? `<circle class="${opts.accent ? 'ch-dot' : 'ch-dot-ctx'}" r="3" cx="${last[0]}" cy="${last[1]}"${an('pop', opts.delay + 750)}/>` : ''}</svg>`;
    }
    draw(opts.values, opts.animate !== false);
    let cur = opts.values;
    return { el, update(next) { const to = next.values; tweenArrays([cur], [to], 600, v => draw(v[0], false)); cur = to; } };
  }

  /* ======================================================================
     BULLET — opts: value, target, max, ranges[], now (fração esperada hoje), delay
     ====================================================================== */
  function bullet(el, opts) {
    opts = Object.assign({ delay: 400, ranges: [] }, opts);
    let max = opts.max || Math.max(opts.value, opts.target || 0) * 1.1;
    const pct = v => (100 * v / max).toFixed(2) + '%';
    let h = `<div class="ch-bullet" role="img" aria-label="${esc(opts.ariaLabel || 'Progresso da meta')}">`;
    opts.ranges.slice().sort((a, b) => b - a).forEach((r, i, arr) => {
      h += `<span class="rng" style="left:0;width:${pct(r)};opacity:${.35 + .25 * (i / Math.max(1, arr.length - 1))}"></span>`;
    });
    if (!opts.ranges.length) h += `<span class="rng" style="left:0;width:100%;opacity:.45"></span>`;
    h += `<span class="val" style="width:100%;transform:scaleX(${(opts.value / max).toFixed(4)})" data-anim="grow-x" data-delay="${opts.delay}" data-dur="1000"></span>`;
    if (opts.now != null) h += `<span class="now" style="left:${pct(opts.now * (opts.target || max))}" data-anim="fade" data-delay="${opts.delay + 700}"></span>`;
    if (opts.target != null) h += `<span class="tgt" style="left:${pct(opts.target)}" data-anim="fade" data-delay="${opts.delay + 500}"></span>`;
    el.innerHTML = h + `</div>`;
    return {
      el, update(next) {
        Object.assign(opts, next);
        if (next.max || next.target) max = opts.max || Math.max(opts.value, opts.target || 0) * 1.1;
        const ease = '.7s cubic-bezier(.16,1,.3,1)';
        const v = el.querySelector('.val');
        v.style.transition = 'transform ' + ease;
        v.style.transform = `scaleX(${Math.min(1, opts.value / max).toFixed(4)})`;
        const t = el.querySelector('.tgt'), n = el.querySelector('.now');
        if (t && opts.target != null) { t.style.transition = 'left ' + ease; t.style.left = pct(opts.target); }
        if (n) { n.style.transition = 'left ' + ease + ', opacity .3s'; n.style.opacity = opts.now == null || opts.now >= 1 ? 0 : 1;
                 if (opts.now != null) n.style.left = pct(Math.min(1, opts.now) * (opts.target || max)); }
      }
    };
  }

  /* ======================================================================
     HEAT — opts: rows [[...]], rowLabels, colLabels (mostra a cada N), format, delay, title(i,j,v)
     ====================================================================== */
  function heat(el, opts) {
    opts = Object.assign({ format: defFmt, delay: 600, labelEvery: 1 }, opts);
    const all = opts.rows.flat(), hi = Math.max(...all), lo = Math.min(...all);
    const cols = opts.rows[0].length;
    el.className = (el.className + ' ch-heat').trim();
    el.style.gridTemplateColumns = `auto repeat(${cols}, minmax(0,1fr))`;
    let h = '';
    opts.rows.forEach((r, i) => {
      h += `<span class="rl" data-anim="fade" data-delay="${opts.delay + i * 40}">${esc(opts.rowLabels ? opts.rowLabels[i] : '')}</span>`;
      r.forEach((v, j) => {
        const o = (.06 + .94 * Math.pow((v - lo) / ((hi - lo) || 1), 1.7)).toFixed(3); // curva: só os picos acendem
        const t = opts.title ? opts.title(i, j, v) : `${opts.rowLabels ? opts.rowLabels[i] + ' · ' : ''}${opts.colLabels ? opts.colLabels[j] + ' · ' : ''}${opts.format(v)}`;
        h += `<span class="cell" style="--o:${o}" title="${esc(t)}" data-anim="fade" data-delay="${opts.delay + Math.min(i, 6) * 40 + j * 6}" data-dur="300"></span>`;
      });
    });
    if (opts.colLabels) {
      h += `<span></span>`;
      opts.colLabels.forEach((c, j) => { h += `<span class="cl">${j % opts.labelEvery === 0 ? esc(c) : ''}</span>`; });
    }
    el.innerHTML = h;
    return { el };
  }

  /* ======================================================================
     RING — opts: value (0–1), size, stroke, delay
     ====================================================================== */
  function ring(el, opts) {
    opts = Object.assign({ size: 120, stroke: 5, delay: 300 }, opts);
    const r = (opts.size - opts.stroke) / 2, c = 2 * Math.PI * r, cx = opts.size / 2;
    function draw(v, animate) {
      el.innerHTML = `<svg width="${opts.size}" height="${opts.size}" viewBox="0 0 ${opts.size} ${opts.size}" aria-hidden="true" style="display:block">
        <circle class="ch-ring-track" cx="${cx}" cy="${cx}" r="${r}" stroke-width="${opts.stroke}"/>
        <path class="ch-ring-val" stroke-width="${opts.stroke}" d="${arc(cx, r, Math.min(.9999, v))}"${animate ? ` data-anim="draw" data-delay="${opts.delay}" data-dur="1100"` : ''}/></svg>`;
    }
    function arc(cx, r, v) {
      const a = v * 2 * Math.PI - Math.PI / 2, x = cx + r * Math.cos(a), y = cx + r * Math.sin(a);
      return `M${cx},${cx - r}A${r},${r} 0 ${v > .5 ? 1 : 0} 1 ${x.toFixed(2)},${y.toFixed(2)}`;
    }
    draw(opts.value, opts.animate !== false);
    let cur = opts.value;
    return { el, update(n) { tweenArrays([[cur]], [[n.value]], 700, v => draw(v[0][0], false)); cur = n.value; } };
  }

  /* ======================================================================
     STACK — opts: parts[{label, value}], format, delay (primeiro = acento)
     ====================================================================== */
  function stack(el, opts) {
    opts = Object.assign({ format: defFmt, delay: 600 }, opts);
    const total = opts.parts.reduce((a, p) => a + p.value, 0);
    const pf = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });
    el.classList.add('ch-stack');
    let h = `<div class="bar" role="img" aria-label="${esc(opts.ariaLabel || 'Composição')}">`;
    opts.parts.forEach((p, i) => {
      h += `<span class="seg" style="flex:${p.value} 1 0;${i ? `opacity:${Math.max(.35, 1 - i * .18)}` : ''}" data-anim="grow-x" data-delay="${opts.delay + i * 70}"></span>`;
    });
    h += `</div><div class="leg">`;
    opts.parts.forEach((p, i) => { h += `<span data-anim="fade" data-delay="${opts.delay + 300 + i * 50}"><b>${pf.format(p.value / total)}</b>${esc(p.label)}</span>`; });
    el.innerHTML = h + `</div>`;
    return { el };
  }

  global.Charts = { line, bars, spark, bullet, heat, ring, stack, util: { niceScale, pathD } };
})(window);
