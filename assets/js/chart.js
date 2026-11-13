/* Lightweight SVG candlestick chart engine (no dependencies).
 * Prices are expressed in PIPS relative to a base price, then labelled as real forex prices.
 */
(function () {
  'use strict';

  const BASE = 1.085;
  const PIP = 0.0001;

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- Series builder ---------- */
  class Builder {
    constructor(seed, start) {
      this.r = rng(seed || 7);
      this.c = [];
      this.last = start || 0;
      this.m = {};
    }
    _push(o, c, h, l) {
      this.c.push({ o, h: Math.max(h, o, c), l: Math.min(l, o, c), c });
      this.last = c;
      return this;
    }
    /** explicit candle: body (+bull/-bear), upper wick, lower wick, gap from previous close */
    k(body, uw = 1, lw = 1, gap = 0) {
      const o = this.last + gap, c = o + body;
      return this._push(o, c, Math.max(o, c) + uw, Math.min(o, c) - lw);
    }
    /** drift toward target level over n candles with noise `vol` */
    to(target, n, vol = 4) {
      for (let i = 0; i < n; i++) {
        const rem = n - i;
        const drift = (target - this.last) / rem;
        const noise = rem > 1 ? (this.r() - 0.5) * 2 * vol : 0;
        let body = drift + noise;
        if (Math.abs(body) < 0.6) body = body < 0 ? -0.6 : 0.6;
        const o = this.last, c = o + body;
        const uw = this.r() * vol * 0.7 + 0.3;
        const lw = this.r() * vol * 0.7 + 0.3;
        this._push(o, c, Math.max(o, c) + uw, Math.min(o, c) - lw);
      }
      return this;
    }
    /** sideways chop between lo and hi */
    range(lo, hi, n, vol = 3) {
      const mid = (lo + hi) / 2, amp = (hi - lo) / 2;
      for (let i = 0; i < n; i++) {
        const target = mid + amp * Math.sin((i / n) * Math.PI * 4 + this.r() * 0.6) * 0.8;
        this.to(target, 1, vol);
        // add wick noise
        const k = this.c[this.c.length - 1];
        k.h += this.r() * vol; k.l -= this.r() * vol;
      }
      return this;
    }
    mark(name) { this.m[name] = this.c.length - 1; return this; }
  }

  /* ---------- Indicators ---------- */
  const closes = (c) => c.map((k) => k.c);
  function ema(v, p) {
    const k = 2 / (p + 1), out = [];
    let e = v[0];
    v.forEach((x, i) => { e = i === 0 ? x : x * k + e * (1 - k); out.push(i < Math.min(p, 8) - 1 ? null : e); });
    return out;
  }
  function sma(v, p) {
    return v.map((_, i) => (i < p - 1 ? null : v.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0) / p));
  }
  function bb(v, p = 20, m = 2) {
    const mid = sma(v, p);
    const up = [], lo = [];
    v.forEach((_, i) => {
      if (mid[i] == null) { up.push(null); lo.push(null); return; }
      const s = v.slice(i - p + 1, i + 1);
      const sd = Math.sqrt(s.reduce((a, b) => a + (b - mid[i]) ** 2, 0) / p);
      up.push(mid[i] + m * sd); lo.push(mid[i] - m * sd);
    });
    return { mid, up, lo };
  }
  function rsi(v, p = 14) {
    const out = [null];
    let g = 0, l = 0;
    for (let i = 1; i < v.length; i++) {
      const d = v[i] - v[i - 1];
      const up = Math.max(d, 0), dn = Math.max(-d, 0);
      if (i <= p) { g += up / p; l += dn / p; out.push(i === p ? 100 - 100 / (1 + g / (l || 1e-9)) : null); continue; }
      g = (g * (p - 1) + up) / p; l = (l * (p - 1) + dn) / p;
      out.push(100 - 100 / (1 + g / (l || 1e-9)));
    }
    return out;
  }
  function macd(v, f = 12, s = 26, sig = 9) {
    const ef = ema(v, f), es = ema(v, s);
    const line = v.map((_, i) => (ef[i] == null || es[i] == null ? null : ef[i] - es[i]));
    const valid = line.map((x) => (x == null ? 0 : x));
    const sg = ema(valid, sig).map((x, i) => (line[i] == null ? null : x));
    return { line, sig: sg, hist: line.map((x, i) => (x == null || sg[i] == null ? null : x - sg[i])) };
  }
  function stoch(c, p = 14, d = 3) {
    const k = c.map((_, i) => {
      if (i < p - 1) return null;
      const s = c.slice(i - p + 1, i + 1);
      const hh = Math.max(...s.map((x) => x.h)), ll = Math.min(...s.map((x) => x.l));
      return ((c[i].c - ll) / (hh - ll || 1)) * 100;
    });
    const dd = k.map((_, i) => (i < p + d - 2 ? null : k.slice(i - d + 1, i + 1).reduce((a, b) => a + b, 0) / d));
    return { k, d: dd };
  }
  function atr(c, p = 14) {
    const tr = c.map((k, i) => (i === 0 ? k.h - k.l : Math.max(k.h - k.l, Math.abs(k.h - c[i - 1].c), Math.abs(k.l - c[i - 1].c))));
    const out = []; let a = 0;
    tr.forEach((t, i) => { if (i < p) { a += t / p; out.push(i === p - 1 ? a : null); } else { a = (a * (p - 1) + t) / p; out.push(a); } });
    return out;
  }
  function midHL(c, i, p) {
    if (i < p - 1) return null;
    const s = c.slice(i - p + 1, i + 1);
    return (Math.max(...s.map((x) => x.h)) + Math.min(...s.map((x) => x.l))) / 2;
  }
  function ichimoku(c) {
    const ten = c.map((_, i) => midHL(c, i, 9));
    const kij = c.map((_, i) => midHL(c, i, 26));
    const n = c.length;
    const sa = new Array(n).fill(null), sb = new Array(n).fill(null);
    for (let i = 0; i < n; i++) {
      const j = i - 26; // value plotted at i was computed 26 bars earlier
      if (j >= 0 && ten[j] != null && kij[j] != null) sa[i] = (ten[j] + kij[j]) / 2;
      if (j >= 0) sb[i] = midHL(c, j, 52) ?? midHL(c, j, Math.min(j + 1, 52));
    }
    return { ten, kij, sa, sb };
  }

  function donchian(c, p = 20) {
    const up = c.map((_, i) => (i < p ? null : Math.max(...c.slice(i - p, i).map((k) => k.h))));
    const lo = c.map((_, i) => (i < p ? null : Math.min(...c.slice(i - p, i).map((k) => k.l))));
    return { up, lo };
  }

  /* ---------- Renderer ---------- */
  const fmt = (v) => (BASE + v * PIP).toFixed(4);
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  function render(spec) {
    const b = new Builder(spec.seed, spec.start);
    spec.build(b);
    const c = b.c, m = b.m, n = c.length;
    const ann = spec.ann ? spec.ann(c, m) : [];
    const ind = spec.ind || {};
    const pane = spec.pane || null;

    const W = 800, padL = 8, padR = 64, padT = 14;
    const mainH = spec.height || 300;
    const paneH = pane ? 110 : 0;
    const gap = pane ? 18 : 0;
    const H = padT + mainH + gap + paneH + 20;
    const cw = (W - padL - padR) / n;
    const X = (i) => padL + (i + 0.5) * cw;

    // compute overlays
    const v = closes(c);
    const overlays = [];
    (ind.ema || []).forEach((p, idx) => overlays.push({ d: ema(v, p), cls: 'ma' + idx, name: 'EMA ' + p }));
    (ind.sma || []).forEach((p, idx) => overlays.push({ d: sma(v, p), cls: 'ma' + (idx + 2), name: 'SMA ' + p }));
    let bands = null, ichi = null;
    if (ind.bb) { bands = bb(v, 20, 2); }
    if (ind.ichimoku) { ichi = ichimoku(c); }
    const don = ind.donchian ? donchian(c, ind.donchian) : null;

    // y-range
    let lo = Infinity, hi = -Infinity;
    c.forEach((k) => { lo = Math.min(lo, k.l); hi = Math.max(hi, k.h); });
    const consider = (y) => { if (y != null && isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); } };
    ann.forEach((a) => { if (a.t === 'h') consider(a.y); if (a.t === 'trade') { consider(a.sl); consider(a.tp); } if (a.t === 'fib') { consider(a.y1); consider(a.y2); } if (a.t === 'z') { consider(a.y1); consider(a.y2); } });
    if (bands) bands.up.concat(bands.lo).forEach(consider);
    const span = hi - lo || 1;
    lo -= span * 0.08; hi += span * 0.1;
    const Y = (p) => padT + (1 - (p - lo) / (hi - lo)) * mainH;

    const o = [];
    o.push(`<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(spec.title || 'Candlestick chart')}" xmlns="http://www.w3.org/2000/svg">`);
    o.push(`<rect class="bg" x="0" y="0" width="${W}" height="${H}" rx="8"/>`);

    // grid + price axis
    for (let g = 0; g <= 5; g++) {
      const p = lo + ((hi - lo) * g) / 5, y = Y(p);
      o.push(`<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}"/>`);
      o.push(`<text class="axis" x="${W - padR + 6}" y="${y + 4}">${fmt(p)}</text>`);
    }

    const line = (arr, cls, Yf = Y) => {
      let d = '', pen = false;
      arr.forEach((val, i) => {
        if (val == null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Yf(val).toFixed(1) + ' ';
        pen = true;
      });
      return d ? `<path class="${cls}" d="${d}"/>` : '';
    };

    // zones first (behind candles)
    ann.filter((a) => a.t === 'z').forEach((a) => {
      const x1 = a.x1 == null ? padL : X(a.x1) - cw / 2;
      const x2 = a.x2 == null ? W - padR : X(a.x2) + cw / 2;
      const y1 = Y(Math.max(a.y1, a.y2)), y2 = Y(Math.min(a.y1, a.y2));
      o.push(`<rect class="zone ${a.cls || 'neutral'}" x="${x1}" y="${y1}" width="${Math.max(2, x2 - x1)}" height="${Math.max(2, y2 - y1)}"/>`);
      if (a.label) o.push(`<text class="lbl ${a.cls || 'neutral'}" x="${x1 + 4}" y="${y1 + 12}">${esc(a.label)}</text>`);
    });
    ann.filter((a) => a.t === 'trade').forEach((a) => {
      const x1 = X(a.x) - cw / 2, x2 = a.x2 != null ? X(a.x2) + cw / 2 : W - padR;
      const tpTop = Y(Math.max(a.entry, a.tp)), tpBot = Y(Math.min(a.entry, a.tp));
      const slTop = Y(Math.max(a.entry, a.sl)), slBot = Y(Math.min(a.entry, a.sl));
      o.push(`<rect class="tz tp" x="${x1}" y="${tpTop}" width="${x2 - x1}" height="${tpBot - tpTop}"/>`);
      o.push(`<rect class="tz sl" x="${x1}" y="${slTop}" width="${x2 - x1}" height="${slBot - slTop}"/>`);
      o.push(`<line class="tl entry" x1="${x1}" x2="${x2}" y1="${Y(a.entry)}" y2="${Y(a.entry)}"/>`);
      const rr = Math.abs(a.tp - a.entry) / Math.abs(a.entry - a.sl);
      o.push(`<text class="lbl tp" x="${x2 - 4}" y="${Y(a.tp) + (a.tp > a.entry ? 12 : -4)}" text-anchor="end">TP${a.tpLabel ? ' ' + esc(a.tpLabel) : ''}</text>`);
      o.push(`<text class="lbl sl" x="${x2 - 4}" y="${Y(a.sl) + (a.sl > a.entry ? 12 : -4)}" text-anchor="end">SL</text>`);
      o.push(`<text class="lbl entry" x="${x2 - 4}" y="${Y(a.entry) + (a.tp > a.entry ? 12 : -4)}" text-anchor="end">Entry · R:R 1:${rr.toFixed(1)}</text>`);
    });

    // bollinger / ichimoku fills
    if (bands) {
      let d = '';
      const idx = bands.up.map((x, i) => (x == null ? null : i)).filter((x) => x != null);
      if (idx.length) {
        d = 'M' + idx.map((i) => X(i) + ' ' + Y(bands.up[i])).join(' L');
        d += ' L' + idx.slice().reverse().map((i) => X(i) + ' ' + Y(bands.lo[i])).join(' L') + ' Z';
        o.push(`<path class="bbfill" d="${d}"/>`);
      }
      o.push(line(bands.up, 'bb'), line(bands.lo, 'bb'), line(bands.mid, 'bbmid'));
    }
    if (ichi) {
      for (let i = 1; i < n; i++) {
        const a0 = ichi.sa[i - 1], b0 = ichi.sb[i - 1], a1 = ichi.sa[i], b1 = ichi.sb[i];
        if ([a0, b0, a1, b1].some((x) => x == null)) continue;
        const cls = a1 >= b1 ? 'kumo-up' : 'kumo-dn';
        o.push(`<path class="${cls}" d="M${X(i - 1)} ${Y(a0)} L${X(i)} ${Y(a1)} L${X(i)} ${Y(b1)} L${X(i - 1)} ${Y(b0)} Z"/>`);
      }
      o.push(line(ichi.sa, 'senA'), line(ichi.sb, 'senB'), line(ichi.ten, 'tenkan'), line(ichi.kij, 'kijun'));
    }

    if (don) { o.push(line(don.up, 'don'), line(don.lo, 'don')); }

    // candles
    const bw = Math.max(1.5, cw * 0.62);
    c.forEach((k, i) => {
      const cls = k.c >= k.o ? 'bull' : 'bear';
      const hl = spec.hl && spec.hl.includes(i) ? ' hl' : '';
      const top = Y(Math.max(k.o, k.c)), bot = Y(Math.min(k.o, k.c));
      o.push(`<g class="cdl ${cls}${hl}"><line x1="${X(i)}" x2="${X(i)}" y1="${Y(k.h)}" y2="${Y(k.l)}"/><rect x="${X(i) - bw / 2}" y="${top}" width="${bw}" height="${Math.max(1.2, bot - top)}"/></g>`);
    });

    overlays.forEach((ov) => o.push(line(ov.d, 'ov ' + ov.cls)));

    // annotations
    ann.forEach((a) => {
      const cls = a.cls || 'neutral';
      if (a.t === 'h') {
        const x1 = a.x1 == null ? padL : X(a.x1), x2 = a.x2 == null ? W - padR : X(a.x2);
        o.push(`<line class="al ${cls}${a.dash === false ? '' : ' dash'}" x1="${x1}" x2="${x2}" y1="${Y(a.y)}" y2="${Y(a.y)}"/>`);
        if (a.label) o.push(`<text class="lbl ${cls}" x="${a.lx != null ? X(a.lx) : x1 + 4}" y="${Y(a.y) + (a.below ? 13 : -5)}">${esc(a.label)}</text>`);
      } else if (a.t === 'l') {
        let x2 = a.x2, y2 = a.y2;
        if (a.ext) { const slope = (a.y2 - a.y1) / (a.x2 - a.x1); y2 = a.y2 + slope * (a.ext - a.x2); x2 = a.ext; }
        o.push(`<line class="al ${cls}${a.dash ? ' dash' : ''}" x1="${X(a.x1)}" x2="${X(x2)}" y1="${Y(a.y1)}" y2="${Y(y2)}"/>`);
        if (a.label) o.push(`<text class="lbl ${cls}" x="${X(a.lx != null ? a.lx : a.x1)}" y="${Y(a.ly != null ? a.ly : a.y1) - 6}">${esc(a.label)}</text>`);
      } else if (a.t === 'a') {
        const x = X(a.x), up = a.dir === 'up';
        const k = c[a.x];
        const y = up ? Y(a.y != null ? a.y : k.l) + 6 : Y(a.y != null ? a.y : k.h) - 6;
        const tip = y, tail = up ? y + 22 : y - 22;
        const head = up ? `${x - 6},${tip + 9} ${x},${tip} ${x + 6},${tip + 9}` : `${x - 6},${tip - 9} ${x},${tip} ${x + 6},${tip - 9}`;
        const acls = a.cls || (up ? 'buy' : 'sell');
        o.push(`<g class="arrow ${acls}"><line x1="${x}" x2="${x}" y1="${tip}" y2="${tail}"/><polygon points="${head}"/></g>`);
        if (a.label) o.push(`<text class="lbl ${acls} bold" x="${x}" y="${up ? tail + 13 : tail - 5}" text-anchor="middle">${esc(a.label)}</text>`);
      } else if (a.t === 'b') {
        const s = c.slice(a.x1, a.x2 + 1);
        const top = Y(Math.max(...s.map((k) => k.h))) - 5, bot = Y(Math.min(...s.map((k) => k.l))) + 5;
        const x1 = X(a.x1) - cw / 2 - 3, x2 = X(a.x2) + cw / 2 + 3;
        o.push(`<rect class="hbox ${cls}" x="${x1}" y="${top}" width="${x2 - x1}" height="${bot - top}" rx="4"/>`);
        if (a.label) o.push(`<text class="lbl ${cls} bold" x="${(x1 + x2) / 2}" y="${a.below ? bot + 13 : top - 5}" text-anchor="middle">${esc(a.label)}</text>`);
      } else if (a.t === 'p') {
        const y = Y(a.y);
        o.push(`<circle class="pt ${cls}" cx="${X(a.x)}" cy="${y}" r="3"/>`);
        o.push(`<text class="lbl ${cls} bold" x="${X(a.x)}" y="${a.below ? y + 14 : y - 7}" text-anchor="middle">${esc(a.text)}</text>`);
      } else if (a.t === 'txt') {
        o.push(`<text class="lbl ${cls}" x="${X(a.x)}" y="${Y(a.y)}" text-anchor="${a.anchor || 'start'}">${esc(a.text)}</text>`);
      } else if (a.t === 'fib') {
        const levels = a.levels || [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        levels.forEach((lv) => {
          const p = a.y1 + (a.y2 - a.y1) * lv; // y1 = 0% (swing end), y2 = 100% (swing start)
          const gold = lv === 0.618 || lv === 0.5;
          o.push(`<line class="al fib${gold ? ' gold' : ''}" x1="${X(a.x1)}" x2="${W - padR}" y1="${Y(p)}" y2="${Y(p)}"/>`);
          o.push(`<text class="lbl fib${gold ? ' gold' : ''}" x="${W - padR - 4}" y="${Y(p) - 3}" text-anchor="end">${(lv * 100).toFixed(1)}%</text>`);
        });
        if (a.golden) {
          const p1 = a.y1 + (a.y2 - a.y1) * 0.5, p2 = a.y1 + (a.y2 - a.y1) * 0.618;
          o.push(`<rect class="zone gold" x="${X(a.x1)}" y="${Y(Math.max(p1, p2))}" width="${W - padR - X(a.x1)}" height="${Math.abs(Y(p1) - Y(p2))}"/>`);
        }
      }
    });

    // legend
    const leg = [];
    overlays.forEach((ov) => leg.push(`<tspan class="lg ${ov.cls}">● ${ov.name}</tspan>`));
    if (bands) leg.push('<tspan class="lg bbl">● BB(20,2)</tspan>');
    if (don) leg.push('<tspan class="lg donl">● Donchian ' + ind.donchian + '</tspan>');
    if (ichi) leg.push('<tspan class="lg tenkanl">● Tenkan</tspan> <tspan class="lg kijunl">● Kijun</tspan> <tspan class="lg kumol">■ Cloud</tspan>');
    if (leg.length) o.push(`<text class="legend" x="${padL + 6}" y="${padT + 10}">${leg.join('  ')}</text>`);

    // indicator pane
    if (pane) {
      const top = padT + mainH + gap, bot = top + paneH;
      o.push(`<line class="sep" x1="${padL}" x2="${W - padR}" y1="${top - gap / 2}" y2="${top - gap / 2}"/>`);
      let plo, phi, series = [], levels = [], name = '';
      if (pane === 'rsi') { plo = 0; phi = 100; series = [{ d: rsi(v, 14), cls: 'p1' }]; levels = [30, 70]; name = 'RSI 14'; }
      if (pane === 'rsi2') { plo = 0; phi = 100; series = [{ d: rsi(v, 2), cls: 'p1' }]; levels = [10, 90]; name = 'RSI 2'; }
      if (pane === 'stoch') { const s = stoch(c); plo = 0; phi = 100; series = [{ d: s.k, cls: 'p1' }, { d: s.d, cls: 'p2' }]; levels = [20, 80]; name = 'Stoch 14,3'; }
      if (pane === 'atr') { const a = atr(c); const vals = a.filter((x) => x != null); plo = Math.min(...vals) * 0.9; phi = Math.max(...vals) * 1.1; series = [{ d: a, cls: 'p1' }]; name = 'ATR 14'; }
      let hist = null;
      if (pane === 'macd') {
        const md = macd(v); const all = md.line.concat(md.sig, md.hist).filter((x) => x != null);
        const mx = Math.max(...all.map(Math.abs)) * 1.1 || 1; plo = -mx; phi = mx;
        series = [{ d: md.line, cls: 'p1' }, { d: md.sig, cls: 'p2' }]; hist = md.hist; levels = [0]; name = 'MACD 12,26,9';
      }
      const PY = (val) => top + (1 - (val - plo) / (phi - plo)) * paneH;
      o.push(`<rect class="panebg" x="${padL}" y="${top}" width="${W - padL - padR}" height="${paneH}"/>`);
      if (pane === 'rsi' || pane === 'stoch' || pane === 'rsi2') {
        o.push(`<rect class="ob" x="${padL}" y="${PY(100)}" width="${W - padL - padR}" height="${PY(levels[1]) - PY(100)}"/>`);
        o.push(`<rect class="os" x="${padL}" y="${PY(levels[0])}" width="${W - padL - padR}" height="${PY(0) - PY(levels[0])}"/>`);
      }
      levels.forEach((lv) => {
        o.push(`<line class="grid strong" x1="${padL}" x2="${W - padR}" y1="${PY(lv)}" y2="${PY(lv)}"/>`);
        o.push(`<text class="axis" x="${W - padR + 6}" y="${PY(lv) + 4}">${lv}</text>`);
      });
      if (hist) hist.forEach((h, i) => { if (h == null) return; const y0 = PY(0), y1 = PY(h); o.push(`<rect class="hist ${h >= 0 ? 'bull' : 'bear'}" x="${X(i) - bw / 2}" y="${Math.min(y0, y1)}" width="${bw}" height="${Math.abs(y1 - y0)}"/>`); });
      series.forEach((s) => o.push(line(s.d, 'pl ' + s.cls, PY)));
      (spec.paneAnn ? spec.paneAnn(c, m) : []).forEach((a) => {
        if (a.t === 'l') o.push(`<line class="al ${a.cls || 'neutral'}" x1="${X(a.x1)}" x2="${X(a.x2)}" y1="${PY(a.y1)}" y2="${PY(a.y2)}"/>`);
        if (a.t === 'p') { o.push(`<circle class="pt ${a.cls || 'neutral'}" cx="${X(a.x)}" cy="${PY(a.y)}" r="3"/>`); if (a.text) o.push(`<text class="lbl ${a.cls || 'neutral'} bold" x="${X(a.x)}" y="${PY(a.y) + (a.below ? 14 : -7)}" text-anchor="middle">${esc(a.text)}</text>`); }
      });
      o.push(`<text class="legend" x="${padL + 6}" y="${top + 12}">${name}</text>`);
    }

    o.push('</svg>');
    return o.join('');
  }

  /* expose helpers so content files can compute values from series */
  window.TChart = { render, Builder, ema, sma, rsi, macd, stoch, bb, atr, ichimoku, donchian };
})();
