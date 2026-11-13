/* Playbook tab: category tabs in the left panel, sections, search, chart zoom. Runs once, when the tab is first opened. */
window.initPlaybook = function () {
  'use strict';
  if (window.__pbReady) return;
  window.__pbReady = true;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const secById = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

  const CATS = [
    { id: 'strategies', label: 'Strategies', icon: '🎯', secs: ['strategies'] },
    { id: 'candles', label: 'Candlesticks', icon: '🕯️', secs: ['candles-bull', 'candles-bear', 'candles-neutral'] },
    { id: 'patterns', label: 'Chart Patterns', icon: '📐', secs: ['patterns'] },
    { id: 'concepts', label: 'Market Structure', icon: '🧭', secs: ['concepts'] },
    { id: 'indicators', label: 'Indicators', icon: '📊', secs: ['ind-leading', 'ind-lagging'] },
    { id: 'risk', label: 'Risk & Rules', icon: '🛡️', secs: ['risk'], static: true },
    { id: 'glossary', label: 'Glossary', icon: '📖', secs: ['glossary'], static: true },
  ];
  const catOfSec = {};
  CATS.forEach((c) => c.secs.forEach((s) => { catOfSec[s] = c.id; }));
  const count = (cat) => (cat.static ? null : cat.secs.reduce((a, s) => a + (secById[s] ? secById[s].items.length : 0), 0));

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
          <div><div class="chart-wrap" data-chart="${item.id}">${chartSvg(item)}</div><p class="desc">${item.desc}</p></div>
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
      <h3>${sec.group === 'indicators' ? `<span class="rank">${idx + 1}</span>` : ''}${esc(item.name)}</h3>
      <div class="tags">${tagHtml(item.tags)}${item.rel ? `<span class="tag gold">Reliability: ${esc(item.rel)}</span>` : ''}</div>
      <div class="chart-wrap" data-chart="${item.id}">${chartSvg(item)}</div>
      <p class="desc">${item.desc}</p>
      <div class="points">${listHtml(item.points)}</div>
    </article>`;
  }
  const gridCls = (id) => (id === 'strategies' ? 'one' : id.startsWith('candles') ? 'three' : 'two');
  $('#dynamic').innerHTML = SECTIONS.map((sec) => `
    <section class="section" id="${sec.id}" data-cat="${catOfSec[sec.id] || sec.id}">
      <h2><span class="sec-icon">${sec.icon}</span> ${esc(sec.title)}</h2>
      <p class="intro">${sec.intro}</p>
      <div class="grid ${gridCls(sec.id)}">${sec.items.map((it, i) => card(it, sec, i)).join('')}</div>
    </section>`).join('');
  ['risk', 'glossary'].forEach((id) => { $('#' + id).dataset.cat = id; });

  /* ---------- left panel: category tabs + items of the active category ---------- */
  let active = 'strategies';
  try { active = localStorage.getItem('fx-pbcat') || 'strategies'; } catch (e) {}
  if (!CATS.some((c) => c.id === active)) active = 'strategies';

  $('#sidebar').innerHTML = `
    <div class="cat-tabs" role="tablist">${CATS.map((c) => `
      <button class="cat-tab" role="tab" data-cat="${c.id}"><span class="ci">${c.icon}</span><span class="cl">${c.label}</span>${count(c) != null ? `<span class="cc">${count(c)}</span>` : ''}</button>`).join('')}
    </div>
    <div class="cat-items" id="catItems"></div>`;

  /* mobile: horizontal category chips at the top of the content + backdrop for the drawer */
  $('#pbMain').insertAdjacentHTML('afterbegin', `<div class="cat-strip" role="tablist">${CATS.map((c) => `<button class="cat-chip" data-cat="${c.id}">${c.icon} ${c.label}</button>`).join('')}</div>`);
  $('#view-playbook').insertAdjacentHTML('beforeend', '<div class="sb-backdrop" id="sbBackdrop"></div>');
  const closeDrawer = () => { $('#sidebar').classList.remove('open'); document.body.classList.remove('drawer-open'); };
  $('#sbBackdrop').addEventListener('click', closeDrawer);
  $('.cat-strip').addEventListener('click', (e) => {
    const chip = e.target.closest('.cat-chip');
    if (!chip) return;
    if (search.value) { search.value = ''; applySearch(); }
    showCat(chip.dataset.cat);
  });

  function renderItems(q) {
    const cats = q ? CATS.filter((c) => !c.static) : CATS.filter((c) => c.id === active);
    let html = '';
    cats.forEach((cat) => cat.secs.forEach((sid) => {
      const sec = secById[sid];
      if (!sec) return;
      const items = sec.items.filter((it) => !q || !$('#' + it.id).classList.contains('hidden'));
      if (!items.length) return;
      html += `<div class="nav-group">${sec.icon} ${esc(sec.title.replace(/ \(.*\)/, ''))}</div>` + items.map((it) => `<a href="#${it.id}" data-nav="${it.id}">${esc(it.name)}</a>`).join('');
    }));
    $('#catItems').innerHTML = html || (q ? '<div class="small" style="padding:8px">No matches</div>' : '');
    observe();
  }
  function showCat(id, keepScroll) {
    active = id;
    try { localStorage.setItem('fx-pbcat', id); } catch (e) {}
    $$('.cat-tab').forEach((b) => b.classList.toggle('on', b.dataset.cat === id));
    $$('.cat-chip').forEach((b) => { b.classList.toggle('on', b.dataset.cat === id); if (b.dataset.cat === id) b.parentNode.scrollLeft = b.offsetLeft - 16; });
    if (!search.value.trim()) $$('#pbMain .section').forEach((s) => s.classList.toggle('hidden', s.dataset.cat !== id));
    renderItems(search.value.trim().toLowerCase());
    if (!keepScroll) window.scrollTo({ top: 0, behavior: 'instant' });
  }
  $('#sidebar').addEventListener('click', (e) => {
    const tab = e.target.closest('.cat-tab');
    if (tab) { if (search.value) { search.value = ''; applySearch(); } showCat(tab.dataset.cat); return; }
    const a = e.target.closest('a[data-nav]');
    if (a) {
      e.preventDefault();
      const el = document.getElementById(a.dataset.nav);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', '#' + a.dataset.nav);
      closeDrawer();
    }
  });
  $('#menuBtn').addEventListener('click', () => { const open = $('#sidebar').classList.toggle('open'); document.body.classList.toggle('drawer-open', open); });

  /* reveal an item by id (used for deep links like #hammer) */
  window.pbReveal = function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    const sec = el.closest('.section');
    if (sec && sec.dataset.cat) showCat(sec.dataset.cat, true);
    setTimeout(() => el.scrollIntoView({ behavior: 'instant', block: 'start' }), 0);
  };

  /* active link highlight */
  let io = null;
  function observe() {
    if (io) io.disconnect();
    const links = {};
    $$('#catItems a[data-nav]').forEach((a) => { links[a.dataset.nav] = a; });
    io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting && links[en.target.id]) {
        Object.values(links).forEach((a) => a.classList.remove('active'));
        links[en.target.id].classList.add('active');
        const sb = $('#sidebar'), a = links[en.target.id];
        const top = a.offsetTop - sb.offsetTop;
        if (top < sb.scrollTop + 40 || top > sb.scrollTop + sb.clientHeight - 60) sb.scrollTop = top - sb.clientHeight / 2;
      }
    }), { rootMargin: '-35% 0px -60% 0px' });
    Object.keys(links).forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ---------- search (across all categories) ---------- */
  const search = $('#search');
  function applySearch() {
    const q = search.value.trim().toLowerCase();
    $$('#pbMain .card[data-search]').forEach((c) => c.classList.toggle('hidden', !!q && !c.dataset.search.includes(q) && !c.textContent.toLowerCase().includes(q)));
    $$('#pbMain .section').forEach((s) => {
      if (!q) { s.classList.toggle('hidden', s.dataset.cat !== active); return; }
      const cards = $$('.card[data-search]', s);
      s.classList.toggle('hidden', cards.length === 0 || cards.every((c) => c.classList.contains('hidden')));
    });
    $$('.cat-tab').forEach((b) => b.classList.toggle('on', !q && b.dataset.cat === active));
    renderItems(q);
  }
  search.addEventListener('input', applySearch);
  document.addEventListener('keydown', (e) => {
    if (document.documentElement.dataset.tab !== 'playbook') return;
    if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus(); }
    if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else if (document.activeElement === search) { search.value = ''; applySearch(); search.blur(); } }
  });

  /* ---------- chart zoom modal ---------- */
  const closeModal = () => { $('#modal').hidden = true; };
  document.addEventListener('click', (e) => {
    const w = e.target.closest('.chart-wrap');
    if (w && !w.closest('.modal')) {
      $('#modalTitle').textContent = charts[w.dataset.chart].name;
      $('#modalBody').innerHTML = w.innerHTML;
      $('#modal').hidden = false;
    }
  });
  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  /* ---------- static tables ---------- */
  $('#beTable').innerHTML = [1, 1.5, 2, 2.5, 3, 4].map((rr) => `<tr><td>1 : ${rr}</td><td>${(100 / (1 + rr)).toFixed(1)}%</td><td style="color:var(--bull)">+${(0.5 * rr - 0.5).toFixed(2)} R / trade</td></tr>`).join('');
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
    ['Leading indicator', 'Signals before the move (oscillators, pivots, fib). Early but noisier.'], ['Lagging indicator', 'Confirms after the move starts (MAs, MACD, ADX). Later but more reliable.'],
    ['ATR', 'Average True Range — average candle size; volatility gauge.'], ['Divergence', 'Price and an oscillator disagree on new highs/lows.'],
    ['Breakeven (BE)', 'Moving the stop to the entry price so the trade can\'t lose.'], ['NFP', 'US Non-Farm Payrolls — first Friday of the month, very high impact.'],
  ];
  $('#glossaryList').innerHTML = glossary.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('');

  showCat(active, true);
};
