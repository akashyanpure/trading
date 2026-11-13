/* Dashboard tab + tab routing. Everything is stored in localStorage (no login, no server). */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const root = document.documentElement;

  /* ---------------- storage ---------------- */
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : Object.assign({}, d, v); } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const DEFAULTS = {
    v: 2, tz: '',
    newsBefore: 15, newsAfter: 15, newsWarn: 60, newsPairOnly: false,
    maxTrades: 4, maxRisk: 1, minRR: 2, anim: true,
    rules: ['HTF bias confirmed (H4 / D1)', 'Price at a key level / zone', 'Confluence: 2+ independent reasons', 'Entry trigger printed (candle closed)', 'R:R at or above 1:{minRR}', 'Calm — not revenge or FOMO'],
    links: ['Prop dashboard | ', 'ForexFactory | https://www.forexfactory.com/calendar', 'FXStreet News | https://www.fxstreet.com/news', 'Investing Calendar | https://www.investing.com/economic-calendar/', 'TradingView | https://www.tradingview.com/chart/'],
  };
  let S = load('fx-settings', DEFAULTS);
  if (!S.v || S.v < 2) { S.maxTrades = 4; S.v = 2; if (S.anim == null) S.anim = true; save('fx-settings', S); }
  let C = load('fx-calc', { ccy: 'USD', bal: 10000, mode: 'pct', risk: 1, pair: 'EURUSD', sl: 20, side: 'buy', entry: '' });
  let G = load('fx-guard', { day: '', count: 0 });
  if (Array.isArray(G.trades)) { G = { day: G.day, count: G.trades.length }; save('fx-guard', G); }

  const tz = () => S.tz || Intl.DateTimeFormat().resolvedOptions().timeZone;

  /* ---------------- tabs ---------------- */
  function setTab(tab, fromHash) {
    root.dataset.tab = tab;
    try { localStorage.setItem('fx-tab', tab); } catch (e) {}
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
    if (tab === 'playbook' && window.initPlaybook) {
      window.initPlaybook();
      if (fromHash) { const id = location.hash.slice(1); const el = id && id !== 'playbook' && document.getElementById(id); if (el) setTimeout(() => el.scrollIntoView(), 0); }
    }
    if (!fromHash) history.replaceState(null, '', '#' + tab);
    setHeaderHeight();
  }
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  window.addEventListener('hashchange', () => {
    const h = location.hash.slice(1);
    setTab(!h || h === 'dashboard' ? 'dashboard' : 'playbook', true);
  });
  function setHeaderHeight() { root.style.setProperty('--hdr', $('#topbar').offsetHeight + 'px'); }
  window.addEventListener('resize', setHeaderHeight);

  /* ---------------- timezone helpers (DST aware via Intl) ---------------- */
  const fmtCache = {};
  function parts(zone, date) {
    const f = fmtCache[zone] || (fmtCache[zone] = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }));
    const o = {};
    f.formatToParts(date).forEach((p) => { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
  }
  function offsetMin(zone, ms) {
    const p = parts(zone, new Date(ms));
    return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000) / 60000);
  }
  function zoned(y, m, d, h, zone) {
    const guess = Date.UTC(y, m - 1, d, h);
    const t = guess - offsetMin(zone, guess) * 60000;
    return guess - offsetMin(zone, t) * 60000;
  }
  const hhmm = (ms) => new Intl.DateTimeFormat('en-GB', { timeZone: tz(), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms);
  const dayKey = (ms) => { const p = parts(tz(), new Date(ms)); return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; };
  function dur(ms) {
    ms = Math.max(0, ms);
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  function durWords(ms) {
    const m = Math.round(ms / 60000);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), d = Math.floor(h / 24);
    return d > 0 ? `${d}d ${h % 24}h` : `${h}h ${m % 60}m`;
  }

  /* ---------------- sessions ---------------- */
  const SESS = [
    { id: 'asia', name: 'Asia', city: 'Tokyo', zone: 'Asia/Tokyo', o: 9, c: 18 },
    { id: 'london', name: 'London', city: 'London', zone: 'Europe/London', o: 8, c: 17 },
    { id: 'ny', name: 'New York', city: 'New York', zone: 'America/New_York', o: 8, c: 17 },
  ];
  function intervals(s, now) {
    const p = parts(s.zone, new Date(now)), out = [];
    for (let k = -2; k <= 8; k++) {
      const dt = new Date(Date.UTC(p.y, p.m - 1, p.d + k));
      const wd = dt.getUTCDay();
      if (wd === 0 || wd === 6) continue;
      const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
      out.push([zoned(y, m, d, s.o, s.zone), zoned(y, m, d, s.c, s.zone)]);
    }
    return out;
  }
  function stateOf(ivs, now) {
    for (const iv of ivs) if (now >= iv[0] && now < iv[1]) return { open: true, iv, at: iv[1] };
    const nx = ivs.find((iv) => iv[0] > now);
    return { open: false, iv: nx, at: nx ? nx[0] : now };
  }
  function intersect(a, b) {
    const out = [];
    a.forEach((x) => b.forEach((y) => { const s = Math.max(x[0], y[0]), e = Math.min(x[1], y[1]); if (e > s) out.push([s, e]); }));
    return out.sort((p, q) => p[0] - q[0]);
  }
  let ivCache = { at: 0 };
  function renderSessions(now) {
    if (now - ivCache.at > 60000) {
      ivCache = { at: now };
      SESS.forEach((s) => { ivCache[s.id] = intervals(s, now); });
      ivCache.overlap = intersect(ivCache.london, ivCache.ny);
    }
    const tiles = SESS.map((s) => ({ name: s.name, sub: s.city, st: stateOf(ivCache[s.id], now) }));
    tiles.push({ name: 'London × NY', sub: 'Overlap — peak liquidity', st: stateOf(ivCache.overlap, now), overlap: true });
    $('#sessions').innerHTML = tiles.map((t) => `
      <div class="sess-tile ${t.st.open ? 'open' : ''} ${t.overlap ? 'overlap' : ''}">
        <div class="nm">${esc(t.name)} <span class="badge">${t.st.open ? (t.overlap ? 'OVERLAP' : 'OPEN') : 'CLOSED'}</span></div>
        <div class="cd"><small>${t.st.open ? 'closes in' : 'opens in'}</small>${dur(t.st.at - now)}</div>
        <div class="hrs">${t.st.iv ? hhmm(t.st.iv[0]) + ' – ' + hhmm(t.st.iv[1]) : ''} · ${esc(t.sub)}</div>
      </div>`).join('');
  }
  function renderClock(now) {
    $('#clockTime').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: tz(), hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now);
    $('#clockTz').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: tz(), weekday: 'short', day: 'numeric', month: 'short' }).format(now) + ' · ' + tz();
  }

  /* ---------------- position size calculator (overlay) ---------------- */
  const PAIRS = ['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY', 'EURAUD', 'EURCHF', 'EURCAD', 'GBPCHF', 'GBPAUD', 'GBPCAD', 'AUDCAD', 'AUDNZD', 'XAUUSD'];
  const SYM = { USD: '$', GBP: '£', EUR: '€' };
  const FALLBACK = { USD: 1, EUR: 0.86, GBP: 0.76, JPY: 154, CHF: 0.80, CAD: 1.40, AUD: 1.53, NZD: 1.75 };
  let RATES = load('fx-rates', null);
  if (RATES && !RATES.rates) RATES = null;

  const spec = (pair) => {
    if (pair === 'XAUUSD') return { pip: 0.1, contract: 100, quote: 'USD', base: 'XAU', dp: 2 };
    const quote = pair.slice(3);
    return { pip: quote === 'JPY' ? 0.01 : 0.0001, contract: 100000, quote, base: pair.slice(0, 3), dp: quote === 'JPY' ? 3 : 5 };
  };
  function rate(acct, quote) {
    if (quote === acct) return 1;
    if (RATES && RATES.base === acct && RATES.rates[quote]) return RATES.rates[quote];
    return FALLBACK[quote] / FALLBACK[acct];
  }
  async function fetchRates() {
    const fresh = RATES && RATES.base === C.ccy && Date.now() - RATES.time < 6 * 3600e3;
    if (!fresh) {
      try {
        const j = await (await fetch('https://open.er-api.com/v6/latest/' + C.ccy)).json();
        if (j.result === 'success') { RATES = { base: C.ccy, rates: j.rates, time: Date.now() }; save('fx-rates', RATES); }
      } catch (e) { /* offline → fallback */ }
    }
    const ok = RATES && RATES.base === C.ccy;
    $('#rateInfo').textContent = ok ? 'live FX rates · ' + new Date(RATES.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'approx. FX rates (offline)';
    calc();
  }

  let calcOut = { valid: false, riskPct: 0 };
  const money = (v) => (v < 0 ? '−' : '') + (SYM[C.ccy] || '') + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function calc() {
    const sp = spec(C.pair);
    const pipPerLot = (sp.pip * sp.contract) / rate(C.ccy, sp.quote);
    const bal = +C.bal || 0, sl = +C.sl || 0;
    const target = C.mode === 'pct' ? (bal * (+C.risk || 0)) / 100 : +C.risk || 0;
    const valid = bal > 0 && sl > 0 && target > 0;
    const lots = valid ? Math.floor((target / (sl * pipPerLot)) * 100 + 1e-9) / 100 : 0;
    const exact = lots * sl * pipPerLot;
    const riskPct = bal > 0 ? (exact / bal) * 100 : 0;
    calcOut = { valid: valid && lots > 0, riskPct, lots, exact };

    $('#oLots').textContent = valid ? lots.toFixed(2) : '–';
    $('#oUnits').textContent = valid ? (lots < 0.01 ? 'below 0.01 — raise risk or tighten stop' : `${Math.round(lots * sp.contract).toLocaleString()} units · ${(lots * 10).toFixed(1)} mini · ${Math.round(lots * 100)} micro`) : 'enter balance, risk & stop';
    $('#oRisk').textContent = valid ? money(exact) : '–';
    $('#oRiskPct').textContent = valid ? `${riskPct.toFixed(2)}% of balance (target ${money(target)})` : '';
    $('#oPip').textContent = valid ? money(lots * pipPerLot) : '–';
    $('#oPipLot').textContent = `${money(pipPerLot)} per pip per 1.00 lot`;
    document.querySelector('.big-stat.risk').classList.toggle('over', valid && riskPct > S.maxRisk + 1e-9);

    const e = parseFloat(C.entry), hasE = isFinite(e) && e > 0, dir = C.side === 'buy' ? 1 : -1;
    const row = (lab, cls, n) => {
      const pips = n * sl, price = hasE ? (e + dir * pips * sp.pip).toFixed(sp.dp) : '—';
      return `<tr class="${cls}"><td>${lab}</td><td>${n < 0 ? '−' : '+'}${Math.abs(pips).toFixed(1)}</td><td>${price}</td><td>${valid ? (n < 0 ? '−' : '+') + money(Math.abs(n) * exact) : '—'}</td></tr>`;
    };
    $('#oLevels').innerHTML = row('SL', 'sl', -1) + row('1R', 'tp', 1) + row('2R', 'tp', 2) + row('3R', 'tp', 3);
    $('#calcSummary').textContent = calcOut.valid ? `${C.pair} · ${lots.toFixed(2)} lots · ${money(exact)} risk · ${sl} pip SL` : 'Set balance, risk & stop';
    renderChecklist();
  }
  function initCalc() {
    $('#cPair').innerHTML = PAIRS.map((p) => `<option>${p}</option>`).join('');
    const bind = (id, key) => { const el = $(id); el.value = C[key]; el.addEventListener('input', () => { C[key] = el.value; save('fx-calc', C); if (key === 'ccy') fetchRates(); calc(); }); };
    bind('#cCcy', 'ccy'); bind('#cBal', 'bal'); bind('#cRiskMode', 'mode'); bind('#cRisk', 'risk'); bind('#cPair', 'pair'); bind('#cSl', 'sl'); bind('#cEntry', 'entry');
    $('#cPair').addEventListener('change', () => { C.entry = ''; $('#cEntry').value = ''; save('fx-calc', C); calc(); renderNews(Date.now()); });
    const sideBtns = document.querySelectorAll('#cSide button');
    const setSide = () => sideBtns.forEach((b) => b.classList.toggle('on', b.dataset.v === C.side));
    sideBtns.forEach((b) => b.addEventListener('click', (ev) => { ev.preventDefault(); C.side = b.dataset.v; save('fx-calc', C); setSide(); calc(); }));
    setSide();
    calc(); fetchRates();
  }
  const openCalc = () => { $('#calcModal').hidden = false; setTimeout(() => $('#cSl').focus(), 30); };
  const closeCalc = () => { $('#calcModal').hidden = true; };
  $('#calcOpen').addEventListener('click', openCalc);
  $('#calcClose').addEventListener('click', closeCalc);
  $('#calcModal').addEventListener('click', (e) => { if (e.target.id === 'calcModal') closeCalc(); });

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (e.key === 'Escape') { if (!$('#calcModal').hidden) closeCalc(); if (!$('#settings').hidden) $('#settings').hidden = true; return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '1') setTab('dashboard');
    if (e.key === '2') setTab('playbook');
    if ((e.key === 'p' || e.key === 'P') && root.dataset.tab === 'dashboard') { e.preventDefault(); $('#calcModal').hidden ? openCalc() : closeCalc(); }
  });

  /* ---------------- news ---------------- */
  let EVENTS = null;
  let newsState = 'unknown';
  async function loadNews() {
    try {
      const r = await fetch('data/calendar.json?h=' + Math.floor(Date.now() / 1800e3), { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      EVENTS = j.filter((e) => e.impact === 'High').map((e) => ({ title: e.title, ccy: e.country, t: Date.parse(e.date) })).filter((e) => isFinite(e.t)).sort((a, b) => a.t - b.t);
    } catch (e) { EVENTS = []; EVENTS.failed = true; }
    renderNews(Date.now());
  }
  function relevant() {
    if (!EVENTS) return [];
    if (!S.newsPairOnly) return EVENTS;
    const sp = spec(C.pair), set = [sp.base, sp.quote].map((x) => (x === 'XAU' ? 'USD' : x));
    return EVENTS.filter((e) => set.includes(e.ccy));
  }
  const whenStr = (t) => new Intl.DateTimeFormat('en-GB', { timeZone: tz(), weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(t);
  function renderNews(now) {
    if (EVENTS === null) return;
    const evs = relevant();
    const before = S.newsBefore * 60000, after = S.newsAfter * 60000, warn = S.newsWarn * 60000;
    const inRed = evs.filter((e) => now >= e.t - before && now <= e.t + after);
    const next = evs.find((e) => e.t > now);
    let st, icon, main, count = '', sub = '';
    if (EVENTS.failed) {
      st = 'unknown'; icon = '📰'; main = 'News feed unavailable'; sub = 'Check ForexFactory for high-impact news before trading';
    } else if (inRed.length) {
      const e = inRed.reduce((a, b) => (Math.abs(a.t - now) < Math.abs(b.t - now) ? a : b));
      const clearAt = Math.max(...inRed.map((x) => x.t + after));
      st = 'red'; icon = '⛔';
      if (e.t > now) { main = "DON'T TRADE — big news in"; count = dur(e.t - now); }
      else { main = "DON'T TRADE — news just released"; count = 'safe in ' + dur(clearAt - now); }
      sub = `${e.ccy} ${e.title}${inRed.length > 1 ? ` (+${inRed.length - 1} more)` : ''} · spikes & slippage likely`;
    } else if (next && next.t - now <= warn) {
      st = 'warn'; icon = '⚠️'; main = 'Big news soon — no-trade zone in'; count = dur(next.t - before - now);
      sub = `${next.ccy} ${next.title} at ${hhmm(next.t)} · avoid opening trades you can't manage through it`;
    } else {
      st = 'clear'; icon = '✅'; main = 'Safe to trade — no high-impact news soon';
      sub = next ? `Next big news: ${next.ccy} ${next.title} · ${whenStr(next.t)} (in ${durWords(next.t - now)})` : 'No more high-impact news this week';
    }
    $('#newsBanner').dataset.state = st; newsState = st;
    $('#nbIcon').textContent = icon; $('#nbMain').textContent = main; $('#nbCount').textContent = count; $('#nbNext').textContent = sub;
  }

  function mountTradingView() {
    const wrap = $('#tvWrap');
    wrap.innerHTML = '<div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div></div>';
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    s.async = true;
    s.textContent = JSON.stringify({
      colorTheme: root.dataset.theme === 'light' ? 'light' : 'dark',
      isTransparent: true, width: '100%', height: '100%', locale: 'en',
      importanceFilter: '1', countryFilter: 'us,eu,gb,jp,ch,ca,au,nz',
    });
    wrap.firstChild.appendChild(s);
  }

  /* ---------------- trade counter ---------------- */
  function rollDay() {
    const today = dayKey(Date.now());
    if (G.day !== today) { G = { day: today, count: 0 }; save('fx-guard', G); }
  }
  const limitHit = () => G.count >= S.maxTrades;
  function setCount(n) {
    rollDay();
    G.count = Math.max(0, Math.min(S.maxTrades, n));
    save('fx-guard', G);
    renderCounter();
  }
  function renderCounter() {
    const n = G.count, max = S.maxTrades, left = max - n;
    $('#cCount').textContent = n; $('#cMax').textContent = max;
    $('#cDots').innerHTML = Array.from({ length: max }, (_, i) => `<span class="${i < n ? 'used' : ''}"></span>`).join('');
    $('#counter').dataset.state = left <= 0 ? 'stop' : left === 1 ? 'last' : 'ok';
    $('#cPlus').disabled = left <= 0; $('#cMinus').disabled = n <= 0;
    const msg = $('#cMsg');
    msg.className = 'cnt-msg ' + (left <= 0 ? 'stop' : left === 1 ? 'last' : '');
    msg.textContent = left <= 0 ? `⛔ Done for today — ${max} of ${max} trades taken` : left === 1 ? '⚠ Last trade of the day — make it an A+ setup' : `${left} trades left today`;
    $('#dayLabel').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: tz(), weekday: 'long', day: 'numeric', month: 'short' }).format(Date.now());
    renderChecklist();
  }
  $('#cPlus').addEventListener('click', () => setCount(G.count + 1));
  $('#cMinus').addEventListener('click', () => setCount(G.count - 1));

  /* ---------------- checklist ---------------- */
  let ticks = {};
  function autoRules() {
    const unknown = newsState === 'unknown';
    return [
      { id: 'auto-news', text: unknown ? 'Checked news manually (feed unavailable)' : 'No high-impact news right now', ok: unknown ? !!ticks['auto-news'] : newsState !== 'red', manual: unknown, src: 'news' },
      { id: 'auto-risk', text: `Risk within limit (≤ ${S.maxRisk}%)`, ok: calcOut.valid && calcOut.riskPct <= S.maxRisk + 1e-9, src: 'calculator' },
    ];
  }
  let lastSig = '';
  function renderChecklist() {
    const manual = S.rules.map((r, i) => ({ id: 'r' + i, text: r.replace('{minRR}', S.minRR) }));
    const autos = autoRules();
    const done = manual.filter((r) => ticks[r.id]).length + autos.filter((a) => a.ok).length;
    const total = manual.length + autos.length;
    const sig = JSON.stringify([manual, autos, ticks, G.count, S.maxTrades]);
    if (sig === lastSig) return;
    lastSig = sig;
    $('#ckList').innerHTML = manual.map((r) => `<li class="${ticks[r.id] ? 'done' : ''}"><label><input type="checkbox" data-id="${r.id}" ${ticks[r.id] ? 'checked' : ''}/> ${esc(r.text)}</label></li>`).join('') +
      autos.map((a) => a.manual
        ? `<li class="${a.ok ? 'done' : ''}"><label><input type="checkbox" data-id="${a.id}" ${a.ok ? 'checked' : ''}/> ${esc(a.text)}</label></li>`
        : `<li class="auto ${a.ok ? 'done' : 'fail'}"><label><input type="checkbox" disabled ${a.ok ? 'checked' : ''}/> ${esc(a.text)} <span class="src">auto · ${a.src}</span></label></li>`).join('');
    $('#ckCount').textContent = `${done} / ${total}`;
    const btn = $('#takeBtn');
    btn.classList.toggle('locked', limitHit());
    if (limitHit()) { btn.disabled = true; btn.textContent = `⛔ Daily limit reached (${S.maxTrades} trades)`; }
    else if (done < total) { btn.disabled = true; btn.textContent = `🔒 Take trade (${total - done} left)`; }
    else { btn.disabled = false; btn.textContent = '✅ Take trade  (+1 to counter)'; }
  }
  $('#ckList').addEventListener('change', (e) => { const id = e.target.dataset.id; if (!id) return; ticks[id] = e.target.checked; renderChecklist(); });
  $('#takeBtn').addEventListener('click', () => { if (limitHit()) return; ticks = {}; setCount(G.count + 1); });

  /* ---------------- quick links ---------------- */
  function renderLinks() {
    $('#quickLinks').innerHTML = S.links.map((l) => {
      const [label, url] = l.split('|').map((x) => (x || '').trim());
      if (!label) return '';
      return url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>` : `<a href="#" class="unset" data-setlink>${esc(label)} (set URL)</a>`;
    }).join('');
    setHeaderHeight();
  }
  $('#quickLinks').addEventListener('click', (e) => { if (e.target.closest('[data-setlink]')) { e.preventDefault(); openSettings(); $('#sLinks').focus(); } });

  /* ---------------- settings ---------------- */
  const NUMS = ['newsBefore', 'newsAfter', 'newsWarn', 'maxTrades', 'maxRisk', 'minRR'];
  const fid = (k) => '#s' + k[0].toUpperCase() + k.slice(1);
  function openSettings() {
    const zones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : ['UTC', 'Europe/London', 'America/New_York', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'];
    $('#sTz').innerHTML = `<option value="">Browser default (${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)})</option>` + zones.map((z) => `<option ${z === S.tz ? 'selected' : ''}>${esc(z)}</option>`).join('');
    NUMS.forEach((k) => { $(fid(k)).value = S[k]; });
    $('#sNewsPairOnly').checked = !!S.newsPairOnly;
    $('#sAnim').checked = S.anim !== false;
    $('#sRules').value = S.rules.join('\n');
    $('#sLinks').value = S.links.join('\n');
    $('#settings').hidden = false;
  }
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#setClose').addEventListener('click', () => { $('#settings').hidden = true; });
  $('#settings').addEventListener('click', (e) => { if (e.target.id === 'settings') $('#settings').hidden = true; });
  $('#sSave').addEventListener('click', () => {
    S.tz = $('#sTz').value;
    NUMS.forEach((k) => { const v = parseFloat($(fid(k)).value); if (isFinite(v)) S[k] = v; });
    S.maxTrades = Math.max(1, Math.round(S.maxTrades));
    S.newsPairOnly = $('#sNewsPairOnly').checked;
    S.anim = $('#sAnim').checked;
    S.rules = $('#sRules').value.split('\n').map((x) => x.trim()).filter(Boolean);
    S.links = $('#sLinks').value.split('\n').map((x) => x.trim()).filter(Boolean);
    save('fx-settings', S);
    $('#settings').hidden = true;
    ticks = {}; ivCache.at = 0; lastSig = '';
    if (window.BG) window.BG.setEnabled(S.anim);
    renderLinks(); calc(); renderCounter(); tick();
  });
  $('#sExport').addEventListener('click', () => {
    const data = {};
    ['fx-settings', 'fx-calc', 'fx-guard', 'fx-theme'].forEach((k) => { data[k] = localStorage.getItem(k); });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'trading-desk-backup.json'; a.click();
  });
  $('#sImport').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      Object.entries(data).forEach(([k, v]) => { if (/^fx-/.test(k) && v != null) localStorage.setItem(k, v); });
      location.reload();
    } catch (err) { alert('Invalid backup file'); }
  });
  $('#sWipe').addEventListener('click', () => {
    if (!confirm('Reset all settings, calculator values and today\'s counter?')) return;
    ['fx-settings', 'fx-calc', 'fx-guard', 'fx-rates'].forEach((k) => localStorage.removeItem(k));
    location.reload();
  });

  /* ---------------- theme ---------------- */
  $('#themeBtn').addEventListener('click', () => {
    const t = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = t;
    try { localStorage.setItem('fx-theme', t); } catch (e) {}
    mountTradingView();
  });

  /* ---------------- main loop ---------------- */
  let lastDay = '';
  function tick() {
    const now = Date.now();
    renderClock(now);
    if (root.dataset.tab === 'dashboard') renderSessions(now);
    renderNews(now);
    const d = dayKey(now);
    if (d !== lastDay) { lastDay = d; rollDay(); renderCounter(); }
    renderChecklist();
  }

  if (window.BG) window.BG.setEnabled(S.anim !== false);
  renderLinks();
  initCalc();
  rollDay();
  renderCounter();
  setTab(root.dataset.tab || 'dashboard', true);
  tick();
  setInterval(tick, 1000);
  loadNews();
  setInterval(loadNews, 15 * 60 * 1000);
  mountTradingView();
})();
