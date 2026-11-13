(function () {
  const cp = H.cp;
  const BULL = { t: 'Bullish', c: 'bull' }, BEAR = { t: 'Bearish', c: 'bear' }, NEU = { t: 'Neutral', c: 'neu' };
  const REV = { t: 'Reversal', c: 'info' }, CONT = { t: 'Continuation', c: 'info' };
  const n1 = { t: '1 candle', c: 'muted' }, n2 = { t: '2 candles', c: 'muted' }, n3 = { t: '3 candles', c: 'muted' };

  const items = [
      {
        id: 'hammer', name: 'Hammer', tags: [BULL, REV, n1], rel: 'Medium–High',
        chart: cp({ seed: 11, pre: [-40, 14], fn: (b) => b.k(-3, 1, 2).k(2.5, 0.6, 16), post: [32, 10], label: 'Hammer', cls: 'bull', arrow: 'up' }),
        desc: 'Small body near the top with a lower wick at least 2× the body, appearing after a decline. Sellers pushed price down but buyers rejected the lows hard.',
        points: {
          Identify: ['Lower wick ≥ 2× body, little/no upper wick', 'Appears after a downtrend or pullback', 'Body color is less important (green slightly stronger)'],
          Trade: ['Entry: above the hammer high (or next candle close)', 'SL: a few pips below the wick low', 'TP: next resistance or 2R'],
          Tips: ['Strongest at support, demand zone or the 50/200 EMA', 'Ignore hammers in the middle of nowhere'],
        },
      },
      {
        id: 'inverted-hammer', name: 'Inverted Hammer', tags: [BULL, REV, n1], rel: 'Medium',
        chart: cp({ seed: 12, pre: [-38, 14], fn: (b) => b.k(-4, 1, 1).k(2.5, 14, 0.5, -0.5), post: [30, 10], label: 'Inverted hammer', cls: 'bull', arrow: 'up' }),
        desc: 'Small body at the bottom with a long upper wick, after a downtrend. Buyers attempted a push; needs bullish confirmation from the next candle.',
        points: {
          Identify: ['Upper wick ≥ 2× body, tiny lower wick', 'Found at the bottom of a decline'],
          Trade: ['Wait for a bullish close above the inverted hammer', 'SL below its low', 'TP: prior swing high / resistance'],
          Tips: ['Weaker than a hammer — confirmation is mandatory'],
        },
      },
      {
        id: 'shooting-star', name: 'Shooting Star', tags: [BEAR, REV, n1], rel: 'Medium–High',
        chart: cp({ seed: 13, pre: [40, 14], fn: (b) => b.k(3, 1, 1).k(-2.5, 16, 0.6, 0.5), post: [-32, 10], label: 'Shooting star', cls: 'bear', arrow: 'down' }),
        desc: 'Small body near the low with a long upper wick after an uptrend. Buyers pushed up but sellers slammed price back down — rejection of higher prices.',
        points: {
          Identify: ['Upper wick ≥ 2× body, little/no lower wick', 'Appears after a rally, ideally into resistance'],
          Trade: ['Entry: below the star low', 'SL: above the wick high', 'TP: next support or 2R'],
          Tips: ['Best at resistance, supply zone or round numbers (e.g. 1.1000)'],
        },
      },
      {
        id: 'hanging-man', name: 'Hanging Man', tags: [BEAR, REV, n1], rel: 'Low–Medium',
        chart: cp({ seed: 14, pre: [38, 14], fn: (b) => b.k(4, 1, 1).k(-2, 0.6, 15, 0.5), post: [-30, 10], label: 'Hanging man', cls: 'bear', arrow: 'down' }),
        desc: 'Same shape as a hammer but appears at the top of an uptrend. Shows sellers are starting to step in. Needs a bearish confirmation candle.',
        points: {
          Identify: ['Long lower wick, small body near the top', 'Occurs after an uptrend'],
          Trade: ['Enter only after a bearish close below its body', 'SL above the high', 'TP: next support'],
          Tips: ['One of the less reliable single candles — treat as a warning, not a signal'],
        },
      },
      {
        id: 'doji', name: 'Doji (Standard)', tags: [NEU, REV, n1], rel: 'Low alone',
        chart: cp({ seed: 15, pre: [36, 14], fn: (b) => b.k(0.2, 8, 8), post: [-28, 10], label: 'Doji', cls: 'neu', arrow: 'down' }),
        desc: 'Open ≈ close. Pure indecision. After a strong trend it warns that momentum is fading; on its own it is not a signal.',
        points: {
          Identify: ['Body is tiny (open and close almost equal)', 'Wicks on both sides'],
          Trade: ['Trade the break of the doji high/low in the direction of the next confirmed candle'],
          Tips: ['In ranges dojis are common and meaningless', 'At key levels after an extended move → potential reversal'],
        },
      },
      {
        id: 'dragonfly', name: 'Dragonfly Doji', tags: [BULL, REV, n1], rel: 'Medium',
        chart: cp({ seed: 16, pre: [-36, 14], fn: (b) => b.k(0.2, 0.3, 15), post: [30, 10], label: 'Dragonfly', cls: 'bull', arrow: 'up' }),
        desc: 'Open, high and close at the top with a long lower wick. Strong rejection of lower prices — bullish at support.',
        points: {
          Identify: ['No upper wick, long lower wick, no body'],
          Trade: ['Entry above the high, SL below the wick'],
          Tips: ['Treat like a hammer; best at support or demand'],
        },
      },
      {
        id: 'gravestone', name: 'Gravestone Doji', tags: [BEAR, REV, n1], rel: 'Medium',
        chart: cp({ seed: 17, pre: [36, 14], fn: (b) => b.k(-0.2, 15, 0.3), post: [-30, 10], label: 'Gravestone', cls: 'bear', arrow: 'down' }),
        desc: 'Open, low and close at the bottom with a long upper wick. Strong rejection of higher prices — bearish at resistance.',
        points: {
          Identify: ['No lower wick, long upper wick, no body'],
          Trade: ['Entry below the low, SL above the wick'],
          Tips: ['Treat like a shooting star'],
        },
      },
      {
        id: 'marubozu', name: 'Bullish Marubozu', tags: [BULL, CONT, n1], rel: 'Medium–High',
        chart: { seed: 18, build: (b) => { b.to(5, 3, 2).range(-6, 6, 8, 2); b.k(1, 0.5, 1); b.k(22, 0.2, 0.2).mark('p'); b.to(b.last + 24, 6, 2.5); },
          ann: (c, m) => [{ t: 'h', y: H.hi(c, 0, m.p - 1), label: 'Range high', cls: 'res', x2: m.p }, { t: 'b', x1: m.p, x2: m.p, label: 'Bullish marubozu', cls: 'bull' }] },
        desc: 'A full-body candle with no (or almost no) wicks. One side completely controlled the period. Often starts a breakout or continuation.',
        points: {
          Identify: ['Body = nearly the whole range', 'Green = buyers in control, red = sellers in control'],
          Trade: ['Breakout out of a range: enter on a small pullback into the candle (50% of body)', 'SL below the candle midpoint/low'],
          Tips: ['A marubozu against your position is a strong reason to exit'],
        },
      },
      {
        id: 'bear-marubozu', name: 'Bearish Marubozu', tags: [BEAR, CONT, n1], rel: 'Medium–High',
        chart: { seed: 20, build: (b) => { b.to(-5, 3, 2).range(-6, 6, 8, 2); b.k(-1, 1, 0.5); b.k(-22, 0.2, 0.2).mark('p'); b.to(b.last - 24, 6, 2.5); },
          ann: (c, m) => [{ t: 'h', y: H.lo(c, 0, m.p - 1), label: 'Range low', cls: 'sup', x2: m.p, below: true }, { t: 'b', x1: m.p, x2: m.p, label: 'Bearish marubozu', cls: 'bear', below: true }] },
        desc: 'A full red body with no wicks: sellers controlled the entire period from open to close. Often starts a breakdown or continues a downtrend.',
        points: {
          Identify: ['Open ≈ high, close ≈ low, (almost) no wicks'],
          Trade: ['Breakdown from a range: sell a pullback into the upper half of the candle', 'SL above the candle midpoint/high'],
          Tips: ['A bearish marubozu against a long position is a strong reason to exit'],
        },
      },
      {
        id: 'spinning-top', name: 'Spinning Top', tags: [NEU, n1], rel: 'Low',
        chart: cp({ seed: 19, pre: [32, 14], fn: (b) => b.k(1.5, 7, 7).k(-1.5, 6, 6), post: [-20, 10], label: 'Spinning tops', cls: 'neu' }),
        desc: 'Small body centered between upper and lower wicks of similar length. Indecision; momentum slowing.',
        points: {
          Identify: ['Small body in the middle, both wicks longer than the body'],
          Trade: ['Not a trade signal alone — use it as a warning to tighten stops / take partials'],
          Tips: ['A cluster of spinning tops at resistance often precedes a reversal'],
        },
      },
      {
        id: 'bull-engulfing', name: 'Bullish Engulfing', tags: [BULL, REV, n2], rel: 'High',
        chart: cp({ seed: 21, pre: [-40, 14], fn: (b) => b.k(-7, 1.5, 1.5).k(12, 1.5, 1.5, -1), post: [30, 10], label: 'Bullish engulfing', cls: 'bull', arrow: 'up' }),
        desc: 'A bullish candle whose body fully engulfs the previous bearish body. Buyers completely overpowered sellers. One of the most reliable 2-candle patterns.',
        points: {
          Identify: ['Candle 1 bearish, candle 2 bullish', 'Body 2 opens at/below close 1 and closes above open 1'],
          Trade: ['Entry: close of the engulfing candle or a 50% retrace of it', 'SL: below the pattern low', 'TP: next resistance / 2R'],
          Tips: ['The bigger the engulfing body vs. the prior one, the better', 'Top-tier at support + RSI oversold'],
        },
      },
      {
        id: 'bear-engulfing', name: 'Bearish Engulfing', tags: [BEAR, REV, n2], rel: 'High',
        chart: cp({ seed: 22, pre: [40, 14], fn: (b) => b.k(7, 1.5, 1.5).k(-12, 1.5, 1.5, 1), post: [-30, 10], label: 'Bearish engulfing', cls: 'bear', arrow: 'down' }),
        desc: 'A bearish candle whose body fully engulfs the prior bullish body. Sellers took full control.',
        points: {
          Identify: ['Candle 1 bullish, candle 2 bearish', 'Body 2 opens at/above close 1 and closes below open 1'],
          Trade: ['Entry: close of the engulfing candle', 'SL: above the pattern high', 'TP: next support / 2R'],
          Tips: ['Most powerful at resistance / supply after an extended move'],
        },
      },
      {
        id: 'piercing', name: 'Piercing Line', tags: [BULL, REV, n2], rel: 'Medium',
        chart: cp({ seed: 23, pre: [-36, 14], fn: (b) => b.k(-12, 1, 1).k(9, 1, 1.5, -2), post: [28, 10], label: 'Piercing line', cls: 'bull', arrow: 'up' }),
        desc: 'Long bearish candle followed by a bullish candle that opens lower and closes above the midpoint of the first candle.',
        points: {
          Identify: ['Candle 2 opens below close 1', 'Candle 2 closes above 50% of candle 1 body (but not above its open)'],
          Trade: ['Entry above candle 2 high', 'SL below pattern low'],
          Tips: ['If it closes above candle 1 open, it becomes an engulfing (stronger)'],
        },
      },
      {
        id: 'dark-cloud', name: 'Dark Cloud Cover', tags: [BEAR, REV, n2], rel: 'Medium',
        chart: cp({ seed: 24, pre: [36, 14], fn: (b) => b.k(12, 1, 1).k(-9, 1.5, 1, 2), post: [-28, 10], label: 'Dark cloud cover', cls: 'bear', arrow: 'down' }),
        desc: 'Long bullish candle followed by a bearish candle that opens higher and closes below the midpoint of the first.',
        points: {
          Identify: ['Candle 2 opens above close 1', 'Candle 2 closes below 50% of candle 1 body'],
          Trade: ['Entry below candle 2 low', 'SL above the pattern high'],
          Tips: ['Bearish counterpart of the piercing line'],
        },
      },
      {
        id: 'tweezer-bottom', name: 'Tweezer Bottom', tags: [BULL, REV, n2], rel: 'Medium',
        chart: cp({ seed: 25, pre: [-38, 14], fn: (b) => b.k(-8, 1, 6).k(7, 1, 6), post: [28, 10], label: 'Tweezer bottom', cls: 'bull', arrow: 'up', ann: (c, m) => [{ t: 'h', y: c[m.s].l, x1: m.s - 3, x2: m.e + 3, cls: 'sup', label: 'Equal lows' , below: true}] }),
        desc: 'Two candles with (almost) identical lows: the first bearish, the second bullish. The same price was rejected twice.',
        points: {
          Identify: ['Matching lows within 1–2 pips', 'First bearish, second bullish'],
          Trade: ['Entry above the second candle', 'SL below the double low'],
          Tips: ['Common at round numbers and previous day low'],
        },
      },
      {
        id: 'tweezer-top', name: 'Tweezer Top', tags: [BEAR, REV, n2], rel: 'Medium',
        chart: cp({ seed: 26, pre: [38, 14], fn: (b) => b.k(8, 6, 1).k(-7, 6, 1), post: [-28, 10], label: 'Tweezer top', cls: 'bear', arrow: 'down', ann: (c, m) => [{ t: 'h', y: c[m.s].h, x1: m.s - 3, x2: m.e + 3, cls: 'res', label: 'Equal highs' }] }),
        desc: 'Two candles with matching highs: first bullish, second bearish. Price was rejected at the same level twice.',
        points: {
          Identify: ['Matching highs within 1–2 pips', 'First bullish, second bearish'],
          Trade: ['Entry below the second candle', 'SL above the double high'],
          Tips: ['Common at previous day high and round numbers'],
        },
      },
      {
        id: 'bull-harami', name: 'Bullish Harami', tags: [BULL, REV, n2], rel: 'Low–Medium',
        chart: cp({ seed: 27, pre: [-36, 14], fn: (b) => b.k(-16, 1, 1).k(5, 1, 1, 3), post: [26, 10], label: 'Bullish harami', cls: 'bull', arrow: 'up' }),
        desc: 'A large bearish candle followed by a small bullish candle fully inside its body ("pregnant" pattern). Selling momentum has stalled.',
        points: {
          Identify: ['Candle 2 body is completely inside candle 1 body'],
          Trade: ['Enter on a break above candle 1 midpoint/high', 'SL below candle 1 low'],
          Tips: ['Needs confirmation — weaker than engulfing'],
        },
      },
      {
        id: 'bear-harami', name: 'Bearish Harami', tags: [BEAR, REV, n2], rel: 'Low–Medium',
        chart: cp({ seed: 28, pre: [36, 14], fn: (b) => b.k(16, 1, 1).k(-5, 1, 1, -3), post: [-26, 10], label: 'Bearish harami', cls: 'bear', arrow: 'down' }),
        desc: 'A large bullish candle followed by a small bearish candle inside its body. Buying momentum has stalled.',
        points: {
          Identify: ['Candle 2 body is completely inside candle 1 body'],
          Trade: ['Enter on a break below candle 1 midpoint/low', 'SL above candle 1 high'],
          Tips: ['Needs confirmation'],
        },
      },
      {
        id: 'morning-star', name: 'Morning Star', tags: [BULL, REV, n3], rel: 'High',
        chart: cp({ seed: 31, pre: [-36, 13], fn: (b) => b.k(-14, 1, 1).k(1, 2, 2, -2).k(13, 1, 1, 1), post: [26, 10], label: 'Morning star', cls: 'bull', arrow: 'up' }),
        desc: 'Long bearish candle → small indecision candle (star) → strong bullish candle closing deep into the first candle. Classic bottom reversal.',
        points: {
          Identify: ['Candle 3 closes above 50% of candle 1', 'Middle candle small (doji or spinning top)'],
          Trade: ['Entry at close of candle 3', 'SL below the star low', 'TP: 2R or next resistance'],
          Tips: ['Very reliable at daily/4H support'],
        },
      },
      {
        id: 'evening-star', name: 'Evening Star', tags: [BEAR, REV, n3], rel: 'High',
        chart: cp({ seed: 32, pre: [36, 13], fn: (b) => b.k(14, 1, 1).k(-1, 2, 2, 2).k(-13, 1, 1, -1), post: [-26, 10], label: 'Evening star', cls: 'bear', arrow: 'down' }),
        desc: 'Long bullish candle → small star → strong bearish candle closing deep into the first candle. Classic top reversal.',
        points: {
          Identify: ['Candle 3 closes below 50% of candle 1', 'Middle candle small'],
          Trade: ['Entry at close of candle 3', 'SL above the star high'],
          Tips: ['Very reliable at daily/4H resistance'],
        },
      },
      {
        id: 'three-soldiers', name: 'Three White Soldiers', tags: [BULL, REV, n3], rel: 'High',
        chart: cp({ seed: 33, pre: [-30, 13], fn: (b) => b.k(-3, 1, 2).k(9, 1.5, 1, -1).k(10, 1.5, 1, -2).k(9, 1.5, 1, -2), post: [18, 9], label: 'Three white soldiers', cls: 'bull' }),
        desc: 'Three consecutive strong bullish candles, each opening within the previous body and closing near its high. Strong shift to bullish control.',
        points: {
          Identify: ['3 long green bodies, small wicks', 'Each close higher than the last'],
          Trade: ['Do not chase — wait for a pullback to the 2nd candle body / 50% of the move'],
          Tips: ['If the 3rd candle shows a long upper wick, momentum is fading ("advance block")'],
        },
      },
      {
        id: 'three-crows', name: 'Three Black Crows', tags: [BEAR, REV, n3], rel: 'High',
        chart: cp({ seed: 34, pre: [30, 13], fn: (b) => b.k(3, 2, 1).k(-9, 1, 1.5, 1).k(-10, 1, 1.5, 2).k(-9, 1, 1.5, 2), post: [-18, 9], label: 'Three black crows', cls: 'bear' }),
        desc: 'Three consecutive strong bearish candles, each closing near its low. Strong shift to bearish control.',
        points: {
          Identify: ['3 long red bodies, small wicks', 'Each close lower than the last'],
          Trade: ['Wait for a pullback into the 2nd candle body before selling'],
          Tips: ['After a long downtrend it can mean exhaustion — check location'],
        },
      },
      {
        id: 'inside-bar', name: 'Inside Bar', tags: [CONT, n2], rel: 'Medium',
        chart: cp({ seed: 35, pre: [24, 14], fn: (b) => b.k(18, 3, 3).k(-5, 2, 2, -2), post: [26, 9], label: 'Mother + inside bar', cls: 'info', ann: (c, m) => [{ t: 'h', y: c[m.s].h, x1: m.s, x2: m.e + 4, cls: 'res', label: 'Break ↑' }, { t: 'h', y: c[m.s].l, x1: m.s, x2: m.e + 4, cls: 'sup', label: 'Break ↓', below: true }, { t: 'a', x: m.e + 1, dir: 'up', label: 'BUY' }] }),
        desc: 'A candle whose whole range (high & low) is inside the previous "mother" candle. Consolidation — energy builds before the next move.',
        points: {
          Identify: ['High lower than mother high, low higher than mother low'],
          Trade: ['Trend direction: buy-stop above mother high / sell-stop below mother low', 'SL: other side of the mother bar (or its 50%)'],
          Tips: ['Best on 4H/Daily in trending markets', 'Ignore inside bars in choppy ranges'],
        },
      },
  ];

  const pick = (fn) => items.filter((it) => fn(it.tags[0].c));
  const base = 'Location matters more than shape: a pattern means much more at support/resistance, a supply/demand zone or a key EMA than in the middle of a range. Always wait for the candle to <b>close</b> before acting.';
  SECTIONS.push({ id: 'candles-bull', group: 'candles', title: 'Bullish Candlestick Patterns', icon: '🟢', intro: 'Buyers taking control — look for these at support, demand zones or after pullbacks in an uptrend. ' + base, items: pick((c) => c === 'bull') });
  SECTIONS.push({ id: 'candles-bear', group: 'candles', title: 'Bearish Candlestick Patterns', icon: '🔴', intro: 'Sellers taking control — look for these at resistance, supply zones or after rallies in a downtrend. ' + base, items: pick((c) => c === 'bear') });
  SECTIONS.push({ id: 'candles-neutral', group: 'candles', title: 'Neutral / Indecision Patterns', icon: '⚪', intro: 'Neither side in control. These warn that momentum is pausing; the <b>next</b> candle decides the direction.', items: pick((c) => c !== 'bull' && c !== 'bear') });
})();
