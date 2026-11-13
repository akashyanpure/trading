/* Shared helpers for content files */
window.SECTIONS = [];
window.H = {
  hi: (c, a, b) => Math.max(...c.slice(a, b + 1).map((k) => k.h)),
  lo: (c, a, b) => Math.min(...c.slice(a, b + 1).map((k) => k.l)),
  hiIdx(c, a, b) { let j = a; for (let i = a; i <= b; i++) if (c[i].h > c[j].h) j = i; return j; },
  loIdx(c, a, b) { let j = a; for (let i = a; i <= b; i++) if (c[i].l < c[j].l) j = i; return j; },
  /** first index >= from whose close is above / below y */
  cross(c, from, y, dir) {
    for (let i = from; i < c.length; i++) if (dir === 'above' ? c[i].c > y : c[i].c < y) return i;
    return c.length - 1;
  },
  /**
   * Candlestick pattern chart: trend into the pattern, the pattern candles, then the follow-through.
   * pre: [targetLevel, candles], post: [relativeMove, candles]
   */
  cp(o) {
    return {
      seed: o.seed,
      build: (b) => {
        b.to(o.pre[0], Math.max(5, Math.round(o.pre[1] * 0.6)), o.vol || 2.5); // fewer candles = bigger candles
        const s = b.c.length;
        o.fn(b);
        b.m.s = s; b.m.e = b.c.length - 1;
        if (o.post) b.to(b.last + o.post[0], Math.max(4, Math.round(o.post[1] * 0.6)), o.vol || 2.5);
      },
      ann: (c, m) => {
        const out = [{ t: 'b', x1: m.s, x2: m.e, label: o.label, cls: o.cls, below: o.below }];
        if (o.arrow) {
          const x = Math.min(m.e + 1, c.length - 1);
          out.push({ t: 'a', x, dir: o.arrow, label: o.arrow === 'up' ? 'BUY' : 'SELL' });
        }
        if (o.ann) out.push(...o.ann(c, m));
        return out;
      },
    };
  },
};
