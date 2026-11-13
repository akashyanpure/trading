(function () {
  const T = { t: 'Trend', c: 'info' }, M = { t: 'Momentum', c: 'info' }, V = { t: 'Volatility', c: 'info' };
  const cl = (c) => c.map((k) => k.c);

  SECTIONS.push({
    id: 'indicators',
    title: 'Indicators Cheat Sheet',
    icon: '📊',
    intro: 'Indicators are derived from price, so they lag. Use them to <b>filter</b> (trend direction, overbought/oversold, volatility) and to time entries — never as the only reason to enter a trade. Two or three indicators are plenty.',
    items: [
      {
        id: 'ema', name: 'Moving Averages (EMA 20 / 50 / 200)', tags: [T], rel: 'Core',
        chart: {
          seed: 71, ind: { ema: [20, 50] },
          build: (b) => b.to(-12, 14, 2.5).to(14, 12, 2.5).to(4, 6, 2).to(32, 12, 2.5).to(22, 6, 2).to(50, 12, 2.5).to(40, 6, 2).to(60, 8, 2.5),
          ann: (c) => {
            const e = TChart.ema(cl(c), 20); const out = [];
            for (let i = 30; i < c.length - 2; i++) if (c[i].l <= e[i] + 1 && c[i - 1].l > e[i - 1] + 1 && c[i].c > e[i] - 1 && i - (out.length ? out[out.length - 1].x : 0) > 6) out.push({ t: 'a', x: i, dir: 'up', label: 'Bounce' });
            return out.slice(0, 3);
          },
        },
        desc: 'EMAs smooth price and show trend direction. Price above a rising EMA = uptrend. EMA 20 = short-term momentum, EMA 50 = medium trend (pullback area), EMA 200 = the long-term "line in the sand".',
        points: {
          Use: ['Trend filter: only buy above EMA 200, only sell below', 'Dynamic support/resistance: pullbacks to EMA 20/50 in trends', 'Fanned out & sloping EMAs = strong trend; flat & tangled = range'],
          Settings: ['EMA 9/21 for scalping, 20/50/200 for intraday & swing'],
          Avoid: ['Crossover signals in sideways markets — constant whipsaws'],
        },
      },
      {
        id: 'rsi', name: 'RSI (Relative Strength Index)', tags: [M], rel: 'Core',
        chart: {
          seed: 72, pane: 'rsi',
          build: (b) => b.to(20, 10, 2).to(-24, 14, 1.5).to(-14, 5, 2).to(-32, 7, 1.5).to(10, 14, 2).to(40, 10, 1.5).to(22, 8, 2),
          paneAnn: (c) => {
            const r = TChart.rsi(cl(c)); const out = [];
            let lo = -1, hi = -1;
            r.forEach((v, i) => { if (v != null && v < 30 && (lo < 0 || v < r[lo])) lo = i; if (v != null && v > 70 && (hi < 0 || v > r[hi])) hi = i; });
            if (lo > 0) out.push({ t: 'p', x: lo, y: r[lo], text: 'Oversold', cls: 'bull', below: true });
            if (hi > 0) out.push({ t: 'p', x: hi, y: r[hi], text: 'Overbought', cls: 'bear', below: true });
            return out;
          },
        },
        desc: 'Momentum oscillator from 0 to 100. Above 70 = overbought, below 30 = oversold. In strong trends RSI can stay overbought/oversold for a long time.',
        points: {
          Use: ['Divergence: price new high but RSI lower high → weakening', 'Trend regime: RSI holding above 40–50 = bullish, below 50–60 = bearish', 'Mean reversion in ranges: buy < 30, sell > 70'],
          Settings: ['14 standard; RSI(2) for short-term mean reversion'],
          Avoid: ['Selling just because RSI > 70 in a strong uptrend'],
        },
      },
      {
        id: 'macd', name: 'MACD', tags: [T, M], rel: 'Core',
        chart: {
          seed: 73, pane: 'macd',
          build: (b) => b.to(-10, 12, 2).to(-34, 14, 2).to(-26, 5, 2).to(-36, 5, 2).to(10, 16, 2.5).to(30, 12, 2.5).to(18, 8, 2),
          paneAnn: (c) => {
            const d = TChart.macd(cl(c)); const out = [];
            for (let i = 27; i < c.length; i++) {
              if (d.line[i - 1] == null || d.sig[i - 1] == null) continue;
              const up = d.line[i - 1] < d.sig[i - 1] && d.line[i] >= d.sig[i];
              const dn = d.line[i - 1] > d.sig[i - 1] && d.line[i] <= d.sig[i];
              if ((up || dn) && (!out.length || i - out[out.length - 1].x > 8)) out.push({ t: 'p', x: i, y: d.line[i], text: up ? 'Bull cross' : 'Bear cross', cls: up ? 'bull' : 'bear', below: up });
            }
            return out;
          },
        },
        desc: 'Difference between EMA 12 and EMA 26 (MACD line), with a 9-EMA signal line and a histogram. Shows trend direction and momentum.',
        points: {
          Use: ['MACD above zero = bullish bias, below zero = bearish', 'Signal-line cross in the direction of the trend = entry trigger', 'Histogram shrinking = momentum fading', 'Divergence at key levels'],
          Settings: ['12, 26, 9 standard'],
          Avoid: ['Taking every cross — filter by zero line and trend'],
        },
      },
      {
        id: 'bbands', name: 'Bollinger Bands', tags: [V], rel: 'Core',
        chart: {
          seed: 74, ind: { bb: true },
          build: (b) => b.to(0, 6, 3).range(-14, 14, 26, 3).to(1, 10, 0.6).to(30, 8, 2.5).to(22, 5, 2),
          ann: (c) => { const bb = TChart.bb(cl(c)); let i = 34; let best = 34; for (; i < 46; i++) if (bb.up[i] - bb.lo[i] < bb.up[best] - bb.lo[best]) best = i; return [{ t: 'b', x1: best - 5, x2: best + 2, label: 'Squeeze', cls: 'info', below: true }]; },
        },
        desc: '20-period SMA with bands 2 standard deviations above and below. ~95% of closes fall inside the bands. Bands widen in volatility and contract (squeeze) before big moves.',
        points: {
          Use: ['Range: fade touches of outer bands back to the middle', 'Trend: "walking the band" — price hugging the upper band is strength', 'Squeeze: narrow bands → prepare for a breakout'],
          Settings: ['20, 2 standard'],
          Avoid: ['Fading band touches when the bands are expanding sharply (breakout)'],
        },
      },
      {
        id: 'stoch', name: 'Stochastic Oscillator', tags: [M], rel: 'Medium',
        chart: {
          seed: 175, pane: 'stoch',
          build: (b) => b.to(-10, 8, 2).to(18, 10, 2).to(0, 6, 1.5).to(32, 10, 2).to(12, 6, 1.5).to(46, 10, 2).to(30, 6, 2),
        },
        desc: 'Compares the close to the recent high–low range (0–100). %K is fast, %D is its 3-period average. Above 80 overbought, below 20 oversold.',
        points: {
          Use: ['In an uptrend, buy when %K crosses above %D from below 20', 'In a downtrend, sell when %K crosses below %D from above 80'],
          Settings: ['14, 3, 3 (slow) is common; 5,3,3 for scalping'],
          Avoid: ['Counter-trend signals — the stochastic is very noisy'],
        },
      },
      {
        id: 'atr', name: 'ATR (Average True Range)', tags: [V], rel: 'Core',
        chart: {
          seed: 76, pane: 'atr',
          build: (b) => b.to(5, 20, 1.2).to(0, 10, 1).to(-40, 10, 5).to(-10, 10, 6).to(-20, 10, 2),
          ann: () => [],
        },
        desc: 'Average size of each candle\'s true range over 14 periods, measured in price/pips. Does not show direction — only volatility.',
        points: {
          Use: ['Stop-loss sizing: SL = 1.5 × ATR beyond the entry structure', 'Position sizing: wider ATR → smaller lot size', 'Targets: daily ATR tells you how far a pair usually moves today'],
          Settings: ['14 periods; check D1 ATR for daily range expectation'],
          Avoid: ['Opening new trades after price already covered ~100% of its daily ATR'],
        },
      },
      {
        id: 'ichimoku', name: 'Ichimoku Cloud', tags: [T], rel: 'Medium–High',
        chart: {
          seed: 77, ind: { ichimoku: true },
          build: (b) => b.to(30, 20, 2.5).to(-20, 30, 2.5).to(-10, 10, 2.5).to(-26, 10, 2).to(30, 26, 2.5).to(22, 8, 2),
        },
        desc: 'All-in-one trend system. The cloud (Senkou A/B) shows trend and future S/R; Tenkan (9) and Kijun (26) act like fast/slow moving averages.',
        points: {
          Use: ['Price above cloud = bullish, below = bearish, inside = no trade', 'Tenkan crossing above Kijun above the cloud = strong buy', 'Kijun is a great trailing stop / pullback level'],
          Settings: ['9, 26, 52 standard'],
          Avoid: ['Trading inside the cloud (chop)'],
        },
      },
    ],
  });
})();
