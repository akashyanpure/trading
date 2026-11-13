/* Playbook page: renders reference sections, nav, search, chart zoom. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- theme ---------- */
  const setTheme = (t) => { document.documentElement.dataset.theme = t; try { localStorage.setItem('fx-theme', t); } catch (e) {} };
  $('#themeBtn').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

  /* ---------- render sections ---------- */
  const charts = {};
  const tagHtml = (tags) => (tags || []).map((t) => `<span class="tag ${t.c}">${esc(t.t)}</span>`).join('');
  const listHtml = (obj, ruleMode) => Object.entries(obj || {}).map(([k, arr]) => {
    const cls = ruleMode ? ({ Entry: 'entry', 'Stop loss': 'sl', 'Take profit': 'tp', Avoid: 'avoid' }[k] || '') : '';
    return `<div><h4 class="${cls}">${esc(k)}</h4><ul>${arr.map((x) => `<li>${x}</li>`).join('')}</ul></div>`;
  }).join('');

  function chartSvg(item) {
    try { return TChart.render(Object.assign({ title: item.name }, item.chart)); }
    catch (e) { console.error(item.id, e); return '<div class="empty">Chart error</div>'; }
  }

  function card(item, sec, idx) {
    charts[item.id] = item;
    const search = [item.name, item.desc, (item.tags || []).map((t) => t.t).join(' '), sec.title].join(' ').toLowerCase();
    if (sec.id === 'strategies') {
      return `<article class="card" id="${item.id}" data-search="${esc(search)}">
        <h3><span class="rank">${idx + 1}</span>${esc(item.name)}</h3>
        <div class="tags">${tagHtml(item.tags)}</div>
        <div class="strat">
          <div><div class="chart-wrap" data-chart="${item.id}">${chartSvg(item)}</div>
            <p class="desc">${item.desc}</p></div>
          <div>
            <div class="stats">
              <div class="stat win"><div class="k">Typical win rate</div><div class="v">${esc(item.win)}</div></div>
              <div class="stat"><div class="k">Risk : Reward</div><div class="v">${esc(item.rr)}</div></div>
              <div class="stat"><div class="k">Timeframe</div><div class="v">${esc(item.tf)}</div></div>
              <div class="stat"><div class="k">Session</div><div class="v">${esc(item.session)}</div></div>
            </div>
            <div class="small"><b>Best pairs:</b> ${esc(item.pairs)}</div>
            <div class="points rules">${listHtml(item.rules, true)}</div>
          </div>
        </div></article>`;
    }
    return `<article class="card" id="${item.id}" data-search="${esc(search)}">
      <h3>${esc(item.name)}</h3>
      <div class="tags">${tagHtml(item.tags)}${item.rel ? `<span class="tag gold">Reliability: ${esc(item.rel)}</span>` : ''}</div>
      <div class="chart-wrap" data-chart="${item.id}">${chartSvg(item)}</div>
      <p class="desc">${item.desc}</p>
      <div class="points">${listHtml(item.points)}</div>
    </article>`;
  }

  const gridCls = { strategies: 'one', candles: 'three' };
  $('#dynamic').innerHTML = SECTIONS.map((sec) => `
    <section class="section" id="${sec.id}">
      <h2><span class="sec-icon">${sec.icon}</span> ${esc(sec.title)}</h2>
      <p class="intro">${sec.intro}</p>
      <div class="grid ${gridCls[sec.id] || 'two'}">${sec.items.map((it, i) => card(it, sec, i)).join('')}</div>
    </section>`).join('');

  /* ---------- sidebar ---------- */
  const staticSecs = [{ id: 'risk', title: 'Risk & Rules', icon: '🛡️' }, { id: 'glossary', title: 'Glossary', icon: '📖' }];
  $('#sidebar').innerHTML = SECTIONS.map((s) => `
      <a class="nav-sec" href="#${s.id}"><span>${s.icon} ${esc(s.title.replace(/ \(.*\)/, ''))}</span><span class="count">${s.items.length}</span></a>
      <div class="nav-items">${s.items.map((it) => `<a href="#${it.id}" data-nav="${it.id}">${esc(it.name)}</a>`).join('')}</div>`).join('') +
    staticSecs.map((s) => `<a class="nav-sec" href="#${s.id}"><span>${s.icon} ${s.title}</span></a>`).join('');

  $('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#sidebar').addEventListener('click', (e) => { if (e.target.closest('a')) $('#sidebar').classList.remove('open'); });

  /* active link highlight */
  const navLinks = {};
  $$('#sidebar a[data-nav]').forEach((a) => (navLinks[a.dataset.nav] = a));
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting && navLinks[en.target.id]) {
      Object.values(navLinks).forEach((a) => a.classList.remove('active'));
      navLinks[en.target.id].classList.add('active');
    }
  }), { rootMargin: '-40% 0px -55% 0px' });
  $$('article.card[id]').forEach((el) => io.observe(el));

  /* ---------- search ---------- */
  const search = $('#search');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    $$('.card[data-search]').forEach((c) => c.classList.toggle('hidden', !!q && !c.dataset.search.includes(q) && !c.textContent.toLowerCase().includes(q)));
    $$('.section').forEach((s) => {
      const cards = $$('.card[data-search]', s);
      s.classList.toggle('hidden', !!q && cards.length > 0 && cards.every((c) => c.classList.contains('hidden')));
    });
    $$('#sidebar a[data-nav]').forEach((a) => a.classList.toggle('hidden', !!q && $('#' + a.dataset.nav).classList.contains('hidden')));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus(); }
    if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else { search.value = ''; search.dispatchEvent(new Event('input')); search.blur(); } }
  });

  /* ---------- chart zoom modal ---------- */
  const closeModal = () => { $('#modal').hidden = true; };
  document.addEventListener('click', (e) => {
    const w = e.target.closest('.chart-wrap');
    if (w && !w.closest('.modal')) {
      const item = charts[w.dataset.chart];
      $('#modalTitle').textContent = item.name;
      $('#modalBody').innerHTML = w.innerHTML;
      $('#modal').hidden = false;
    }
  });
  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  /* ---------- static tables ---------- */
  $('#beTable').innerHTML = [1, 1.5, 2, 2.5, 3, 4].map((rr) => {
    const be = (100 / (1 + rr)).toFixed(1), ex = (0.5 * rr - 0.5).toFixed(2);
    return `<tr><td>1 : ${rr}</td><td>${be}%</td><td style="color:var(--bull)">+${ex} R / trade</td></tr>`;
  }).join('');

  const glossary = [
    ['Pip', 'Smallest standard price move: 0.0001 (0.01 for JPY pairs).'], ['Pipette', 'Fractional pip, the 5th decimal (3rd on JPY).'],
    ['Lot', 'Trade size. 1 standard lot = 100,000 units of the base currency.'], ['Spread', 'Difference between bid and ask — your cost to enter.'],
    ['Leverage', 'Borrowed exposure (e.g. 1:30). Increases both gains and losses.'], ['Margin', 'Collateral locked to keep a leveraged position open.'],
    ['Slippage', 'Filled at a worse price than requested, common during news.'], ['Swap', 'Overnight interest paid/received for holding a position.'],
    ['R / R-multiple', 'Profit or loss measured in units of initial risk. +2R = won twice what you risked.'], ['Expectancy', 'Average R won per trade over many trades.'],
    ['Drawdown', 'Peak-to-trough decline of the account.'], ['Confluence', 'Several independent reasons pointing at the same trade.'],
    ['HTF / LTF', 'Higher / lower timeframe.'], ['BOS', 'Break of Structure — trend-direction break of the last swing.'],
    ['CHoCH', 'Change of Character — first structure break against the trend.'], ['Order Block (OB)', 'Last opposite candle before an impulsive, structure-breaking move.'],
    ['FVG', 'Fair Value Gap — 3-candle imbalance where wicks do not overlap.'], ['Liquidity', 'Clusters of stop/limit orders, usually above highs and below lows.'],
    ['Premium / Discount', 'Upper / lower half of a range — sell premium, buy discount.'], ['Killzone', 'High-volume session windows (London open, NY open).'],
    ['ATR', 'Average True Range — average candle size; volatility gauge.'], ['Divergence', 'Price and an oscillator disagree on new highs/lows.'],
    ['Breakeven (BE)', 'Moving the stop to the entry price so the trade can\'t lose.'], ['NFP', 'US Non-Farm Payrolls — first Friday of the month, very high impact.'],
  ];
  $('#glossaryList').innerHTML = glossary.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('');
})();
