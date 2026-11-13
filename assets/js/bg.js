/* Animated background: a slow, endlessly scrolling live candlestick chart with an EMA line. */
(function () {
  'use strict';
  const cv = document.getElementById('bgCanvas');
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d');
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STEP = 26, CW = 15, SPEED = 22; // px per candle, body width, px per second
  let W = 0, H = 0, dpr = 1, enabled = true, raf = 0, last = 0, offset = 0;
  let col = {};
  let lo = null, hi = null;

  /* ---- price generator: regime-switching random walk ---- */
  let price = 100, drift = 0, regimeLeft = 0, vol = 1;
  function regime() {
    regimeLeft = 25 + Math.floor(Math.random() * 45);
    const r = Math.random();
    drift = r < 0.38 ? 0.35 + Math.random() * 0.35 : r < 0.76 ? -(0.35 + Math.random() * 0.35) : 0;
    vol = 0.8 + Math.random() * 0.9;
  }
  function newCandle() {
    if (regimeLeft-- <= 0) regime();
    const o = price;
    const target = o + drift + (Math.random() - 0.5) * 2.4 * vol;
    return { o, c: o, h: o, l: o, target, wob: Math.random() * 6.28, uw: Math.random() * vol * 0.9, lw: Math.random() * vol * 0.9 };
  }
  let candles = [];
  function seed() {
    candles = [];
    regime();
    const n = Math.ceil(W / STEP) + 60;
    for (let i = 0; i < n; i++) { const k = newCandle(); finish(k); candles.push(k); price = k.c; }
    candles.push(newCandle());
    lo = hi = null;
  }
  function finish(k) {
    k.c = k.target;
    k.h = Math.max(k.h, k.o, k.c) + k.uw;
    k.l = Math.min(k.l, k.o, k.c) - k.lw;
  }

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    const light = document.documentElement.dataset.theme === 'light';
    col = { bull: v('--bull'), bear: v('--bear'), accent: v('--accent'), gold: v('--gold'), grid: v('--grid'), muted: v('--muted'), a: light ? 0.30 : 0.50, line: light ? 0.55 : 0.85 };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (candles.length < Math.ceil(W / STEP) + 10) seed();
  }

  function draw(dt) {
    // advance the forming candle
    offset += SPEED * dt;
    let cur = candles[candles.length - 1];
    while (offset >= STEP) {
      offset -= STEP;
      finish(cur); price = cur.c;
      cur = newCandle(); candles.push(cur);
      if (candles.length > Math.ceil(W / STEP) + 80) candles.shift();
    }
    const p = offset / STEP;
    cur.wob += dt * 3;
    cur.c = cur.o + (cur.target - cur.o) * p + Math.sin(cur.wob) * 0.25 * vol * (1 - p);
    cur.h = Math.max(cur.h, cur.c); cur.l = Math.min(cur.l, cur.c);

    const rightX = W - Math.max(90, W * 0.08);
    const n = candles.length;
    const visFrom = Math.max(0, n - Math.ceil(rightX / STEP) - 2);

    // smooth auto-scale
    let mn = Infinity, mx = -Infinity;
    for (let i = visFrom; i < n; i++) { mn = Math.min(mn, candles[i].l); mx = Math.max(mx, candles[i].h); }
    const pad = (mx - mn) * 0.15 + 1;
    const tl = mn - pad, th = mx + pad;
    lo = lo == null ? tl : lo + (tl - lo) * Math.min(1, dt * 0.8);
    hi = hi == null ? th : hi + (th - hi) * Math.min(1, dt * 0.8);
    const top = H * 0.12, bot = H * 0.92;
    const Y = (v) => bot - ((v - lo) / (hi - lo)) * (bot - top);
    const X = (i) => rightX - (n - 1 - i) * STEP - offset;

    ctx.clearRect(0, 0, W, H);

    // grid: horizontal static, vertical scrolling with candles
    ctx.strokeStyle = col.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let g = 1; g < 7; g++) { const y = Math.round(top + ((bot - top) * g) / 7) + 0.5; ctx.moveTo(0, y); ctx.lineTo(W, y); }
    for (let i = visFrom; i < n; i++) if (i % 8 === 0) { const x = Math.round(X(i)) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    ctx.stroke();

    // candles
    ctx.globalAlpha = col.a;
    for (let i = visFrom; i < n; i++) {
      const k = candles[i], x = X(i), up = k.c >= k.o;
      ctx.fillStyle = ctx.strokeStyle = up ? col.bull : col.bear;
      ctx.beginPath(); ctx.moveTo(x, Y(k.h)); ctx.lineTo(x, Y(k.l)); ctx.lineWidth = 2; ctx.stroke();
      const y1 = Y(Math.max(k.o, k.c)), y2 = Y(Math.min(k.o, k.c));
      ctx.fillRect(x - CW / 2, y1, CW, Math.max(1.5, y2 - y1));
    }

    // EMA 20: soft area fill + glowing line
    const kf = 2 / 21; let e = candles[0].c;
    const pts = [];
    { let e2 = candles[0].c; for (let i = 0; i < n; i++) { e2 = candles[i].c * kf + e2 * (1 - kf); if (i >= visFrom) pts.push([X(i), Y(e2)]); } }
    if (pts.length > 1) {
      const grad = ctx.createLinearGradient(0, top, 0, H);
      grad.addColorStop(0, col.accent); grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = col.a * 0.45; ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(pts[0][0], H); pts.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(pts[pts.length - 1][0], H); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = col.line; ctx.strokeStyle = col.accent; ctx.lineWidth = 2.6;
    ctx.shadowColor = col.accent; ctx.shadowBlur = 16;
    ctx.beginPath();
    for (let i = 0; i < n; i++) { e = candles[i].c * kf + e * (1 - kf); if (i >= visFrom) { const x = X(i), y = Y(e); i === visFrom ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // live price line + label
    const py = Y(cur.c), up = cur.c >= cur.o;
    ctx.globalAlpha = col.line * 0.8; ctx.strokeStyle = up ? col.bull : col.bear; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = Math.min(0.75, col.line * 1.6);
    ctx.fillStyle = up ? col.bull : col.bear;
    const lx = rightX + 14;
    ctx.fillRect(lx, py - 9, 62, 18);
    ctx.fillStyle = '#fff'; ctx.font = '600 11px ui-monospace, Consolas, monospace';
    ctx.fillText((1.08 + cur.c / 4000).toFixed(5), lx + 6, py + 4);
    // pulsing dot on the live candle
    const pulse = (Math.sin(performance.now() / 300) + 1) / 2;
    ctx.globalAlpha = 0.25 + pulse * 0.35; ctx.fillStyle = up ? col.bull : col.bear;
    ctx.beginPath(); ctx.arc(X(n - 1), py, 3 + pulse * 3, 0, 6.29); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    raf = 0;
    if (!enabled || document.hidden) return;
    const dt = last ? Math.min(0.1, (t - last) / 1000) : 0.016;
    if (t - last >= 30) { last = t; draw(dt); }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && enabled && !reduced) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  readColors(); resize();
  if (reduced) draw(0); else start();
  window.addEventListener('resize', () => { resize(); if (reduced) draw(0); });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  window.BG = {
    setEnabled(on) {
      enabled = !!on;
      cv.style.display = enabled ? '' : 'none';
      if (enabled) { if (reduced) draw(0); else start(); } else stop();
    },
  };
})();
