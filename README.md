# Trading Desk — Forex Dashboard & Playbook

Personal forex reference + live trading-session dashboard. Static site, no build step, no dependencies, hosted on GitHub Pages.

## Layout
One page with two tabs (keys **1** / **2**): **Dashboard** and **Playbook**. A live candlestick chart scrolls in the background (toggle in ⚙ Settings; respects reduced-motion).

**Dashboard** (one screen, big numbers)
- **News banner** in plain English: ✅ *Safe to trade*, ⚠️ *Big news soon* (countdown to the no-trade zone), ⛔ *DON'T TRADE* (±15 min around high-impact releases). Data: ForexFactory weekly feed fetched by the GitHub Action.
- **Session clock**: Asia (Tokyo), London, New York + London×NY overlap with countdowns. DST automatic; display timezone configurable.
- **Trades today**: counter with + / − (default max **4**/day), locks at the limit, resets daily.
- **Pre-trade checklist**: your rules + live auto-checks (news, risk ≤ limit). “Take trade” stays locked until all are ticked; taking a trade adds +1 to the counter.
- **Position size** overlay (button or **P**): lots, exact risk, pip value, SL / 1R / 2R / 3R.
- **High-impact news**: TradingView economic calendar widget. Editable quick links in the header.

**Playbook**: top 20 strategies, 22 candlestick patterns, 13 chart patterns, market structure/SMC concepts, indicators, risk rules, glossary — each with an annotated candlestick chart. Search with **/**.

## Data & privacy
No login and no server. Settings, checklist rules and the daily log live in your browser's `localStorage`. Use **⚙ Settings → Export/Import** to back up or move to another device.

## Deployment
`.github/workflows/pages.yml` deploys to GitHub Pages on every push to `main`, and every 2 hours (Sun–Fri) to refresh `data/calendar.json`.

One-time setup: **Repo → Settings → Pages → Build and deployment → Source: GitHub Actions**.

> Not financial advice. Win rates are typical published/backtest ranges, not guarantees.
