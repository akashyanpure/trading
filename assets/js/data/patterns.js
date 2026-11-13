(function () {
  const BULL = { t: 'Bullish', c: 'bull' }, BEAR = { t: 'Bearish', c: 'bear' }, NEU = { t: 'Bi-directional', c: 'neu' };
  const REV = { t: 'Reversal', c: 'info' }, CONT = { t: 'Continuation', c: 'info' };

  /* value of the line (x1,y1)->(x2,y2) at x */
  const at = (x1, y1, x2, y2, x) => y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
  const crossLine = (c, from, x1, y1, x2, y2, dir) => {
    for (let i = from; i < c.length; i++) { const y = at(x1, y1, x2, y2, i); if (dir === 'above' ? c[i].c > y : c[i].c < y) return i; }
    return c.length - 1;
  };

  SECTIONS.push({
    id: 'patterns',
    title: 'Chart Patterns',
    icon: '📐',
    intro: 'Chart patterns are bigger structures made of many candles. Trade the <b>breakout with a candle close</b> beyond the pattern line (or the retest), place the stop on the other side of the structure, and use the <b>measured move</b> (pattern height projected from the breakout) as the first target. Bulkowski\'s large studies rank head & shoulders, double tops/bottoms and flags among the most dependable.',
    items: [
      {
        id: 'double-top', name: 'Double Top (M)', tags: [BEAR, REV], rel: 'High',
        chart: {
          seed: 41,
          build: (b) => b.to(8, 5, 2).to(42, 10, 2.5).mark('t1').to(16, 7, 2.5).mark('n').to(42, 7, 2.5).mark('t2').to(18, 6, 2.5).to(-22, 10, 2.5),
          ann: (c, m) => {
            const i1 = H.hiIdx(c, m.t1 - 2, m.t1 + 1), i2 = H.hiIdx(c, m.t2 - 2, m.t2 + 1);
            const top = Math.max(c[i1].h, c[i2].h), neck = H.lo(c, i1, i2);
            const br = H.cross(c, i2 + 1, neck, 'below');
            return [
              { t: 'h', y: top, cls: 'res', label: 'Resistance', x1: i1 - 3, lx: i2 + 3 },
              { t: 'h', y: neck, cls: 'neutral', label: 'Neckline', below: true, x1: i1 - 3 },
              { t: 'p', x: i1, y: c[i1].h, text: 'Top 1', cls: 'bear' }, { t: 'p', x: i2, y: c[i2].h, text: 'Top 2', cls: 'bear' },
              { t: 'trade', x: br, entry: c[br].c, sl: top + 3, tp: neck - (top - neck), x2: Math.min(br + 9, c.length - 1), tpLabel: '(measured move)' },
            ];
          },
        },
        desc: 'Price makes two highs at roughly the same level and fails to break higher. A close below the neckline (the low between the tops) completes the pattern.',
        points: {
          Identify: ['Two peaks within ~10–20 pips of each other', 'Clear valley (neckline) between them', 'Second top often on weaker momentum (RSI divergence)'],
          Trade: ['Entry: candle close below neckline or retest of neckline from below', 'SL: above the second top', 'TP: neckline − pattern height'],
          Tips: ['Before the neckline breaks it is only a range — don\'t pre-empt'],
        },
      },
      {
        id: 'double-bottom', name: 'Double Bottom (W)', tags: [BULL, REV], rel: 'High',
        chart: {
          seed: 42,
          build: (b) => b.to(-8, 5, 2).to(-42, 10, 2.5).mark('t1').to(-16, 7, 2.5).mark('n').to(-42, 7, 2.5).mark('t2').to(-18, 6, 2.5).to(22, 10, 2.5),
          ann: (c, m) => {
            const i1 = H.loIdx(c, m.t1 - 2, m.t1 + 1), i2 = H.loIdx(c, m.t2 - 2, m.t2 + 1);
            const bot = Math.min(c[i1].l, c[i2].l), neck = H.hi(c, i1, i2);
            const br = H.cross(c, i2 + 1, neck, 'above');
            return [
              { t: 'h', y: bot, cls: 'sup', label: 'Support', below: true, x1: i1 - 3, lx: i2 + 3 },
              { t: 'h', y: neck, cls: 'neutral', label: 'Neckline', x1: i1 - 3 },
              { t: 'p', x: i1, y: c[i1].l, text: 'Bottom 1', cls: 'bull', below: true }, { t: 'p', x: i2, y: c[i2].l, text: 'Bottom 2', cls: 'bull', below: true },
              { t: 'trade', x: br, entry: c[br].c, sl: bot - 3, tp: neck + (neck - bot), x2: Math.min(br + 9, c.length - 1), tpLabel: '(measured move)' },
            ];
          },
        },
        desc: 'Two lows at roughly the same level; buyers defend the price twice. A close above the neckline confirms the reversal.',
        points: {
          Identify: ['Two troughs at a similar level', 'Neckline = high between the troughs'],
          Trade: ['Entry: close above neckline / neckline retest', 'SL: below the second bottom', 'TP: neckline + pattern height'],
          Tips: ['Bullish RSI divergence on bottom 2 adds a lot of confidence'],
        },
      },
      {
        id: 'head-shoulders', name: 'Head & Shoulders', tags: [BEAR, REV], rel: 'Very high',
        chart: {
          seed: 43,
          build: (b) => b.to(4, 4, 2).to(30, 7, 2).mark('ls').to(12, 5, 2).mark('n1').to(50, 7, 2).mark('hd').to(13, 7, 2).mark('n2').to(31, 5, 2).mark('rs').to(12, 5, 2).to(-26, 9, 2.5),
          ann: (c, m) => {
            const a = H.loIdx(c, m.n1 - 1, m.n1 + 1), z = H.loIdx(c, m.n2 - 1, m.n2 + 1);
            const ls = H.hiIdx(c, m.ls - 2, m.ls + 1), hd = H.hiIdx(c, m.hd - 2, m.hd + 1), rs = H.hiIdx(c, m.rs - 2, m.rs + 1);
            const br = crossLine(c, rs + 1, a, c[a].l, z, c[z].l, 'below');
            const neck = at(a, c[a].l, z, c[z].l, br), height = c[hd].h - at(a, c[a].l, z, c[z].l, hd);
            return [
              { t: 'l', x1: a, y1: c[a].l, x2: z, y2: c[z].l, ext: c.length - 1, cls: 'neutral', label: 'Neckline', ly: c[a].l - 4 },
              { t: 'p', x: ls, y: c[ls].h, text: 'L. Shoulder', cls: 'bear' }, { t: 'p', x: hd, y: c[hd].h, text: 'Head', cls: 'bear' }, { t: 'p', x: rs, y: c[rs].h, text: 'R. Shoulder', cls: 'bear' },
              { t: 'trade', x: br, entry: c[br].c, sl: c[rs].h + 3, tp: neck - height, x2: Math.min(br + 9, c.length - 1) },
            ];
          },
        },
        desc: 'Three peaks: a higher "head" between two lower "shoulders". It shows buyers failing to make new highs and is one of the most reliable reversal patterns.',
        points: {
          Identify: ['Left shoulder → higher head → lower right shoulder', 'Neckline connects the two lows between the peaks'],
          Trade: ['Entry: close below the neckline (aggressive) or on the neckline retest (conservative)', 'SL: above the right shoulder', 'TP: head-to-neckline height projected down'],
          Tips: ['Volume / momentum usually weaker on the right shoulder', 'A sloping neckline is fine — draw it through the lows'],
        },
      },
      {
        id: 'inv-head-shoulders', name: 'Inverse Head & Shoulders', tags: [BULL, REV], rel: 'Very high',
        chart: {
          seed: 44,
          build: (b) => b.to(-4, 4, 2).to(-30, 7, 2).mark('ls').to(-12, 5, 2).mark('n1').to(-50, 7, 2).mark('hd').to(-13, 7, 2).mark('n2').to(-31, 5, 2).mark('rs').to(-12, 5, 2).to(26, 9, 2.5),
          ann: (c, m) => {
            const a = H.hiIdx(c, m.n1 - 1, m.n1 + 1), z = H.hiIdx(c, m.n2 - 1, m.n2 + 1);
            const ls = H.loIdx(c, m.ls - 2, m.ls + 1), hd = H.loIdx(c, m.hd - 2, m.hd + 1), rs = H.loIdx(c, m.rs - 2, m.rs + 1);
            const br = crossLine(c, rs + 1, a, c[a].h, z, c[z].h, 'above');
            const neck = at(a, c[a].h, z, c[z].h, br), height = at(a, c[a].h, z, c[z].h, hd) - c[hd].l;
            return [
              { t: 'l', x1: a, y1: c[a].h, x2: z, y2: c[z].h, ext: c.length - 1, cls: 'neutral', label: 'Neckline' },
              { t: 'p', x: ls, y: c[ls].l, text: 'L. Shoulder', cls: 'bull', below: true }, { t: 'p', x: hd, y: c[hd].l, text: 'Head', cls: 'bull', below: true }, { t: 'p', x: rs, y: c[rs].l, text: 'R. Shoulder', cls: 'bull', below: true },
              { t: 'trade', x: br, entry: c[br].c, sl: c[rs].l - 3, tp: neck + height, x2: Math.min(br + 9, c.length - 1) },
            ];
          },
        },
        desc: 'Mirror of head & shoulders at a market bottom. A close above the neckline signals the downtrend is over.',
        points: {
          Identify: ['Three troughs, the middle one deepest', 'Neckline across the two highs'],
          Trade: ['Entry: close above neckline or the retest', 'SL: below the right shoulder', 'TP: measured move (head → neckline height)'],
          Tips: ['Breakout candle with strong body = higher success'],
        },
      },
      {
        id: 'asc-triangle', name: 'Ascending Triangle', tags: [BULL, CONT], rel: 'High',
        chart: {
          seed: 45,
          build: (b) => b.to(4, 4, 2).to(40, 7, 2).mark('h1').to(14, 5, 2).mark('l1').to(40, 5, 2).mark('h2').to(24, 4, 1.5).mark('l2').to(40, 4, 1.5).mark('h3').to(31, 3, 1.2).mark('l3').to(40, 2, 1).to(72, 9, 2.5),
          ann: (c, m) => {
            const r = Math.max(c[m.h1].h, c[m.h2].h, c[m.h3].h) - 1;
            const a = H.loIdx(c, m.l1 - 1, m.l1 + 1), z = H.loIdx(c, m.l3 - 1, m.l3 + 1);
            const br = H.cross(c, z + 1, r + 1, 'above');
            return [
              { t: 'h', y: r, cls: 'res', label: 'Flat resistance', x1: m.h1 - 3, x2: br + 2 },
              { t: 'l', x1: a, y1: c[a].l, x2: z, y2: c[z].l, ext: br, cls: 'sup', label: 'Rising lows', ly: c[a].l - 8 },
              { t: 'trade', x: br, entry: c[br].c, sl: c[z].l - 2, tp: r + (r - c[a].l), x2: Math.min(br + 8, c.length - 1) },
            ];
          },
        },
        desc: 'Flat resistance with higher lows. Buyers become more aggressive each swing until resistance gives way.',
        points: {
          Identify: ['Horizontal top touched 2–3+ times', 'Rising trendline under the lows'],
          Trade: ['Entry: close above resistance (or retest)', 'SL: below last higher low', 'TP: triangle height added to breakout'],
          Tips: ['Breakouts in the trend direction work best', 'Breakout around 2/3 of the way to the apex is ideal'],
        },
      },
      {
        id: 'desc-triangle', name: 'Descending Triangle', tags: [BEAR, CONT], rel: 'High',
        chart: {
          seed: 46,
          build: (b) => b.to(-4, 4, 2).to(-40, 7, 2).mark('h1').to(-14, 5, 2).mark('l1').to(-40, 5, 2).mark('h2').to(-24, 4, 1.5).mark('l2').to(-40, 4, 1.5).mark('h3').to(-31, 3, 1.2).mark('l3').to(-40, 2, 1).to(-72, 9, 2.5),
          ann: (c, m) => {
            const s = Math.min(c[m.h1].l, c[m.h2].l, c[m.h3].l) + 1;
            const a = H.hiIdx(c, m.l1 - 1, m.l1 + 1), z = H.hiIdx(c, m.l3 - 1, m.l3 + 1);
            const br = H.cross(c, z + 1, s - 1, 'below');
            return [
              { t: 'h', y: s, cls: 'sup', label: 'Flat support', below: true, x1: m.h1 - 3, x2: br + 2 },
              { t: 'l', x1: a, y1: c[a].h, x2: z, y2: c[z].h, ext: br, cls: 'res', label: 'Lower highs', ly: c[a].h + 4 },
              { t: 'trade', x: br, entry: c[br].c, sl: c[z].h + 2, tp: s - (c[a].h - s), x2: Math.min(br + 8, c.length - 1) },
            ];
          },
        },
        desc: 'Flat support with lower highs. Sellers keep pressing until support breaks.',
        points: {
          Identify: ['Horizontal floor touched 2–3+ times', 'Falling trendline over the highs'],
          Trade: ['Entry: close below support', 'SL: above last lower high', 'TP: triangle height projected down'],
          Tips: ['Common in downtrends as a continuation'],
        },
      },
      {
        id: 'sym-triangle', name: 'Symmetrical Triangle', tags: [NEU, CONT], rel: 'Medium',
        chart: {
          seed: 47,
          build: (b) => b.to(-10, 4, 2).to(42, 8, 2).mark('h1').to(0, 6, 2).mark('l1').to(34, 5, 1.8).mark('h2').to(9, 5, 1.6).mark('l2').to(27, 4, 1.4).mark('h3').to(16, 3, 1.2).mark('l3').to(24, 2, 1).to(60, 9, 2.5),
          ann: (c, m) => {
            const h1 = H.hiIdx(c, m.h1 - 1, m.h1 + 1), h3 = H.hiIdx(c, m.h3 - 1, m.h3 + 1);
            const l1 = H.loIdx(c, m.l1 - 1, m.l1 + 1), l3 = H.loIdx(c, m.l3 - 1, m.l3 + 1);
            const br = crossLine(c, l3 + 1, h1, c[h1].h, h3, c[h3].h, 'above');
            return [
              { t: 'l', x1: h1, y1: c[h1].h, x2: h3, y2: c[h3].h, ext: br + 2, cls: 'res', label: 'Lower highs', ly: c[h1].h + 2 },
              { t: 'l', x1: l1, y1: c[l1].l, x2: l3, y2: c[l3].l, ext: br + 2, cls: 'sup', label: 'Higher lows', ly: c[l1].l - 10 },
              { t: 'trade', x: br, entry: c[br].c, sl: c[l3].l - 2, tp: c[br].c + (c[h1].h - c[l1].l), x2: Math.min(br + 8, c.length - 1) },
            ];
          },
        },
        desc: 'Lower highs and higher lows converge — volatility contracts before an expansion. Usually breaks in the direction of the prior trend.',
        points: {
          Identify: ['At least 2 touches on each converging line'],
          Trade: ['Trade the side that breaks with a candle close', 'SL: opposite side of the last swing', 'TP: widest part of the triangle projected from breakout'],
          Tips: ['Fakeouts are common — waiting for a retest improves win rate'],
        },
      },
      {
        id: 'bull-flag', name: 'Bull Flag', tags: [BULL, CONT], rel: 'High',
        chart: {
          seed: 48,
          build: (b) => b.to(2, 6, 2).to(48, 7, 1.5).mark('pole').to(38, 3, 1.2).mark('l1').to(43, 2, 1).mark('h2').to(33, 3, 1.2).mark('l2').to(37, 2, 1).mark('h3').to(30, 2, 1).mark('l3').to(74, 9, 2.5),
          ann: (c, m) => {
            const p = H.hiIdx(c, m.pole - 1, m.pole + 1), h2 = H.hiIdx(c, m.h2 - 1, m.h2);
            const l1 = H.loIdx(c, m.l1 - 1, m.l1 + 1), l3 = H.loIdx(c, m.l3 - 1, m.l3);
            const br = crossLine(c, l3 + 1, p, c[p].h, h2, c[h2].h, 'above');
            const pole = c[p].h - H.lo(c, 0, 6);
            return [
              { t: 'b', x1: 6, x2: p, label: 'Flagpole', cls: 'bull', below: true },
              { t: 'l', x1: p, y1: c[p].h, x2: h2, y2: c[h2].h, ext: br + 1, cls: 'res' },
              { t: 'l', x1: l1, y1: c[l1].l, x2: l3, y2: c[l3].l, ext: br + 1, cls: 'sup', label: 'Flag', ly: c[l1].l - 8 },
              { t: 'trade', x: br, entry: c[br].c, sl: c[l3].l - 2, tp: c[br].c + pole * 0.8, x2: Math.min(br + 8, c.length - 1), tpLabel: '(≈ pole)' },
            ];
          },
        },
        desc: 'A sharp rally (pole) followed by a small, orderly down-sloping channel (flag). The breakout of the flag often repeats the pole length.',
        points: {
          Identify: ['Strong impulsive pole', 'Shallow pullback (< 50% of pole) in a tight channel'],
          Trade: ['Entry: close above flag upper line', 'SL: below flag low', 'TP: pole length projected from the breakout'],
          Tips: ['The tighter and shorter the flag, the better', 'Deep flags (> 61.8%) are lower quality'],
        },
      },
      {
        id: 'bear-flag', name: 'Bear Flag', tags: [BEAR, CONT], rel: 'High',
        chart: {
          seed: 49,
          build: (b) => b.to(-2, 6, 2).to(-48, 7, 1.5).mark('pole').to(-38, 3, 1.2).mark('l1').to(-43, 2, 1).mark('h2').to(-33, 3, 1.2).mark('l2').to(-37, 2, 1).mark('h3').to(-30, 2, 1).mark('l3').to(-74, 9, 2.5),
          ann: (c, m) => {
            const p = H.loIdx(c, m.pole - 1, m.pole + 1), h2 = H.loIdx(c, m.h2 - 1, m.h2);
            const l1 = H.hiIdx(c, m.l1 - 1, m.l1 + 1), l3 = H.hiIdx(c, m.l3 - 1, m.l3);
            const br = crossLine(c, l3 + 1, p, c[p].l, h2, c[h2].l, 'below');
            const pole = H.hi(c, 0, 6) - c[p].l;
            return [
              { t: 'b', x1: 6, x2: p, label: 'Flagpole', cls: 'bear' },
              { t: 'l', x1: p, y1: c[p].l, x2: h2, y2: c[h2].l, ext: br + 1, cls: 'sup' },
              { t: 'l', x1: l1, y1: c[l1].h, x2: l3, y2: c[l3].h, ext: br + 1, cls: 'res', label: 'Flag', ly: c[l1].h + 4 },
              { t: 'trade', x: br, entry: c[br].c, sl: c[l3].h + 2, tp: c[br].c - pole * 0.8, x2: Math.min(br + 8, c.length - 1), tpLabel: '(≈ pole)' },
            ];
          },
        },
        desc: 'A sharp drop followed by a small up-sloping channel. The breakdown usually continues the downtrend.',
        points: {
          Identify: ['Strong bearish pole', 'Weak, overlapping bounce in a channel'],
          Trade: ['Entry: close below flag lower line', 'SL: above flag high', 'TP: pole length projected down'],
          Tips: ['Very common after news-driven drops'],
        },
      },
      {
        id: 'rising-wedge', name: 'Rising Wedge', tags: [BEAR, REV], rel: 'Medium–High',
        chart: {
          seed: 50,
          build: (b) => b.to(-4, 4, 2).to(20, 6, 1.6).mark('h1').to(6, 4, 1.4).mark('l1').to(31, 5, 1.4).mark('h2').to(20, 3, 1.2).mark('l2').to(38, 4, 1.2).mark('h3').to(31, 3, 1).mark('l3').to(39, 3, 1).to(4, 9, 2.5),
          ann: (c, m) => {
            const h1 = H.hiIdx(c, m.h1 - 1, m.h1 + 1), h3 = H.hiIdx(c, m.h3 - 1, m.h3 + 1);
            const l1 = H.loIdx(c, m.l1 - 1, m.l1 + 1), l3 = H.loIdx(c, m.l3 - 1, m.l3 + 1);
            const br = crossLine(c, l3 + 2, l1, c[l1].l, l3, c[l3].l, 'below');
            return [
              { t: 'l', x1: h1, y1: c[h1].h, x2: h3, y2: c[h3].h, ext: br + 1, cls: 'res', label: 'Rising wedge', ly: c[h1].h + 3 },
              { t: 'l', x1: l1, y1: c[l1].l, x2: l3, y2: c[l3].l, ext: br + 1, cls: 'sup' },
              { t: 'trade', x: br, entry: c[br].c, sl: H.hi(c, l3, br) + 2, tp: c[l1].l, x2: Math.min(br + 8, c.length - 1), tpLabel: '(wedge start)' },
            ];
          },
        },
        desc: 'Price climbs in a narrowing channel where the lows rise faster than the highs — buyers are losing steam. Typically breaks down.',
        points: {
          Identify: ['Both trendlines slope up and converge', 'Each push higher is smaller'],
          Trade: ['Entry: close below lower trendline', 'SL: above the last high', 'TP: start of the wedge'],
          Tips: ['Often accompanied by bearish RSI divergence'],
        },
      },
      {
        id: 'falling-wedge', name: 'Falling Wedge', tags: [BULL, REV], rel: 'Medium–High',
        chart: {
          seed: 51,
          build: (b) => b.to(4, 4, 2).to(-20, 6, 1.6).mark('h1').to(-6, 4, 1.4).mark('l1').to(-31, 5, 1.4).mark('h2').to(-20, 3, 1.2).mark('l2').to(-38, 4, 1.2).mark('h3').to(-31, 3, 1).mark('l3').to(-39, 3, 1).to(-4, 9, 2.5),
          ann: (c, m) => {
            const h1 = H.loIdx(c, m.h1 - 1, m.h1 + 1), h3 = H.loIdx(c, m.h3 - 1, m.h3 + 1);
            const l1 = H.hiIdx(c, m.l1 - 1, m.l1 + 1), l3 = H.hiIdx(c, m.l3 - 1, m.l3 + 1);
            const br = crossLine(c, l3 + 2, l1, c[l1].h, l3, c[l3].h, 'above');
            return [
              { t: 'l', x1: h1, y1: c[h1].l, x2: h3, y2: c[h3].l, ext: br + 1, cls: 'sup' },
              { t: 'l', x1: l1, y1: c[l1].h, x2: l3, y2: c[l3].h, ext: br + 1, cls: 'res', label: 'Falling wedge', ly: c[l1].h + 2 },
              { t: 'trade', x: br, entry: c[br].c, sl: H.lo(c, l3, br) - 2, tp: c[l1].h, x2: Math.min(br + 8, c.length - 1), tpLabel: '(wedge start)' },
            ];
          },
        },
        desc: 'Price falls in a narrowing channel; each push down is weaker. Typically breaks to the upside.',
        points: {
          Identify: ['Both lines slope down and converge'],
          Trade: ['Entry: close above upper trendline', 'SL: below the last low', 'TP: start of the wedge'],
          Tips: ['Bullish divergence on RSI/MACD strengthens it'],
        },
      },
      {
        id: 'cup-handle', name: 'Cup & Handle', tags: [BULL, CONT], rel: 'High',
        chart: {
          seed: 52,
          build: (b) => b.to(40, 6, 2).mark('r1').to(28, 4, 1.5).to(16, 4, 1.5).to(9, 4, 1.2).to(8, 3, 1).to(14, 3, 1.2).to(26, 4, 1.5).to(40, 4, 1.5).mark('r2').to(31, 4, 1.2).mark('hd').to(35, 2, 1).to(70, 9, 2.5),
          ann: (c, m) => {
            const rim = Math.max(H.hi(c, m.r1 - 1, m.r1 + 1), H.hi(c, m.r2 - 1, m.r2 + 1));
            const bot = H.lo(c, m.r1, m.r2);
            const br = H.cross(c, m.hd + 1, rim, 'above');
            return [
              { t: 'h', y: rim, cls: 'res', label: 'Rim / resistance', x1: m.r1 - 2, x2: br + 2 },
              { t: 'b', x1: m.r1 + 1, x2: m.r2 - 1, label: 'Cup', cls: 'info', below: true },
              { t: 'b', x1: m.r2 + 1, x2: m.hd + 2, label: 'Handle', cls: 'info', below: true },
              { t: 'trade', x: br, entry: c[br].c, sl: H.lo(c, m.r2, br) - 2, tp: rim + (rim - bot), x2: Math.min(br + 8, c.length - 1) },
            ];
          },
        },
        desc: 'A rounded "U" bottom (cup) followed by a small pullback (handle) before breaking above the rim.',
        points: {
          Identify: ['Rounded, not V-shaped, cup', 'Handle retraces < 50% of the cup depth'],
          Trade: ['Entry: close above the rim', 'SL: below the handle low', 'TP: cup depth projected from the rim'],
          Tips: ['More common on higher timeframes (4H/Daily)'],
        },
      },
      {
        id: 'rectangle', name: 'Rectangle (Range)', tags: [NEU, CONT], rel: 'Medium',
        chart: {
          seed: 53, start: 60,
          build: (b) => b.to(30, 7, 2).mark('a').to(5, 5, 2).to(29, 5, 2).to(6, 5, 2).to(30, 5, 2).to(6, 5, 2).mark('z').to(10, 2, 1.5).to(-30, 9, 2.5),
          ann: (c, m) => {
            const top = H.hi(c, m.a, m.z) - 1, bot = H.lo(c, m.a, m.z) + 1;
            const br = H.cross(c, m.z + 1, bot - 1, 'below');
            return [
              { t: 'z', x1: m.a, x2: br, y1: top, y2: bot, cls: 'neutral', label: 'Range' },
              { t: 'trade', x: br, entry: c[br].c, sl: bot + (top - bot) / 2, tp: bot - (top - bot), x2: Math.min(br + 8, c.length - 1) },
            ];
          },
        },
        desc: 'Price bounces between horizontal support and resistance. You can trade the bounces inside or the breakout in the trend direction.',
        points: {
          Identify: ['2+ touches of a flat top and flat bottom'],
          Trade: ['Inside: sell top / buy bottom with rejection candles', 'Breakout: close outside the box, SL inside the box (mid), TP = box height'],
          Tips: ['Breakout direction usually matches the trend before the range'],
        },
      },
    ],
  });

  /* ---------------- Market structure & concepts ---------------- */
  SECTIONS.push({
    id: 'concepts',
    title: 'Market Structure & Key Concepts',
    icon: '🧭',
    intro: 'These are the building blocks used by almost every strategy: where price is likely to react (levels, zones, liquidity) and which side is in control (structure).',
    items: [
      {
        id: 'sr', name: 'Support & Resistance (Role Reversal)', tags: [NEU], rel: 'Core',
        chart: {
          seed: 61,
          build: (b) => b.to(-20, 4, 2).to(20, 6, 2).mark('r1').to(0, 5, 2).to(20, 5, 2).mark('r2').to(4, 5, 2).to(36, 6, 2).mark('bo').to(22, 5, 1.5).mark('rt').to(55, 8, 2.5),
          ann: (c, m) => {
            const lvl = Math.max(H.hi(c, m.r1 - 1, m.r1 + 1), H.hi(c, m.r2 - 1, m.r2 + 1));
            return [
              { t: 'z', x1: m.r1 - 2, x2: m.bo - 3, y1: lvl + 1.5, y2: lvl - 3, cls: 'res', label: 'Resistance' },
              { t: 'z', x1: m.bo - 2, x2: c.length - 1, y1: lvl + 1.5, y2: lvl - 3, cls: 'sup', label: 'Old resistance → new support' },
              { t: 'a', x: H.loIdx(c, m.rt - 1, m.rt + 2), dir: 'up', label: 'Retest' },
            ];
          },
        },
        desc: 'Support is where buying stopped declines; resistance is where selling stopped rallies. Once broken, they often switch roles.',
        points: {
          Identify: ['Use swing highs/lows with 2+ reactions', 'Draw zones (10–20 pips on H1), not thin lines', 'Previous day/week high & low, round numbers (1.1000, 1.0950)'],
          Trade: ['Look for rejection candles at the zone', 'After a breakout, trade the retest'],
          Tips: ['Higher timeframe levels > lower timeframe levels', 'The more times a level is hit, the weaker it gets'],
        },
      },
      {
        id: 'trendline', name: 'Trendlines & Channels', tags: [NEU], rel: 'Core',
        chart: {
          seed: 62,
          build: (b) => b.to(-10, 3, 2).mark('l1').to(16, 6, 2).mark('h1').to(4, 5, 2).mark('l2').to(30, 6, 2).mark('h2').to(18, 5, 2).mark('l3').to(44, 6, 2).mark('h3').to(32, 5, 2).mark('l4').to(50, 4, 2),
          ann: (c, m) => {
            const l1 = H.loIdx(c, m.l1 - 1, m.l1 + 1), l2 = H.loIdx(c, m.l2 - 1, m.l2 + 1), l3 = H.loIdx(c, m.l3 - 1, m.l3 + 1);
            const h1 = H.hiIdx(c, m.h1 - 1, m.h1 + 1), h2 = H.hiIdx(c, m.h2 - 1, m.h2 + 1);
            const end = c.length - 1;
            return [
              { t: 'l', x1: l1, y1: c[l1].l, x2: l3, y2: c[l3].l, ext: end, cls: 'sup', label: 'Trendline (buy touches)', lx: l2, ly: c[l2].l - 10 },
              { t: 'l', x1: h1, y1: c[h1].h, x2: h2, y2: c[h2].h, ext: end, cls: 'res', dash: true, label: 'Channel top (take profit)', lx: h1, ly: c[h1].h + 4 },
              { t: 'a', x: H.loIdx(c, m.l4 - 1, m.l4 + 1), dir: 'up', label: '3rd touch' },
            ];
          },
        },
        desc: 'A trendline connects higher lows (uptrend) or lower highs (downtrend). A parallel line through the opposite swings forms a channel.',
        points: {
          Identify: ['Needs 2 points to draw, 3rd touch to confirm', 'Do not force lines through candle bodies'],
          Trade: ['Buy the 3rd/4th touch of a rising trendline with a rejection candle', 'Take profits at the channel top'],
          Tips: ['A break of the trendline is NOT a reversal by itself — wait for a structure break'],
        },
      },
      {
        id: 'structure', name: 'Market Structure: HH/HL, BOS & CHoCH', tags: [NEU], rel: 'Core',
        chart: {
          seed: 63,
          build: (b) => b.to(-20, 3, 1.5).mark('l1').to(5, 5, 1.5).mark('h1').to(-8, 4, 1.5).mark('l2').to(20, 5, 1.5).mark('h2').to(6, 4, 1.5).mark('l3').to(32, 5, 1.5).mark('h3').to(14, 4, 1.5).mark('l4').to(28, 4, 1.5).mark('h4').to(-4, 7, 2).mark('x').to(10, 4, 1.5).to(-20, 6, 2),
          ann: (c, m) => {
            const P = (k, hi, txt, cls) => { const i = hi ? H.hiIdx(c, m[k] - 1, Math.min(m[k] + 1, c.length - 1)) : H.loIdx(c, m[k] - 1, Math.min(m[k] + 1, c.length - 1)); return { t: 'p', x: i, y: hi ? c[i].h : c[i].l, text: txt, cls, below: !hi }; };
            const h1 = H.hiIdx(c, m.h1 - 1, m.h1 + 1), h2 = H.hiIdx(c, m.h2 - 1, m.h2 + 1), l4 = H.loIdx(c, m.l4 - 1, m.l4 + 1);
            const bos1 = H.cross(c, h1 + 1, c[h1].h, 'above'), bos2 = H.cross(c, h2 + 1, c[h2].h, 'above');
            const ch = H.cross(c, m.h4 + 1, c[l4].l, 'below');
            return [
              P('l1', 0, 'L', 'neutral'), P('h1', 1, 'H', 'neutral'), P('l2', 0, 'HL', 'bull'), P('h2', 1, 'HH', 'bull'), P('l3', 0, 'HL', 'bull'), P('h3', 1, 'HH', 'bull'), P('l4', 0, 'HL', 'bull'), P('h4', 1, 'LH', 'bear'),
              { t: 'h', y: c[h1].h, x1: h1, x2: bos1, cls: 'bull', dash: false, label: 'BOS', lx: h1 + 1, below: true },
              { t: 'h', y: c[h2].h, x1: h2, x2: bos2, cls: 'bull', dash: false, label: 'BOS', lx: h2 + 1, below: true },
              { t: 'h', y: c[l4].l, x1: l4, x2: ch, cls: 'bear', dash: false, label: 'CHoCH', lx: l4 + 1 },
            ];
          },
        },
        desc: 'Uptrend = higher highs (HH) and higher lows (HL). Downtrend = lower highs and lower lows. A Break of Structure (BOS) confirms the trend continues; a Change of Character (CHoCH) — breaking the last higher low — is the first sign of reversal.',
        points: {
          Identify: ['Mark swing highs/lows on your bias timeframe (4H/1H)', 'BOS = close beyond the previous swing in the trend direction', 'CHoCH = close beyond the last swing that protected the trend'],
          Trade: ['Trade only in the direction of structure', 'After a CHoCH, wait for a lower high to sell (or vice versa)'],
          Tips: ['Use candle closes, not wicks, to confirm breaks'],
        },
      },
      {
        id: 'supply-demand', name: 'Supply & Demand Zones', tags: [NEU], rel: 'High',
        chart: {
          seed: 64,
          build: (b) => b.to(20, 6, 2).to(-6, 7, 2).mark('b1').k(-1, 1.5, 1.5).k(1, 1.5, 1.5).k(-1, 1.5, 1.5).mark('b2').k(14, 1, 1).k(12, 1, 1).k(9, 1, 1).to(42, 5, 2).to(-1, 9, 2).mark('rt').to(40, 8, 2.5),
          ann: (c, m) => {
            const top = H.hi(c, m.b1 + 1, m.b2), bot = H.lo(c, m.b1 + 1, m.b2);
            return [
              { t: 'z', x1: m.b1 + 1, x2: c.length - 1, y1: top, y2: bot, cls: 'sup', label: 'Demand zone (base)' },
              { t: 'b', x1: m.b2 + 1, x2: m.b2 + 3, label: 'Strong departure', cls: 'bull' },
              { t: 'a', x: H.loIdx(c, m.rt - 1, m.rt + 2), dir: 'up', label: 'BUY at 1st retest' },
            ];
          },
        },
        desc: 'A zone where price paused (a "base" of small candles) right before an explosive move. Unfilled institutional orders often remain there, so price reacts on the first return.',
        points: {
          Identify: ['Base of 1–4 small candles', 'Strong, fast departure (big candles)', 'Zone = base high to base low (wick or body)'],
          Trade: ['Limit order at the zone on the FIRST retest', 'SL a few pips beyond the zone', 'TP: opposite zone / 3R'],
          Tips: ['Fresh zones are best; each retest weakens it', 'Trade zones in line with the higher-timeframe trend'],
        },
      },
      {
        id: 'order-block', name: 'Order Block (SMC)', tags: [NEU], rel: 'Medium–High',
        chart: {
          seed: 65,
          build: (b) => b.to(12, 4, 2).to(-14, 7, 2).k(-4, 1, 1.5).mark('ob').k(13, 1, 1).k(12, 1, 1).k(8, 1, 1).to(30, 4, 2).to(0, 7, 2).mark('rt').to(42, 8, 2.5),
          ann: (c, m) => [
            { t: 'z', x1: m.ob, x2: c.length - 1, y1: c[m.ob].h, y2: c[m.ob].l, cls: 'sup', label: 'Bullish order block' },
            { t: 'h', y: H.hi(c, 0, m.ob), x1: H.hiIdx(c, 0, m.ob), x2: H.cross(c, m.ob + 1, H.hi(c, 0, m.ob), 'above'), cls: 'bull', dash: false, label: 'BOS' },
            { t: 'a', x: H.loIdx(c, m.rt - 1, m.rt + 2), dir: 'up', label: 'BUY' },
          ],
        },
        desc: 'The last opposite-colored candle before an impulsive move that breaks structure. Bullish OB = last bearish candle before a strong rally.',
        points: {
          Identify: ['Last down candle before a move that breaks a swing high (BOS)', 'Ideally leaves a fair value gap'],
          Trade: ['Entry at the OB open or 50% (mean threshold)', 'SL beyond the OB', 'TP: next liquidity (old highs)'],
          Tips: ['An OB without a BOS is just a candle'],
        },
      },
      {
        id: 'fvg', name: 'Fair Value Gap (Imbalance)', tags: [NEU], rel: 'Medium',
        chart: {
          seed: 66,
          build: (b) => b.to(-20, 10, 2).k(2, 1, 1.5).mark('c1').k(16, 0.5, 0.5).mark('c2').k(6, 2, 0.5, 0.5).mark('c3').to(28, 4, 2).to(-6, 6, 1.5).mark('rt').to(38, 8, 2.5),
          ann: (c, m) => [
            { t: 'z', x1: m.c1, x2: c.length - 1, y1: c[m.c3].l, y2: c[m.c1].h, cls: 'info', label: 'FVG (gap between candle 1 high & candle 3 low)' },
            { t: 'b', x1: m.c1, x2: m.c3, label: '3-candle imbalance', cls: 'bull', below: true },
            { t: 'a', x: H.loIdx(c, m.rt - 1, m.rt + 2), dir: 'up', label: 'BUY' },
          ],
        },
        desc: 'A three-candle formation where candle 1\'s high and candle 3\'s low don\'t overlap, leaving an inefficient price gap. Price often returns to "fill" it before continuing.',
        points: {
          Identify: ['Bullish FVG: candle 3 low > candle 1 high', 'Created by a large displacement candle (candle 2)'],
          Trade: ['Limit entry at the gap (or its 50%) in trend direction', 'SL below candle 1 low'],
          Tips: ['FVGs combined with an order block or discount zone are best'],
        },
      },
      {
        id: 'liquidity', name: 'Liquidity & Stop Hunts', tags: [NEU], rel: 'High',
        chart: {
          seed: 67,
          build: (b) => b.to(30, 6, 2).to(5, 7, 2).mark('a').to(22, 5, 2).to(5.5, 5, 2).mark('b').to(18, 4, 2).to(6, 4, 2).k(-3, 1, 1).k(1, 1, 12).mark('sw').k(10, 1, 1).to(40, 8, 2.5),
          ann: (c, m) => {
            const eq = Math.min(H.lo(c, m.a - 1, m.a + 1), H.lo(c, m.b - 1, m.b + 1));
            return [
              { t: 'h', y: eq, x1: m.a - 2, x2: m.sw + 3, cls: 'sup', label: 'Equal lows = sell stops resting here', below: true },
              { t: 'b', x1: m.sw, x2: m.sw, label: 'Sweep', cls: 'bear', below: true },
              { t: 'a', x: m.sw + 1, dir: 'up', label: 'BUY' },
            ];
          },
        },
        desc: 'Stop-losses cluster above equal highs and below equal lows. Large players often push price through these levels to fill orders, then reverse.',
        points: {
          Identify: ['Equal highs/lows, obvious trendline touches, previous day high/low, Asian range'],
          Trade: ['Wait for the sweep (wick through the level) and a close back inside', 'Enter on the close back inside; SL beyond the sweep wick'],
          Tips: ['Never put your stop exactly at obvious equal highs/lows', 'Sweeps are most common at London/NY open'],
        },
      },
      {
        id: 'fib', name: 'Fibonacci Retracement', tags: [NEU], rel: 'Core',
        chart: {
          seed: 68,
          build: (b) => b.to(-4, 3, 1.5).mark('s').to(50, 10, 2).mark('e').to(22, 7, 2).mark('rt').to(66, 10, 2.5),
          ann: (c, m) => {
            const s = H.loIdx(c, 0, m.s + 1), e = H.hiIdx(c, m.e - 1, m.e + 1);
            return [
              { t: 'fib', x1: s, y1: c[e].h, y2: c[s].l, golden: true },
              { t: 'a', x: H.loIdx(c, m.rt - 1, m.rt + 2), dir: 'up', label: 'Golden zone' },
            ];
          },
        },
        desc: 'Fibonacci levels measure how deep a pullback is. Draw from swing low to swing high in an uptrend (reverse in downtrends). The 50–61.8% "golden zone" is the most watched area.',
        points: {
          Identify: ['Key levels: 38.2%, 50%, 61.8%, 78.6%', 'Extensions for targets: 127.2%, 161.8%'],
          Trade: ['Buy in the golden zone when it lines up with S/R or an EMA (confluence)'],
          Tips: ['Fib alone is weak — confluence makes it strong', 'Use obvious swings only'],
        },
      },
    ],
  });
})();
