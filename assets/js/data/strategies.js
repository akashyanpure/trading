(function () {
  const cl = (c) => c.map((k) => k.c);
  const last = (c) => c.length - 1;
  const MR = { t: 'Mean reversion', c: 'info' }, TR = { t: 'Trend following', c: 'info' }, BO = { t: 'Breakout', c: 'info' }, PA = { t: 'Price action', c: 'info' }, RV = { t: 'Reversal', c: 'info' }, SM = { t: 'Smart money', c: 'info' };

  SECTIONS.push({
    id: 'strategies',
    title: 'Top 20 Strategies (by typical win rate)',
    icon: '🎯',
    intro: '<b>Read this first:</b> win rates below are <i>typical ranges</i> reported in public backtests and trader communities for disciplined execution — they are not guarantees and vary by pair, timeframe, spread and skill. A high win rate usually comes with a small reward (R:R ≈ 1:1), while low win-rate trend systems win with big R:R. What matters is <b>expectancy = (Win% × Avg win) − (Loss% × Avg loss)</b>. Backtest/demo any strategy before using real money.',
    items: [
      {
        id: 'rsi2', name: 'RSI(2) Pullback in an Uptrend (Connors)', tags: [MR], win: '65–75%', rr: '≈ 1:0.8 – 1:1', tf: 'H1 – D1', pairs: 'Majors, indices, gold', session: 'Any',
        chart: {
          seed: 81, pane: 'rsi2', ind: { ema: [200], sma: [5] },
          build: (b) => b.to(10, 16, 3).to(26, 14, 3).to(40, 14, 3).to(26, 4, 0.8).mark('dip').to(48, 10, 2.5),
          ann: (c, m) => {
            const s5 = TChart.sma(cl(c), 5); let ex = m.dip + 1; while (ex < last(c) && c[ex].c <= s5[ex]) ex++;
            return [{ t: 'a', x: m.dip, dir: 'up', label: 'RSI2 < 10' }, { t: 'a', x: ex, dir: 'down', label: 'Exit > SMA5', cls: 'neutral' }, { t: 'trade', x: m.dip, entry: c[m.dip].c, sl: c[m.dip].c - 14, tp: c[ex].c, x2: ex }];
          },
          paneAnn: (c, m) => [{ t: 'p', x: m.dip, y: TChart.rsi(cl(c), 2)[m.dip], text: 'Oversold', cls: 'bull', below: false }],
        },
        desc: 'Buy short, sharp dips inside a clear uptrend when the 2-period RSI becomes extremely oversold, and sell quickly on the bounce. Very high win rate, small average win.',
        rules: {
          Setup: ['Price above the 200 EMA/SMA (uptrend only)', 'Price pulls back 2–4 candles in a row'],
          Entry: ['RSI(2) closes below 10 (below 5 = stronger) → buy at close'],
          'Stop loss': ['1.5–2 × ATR below entry (the original system uses none — not recommended in forex)'],
          'Take profit': ['Close above the 5-period SMA, or RSI(2) > 70'],
          Avoid: ['Trading it below the 200 MA', 'News spikes — the dip may be the start of a reversal'],
        },
      },
      {
        id: 'bb-mr', name: 'Bollinger Band + RSI Range Reversion', tags: [MR], win: '60–70%', rr: '≈ 1:1 – 1:1.5', tf: 'M15 – H1', pairs: 'EURGBP, AUDNZD, EURCHF, USDCHF', session: 'Asian / late NY',
        chart: {
          seed: 82, pane: 'rsi', ind: { bb: true },
          build: (b) => b.to(0, 6, 2).range(-16, 16, 56, 2.2),
          ann: (c) => {
            const bb = TChart.bb(cl(c)), out = []; let lastX = -10;
            for (let i = 22; i < c.length; i++) {
              if (i - lastX < 6) continue;
              if (c[i].l <= bb.lo[i]) { out.push({ t: 'a', x: i, dir: 'up', label: 'BUY' }); lastX = i; }
              else if (c[i].h >= bb.up[i]) { out.push({ t: 'a', x: i, dir: 'down', label: 'SELL' }); lastX = i; }
            }
            return out;
          },
        },
        desc: 'In a sideways market, price tends to snap back to the mean. Fade touches of the outer Bollinger Band when RSI confirms an extreme, target the middle band.',
        rules: {
          Setup: ['Market is ranging: flat 20 SMA, bands roughly horizontal, ADX < 20', 'Low-volatility pairs/sessions work best'],
          Entry: ['Price touches/pierces lower band + RSI < 30 + bullish rejection candle → buy (mirror for sells)'],
          'Stop loss': ['Beyond the candle wick or 1 × ATR outside the band'],
          'Take profit': ['Middle band (TP1), opposite band (TP2)'],
          Avoid: ['Expanding bands / breakout days', 'High-impact news (NFP, CPI, rate decisions)'],
        },
      },
      {
        id: 'sr-bounce', name: 'Support & Resistance Bounce (Range Trading)', tags: [PA, MR], win: '60–65%', rr: '1:1.5 – 1:2', tf: 'H1 – H4', pairs: 'All majors', session: 'London / NY',
        chart: {
          seed: 83, start: 15,
          build: (b) => b.to(31, 5, 2).mark('r1').to(2, 7, 2).mark('s1').to(30, 7, 2).mark('r2').to(5, 6, 2).k(-3, 0.5, 1).k(2.5, 0.5, 9).mark('pin').to(26, 7, 2).k(2, 1, 0.5).k(-2.5, 8, 0.5).mark('star').to(4, 8, 2),
          ann: (c, m) => {
            const top = Math.max(H.hi(c, 0, m.r2 + 1), c[m.star].h - 2), bot = Math.min(H.lo(c, 0, m.s1 + 1), c[m.pin].l + 2);
            return [
              { t: 'z', y1: top, y2: top - 5, cls: 'res', label: 'Resistance zone' },
              { t: 'z', y1: bot + 5, y2: bot, cls: 'sup', label: 'Support zone' },
              { t: 'trade', x: m.pin + 1, entry: c[m.pin].c, sl: c[m.pin].l - 2, tp: top - 6, x2: m.pin + 8 },
              { t: 'trade', x: m.star + 1, entry: c[m.star].c, sl: c[m.star].h + 2, tp: bot + 6, x2: Math.min(m.star + 8, last(c)) },
            ];
          },
        },
        desc: 'Buy at proven support and sell at proven resistance inside a range, only after a rejection candle shows the level is holding.',
        rules: {
          Setup: ['Clear horizontal range with 2+ touches on each side', 'Zones drawn on H4/D1, refined on H1'],
          Entry: ['Pin bar / engulfing / tweezer at the zone, enter on candle close'],
          'Stop loss': ['5–10 pips beyond the zone or rejection wick'],
          'Take profit': ['Opposite side of the range (exit a bit before it)'],
          Avoid: ['Entering on the first touch without rejection', 'Ranges that are narrowing toward a breakout'],
        },
      },
      {
        id: 'ema-pullback', name: 'Trend Pullback to the 20/50 EMA', tags: [TR], win: '55–65%', rr: '1:2', tf: 'M15 – H4', pairs: 'Trending majors (EURUSD, GBPUSD, USDJPY), Gold', session: 'London / NY',
        chart: {
          seed: 84, ind: { ema: [20, 50] },
          build: (b) => b.to(-10, 12, 2).to(18, 12, 2).to(8, 6, 1.5).to(36, 12, 2).to(27, 5, 1.2).k(-2, 0.5, 4).mark('pb').k(6, 1, 0.5, -0.5).mark('e').to(64, 12, 2),
          ann: (c, m) => [{ t: 'a', x: m.e, dir: 'up', label: 'BUY' }, { t: 'trade', x: m.e + 1, entry: c[m.e].c, sl: H.lo(c, m.pb - 2, m.e) - 2, tp: c[m.e].c + 2 * (c[m.e].c - H.lo(c, m.pb - 2, m.e) + 2), x2: m.e + 11 }],
        },
        desc: 'The bread-and-butter trend strategy: wait for an established trend, let price pull back into the 20–50 EMA zone, then enter when a bullish candle shows the trend resuming.',
        rules: {
          Setup: ['Higher highs & higher lows; EMA 20 > EMA 50, both sloping up; price above EMA 200'],
          Entry: ['Price pulls back into the 20–50 EMA band', 'Bullish engulfing / pin bar / break of the pullback trendline → buy'],
          'Stop loss': ['Below the pullback swing low (or below EMA 50)'],
          'Take profit': ['2R, or the previous swing high then trail behind EMA 20'],
          Avoid: ['Flat or tangled EMAs', 'Third+ pullback in an old, extended trend'],
        },
      },
      {
        id: 'break-retest', name: 'Break & Retest', tags: [BO, PA], win: '55–65%', rr: '1:2 – 1:3', tf: 'M15 – H4', pairs: 'All majors, Gold', session: 'London / NY',
        chart: {
          seed: 85,
          build: (b) => b.to(-18, 5, 2).to(20, 7, 2).mark('r1').to(2, 6, 2).to(20, 6, 2).mark('r2').to(5, 5, 2).to(38, 6, 2).mark('bo').to(23, 5, 1.2).k(-1, 0.5, 4).mark('rt').k(7, 1, 0.5).mark('e').to(60, 9, 2.5),
          ann: (c, m) => {
            const lvl = Math.max(H.hi(c, m.r1 - 1, m.r1 + 1), H.hi(c, m.r2 - 1, m.r2 + 1));
            const br = H.cross(c, m.r2 + 1, lvl, 'above');
            return [
              { t: 'h', y: lvl, cls: 'res', label: 'Resistance → support', x1: m.r1 - 3 },
              { t: 'a', x: br, dir: 'up', label: 'Break', cls: 'neutral' },
              { t: 'trade', x: m.e + 1, entry: c[m.e].c, sl: c[m.rt].l - 3, tp: c[m.e].c + 2.5 * (c[m.e].c - c[m.rt].l + 3), x2: m.e + 10 },
              { t: 'a', x: m.rt, dir: 'up', label: 'Retest' },
            ];
          },
        },
        desc: 'Don\'t chase breakouts. Wait for price to break a key level, come back to retest it from the other side, and show a rejection — then join the move.',
        rules: {
          Setup: ['Strong level with 2+ touches', 'Breakout candle closes clearly beyond it'],
          Entry: ['Pullback to the broken level + rejection candle → enter on close'],
          'Stop loss': ['Below the retest wick (behind the level)'],
          'Take profit': ['Next major level or measured move; 2–3R'],
          Avoid: ['Retests that close back deep inside the old range (failed breakout)'],
        },
      },
      {
        id: 'supply-demand', name: 'Supply & Demand Zone (First Retest)', tags: [PA, SM], win: '55–65%', rr: '1:2 – 1:3', tf: 'M30 – H4', pairs: 'All', session: 'London / NY',
        chart: {
          seed: 86,
          build: (b) => b.to(-20, 6, 2).to(10, 7, 2).mark('b1').k(1, 1.5, 1.5).k(-1, 1.5, 1.5).k(1, 1.5, 1.5).mark('b2').k(-14, 1, 1).k(-12, 1, 1).k(-8, 1, 1).to(-38, 5, 2).to(8, 9, 2).mark('rt').k(-6, 1, 1).to(-40, 8, 2.5),
          ann: (c, m) => {
            const top = H.hi(c, m.b1 + 1, m.b2), bot = H.lo(c, m.b1 + 1, m.b2);
            return [
              { t: 'z', x1: m.b1 + 1, x2: last(c), y1: top, y2: bot, cls: 'res', label: 'Supply zone (rally-base-drop)' },
              { t: 'trade', x: m.rt, entry: bot + 1, sl: top + 3, tp: bot + 1 - 3 * (top + 3 - bot - 1), x2: Math.min(m.rt + 10, last(c)) },
            ];
          },
        },
        desc: 'Mark zones where price based briefly and then left explosively (rally-base-drop = supply, drop-base-rally = demand). Place a limit order for the first return to the fresh zone.',
        rules: {
          Setup: ['Fresh (untouched) zone with a strong departure', 'In the direction of the higher-timeframe trend'],
          Entry: ['Limit order at the zone edge; or wait for a lower-timeframe CHoCH inside the zone'],
          'Stop loss': ['A few pips beyond the far side of the zone'],
          'Take profit': ['Next opposing zone; minimum 2R'],
          Avoid: ['Zones already tested 2+ times', 'Zones against a strong HTF trend'],
        },
      },
      {
        id: 'liq-sweep', name: 'Liquidity Sweep Reversal (Stop Hunt)', tags: [SM, RV], win: '55–65%', rr: '1:2 – 1:4', tf: 'M5 – H1', pairs: 'GBPUSD, EURUSD, Gold, indices', session: 'London open, NY open',
        chart: {
          seed: 87,
          build: (b) => b.to(-20, 6, 2).to(10, 7, 2).mark('a').to(-8, 5, 2).to(9.5, 5, 2).mark('b').to(-6, 5, 2).to(8, 4, 2).k(2, 12, 1).mark('sw').k(-8, 1, 1).mark('e').to(-36, 9, 2.5),
          ann: (c, m) => {
            const eq = Math.max(H.hi(c, m.a - 1, m.a + 1), H.hi(c, m.b - 1, m.b + 1));
            return [
              { t: 'h', y: eq, x1: m.a - 2, x2: m.sw + 2, cls: 'res', label: 'Equal highs (buy stops)' },
              { t: 'b', x1: m.sw, x2: m.sw, label: 'Sweep', cls: 'bear' },
              { t: 'trade', x: m.e + 1, entry: c[m.e].c, sl: c[m.sw].h + 2, tp: H.lo(c, m.a, m.sw) - 6, x2: Math.min(m.e + 10, last(c)) },
            ];
          },
        },
        desc: 'Obvious highs/lows hold clusters of stop orders. When price spikes through them and immediately closes back inside, the breakout traders are trapped — trade the reversal.',
        rules: {
          Setup: ['Equal highs/lows, previous day high/low or Asian range high/low'],
          Entry: ['Wick through the level + candle closes back inside → enter on next candle or on a lower-TF CHoCH'],
          'Stop loss': ['Just beyond the sweep wick'],
          'Take profit': ['Opposite side of the range / opposite liquidity pool'],
          Avoid: ['Sweeps that close strongly beyond the level (real breakout)'],
        },
      },
      {
        id: 'fib-golden', name: 'Fibonacci Golden Zone in Trend', tags: [TR], win: '55–62%', rr: '1:2 – 1:3', tf: 'H1 – D1', pairs: 'All majors, Gold', session: 'London / NY',
        chart: {
          seed: 88, start: 10,
          build: (b) => b.to(50, 4, 2).mark('s').to(0, 11, 2).mark('e').to(30, 8, 2).k(1, 6, 0.5).k(-6, 1, 0.5).mark('x').to(-24, 10, 2.5),
          ann: (c, m) => {
            const s = H.hiIdx(c, 0, m.s + 1), e = H.loIdx(c, m.e - 1, m.e + 1);
            const range = c[s].h - c[e].l;
            return [
              { t: 'fib', x1: s, y1: c[e].l, y2: c[s].h, golden: true },
              { t: 'trade', x: m.x + 1, entry: c[m.x].c, sl: c[e].l + range * 0.786 + 2, tp: c[e].l - range * 0.272, x2: Math.min(m.x + 10, last(c)), tpLabel: '(−27.2% ext.)' },
            ];
          },
        },
        desc: 'After an impulsive leg, trends commonly retrace into the 50–61.8% zone before continuing. Combine with structure (old S/R) and a confirmation candle.',
        rules: {
          Setup: ['Clear impulse leg in the trend direction', 'Draw fib from swing start to swing end'],
          Entry: ['Rejection candle inside the 50–61.8% zone, ideally overlapping S/R or EMA 50'],
          'Stop loss': ['Beyond the 78.6% level'],
          'Take profit': ['Swing extreme (0%) then −27.2% / −61.8% extensions'],
          Avoid: ['Price closing beyond 78.6% — the move is likely a reversal, not a pullback'],
        },
      },
      {
        id: 'rsi-div', name: 'RSI Divergence at Key Level', tags: [RV], win: '55–62%', rr: '1:2 – 1:3', tf: 'H1 – H4', pairs: 'All majors', session: 'London / NY',
        chart: {
          seed: 89, pane: 'rsi',
          build: (b) => b.to(30, 12, 2).to(-32, 6, 1).mark('l1').to(-4, 8, 1.5).to(-18, 4, 1).to(-12, 3, 1).to(-26, 4, 1).to(-20, 3, 1).to(-31, 3, 1).k(1, 0.5, 6).mark('l2').k(8, 1, 0.5).mark('e').to(24, 12, 2.5),
          ann: (c, m) => {
            const a = H.loIdx(c, m.l1 - 2, m.l1 + 2), z = H.loIdx(c, m.l2 - 2, m.l2);
            return [
              { t: 'l', x1: a, y1: c[a].l, x2: z, y2: c[z].l, cls: 'bear', label: 'Lower low', lx: a, ly: c[a].l - 8 },
              { t: 'trade', x: m.e + 1, entry: c[m.e].c, sl: c[z].l - 3, tp: c[m.e].c + 2.5 * (c[m.e].c - c[z].l + 3), x2: m.e + 11 },
            ];
          },
          paneAnn: (c, m) => {
            const r = TChart.rsi(cl(c));
            const lowest = (a, b) => { let j = -1; for (let i = a; i <= b; i++) if (r[i] != null && (j < 0 || r[i] < r[j])) j = i; return j; };
            const a = lowest(m.l1 - 3, m.l1 + 2), z = lowest(m.l2 - 3, m.l2);
            return [{ t: 'l', x1: a, y1: r[a], x2: z, y2: r[z], cls: 'bull' }, { t: 'p', x: z, y: r[z], text: 'Higher low', cls: 'bull', below: true }];
          },
        },
        desc: 'Price makes a lower low but RSI makes a higher low (bullish divergence) — selling momentum is fading. At a support level, this is a high-quality reversal signal.',
        rules: {
          Setup: ['Divergence between two swing lows (or highs) on price vs RSI', 'Second swing at a support/resistance or demand/supply zone'],
          Entry: ['Confirmation candle (engulfing / break of the small downtrend line) after the 2nd low'],
          'Stop loss': ['Below the second low'],
          'Take profit': ['Last lower high, then the next resistance'],
          Avoid: ['Divergence alone in a strong trend — it can keep diverging'],
        },
      },
      {
        id: 'pinbar', name: 'Pin Bar at Key Level', tags: [PA], win: '55–62%', rr: '1:2 – 1:3', tf: 'H4 – D1', pairs: 'All majors, Gold', session: 'Daily close',
        chart: {
          seed: 90, start: 30,
          build: (b) => b.to(8, 6, 2).mark('s1').to(20, 4, 2).to(6, 4, 2).mark('s2').to(-20, 8, 2).to(5, 8, 2).k(1, 1, 0.5).k(-2.5, 13, 0.5).mark('pin').to(-34, 10, 2.5),
          ann: (c, m) => {
            const lvl = Math.min(H.lo(c, m.s1 - 1, m.s1 + 1), H.lo(c, m.s2 - 1, m.s2 + 1));
            return [
              { t: 'h', y: lvl, cls: 'res', label: 'Old support → resistance', x1: m.s1 - 3 },
              { t: 'b', x1: m.pin, x2: m.pin, label: 'Bearish pin bar', cls: 'bear' },
              { t: 'trade', x: m.pin + 1, entry: c[m.pin].l, sl: c[m.pin].h + 2, tp: c[m.pin].l - 2.2 * (c[m.pin].h + 2 - c[m.pin].l), x2: Math.min(m.pin + 10, last(c)) },
            ];
          },
        },
        desc: 'A pin bar (long rejection wick, small body) printed at a significant level in the trend direction. One of the cleanest price-action signals on 4H/Daily charts.',
        rules: {
          Setup: ['Wick ≥ 2/3 of the candle range', 'Wick pierces a key level, body closes back on the right side', 'With the trend (or at a major level)'],
          Entry: ['Break of the pin low (sell) / high (buy), or a 50% retrace limit into the wick'],
          'Stop loss': ['Beyond the wick tip'],
          'Take profit': ['Next level; 2R minimum'],
          Avoid: ['Pin bars in the middle of ranges', 'Tiny pin bars on M1–M5'],
        },
      },
      {
        id: 'engulf-trend', name: 'Engulfing Candle with the Trend', tags: [PA, TR], win: '55–60%', rr: '1:2', tf: 'H1 – D1', pairs: 'All majors', session: 'London / NY',
        chart: {
          seed: 91, ind: { ema: [50] },
          build: (b) => b.to(-14, 12, 2).to(10, 12, 2).to(0, 6, 1.5).to(24, 10, 2).to(13, 6, 1.2).k(-4, 1, 1).k(8, 1, 1, -1).mark('e').to(50, 12, 2.5),
          ann: (c, m) => [
            { t: 'b', x1: m.e - 1, x2: m.e, label: 'Bullish engulfing', cls: 'bull', below: true },
            { t: 'trade', x: m.e + 1, entry: c[m.e].c, sl: H.lo(c, m.e - 1, m.e) - 2, tp: c[m.e].c + 2 * (c[m.e].c - H.lo(c, m.e - 1, m.e) + 2), x2: m.e + 11 },
          ],
        },
        desc: 'In a trend, wait for a pullback and enter on an engulfing candle in the trend direction — momentum has returned.',
        rules: {
          Setup: ['Clear trend, price above EMA 50 (for buys)', 'Pullback into S/R, EMA or fib zone'],
          Entry: ['Bullish engulfing closes → enter at close or on 50% retrace of the engulfing body'],
          'Stop loss': ['Below the low of the two-candle pattern'],
          'Take profit': ['2R / previous high'],
          Avoid: ['Counter-trend engulfings without a key level'],
        },
      },
      {
        id: 'ob-fvg', name: 'Order Block + FVG (Smart Money Concepts)', tags: [SM], win: '50–60%', rr: '1:3+', tf: 'H4 bias, M5–M15 entry', pairs: 'GBPUSD, EURUSD, Gold, NAS100', session: 'London / NY killzones',
        chart: {
          seed: 92,
          build: (b) => b.to(-10, 5, 2).to(18, 7, 2).to(8, 4, 1.5).mark('hl').to(28, 6, 2).k(3, 1, 1).mark('ob').k(-13, 0.5, 1).mark('d1').k(-12, 0.5, 1).k(-9, 1, 1).to(-14, 4, 2).to(20, 7, 1.5).mark('rt').to(-36, 10, 2.5),
          ann: (c, m) => {
            const hl = H.loIdx(c, m.hl - 1, m.hl + 1), ch = H.cross(c, m.ob + 1, c[hl].l, 'below');
            return [
              { t: 'z', x1: m.ob, x2: last(c), y1: c[m.ob].h, y2: c[m.ob].l, cls: 'res', label: 'Bearish order block' },
              { t: 'z', x1: m.ob, x2: last(c), y1: c[m.ob].l, y2: c[m.d1 + 1].h, cls: 'info', label: 'FVG' },
              { t: 'h', y: c[hl].l, x1: hl, x2: ch, cls: 'bear', dash: false, label: 'CHoCH', lx: hl + 1, below: true },
              { t: 'trade', x: m.rt, entry: c[m.ob].l, sl: c[m.ob].h + 3, tp: H.lo(c, m.ob, m.rt) - 4, x2: Math.min(m.rt + 9, last(c)) },
            ];
          },
        },
        desc: 'After a change of character, price often returns to the order block / fair value gap that caused the move. Enter there with a tight stop for a large R:R.',
        rules: {
          Setup: ['HTF bias defined (H4/H1 structure)', 'CHoCH/BOS on entry timeframe with displacement leaving an FVG', 'OB + FVG ideally in premium (above 50% of range) for sells'],
          Entry: ['Limit order at the FVG / OB edge, or wait for M1 confirmation inside it'],
          'Stop loss': ['Above the order block high'],
          'Take profit': ['The opposite liquidity (old lows / equal lows); partials at 2R'],
          Avoid: ['Trading outside killzones', 'OBs that did not cause a structure break'],
        },
      },
      {
        id: 'stoch-pullback', name: 'Stochastic Pullback in Trend', tags: [TR, MR], win: '55–60%', rr: '1:1.5 – 1:2', tf: 'M15 – H4', pairs: 'Trending majors', session: 'London / NY',
        chart: {
          seed: 93, pane: 'stoch', ind: { ema: [50] },
          build: (b) => b.to(-8, 10, 2).to(18, 12, 2).to(4, 5, 1.5).to(32, 10, 2).to(12, 6, 1.5).mark('pb').k(5, 1, 1).k(4, 1, 1).mark('e').to(52, 10, 2),
          ann: (c, m) => [{ t: 'a', x: m.e, dir: 'up', label: 'BUY' }, { t: 'trade', x: m.e + 1, entry: c[m.e].c, sl: H.lo(c, m.pb - 2, m.e) - 2, tp: c[m.e].c + 2 * (c[m.e].c - H.lo(c, m.pb - 2, m.e) + 2), x2: m.e + 10 }],
          paneAnn: (c, m) => { const s = TChart.stoch(c); return [{ t: 'p', x: m.pb, y: s.k[m.pb], text: '< 20', cls: 'bull', below: true }]; },
        },
        desc: 'Use the stochastic to time entries on pullbacks within a trend: buy when it is oversold in an uptrend, sell when overbought in a downtrend.',
        rules: {
          Setup: ['Trend defined by EMA 50 slope / structure'],
          Entry: ['Stochastic dips below 20, then %K crosses above %D → buy on the close'],
          'Stop loss': ['Below the pullback low'],
          'Take profit': ['Previous high or when stochastic > 80 and turns down'],
          Avoid: ['Taking overbought sells in an uptrend'],
        },
      },
      {
        id: 'macd-trend', name: 'MACD Cross with 200 EMA Filter', tags: [TR], win: '50–58%', rr: '1:1.5 – 1:2', tf: 'M30 – H4', pairs: 'Majors', session: 'London / NY',
        chart: {
          seed: 94, pane: 'macd', ind: { ema: [200] },
          build: (b) => b.to(14, 18, 2).to(34, 16, 2).to(10, 12, 1.6).to(8, 4, 1.4).to(48, 12, 2).to(40, 6, 2),
          ann: (c) => {
            const d = TChart.macd(cl(c)); let x = -1;
            for (let i = 40; i < c.length; i++) if (d.line[i - 1] < d.sig[i - 1] && d.line[i] >= d.sig[i] && d.line[i] < 0) { x = i; break; }
            if (x < 0) return [];
            const sl = H.lo(c, x - 6, x) - 2;
            return [{ t: 'a', x, dir: 'up', label: 'BUY' }, { t: 'trade', x: x + 1, entry: c[x].c, sl, tp: c[x].c + 1.8 * (c[x].c - sl), x2: Math.min(x + 10, last(c)) }];
          },
          paneAnn: (c) => {
            const d = TChart.macd(cl(c));
            for (let i = 40; i < c.length; i++) if (d.line[i - 1] < d.sig[i - 1] && d.line[i] >= d.sig[i] && d.line[i] < 0) return [{ t: 'p', x: i, y: d.line[i], text: 'Cross below 0', cls: 'bull', below: true }];
            return [];
          },
        },
        desc: 'Classic momentum entry: in an uptrend (price above EMA 200), buy when the MACD line crosses above the signal line while still below zero (the pullback is ending).',
        rules: {
          Setup: ['Price above EMA 200 for buys, below for sells'],
          Entry: ['MACD crosses signal line below zero (buys) / above zero (sells)'],
          'Stop loss': ['Below the recent swing low or at EMA 200'],
          'Take profit': ['1.5–2R'],
          Avoid: ['Crosses near the zero line in a flat market'],
        },
      },
      {
        id: 'london-bo', name: 'London Breakout (Asian Range)', tags: [BO], win: '50–60%', rr: '1:1.5 – 1:2', tf: 'M15', pairs: 'GBPUSD, EURUSD, GBPJPY, EURJPY', session: 'London open (07:00–10:00 UK)',
        chart: {
          seed: 95,
          build: (b) => { b.to(-6, 4, 1.5).mark('as'); b.range(-6, 6, 22, 1.2); b.mark('ae'); b.k(4, 1, 1).k(13, 1, 1).mark('bo').to(b.last + 26, 10, 2); },
          ann: (c, m) => {
            const top = H.hi(c, m.as + 1, m.ae), bot = H.lo(c, m.as + 1, m.ae);
            const e = top + 2;
            return [
              { t: 'z', x1: m.as + 1, x2: m.ae, y1: top, y2: bot, cls: 'neutral', label: 'Asian session range' },
              { t: 'txt', x: m.ae + 1, y: top + 14, text: 'London open', cls: 'info' },
              { t: 'trade', x: m.ae + 1, entry: e, sl: (top + bot) / 2, tp: e + 1.5 * (top - bot), x2: Math.min(m.ae + 12, last(c)), tpLabel: '(1.5 × range)' },
            ];
          },
        },
        desc: 'The Asian session usually builds a tight range. At the London open, volume surges and price often breaks out of that range decisively.',
        rules: {
          Setup: ['Mark the Asian session high/low (00:00–07:00 UK)', 'Range should be relatively tight (e.g. < 40 pips on GBPUSD)'],
          Entry: ['Buy-stop 2–3 pips above range high, sell-stop below range low (cancel the other when one triggers)'],
          'Stop loss': ['Middle of the range, or opposite side'],
          'Take profit': ['1–2 × range size; close by NY lunch'],
          Avoid: ['Very wide Asian ranges', 'Days with major news at London open'],
        },
      },
      {
        id: 'inside-bar-bo', name: 'Inside Bar Breakout (Trend)', tags: [BO, PA], win: '50–58%', rr: '1:2', tf: 'H4 – D1', pairs: 'All majors', session: 'Daily close',
        chart: {
          seed: 96, ind: { ema: [20] },
          build: (b) => b.to(-10, 10, 2).to(20, 14, 2).k(12, 2, 2).mark('mo').k(-4, 1.5, 1.5, -2).mark('ib').k(9, 1, 0.5).mark('bo').to(48, 10, 2.5),
          ann: (c, m) => [
            { t: 'b', x1: m.mo, x2: m.ib, label: 'Mother + inside bar', cls: 'info', below: true },
            { t: 'trade', x: m.bo, entry: c[m.mo].h + 1, sl: c[m.mo].l - 1, tp: c[m.mo].h + 1 + 2 * (c[m.mo].h - c[m.mo].l + 2), x2: m.bo + 10 },
          ],
        },
        desc: 'An inside bar in a trending market is a pause. Place a stop order beyond the mother bar in the trend direction to catch the continuation.',
        rules: {
          Setup: ['Trending market (price respecting EMA 20)', 'Inside bar fully within the mother bar'],
          Entry: ['Buy-stop above mother bar high (uptrend)'],
          'Stop loss': ['Below mother bar low (or its 50% for big mother bars)'],
          'Take profit': ['2R or next resistance'],
          Avoid: ['Inside bars in ranges, or several stacked inside bars before news'],
        },
      },
      {
        id: 'ichimoku-tk', name: 'Ichimoku Cloud Breakout + TK Cross', tags: [TR], win: '45–55%', rr: '1:2 – 1:3', tf: 'H4 – D1', pairs: 'JPY pairs, majors', session: 'Any',
        chart: {
          seed: 97, ind: { ichimoku: true },
          build: (b) => b.to(30, 20, 2.5).to(-20, 30, 2.5).to(-10, 10, 2.5).to(-26, 10, 2).to(34, 26, 2.5).to(26, 6, 2),
          ann: (c) => {
            const k = TChart.ichimoku(c); let x = -1;
            for (let i = 60; i < c.length; i++) if (k.sa[i] != null && k.sb[i] != null && c[i].c > Math.max(k.sa[i], k.sb[i]) && k.ten[i] > k.kij[i]) { x = i; break; }
            if (x < 0) return [];
            const sl = k.kij[x] - 4;
            return [{ t: 'a', x, dir: 'up', label: 'BUY' }, { t: 'trade', x: x + 1, entry: c[x].c, sl, tp: c[x].c + 2 * (c[x].c - sl), x2: Math.min(x + 12, last(c)) }];
          },
        },
        desc: 'Enter when price closes above the cloud and the Tenkan-sen is above the Kijun-sen — trend, momentum and future support all aligned.',
        rules: {
          Setup: ['Price closes above the cloud (Kumo)', 'Future cloud is green (Senkou A > Senkou B)'],
          Entry: ['Tenkan crosses above Kijun (or already above) → buy'],
          'Stop loss': ['Below the Kijun-sen or below the cloud'],
          'Take profit': ['Trail with the Kijun-sen; exit on close below it'],
          Avoid: ['Thin, flat clouds and price chopping inside the cloud'],
        },
      },
      {
        id: 'bb-squeeze', name: 'Bollinger Squeeze Breakout', tags: [BO], win: '45–55%', rr: '1:2 – 1:3', tf: 'M15 – H4', pairs: 'GBP pairs, Gold, JPY pairs', session: 'London / NY',
        chart: {
          seed: 98, ind: { bb: true },
          build: (b) => b.to(14, 10, 3).to(-8, 10, 3).to(2, 6, 2).to(0, 16, 0.7).mark('sq').k(3, 1, 1).k(11, 1, 1).to(36, 10, 2.5),
          ann: (c, m) => {
            const bb = TChart.bb(cl(c)); const x = H.cross(c, m.sq, bb.up[m.sq] + 0.5, 'above');
            const sl = bb.mid[x] - 1;
            return [{ t: 'b', x1: m.sq - 12, x2: m.sq, label: 'Squeeze (bands tight)', cls: 'info', below: true }, { t: 'trade', x: x + 1, entry: c[x].c, sl, tp: c[x].c + 2.5 * (c[x].c - sl), x2: Math.min(x + 10, last(c)) }];
          },
        },
        desc: 'Volatility is cyclical: when the Bollinger Bands contract to their narrowest in months, a strong expansion usually follows. Trade the side that breaks.',
        rules: {
          Setup: ['Band width at a multi-week low (BandWidth indicator or visual)'],
          Entry: ['Candle closes outside the band with a strong body → enter in that direction'],
          'Stop loss': ['Middle band or opposite side of the squeeze'],
          'Take profit': ['Trail with the middle band; or 2–3R'],
          Avoid: ['First wick-only poke outside the band (head fake)'],
        },
      },
      {
        id: 'ema-cross', name: 'EMA 9/21 Crossover with 200 Filter', tags: [TR], win: '40–50%', rr: '1:2 – 1:4', tf: 'M15 – H4', pairs: 'Trending majors, Gold', session: 'London / NY',
        chart: {
          seed: 99, ind: { ema: [9, 21, 200] },
          build: (b) => b.to(30, 16, 2).to(20, 14, 2).to(14, 8, 2).to(48, 18, 2.5).to(40, 6, 2),
          ann: (c) => {
            const v = cl(c), f = TChart.ema(v, 9), s = TChart.ema(v, 21); let x = -1;
            for (let i = 32; i < c.length; i++) if (f[i - 1] <= s[i - 1] && f[i] > s[i]) { x = i; break; }
            if (x < 0) return [];
            const sl = H.lo(c, x - 6, x) - 2;
            return [{ t: 'a', x, dir: 'up', label: '9 crosses 21' }, { t: 'trade', x: x + 1, entry: c[x].c, sl, tp: c[x].c + 3 * (c[x].c - sl), x2: Math.min(x + 16, last(c)) }];
          },
        },
        desc: 'Simple trend-following: buy when the fast EMA crosses above the slow EMA while price is above the 200 EMA. Lower win rate, but winners are large when trends run.',
        rules: {
          Setup: ['Price above EMA 200 (buys only) / below (sells only)'],
          Entry: ['EMA 9 crosses above EMA 21 → enter on the candle close'],
          'Stop loss': ['Below the most recent swing low'],
          'Take profit': ['Trail: exit when EMA 9 crosses back below EMA 21, or 3R'],
          Avoid: ['Sideways markets — use ADX > 20 as a filter'],
        },
      },
      {
        id: 'turtle', name: 'Donchian 20 Breakout (Turtle style)', tags: [TR, BO], win: '35–45%', rr: '1:3 – 1:5+', tf: 'H4 – D1', pairs: 'Trending majors, Gold, JPY crosses', session: 'Daily close',
        chart: {
          seed: 100, ind: { donchian: 20 },
          build: (b) => b.to(4, 8, 2).range(-10, 10, 24, 2).to(30, 10, 2.5).to(24, 4, 2).to(56, 12, 2.5),
          ann: (c) => {
            const d = TChart.donchian(c, 20); let x = -1;
            for (let i = 28; i < c.length; i++) if (d.up[i] != null && c[i].c > d.up[i]) { x = i; break; }
            if (x < 0) return [];
            const atr = TChart.atr(c)[x] || 6, sl = c[x].c - 2 * atr;
            return [{ t: 'a', x, dir: 'up', label: '20-bar high' }, { t: 'trade', x: x + 1, entry: c[x].c, sl, tp: c[x].c + 4 * (c[x].c - sl), x2: last(c), tpLabel: '(trail)' }];
          },
        },
        desc: 'Buy a close above the highest high of the last 20 bars, sell a close below the lowest low. Most trades are small losses; a few huge trends pay for everything.',
        rules: {
          Setup: ['Mark the 20-bar Donchian channel'],
          Entry: ['Close above the upper channel → buy; below the lower → sell'],
          'Stop loss': ['2 × ATR(20) from entry'],
          'Take profit': ['Trail with the 10-bar opposite channel'],
          Avoid: ['Risking more than 0.5–1% per trade — losing streaks of 6–10 are normal'],
        },
      },
    ],
  });
})();
