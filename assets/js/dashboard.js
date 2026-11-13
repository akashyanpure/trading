/* Live trading dashboard. Everything is stored in localStorage (no login, no server). */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------- storage ---------------- */
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : Object.assign(Array.isArray(d) ? [] : {}, d, v); } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const DEFAULTS = {
    tz: '',
    newsBefore: 15, newsAfter: 15, newsWarn: 60, newsPairOnly: false,
    maxRisk: 1, minRR: 2, maxLossR: 3, maxTrades: 3, streakWarn: 2,
    rules: ['HTF bias confirmed (H4 / D1)', 'Price at a key level / zone', 'Confluence: 2+ independent reasons', 'Entry trigger printed (candle closed)', 'R:R at or above 1:{minRR}', 'Calm — not revenge or FOMO'],
    links: ['Prop dashboard | ', 'ForexFactory | https://www.forexfactory.com/calendar', 'FXStreet News | https://www.fxstreet.com/news', 'Investing Calendar | https://www.investing.com/economic-calendar/', 'TradingView | https://www.tradingview.com/chart/'],
  };
  let S = load('fx-settings', DEFAULTS);
  let C = load('fx-calc', { ccy: 'USD', bal: 10000, mode: 'pct', risk: 1, pair: 'EURUSD', sl: 20, side: 'buy', entry: '' });
  let G = load('fx-guard', { day: '', trades: [] });

  const tz = () => S.tz || Intl.DateTimeFormat().resolvedOptions().timeZone;

  /* ---------------- timezone helpers (DST aware via Intl) ---------------- */
  const fmtCache = {};
  function parts(zone, date) {
    const f = fmtCache[zone] || (fmtCache[zone] = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }));
    const o = {};
    f.formatToParts(date).forEach((p) => { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second, wd: o.weekday };
  }
  function offsetMin(zone, ms) {
    const p = parts(zone, new Date(ms));
    return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000) / 60000);
  }
  function zoned(y, m, d, h, zone) {
    const guess = Date.UTC(y, m - 1, d, h);
    let t = guess - offsetMin(zone, guess) * 60000;
    const off2 = offsetMin(zone, t);
    t = guess - off2 * 60000;
    return t;
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
    const name = new Intl.DateTimeFormat('en-GB', { timeZone: tz(), timeZoneName: 'short', weekday: 'short', day: 'numeric', month: 'short' }).format(now);
    $('#clockTz').textContent = name + ' · ' + tz();
  }

  /* ---------------- position size calculator ---------------- */
  const PAIRS = ['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY', 'EURAUD', 'EURCHF', 'EURCAD', 'GBPCHF', 'GBPAUD', 'GBPCAD', 'AUDCAD', 'AUDNZD', 'XAUUSD'];
  const SYM = { USD: '$', GBP: '£', EUR: '€' };
  const FALLBACK = { USD: 1, EUR: 0.86, GBP: 0.76, JPY: 154, CHF: 0.80, CAD: 1.40, AUD: 1.53, NZD: 1.75 };
  let RATES = load('fx-rates', null);

  const spec = (pair) => {
    if (pair === 'XAUUSD') return { pip: 0.1, contract: 100, quote: 'USD', dp: 2, base: 'USD' };
    const quote = pair.slice(3);
    return { pip: quote === 'JPY' ? 0.01 : 0.0001, contract: 100000, quote, base: pair.slice(0, 3), dp: quote === 'JPY' ? 3 : 5 };
  };
  function rate(ccyAcct, quote) { // units of `quote` per 1 unit of account currency
    if (quote === ccyAcct) return 1;
    if (RATES && RATES.base === ccyAcct && RATES.rates[quote]) return RATES.rates[quote];
    return FALLBACK[quote] / FALLBACK[ccyAcct];
  }
  async function fetchRates(force) {
    const fresh = RATES && RATES.base === C.ccy && Date.now() - RATES.time < 6 * 3600e3;
    if (fresh && !force) return showRateInfo();
    try {
      const r = await fetch('https://open.er-api.com/v6/latest/' + C.ccy);
      const j = await r.json();
      if (j.result === 'success') { RATES = { base: C.ccy, rates: j.rates, time: Date.now() }; save('fx-rates', RATES); }
    } catch (e) { /* offline → fallback rates */ }
    showRateInfo(); calc();
  }
  function showRateInfo() {
    const ok = RATES && RATES.base === C.ccy;
    $('#rateInfo').textContent = ok ? 'FX rates ' + new Date(RATES.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'approx. FX rates (offline)';
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
    $('#oUnits').textContent = valid ? (lots < 0.01 ? 'below 0.01 — widen budget or tighten stop' : `${Math.round(lots * sp.contract).toLocaleString()} units · ${(lots * 10).toFixed(1)} mini · ${Math.round(lots * 100)} micro`) : 'enter balance, risk & stop';
    $('#oRisk').textContent = valid ? money(exact) : '–';
    $('#oRiskPct').textContent = valid ? `${riskPct.toFixed(2)}% of balance (target ${money(target)})` : '';
    $('#oPip').textContent = valid ? money(lots * pipPerLot) : '–';
    $('#oPipLot').textContent = `${money(pipPerLot)} per pip per 1.00 lot`;
    $('.big-stat.risk').classList.toggle('over', valid && riskPct > S.maxRisk + 1e-9);

    const e = parseFloat(C.entry), hasE = isFinite(e) && e > 0, dir = C.side === 'buy' ? 1 : -1;
    const row = (lab, cls, n) => {
      const pips = n * sl, price = hasE ? (e + dir * pips * sp.pip).toFixed(sp.dp) : '—';
      return `<tr class="${cls}"><td>${lab}</td><td>${n < 0 ? '−' : '+'}${Math.abs(pips).toFixed(1)}</td><td>${price}</td><td>${valid ? (n < 0 ? '−' : '+') + money(Math.abs(n) * exact).replace('−', '') : '—'}</td></tr>`;
    };
    $('#oLevels').innerHTML = row('SL', 'sl', -1) + row('1R', 'tp', 1) + row('2R', 'tp', 2) + row('3R', 'tp', 3);
    renderChecklist();
  }
  function initCalc() {
    $('#cPair').innerHTML = PAIRS.map((p) => `<option>${p}</option>`).join('');
    const bind = (id, key) => { const el = $(id); el.value = C[key]; el.addEventListener('input', () => { C[key] = el.value; save('fx-calc', C); if (key === 'ccy') fetchRates(); calc(); }); };
    bind('#cCcy', 'ccy'); bind('#cBal', 'bal'); bind('#cRiskMode', 'mode'); bind('#cRisk', 'risk'); bind('#cPair', 'pair'); bind('#cSl', 'sl'); bind('#cEntry', 'entry');
    $('#cPair').addEventListener('change', () => { C.entry = ''; $('#cEntry').value = ''; save('fx-calc', C); calc(); renderNews(Date.now(), true); });
    const sideBtns = document.querySelectorAll('#cSide button');
    const setSide = () => sideBtns.forEach((b) => b.classList.toggle('on', b.dataset.v === C.side));
    sideBtns.forEach((b) => b.addEventListener('click', (ev) => { ev.preventDefault(); C.side = b.dataset.v; save('fx-calc', C); setSide(); calc(); }));
    setSide();
    calc(); fetchRates();
  }

  /* ---------------- news ---------------- */
  let EVENTS = null; // null = loading, [] = none / failed
  let newsState = 'unknown';
  async function loadNews() {
    try {
      const r = await fetch('data/calendar.json?h=' + Math.floor(Date.now() / 1800e3), { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      EVENTS = j.filter((e) => e.impact === 'High').map((e) => ({ title: e.title, ccy: e.country, t: Date.parse(e.date) })).filter((e) => isFinite(e.t)).sort((a, b) => a.t - b.t);
    } catch (e) { EVENTS = []; EVENTS.failed = true; }
    renderNews(Date.now(), true);
  }
  function relevant() {
    if (!EVENTS) return [];
    if (!S.newsPairOnly) return EVENTS;
    const sp = spec(C.pair), set = [sp.base, sp.quote].map((x) => (x === 'XAU' ? 'USD' : x));
    return EVENTS.filter((e) => set.includes(e.ccy));
  }
  let lastListRender = 0;
  function renderNews(now, forceList) {
    const B = $('#newsBanner');
    if (EVENTS === null) return;
    const evs = relevant();
    const before = S.newsBefore * 60000, after = S.newsAfter * 60000, warn = S.newsWarn * 60000;
    const inRed = evs.filter((e) => now >= e.t - before && now <= e.t + after);
    const next = evs.find((e) => e.t > now);
    let st, icon, main, count = '', nxt = '';
    if (EVENTS.failed || (!evs.length && !EVENTS.length)) {
      st = 'unknown'; icon = '📰'; main = EVENTS.failed ? 'Calendar feed unavailable — check ForexFactory before trading' : 'No high-impact events loaded';
    } else if (inRed.length) {
      const e = inRed.reduce((a, b) => (Math.abs(a.t - now) < Math.abs(b.t - now) ? a : b));
      const clearAt = Math.max(...inRed.map((x) => x.t + after));
      st = 'red'; icon = '⛔';
      main = `NO TRADE — ${e.ccy} ${e.title}${inRed.length > 1 ? ` (+${inRed.length - 1})` : ''}`;
      count = e.t > now ? 'in ' + dur(e.t - now) : 'released ' + dur(now - e.t) + ' ago';
      nxt = `Clear in ${dur(clearAt - now)} · window −${S.newsBefore}/+${S.newsAfter} min`;
    } else if (next && next.t - now <= warn) {
      st = 'warn'; icon = '⚠️'; main = `High-impact soon — ${next.ccy} ${next.title}`; count = 'in ' + dur(next.t - now);
      nxt = `No-trade from ${hhmm(next.t - before)}`;
    } else {
      st = 'clear'; icon = '✅'; main = 'News clear';
      nxt = next ? `Next: ${next.ccy} ${next.title} · ${new Intl.DateTimeFormat('en-GB', { timeZone: tz(), weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(next.t)}` : 'No more high-impact events this week';
      count = next ? 'in ' + dur(next.t - now) : '';
    }
    B.dataset.state = st; newsState = st;
    $('#nbIcon').textContent = icon; $('#nbMain').textContent = main; $('#nbCount').textContent = count; $('#nbNext').textContent = nxt;

    if (forceList || now - lastListRender > 30000) {
      lastListRender = now;
      const today = dayKey(now);
      const list = evs.filter((e) => dayKey(e.t) >= today);
      let html = '', lastDay = '';
      list.forEach((e) => {
        const dk = dayKey(e.t);
        if (dk !== lastDay) { lastDay = dk; html += `<li class="day">${new Intl.DateTimeFormat('en-GB', { timeZone: tz(), weekday: 'long', day: 'numeric', month: 'short' }).format(e.t)}</li>`; }
        const red = now >= e.t - before && now <= e.t + after;
        html += `<li class="${e.t + after < now ? 'past' : ''} ${red ? 'red' : ''}"><span class="t">${hhmm(e.t)}</span><span class="c">${esc(e.ccy)}</span><span>${esc(e.title)}</span></li>`;
      });
      $('#evList').innerHTML = html || '<li class="day">No upcoming high-impact events this week</li>';
    }
  }

  function mountTradingView() {
    const wrap = $('#tvWrap');
    wrap.innerHTML = '<div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div></div>';
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    s.async = true;
    s.textContent = JSON.stringify({
      colorTheme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
      isTransparent: true, width: '100%', height: '100%', locale: 'en',
      importanceFilter: '1', countryFilter: 'us,eu,gb,jp,ch,ca,au,nz',
    });
    wrap.firstChild.appendChild(s);
  }

  /* ---------------- checklist ---------------- */
  let ticks = {};
  function autoRules() {
    const newsOk = newsState !== 'red';
    const newsUnknown = newsState === 'unknown';
    return [
      { id: 'auto-news', text: newsUnknown ? 'News checked manually (feed unavailable)' : 'No high-impact news in window', ok: newsUnknown ? !!ticks['auto-news'] : newsOk, manual: newsUnknown, src: 'news' },
      { id: 'auto-risk', text: `Risk within limit (≤ ${S.maxRisk}%)`, ok: calcOut.valid && calcOut.riskPct <= S.maxRisk + 1e-9, src: 'calculator' },
    ];
  }
  let lastCkSig = '';
  function renderChecklist() {
    const manual = S.rules.map((r, i) => ({ id: 'r' + i, text: r.replace('{minRR}', S.minRR) }));
    const autos = autoRules();
    const locked = guardLocked();
    const done = manual.filter((r) => ticks[r.id]).length + autos.filter((a) => a.ok).length;
    const total = manual.length + autos.length;
    const sig = JSON.stringify([manual, autos.map((a) => [a.ok, a.manual, a.text]), ticks, locked]);
    if (sig === lastCkSig) return;
    lastCkSig = sig;
    $('#ckList').innerHTML = manual.map((r) => `<li class="${ticks[r.id] ? 'done' : ''}"><label><input type="checkbox" data-id="${r.id}" ${ticks[r.id] ? 'checked' : ''}/> ${esc(r.text)}</label></li>`).join('') +
      autos.map((a) => a.manual
        ? `<li class="${a.ok ? 'done' : ''}"><label><input type="checkbox" data-id="${a.id}" ${a.ok ? 'checked' : ''}/> ${esc(a.text)}</label></li>`
        : `<li class="auto ${a.ok ? 'done' : 'fail'}"><label><input type="checkbox" disabled ${a.ok ? 'checked' : ''}/> ${esc(a.text)} <span class="src">auto · ${a.src}</span></label></li>`).join('');
    $('#ckCount').textContent = `${done} / ${total}`;
    const btn = $('#takeBtn');
    btn.classList.toggle('locked', !!locked);
    if (locked) { btn.disabled = true; btn.textContent = '⛔ STOP TRADING — ' + locked; }
    else if (done < total) { btn.disabled = true; btn.textContent = `🔒 Take trade (${total - done} left)`; }
    else { btn.disabled = false; btn.textContent = '✅ Take trade'; }
  }
  $('#ckList').addEventListener('change', (e) => {
    const id = e.target.dataset.id; if (!id) return;
    ticks[id] = e.target.checked; renderChecklist();
  });
  $('#takeBtn').addEventListener('click', () => {
    if (guardLocked()) return;
    G.trades.push({ r: null, t: Date.now() });
    save('fx-guard', G);
    ticks = {};
    renderGuard();
  });

  /* ---------------- daily risk guard ---------------- */
  function rollDay() {
    const today = dayKey(Date.now());
    if (G.day !== today) { G = { day: today, trades: [] }; save('fx-guard', G); }
  }
  const stats = () => {
    const closed = G.trades.filter((t) => t.r != null);
    const R = closed.reduce((a, t) => a + t.r, 0);
    let streak = 0;
    const byTime = closed.slice().sort((a, b) => (a.rt || a.t) - (b.rt || b.t));
    for (let i = byTime.length - 1; i >= 0 && byTime[i].r < 0; i--) streak++;
    return { n: G.trades.length, R, streak, open: G.trades.filter((t) => t.r == null).length };
  };
  function guardLocked() {
    const s = stats();
    if (s.R <= -S.maxLossR + 1e-9) return `daily loss hit (${s.R.toFixed(1)}R)`;
    if (s.n >= S.maxTrades) return `max ${S.maxTrades} trades reached`;
    return '';
  }
  function renderGuard() {
    const s = stats(), locked = guardLocked();
    $('#gTrades').textContent = s.n;
    $('#gTradesMax').textContent = `of ${S.maxTrades} max${s.open ? ` · ${s.open} open` : ''}`;
    const r = $('#gR');
    r.textContent = (s.R > 0 ? '+' : s.R < 0 ? '−' : '') + Math.abs(s.R).toFixed(1);
    r.className = 'v ' + (s.R > 0 ? 'pos' : s.R < 0 ? 'neg' : '');
    const pct = C.mode === 'pct' ? +C.risk : null;
    $('#gRMax').textContent = `limit −${S.maxLossR}R${pct ? ` (≈ −${(S.maxLossR * pct).toFixed(1)}%)` : ''}`;
    const st = $('#gStreak');
    st.textContent = s.streak;
    st.className = 'v ' + (s.streak >= S.streakWarn ? 'neg' : s.streak > 0 ? 'warn' : '');
    const msg = $('#gMsg');
    if (locked) { msg.className = 'guard-msg stop'; msg.textContent = '⛔ STOP TRADING — ' + locked + '. Close the platform.'; }
    else if (s.streak >= S.streakWarn) { msg.className = 'guard-msg warn'; msg.textContent = `⚠ ${s.streak} losses in a row — step away for 30 min and review before the next trade.`; }
    else { msg.className = 'guard-msg'; msg.textContent = ''; }
    $('#gChips').innerHTML = G.trades.map((t, i) => t.r == null ? `<span class="chip o">#${i + 1} open</span>`
      : `<span class="chip ${t.r > 0 ? 'w' : t.r < 0 ? 'l' : ''}">#${i + 1} ${t.r > 0 ? '+' : t.r < 0 ? '−' : ''}${Math.abs(t.r).toFixed(1)}R</span>`).join('');
    renderChecklist();
  }
  function logResult(r) {
    rollDay();
    const open = G.trades.find((t) => t.r == null);
    if (open) { open.r = r; open.rt = Date.now(); }
    else G.trades.push({ r, t: Date.now(), rt: Date.now(), logged: true });
    save('fx-guard', G); renderGuard();
  }
  $('#gWin').addEventListener('click', () => logResult(Math.abs(parseFloat($('#gWinR').value) || 1)));
  $('#gLoss').addEventListener('click', () => logResult(-1));
  $('#gBe').addEventListener('click', () => logResult(0));
  $('#gUndo').addEventListener('click', () => {
    if (!G.trades.length) return;
    let idx = 0;
    G.trades.forEach((t, i) => { if ((t.rt || t.t) >= (G.trades[idx].rt || G.trades[idx].t)) idx = i; });
    const t = G.trades[idx];
    if (t.rt && !t.logged) { t.r = null; delete t.rt; } else G.trades.splice(idx, 1);
    save('fx-guard', G); renderGuard();
  });
  $('#gReset').addEventListener('click', () => { if (confirm('Start a new trading day? This clears today\'s trades.')) { G = { day: dayKey(Date.now()), trades: [] }; save('fx-guard', G); renderGuard(); } });

  /* ---------------- quick links ---------------- */
  function renderLinks() {
    $('#quickLinks').innerHTML = S.links.map((l) => {
      const [label, url] = l.split('|').map((x) => (x || '').trim());
      if (!label) return '';
      return url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>` : `<a href="#" class="unset" data-setlink>${esc(label)} (set URL)</a>`;
    }).join('');
  }
  $('#quickLinks').addEventListener('click', (e) => { if (e.target.closest('[data-setlink]')) { e.preventDefault(); openSettings(); $('#sLinks').focus(); } });

  /* ---------------- settings ---------------- */
  function openSettings() {
    const zones = (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : ['UTC', 'Europe/London', 'America/New_York', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Europe/Berlin']);
    const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
    $('#sTz').innerHTML = `<option value="">Browser default (${esc(browser)})</option>` + zones.map((z) => `<option ${z === S.tz ? 'selected' : ''}>${esc(z)}</option>`).join('');
    ['newsBefore', 'newsAfter', 'newsWarn', 'maxRisk', 'minRR', 'maxLossR', 'maxTrades', 'streakWarn'].forEach((k) => { $('#s' + k[0].toUpperCase() + k.slice(1)).value = S[k]; });
    $('#sNewsPairOnly').checked = !!S.newsPairOnly;
    $('#sRules').value = S.rules.join('\n');
    $('#sLinks').value = S.links.join('\n');
    $('#settings').hidden = false;
  }
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#setClose').addEventListener('click', () => { $('#settings').hidden = true; });
  $('#settings').addEventListener('click', (e) => { if (e.target.id === 'settings') $('#settings').hidden = true; });
  $('#sSave').addEventListener('click', () => {
    S.tz = $('#sTz').value;
    ['newsBefore', 'newsAfter', 'newsWarn', 'maxRisk', 'minRR', 'maxLossR', 'maxTrades', 'streakWarn'].forEach((k) => { const v = parseFloat($('#s' + k[0].toUpperCase() + k.slice(1)).value); if (isFinite(v)) S[k] = v; });
    S.newsPairOnly = $('#sNewsPairOnly').checked;
    S.rules = $('#sRules').value.split('\n').map((x) => x.trim()).filter(Boolean);
    S.links = $('#sLinks').value.split('\n').map((x) => x.trim()).filter(Boolean);
    save('fx-settings', S);
    $('#settings').hidden = true;
    ticks = {}; ivCache.at = 0; lastCkSig = '';
    renderLinks(); calc(); renderGuard(); tick(true);
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
    if (!confirm('Reset all settings, calculator values and today\'s log?')) return;
    ['fx-settings', 'fx-calc', 'fx-guard', 'fx-rates'].forEach((k) => localStorage.removeItem(k));
    location.reload();
  });

  /* ---------------- theme ---------------- */
  $('#themeBtn').addEventListener('click', () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('fx-theme', t); } catch (e) {}
    mountTradingView();
  });

  /* ---------------- main loop ---------------- */
  function tick(force) {
    const now = Date.now();
    renderClock(now);
    renderSessions(now);
    renderNews(now, force);
    rollDayIfNeeded(now);
    renderChecklist();
  }
  let lastDay = '';
  function rollDayIfNeeded(now) {
    const d = dayKey(now);
    if (d !== lastDay) { lastDay = d; rollDay(); renderGuard(); }
  }

  renderLinks();
  initCalc();
  rollDay();
  renderGuard();
  tick(true);
  setInterval(tick, 1000);
  loadNews();
  setInterval(loadNews, 15 * 60 * 1000);
  mountTradingView();
})();
