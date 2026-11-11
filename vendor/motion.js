/* ==========================================================================
   motion.js — coreografia para dashboards premium (sem dependência)

   Marque elementos com data-anim e chame Motion.play(raiz):
     data-anim="fade"    opacity 0→1
     data-anim="rise"    sobe 10px + fade
     data-anim="mask"    revela de baixo para cima (clip-path) — manchetes, títulos
     data-anim="draw"    desenha um path/circle SVG (stroke-dashoffset)
     data-anim="grow-x"  cresce da esquerda (scaleX) — barras
     data-anim="grow-y"  cresce de baixo (scaleY)
     data-anim="pop"     escala 0→1 com leve overshoot — pontos, marcadores
     data-anim="count"   conta até data-to (data-from, data-format=brl|brlc|int|pct|dec1|dec2)
   Atributos opcionais: data-delay (ms), data-dur (ms).
   Pai com data-stagger="50" dá atraso crescente aos filhos com data-anim (máx. 6 em cascata).

   API:
     Motion.play(root, { observe: false })  // observe=true: só anima quando entrar na tela
     Motion.count(el, to, { from, dur, delay, format, paused }) → Animation (play/pause)
     Motion.tween(el, to, { format })       // valor atual → novo (troca de filtro)
     Motion.fmt.brl(v) / brlc / int / pct / dec1 / dec2
     Motion.reduced                          // true se prefers-reduced-motion
   ========================================================================== */
