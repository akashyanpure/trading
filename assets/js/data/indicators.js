(function () {
  const LEAD = { t: 'Leading', c: 'gold' }, LAG = { t: 'Lagging', c: 'info' };
  const MOM = { t: 'Momentum', c: 'muted' }, TRD = { t: 'Trend', c: 'muted' }, VOL = { t: 'Volatility', c: 'muted' }, LVL = { t: 'Levels', c: 'muted' };
  const cl = (c) => c.map((k) => k.c);

  /* mark the first bar of each visit into overbought / oversold zones */
  function hits(arr, lo, hi, gap = 8, max = 4) {
    const out = []; let last = -99;
    for (let i = 1; i < arr.length; i++) {
      const v = arr[i], p = arr[i - 1];
      if (v == null || p == null || i - last < gap) continue;
      if (v <= lo && p > lo) { out.push({ t: 'p', x: i, y: v, text: 'Oversold', cls: 'bull', below: true }); last = i; }
      else if (v >= hi && p < hi) { out.push({ t: 'p', x: i, y: v, text: 'Overbought', cls: 'bear' }); last = i; }
    }
    return out.slice(0, max);
  }
  const swingPath = (b) => b.to(-10, 8, 2).to(18, 10, 2).to(0, 6, 1.5).to(32, 10, 2).to(12, 6, 1.5).to(46, 10, 2).to(30, 6, 2);
  const wavePath = (b) => b.to(20, 10, 2).to(-24, 14, 1.5).to(-8, 6, 2).to(-30, 8, 1.5).to(14, 14, 2).to(38, 10, 1.5).to(20, 8, 2);

  const leading = [
    {
      id: 'rsi', name: 'RSI (Relative Strength Index)', tags: [LEAD, MOM], rel: 'Core',
      chart: { seed: 72, pane: 'rsi', build: wavePath, paneAnn: (c) => hits(TChart.rsi(cl(c)), 30, 70) },
      desc: 'Momentum oscillator 0–100 comparing the size of recent gains vs losses. Above 70 = overbought, below 30 = oversold. Leading because momentum usually fades (divergence) before price turns.',
      points: {
        Use: ['Divergence at key levels → early reversal warning', 'Trend regime: holds 40–50 in uptrends, caps at 50–60 in downtrends', 'Range trading: buy < 30, sell > 70'],
        Settings: ['14 standard · RSI(2) for short-term mean reversion'],
        Avoid: ['Selling just because RSI > 70 in a strong uptrend'],
      },
    },
    {
      id: 'stoch', name: 'Stochastic Oscillator', tags: [LEAD, MOM], rel: 'High',
      chart: { seed: 175, pane: 'stoch', build: swingPath, paneAnn: (c) => hits(TChart.stoch(c).k, 20, 80) },
      desc: 'Where the close sits within the recent high–low range (0–100). %K fast, %D slow. Turns before price at swing points — great for timing pullback entries.',
      points: {
        Use: ['Uptrend: buy when %K crosses up through %D from below 20', 'Downtrend: sell when %K crosses down from above 80'],
        Settings: ['14,3,3 (slow) · 5,3,3 for scalping'],
        Avoid: ['Counter-trend signals — very noisy in strong trends'],
      },
    },
    {
      id: 'stochrsi', name: 'Stochastic RSI', tags: [LEAD, MOM], rel: 'Medium',
      chart: { seed: 301, pane: 'stochrsi', build: swingPath, paneAnn: (c) => hits(TChart.stochRsi(cl(c)).k, 20, 80) },
      desc: 'A stochastic applied to RSI instead of price — an "indicator of an indicator". Much faster and more sensitive than RSI, reaching extremes far more often.',
      points: {
        Use: ['Timing entries in the trend direction on lower timeframes', 'K/D cross out of an extreme zone = trigger'],
        Settings: ['14,14,3,3'],
        Avoid: ['Using it alone — it gives many false signals'],
      },
    },
    {
      id: 'willr', name: 'Williams %R', tags: [LEAD, MOM], rel: 'Medium',
      chart: { seed: 302, pane: 'willr', build: wavePath, paneAnn: (c) => hits(TChart.willr(c), -80, -20) },
      desc: 'Like an inverted fast stochastic (0 to −100). Above −20 = overbought, below −80 = oversold. Very responsive; popular for short-term reversals.',
      points: {
        Use: ['Failure to reach −20 on a rally in a downtrend = weakness', 'Crosses back out of −80 / −20 as entry triggers'],
        Settings: ['14 periods'],
        Avoid: ['Fading strong trends just because %R is extreme'],
      },
    },
    {
      id: 'cci', name: 'CCI (Commodity Channel Index)', tags: [LEAD, MOM], rel: 'Medium',
      chart: { seed: 303, pane: 'cci', build: swingPath, paneAnn: (c) => hits(TChart.cci(c), -100, 100, 10) },
      desc: 'Measures how far price is from its statistical average. Readings above +100 / below −100 are unusual and show strong momentum or extremes.',
      points: {
        Use: ['Trend: cross above +100 = momentum entry; pullback to 0 = add', 'Range: moves back inside ±100 from outside = reversal'],
        Settings: ['20 periods (14 on lower TFs)'],
        Avoid: ['Treating every ±100 as a reversal — in trends it can stay there'],
      },
    },
    {
      id: 'momentum', name: 'Momentum / Rate of Change', tags: [LEAD, MOM], rel: 'Medium',
      chart: { seed: 304, pane: 'mom', build: (b) => b.to(-6, 6, 1.5).to(36, 14, 1.5).to(44, 10, 1.2).to(46, 8, 1).to(20, 12, 1.5).to(-6, 12, 1.5).to(4, 8, 1.5) },
      desc: 'Current price minus the price N bars ago. When momentum peaks and starts falling while price still rises, the trend is losing speed — before price actually turns.',
      points: {
        Use: ['Zero-line crosses confirm direction changes', 'Momentum making lower highs while price makes higher highs = divergence'],
        Settings: ['10 or 14 periods'],
        Avoid: ['Ignoring the bigger trend; momentum dips are normal pullbacks'],
      },
    },
    {
      id: 'uo', name: 'Ultimate Oscillator', tags: [LEAD, MOM], rel: 'Medium',
      chart: { seed: 305, pane: 'uo', build: wavePath, paneAnn: (c) => hits(TChart.ultimate(c), 30, 70) },
      desc: 'Larry Williams\' oscillator blending 7, 14 and 28-period buying pressure. Averaging three timeframes reduces the false signals of single-period oscillators.',
      points: {
        Use: ['Bullish divergence with UO below 30, then UO breaks the divergence high → buy', 'Above 70 = overbought'],
        Settings: ['7, 14, 28'],
        Avoid: ['Signals without divergence — the original rules require it'],
      },
    },
    {
      id: 'demarker', name: 'DeMarker', tags: [LEAD, MOM], rel: 'Medium',
      chart: { seed: 306, pane: 'dem', build: wavePath, paneAnn: (c) => hits(TChart.demarker(c), 0.3, 0.7) },
      desc: 'Tom DeMark\'s exhaustion gauge (0–1) comparing new highs vs new lows. Above 0.7 = buying exhaustion, below 0.3 = selling exhaustion. Built into MT4/MT5.',
      points: {
        Use: ['Spot exhausted pullbacks in a trend (dip below 0.3 in an uptrend = buy zone)'],
        Settings: ['14 periods'],
        Avoid: ['Stand-alone use; pair with levels or structure'],
      },
    },
    {
      id: 'pivots', name: 'Pivot Points (Classic)', tags: [LEAD, LVL], rel: 'High',
      chart: {
        seed: 307,
        build: (b) => { b.to(5, 4, 2).range(-10, 15, 20, 2.5); b.mark('y'); b.to(-12, 8, 2).to(12, 10, 2).to(6, 5, 2).to(14, 5, 2); },
        ann: (c, m) => {
          const yH = H.hi(c, 0, m.y), yL = H.lo(c, 0, m.y), yC = c[m.y].c, pp = (yH + yL + yC) / 3;
          const lv = [['R2', pp + (yH - yL), 'res'], ['R1', 2 * pp - yL, 'res'], ['PP', pp, 'neutral'], ['S1', 2 * pp - yH, 'sup'], ['S2', pp - (yH - yL), 'sup']];
          return [{ t: 'z', x1: 0, x2: m.y, y1: yH, y2: yL, cls: 'neutral', label: 'Yesterday → H, L, C' }]
            .concat(lv.map(([n, y, cls]) => ({ t: 'h', y, x1: m.y + 1, cls, label: n, lx: c.length - 3 })));
        },
      },
      desc: 'Support/resistance levels calculated from yesterday\'s high, low and close. Because thousands of traders and algos watch the same numbers, price often reacts at them — known before the session starts.',
      points: {
        Use: ['Above PP = bullish bias, below = bearish', 'Fade S1/R1 in ranges; break of R1/S1 targets R2/S2 on trend days'],
        Settings: ['PP = (H+L+C)/3 · R1 = 2PP−L · S1 = 2PP−H · R2/S2 = PP ± (H−L)'],
        Avoid: ['Trading levels blindly on big news days'],
      },
    },
    {
      id: 'fib-tool', name: 'Fibonacci Retracement & Extensions', tags: [LEAD, LVL], rel: 'High',
      chart: {
        seed: 68,
        build: (b) => b.to(-4, 3, 1.5).mark('s').to(50, 10, 2).mark('e').to(22, 7, 2).mark('rt').to(66, 10, 2.5),
        ann: (c, m) => { const s = H.loIdx(c, 0, m.s + 1), e = H.hiIdx(c, m.e - 1, m.e + 1); return [{ t: 'fib', x1: s, y1: c[e].h, y2: c[s].l, golden: true }, { t: 'a', x: H.loIdx(c, m.rt - 1, m.rt + 2), dir: 'up', label: 'Golden zone' }]; },
      },
      desc: 'Projects likely pullback levels (38.2 / 50 / 61.8 / 78.6%) and targets (127.2 / 161.8%) from a swing — drawn before price gets there, which makes it leading.',
      points: {
        Use: ['Buy pullbacks into 50–61.8% in an uptrend with a confirmation candle', 'Targets at −27% / −61.8% extensions'],
        Settings: ['Draw swing low → swing high (uptrend), reverse in downtrends'],
        Avoid: ['Drawing on unclear swings; fib alone without confluence'],
      },
    },
  ];

  const lagging = [
    {
      id: 'ema', name: 'Exponential Moving Average (EMA 20 / 50)', tags: [LAG, TRD], rel: 'Core',
      chart: {
        seed: 71, ind: { ema: [20, 50] },
        build: (b) => b.to(-12, 14, 2.5).to(14, 12, 2.5).to(4, 6, 2).to(32, 12, 2.5).to(22, 6, 2).to(50, 12, 2.5).to(40, 6, 2).to(60, 8, 2.5),
        ann: (c) => {
          const e = TChart.ema(cl(c), 20); const out = [];
          for (let i = 30; i < c.length - 2; i++) if (c[i].l <= e[i] + 1 && c[i - 1].l > e[i - 1] + 1 && c[i].c > e[i] - 1 && i - (out.length ? out[out.length - 1].x : 0) > 6) out.push({ t: 'a', x: i, dir: 'up', label: 'Bounce' });
          return out.slice(0, 3);
        },
      },
      desc: 'Weighted average that reacts faster than an SMA. Price above a rising EMA = uptrend. EMA 20 = short-term momentum, EMA 50 = pullback area, EMA 200 = long-term bias.',
      points: {
        Use: ['Trend filter: buy only above EMA 200', 'Dynamic support/resistance on pullbacks', 'Fanned, sloped EMAs = strong trend; tangled = range'],
        Settings: ['9/21 scalping · 20/50/200 intraday & swing'],
        Avoid: ['Crossovers in sideways markets'],
      },
    },
    {
      id: 'sma', name: 'Simple Moving Average (Golden / Death Cross)', tags: [LAG, TRD], rel: 'High',
      chart: {
        seed: 311, ind: { sma: [20, 50] },
        build: (b) => b.to(20, 16, 2).to(-14, 26, 2).to(-6, 8, 2).to(36, 30, 2.2),
        ann: (c) => {
          const v = cl(c), f = TChart.sma(v, 20), s = TChart.sma(v, 50); const out = [];
          for (let i = 51; i < c.length; i++) { if (f[i - 1] <= s[i - 1] && f[i] > s[i]) out.push({ t: 'a', x: i, dir: 'up', label: 'Golden cross' }); if (f[i - 1] >= s[i - 1] && f[i] < s[i]) out.push({ t: 'a', x: i, dir: 'down', label: 'Death cross' }); }
          return out.slice(0, 2);
        },
      },
      desc: 'Plain average of the last N closes. Slower and smoother than an EMA. The 50/200 SMA "golden cross" (bullish) and "death cross" (bearish) on the daily chart are the most-watched long-term signals.',
      points: {
        Use: ['Daily 50/200 crosses for long-term bias', 'SMA 200 as institutional support/resistance'],
        Settings: ['50 & 200 on D1 (example shows 20/50 for space)'],
        Avoid: ['Using crosses for entry timing — they arrive very late'],
      },
    },
    {
      id: 'macd', name: 'MACD', tags: [LAG, TRD, MOM], rel: 'Core',
      chart: {
        seed: 73, pane: 'macd',
        build: (b) => b.to(-10, 12, 2).to(-34, 14, 2).to(-26, 5, 2).to(-36, 5, 2).to(10, 16, 2.5).to(30, 12, 2.5).to(18, 8, 2),
        paneAnn: (c) => {
          const d = TChart.macd(cl(c)); const out = [];
          for (let i = 27; i < c.length; i++) {
            if (d.line[i - 1] == null || d.sig[i - 1] == null) continue;
            const up = d.line[i - 1] < d.sig[i - 1] && d.line[i] >= d.sig[i], dn = d.line[i - 1] > d.sig[i - 1] && d.line[i] <= d.sig[i];
            if ((up || dn) && (!out.length || i - out[out.length - 1].x > 8)) out.push({ t: 'p', x: i, y: d.line[i], text: up ? 'Bull cross' : 'Bear cross', cls: up ? 'bull' : 'bear', below: up });
          }
          return out;
        },
      },
      desc: 'EMA 12 − EMA 26 (MACD line) with a 9-EMA signal line and histogram. Shows trend direction and momentum; built from moving averages, so it lags.',
      points: {
        Use: ['Above zero = bullish bias, below = bearish', 'Signal-line cross in trend direction = trigger', 'Shrinking histogram = momentum fading'],
        Settings: ['12, 26, 9'],
        Avoid: ['Taking every cross in a flat market'],
      },
    },
    {
      id: 'bbands', name: 'Bollinger Bands', tags: [LAG, VOL], rel: 'Core',
      chart: {
        seed: 74, ind: { bb: true },
        build: (b) => b.to(0, 6, 3).range(-14, 14, 26, 3).to(1, 10, 0.6).to(30, 8, 2.5).to(22, 5, 2),
        ann: (c) => { const bb = TChart.bb(cl(c)); let best = 34; for (let i = 34; i < 46; i++) if (bb.up[i] - bb.lo[i] < bb.up[best] - bb.lo[best]) best = i; return [{ t: 'b', x1: best - 5, x2: best + 2, label: 'Squeeze', cls: 'info', below: true }]; },
      },
      desc: '20-SMA with bands 2 standard deviations away. ~95% of closes stay inside. Bands widen with volatility and squeeze before big moves.',
      points: {
        Use: ['Range: fade outer band touches back to the middle', 'Trend: "walking the band" = strength', 'Squeeze → prepare for breakout'],
        Settings: ['20, 2'],
        Avoid: ['Fading band touches while the bands expand sharply'],
      },
    },
    {
      id: 'adx', name: 'ADX / DMI', tags: [LAG, TRD], rel: 'High',
      chart: { seed: 312, pane: 'adx', build: (b) => b.to(4, 10, 2.5).range(-8, 8, 16, 2.5).to(50, 22, 1.8).to(44, 10, 2.5).range(38, 50, 14, 2.5) },
      desc: 'Measures trend STRENGTH (not direction) from 0–100. ADX above 25 = trending market, below 20 = range. +DI above −DI = bulls in control.',
      points: {
        Use: ['Filter: use trend strategies only when ADX > 25, range strategies when < 20', '+DI / −DI cross for direction'],
        Settings: ['14'],
        Avoid: ['Reading a falling ADX as a reversal — it only means the trend is weakening'],
      },
    },
    {
      id: 'psar', name: 'Parabolic SAR', tags: [LAG, TRD], rel: 'Medium',
      chart: { seed: 313, ind: { psar: true }, build: (b) => b.to(-6, 6, 2).to(30, 16, 2).to(18, 8, 2).to(-14, 14, 2).to(-4, 8, 2).to(26, 14, 2) },
      desc: 'Dots that trail price and accelerate as the trend extends. Dots below price = uptrend, above = downtrend; a flip signals a possible reversal.',
      points: {
        Use: ['Trailing stop: move SL to the dot each bar', 'Flip + trend filter (EMA 200) as entry'],
        Settings: ['Step 0.02, max 0.2'],
        Avoid: ['Ranges — it flips constantly'],
      },
    },
    {
      id: 'ichimoku', name: 'Ichimoku Cloud', tags: [LAG, TRD], rel: 'Medium–High',
      chart: { seed: 77, ind: { ichimoku: true }, build: (b) => b.to(30, 20, 2.5).to(-20, 30, 2.5).to(-10, 10, 2.5).to(-26, 10, 2).to(30, 26, 2.5).to(22, 8, 2) },
      desc: 'All-in-one trend system. Cloud (Senkou A/B) = trend and future S/R; Tenkan (9) and Kijun (26) act like fast/slow moving averages.',
      points: {
        Use: ['Above cloud = bullish, below = bearish, inside = no trade', 'Tenkan > Kijun above the cloud = strong buy', 'Kijun = trailing stop'],
        Settings: ['9, 26, 52'],
        Avoid: ['Trading inside the cloud'],
      },
    },
    {
      id: 'supertrend', name: 'Supertrend', tags: [LAG, TRD], rel: 'Medium–High',
      chart: { seed: 314, ind: { supertrend: true }, build: (b) => b.to(-6, 8, 2).to(32, 18, 2.2).to(22, 8, 2).to(-16, 16, 2.2).to(-6, 8, 2).to(28, 16, 2.2) },
      desc: 'ATR-based line that sits below price in uptrends (green) and above in downtrends (red). Simple, visual trend direction plus a built-in trailing stop.',
      points: {
        Use: ['Trade only in the Supertrend direction', 'Use the line as a trailing stop', 'Flip = trend change signal'],
        Settings: ['ATR 10, multiplier 3'],
        Avoid: ['Sideways markets — whipsaws'],
      },
    },
    {
      id: 'atr', name: 'ATR (Average True Range)', tags: [LAG, VOL], rel: 'Core',
      chart: { seed: 76, pane: 'atr', build: (b) => b.to(5, 20, 1.2).to(0, 10, 1).to(-40, 10, 5).to(-10, 10, 6).to(-20, 10, 2) },
      desc: 'Average candle range over 14 periods, in price/pips. Shows volatility, not direction.',
      points: {
        Use: ['SL = 1.5 × ATR beyond structure', 'Higher ATR → smaller lot size', 'Daily ATR = how far a pair usually travels today'],
        Settings: ['14 · check D1 ATR for daily range'],
        Avoid: ['New trades after price already covered ~100% of daily ATR'],
      },
    },
    {
      id: 'keltner', name: 'Keltner Channels', tags: [LAG, VOL, TRD], rel: 'Medium',
      chart: { seed: 315, ind: { keltner: true }, build: (b) => b.to(4, 8, 2).range(-8, 8, 18, 2).to(36, 14, 2).to(28, 6, 2).to(46, 10, 2) },
      desc: 'EMA 20 with bands at ± 2 × ATR. Smoother than Bollinger Bands. A close outside the channel signals a strong trending move.',
      points: {
        Use: ['Close above upper band = momentum breakout; pullbacks to the EMA = entries', 'Bollinger inside Keltner = "TTM squeeze" (big move coming)'],
        Settings: ['EMA 20, ATR 10, ×2'],
        Avoid: ['Fading the first close outside the channel'],
      },
    },
  ];

  SECTIONS.push({
    id: 'ind-leading', group: 'indicators', title: 'Leading Indicators (Top 10)', icon: '⏩',
    intro: '<b>Leading</b> indicators try to signal a move <i>before</i> it happens — mostly oscillators and pre-calculated levels. They give early entries but more false signals. Best in ranges and for timing entries inside a trend.',
    items: leading,
  });
  SECTIONS.push({
    id: 'ind-lagging', group: 'indicators', title: 'Lagging Indicators (Top 10)', icon: '⏪',
    intro: '<b>Lagging</b> indicators confirm a move <i>after</i> it starts — moving averages, trend and volatility tools. Fewer false signals, later entries. Best for trend direction, filters and trailing stops. Use one lagging tool for direction + one leading tool for timing.',
    items: lagging,
  });
})();