(function (global) {
  'use strict';

  const reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const EASE = {
    out: 'cubic-bezier(.16,1,.3,1)',
    edit: 'cubic-bezier(.22,1,.36,1)',
    mech: 'cubic-bezier(.34,1.3,.64,1)',
    solemn: 'cubic-bezier(.65,0,.35,1)'
  };
  const easeOutExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

  /* ---------- formatadores pt-BR ---------- */
  const nf = (o) => new Intl.NumberFormat('pt-BR', o);
  const F = {
    brl:  nf({ style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }),
    brl2: nf({ style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    brlc: nf({ style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 2 }),
    int:  nf({ maximumFractionDigits: 0 }),
    dec1: nf({ minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    dec2: nf({ minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    pct:  nf({ style: 'percent', maximumFractionDigits: 0 }),
    pct1: nf({ style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
  };
  const fmt = {};
  Object.keys(F).forEach(k => { fmt[k] = v => F[k].format(v).replace(/ /g, ' '); });
  // número sem moeda (para quando "R$" é um <span class="unit"> separado)
  fmt.plain = v => F.int.format(Math.round(v));

  const resolveFormat = f => (typeof f === 'function' ? f : fmt[f] || fmt.int);

  /* ---------- contagem ---------- */
  const counting = new WeakMap();

  // A contagem é dirigida por uma Web Animation "vazia": fica na mesma linha do
  // tempo das outras animações (pausa, sincroniza e pode ser posicionada no tempo
  // por ferramentas de revisão via document.getAnimations()).
  function count(el, to, o = {}) {
    const format = resolveFormat(o.format || el.dataset.format);
    const from = o.from != null ? o.from : (el.dataset.from != null ? +el.dataset.from : 0);
    const dur = reduced ? 0 : (o.dur != null ? o.dur : 1000);
    const delay = reduced ? 0 : (o.delay || 0);
    const prev = counting.get(el); if (prev) prev.cancel();
    el.dataset.value = to;
    if (!dur || !el.animate) { el.textContent = format(to); return { play() {}, finished: Promise.resolve() }; }
    el.textContent = format(from);
    const anim = el.animate([{}, {}], { duration: dur, delay, easing: 'linear', fill: 'both' });
    if (o.paused) anim.pause();
    counting.set(el, anim);
    let alive = true;
    const step = () => {
      if (!alive) return;
      const p = anim.effect.getComputedTiming().progress;
      el.textContent = format(from + (to - from) * easeOutExpo(p == null ? 0 : p));
      if (anim.playState === 'finished') { el.textContent = format(to); counting.delete(el); return; }
      requestAnimationFrame(step);
    };
    anim.oncancel = () => { alive = false; };
    requestAnimationFrame(step);
    return anim;
  }

  // troca de valor (filtro/período): conta do valor atual ao novo e pisca o delta 1×
  function tween(el, to, o = {}) {
    const from = el.dataset.value != null ? +el.dataset.value : 0;
    if (!reduced && from !== to && el.animate) {
      el.animate([{ opacity: .55 }, { opacity: 1 }], { duration: 420, easing: EASE.out });
    }
    return count(el, to, { from, dur: o.dur || 550, format: o.format || el.dataset.format }).finished;
  }

  /* ---------- keyframes por tipo ---------- */
  function frames(el, kind) {
    switch (kind) {
      case 'fade':  return [{ opacity: 0 }, { opacity: 1 }];
      case 'rise':  return [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }];
      case 'mask':  return [
        { clipPath: 'inset(0 0 100% 0)', transform: 'translateY(.35em)' },
        { clipPath: 'inset(0 0 0% 0)', transform: 'none' }];
      case 'grow-x': {
        const end = el.style.transform || 'none';
        el.style.transformOrigin = el.style.transformOrigin || 'left center';
        if (el instanceof SVGElement) el.style.transformBox = 'fill-box';
        return [{ transform: 'scaleX(0)' }, { transform: end }];
      }
      case 'grow-y': {
        const end = el.style.transform || 'none';
        el.style.transformOrigin = el.style.transformOrigin || 'center bottom';
        if (el instanceof SVGElement) el.style.transformBox = 'fill-box';
        return [{ transform: 'scaleY(0)' }, { transform: end }];
      }
      case 'pop': {
        if (el instanceof SVGElement) { el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center'; }
        return [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }];
      }
      case 'draw': {
        const len = el.getTotalLength ? Math.ceil(el.getTotalLength()) : 1000;
        el.style.strokeDasharray = len + ' ' + len;
        return [{ strokeDashoffset: len }, { strokeDashoffset: 0 }];
      }
    }
    return null;
  }

  const DEF_DUR = { fade: 350, rise: 500, mask: 650, 'grow-x': 650, 'grow-y': 650, pop: 380, draw: 950, count: 1000 };
  const DEF_EASE = { pop: EASE.mech, draw: 'cubic-bezier(.45,.05,.25,1)' };

  function computeDelay(el) {
    let d = +(el.dataset.delay || 0);
    const parent = el.parentElement && el.parentElement.closest('[data-stagger]');
    if (parent) {
      const step = +parent.dataset.stagger || 50;
      const sibs = Array.from(parent.querySelectorAll(':scope > [data-anim], :scope > * > [data-anim]'));
      const i = sibs.indexOf(el);
      if (i >= 0) d += Math.min(i, 6) * step + (+(parent.dataset.delay || 0));
    }
    return d;
  }

  function prepare(root) {
    const els = Array.from(root.querySelectorAll('[data-anim]'));
    if (root.matches && root.matches('[data-anim]')) els.unshift(root);
    const jobs = [];
    els.forEach(el => {
      if (el.__motionDone) return;
      el.__motionDone = true;
      const kind = el.dataset.anim;
      const delay = computeDelay(el);
      const dur = +(el.dataset.dur || DEF_DUR[kind] || 500);
      if (kind === 'count') {
        const a = count(el, +el.dataset.to, { dur, delay, paused: true });
        jobs.push(() => a.play());
        return;
      }
      if (reduced || !el.animate) return;
      const kf = frames(el, kind); if (!kf) return;
      const anim = el.animate(kf, { duration: dur, delay, easing: DEF_EASE[kind] || EASE.out, fill: 'backwards' });
      anim.pause();
      if (kind === 'draw') anim.finished.then(() => { el.style.strokeDasharray = ''; }).catch(() => {});
      jobs.push(() => anim.play());
    });
    return jobs;
  }

  function play(root = document, o = {}) {
    if (!o.observe || !('IntersectionObserver' in global)) {
      prepare(root).forEach(j => j());
      return;
    }
    // cada [data-anim-group] anima ao entrar na tela
    const groups = Array.from(root.querySelectorAll('[data-anim-group]'));
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        (e.target.__jobs || []).forEach(j => j());
      });
    }, { threshold: .15 });
    groups.forEach(g => { g.__jobs = prepare(g); io.observe(g); });
    prepare(root).forEach(j => j()); // o que sobrou fora de grupos
  }

  // FLIP: anima reordenação de uma lista. Chame antes de mudar o DOM e use o retorno depois.
  function flip(items) {
    const first = new Map(items.map(el => [el, el.getBoundingClientRect()]));
    return function animate() {
      if (reduced) return;
      first.forEach((r, el) => {
        if (!el.isConnected) return;
        const r2 = el.getBoundingClientRect();
        const dy = r.top - r2.top, dx = r.left - r2.left;
        if (dx || dy) el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }],
          { duration: 520, easing: EASE.out });
      });
    };
  }

  global.Motion = { play, count, tween, flip, fmt, EASE, reduced };
})(window);
