# Trading Desk — Forex Dashboard & Playbook

Personal forex reference + live trading-session dashboard. Static site, no build step, no dependencies, hosted on GitHub Pages.

## Pages

**`index.html` — Live Dashboard** (one screen, big numbers)
- **Position size calculator**: balance, risk % or £/$ amount, pair, stop (pips) → lot size, exact risk, pip value, SL/1R/2R/3R levels (prices if entry given). Live FX conversion via open.er-api.com.
- **Session clock**: Asia (Tokyo), London, New York + London×NY overlap with countdowns to next open/close. DST handled automatically; display timezone configurable.
- **News guard**: high-impact events (ForexFactory weekly feed, fetched by the GitHub Action) with a countdown banner that turns **red** inside the no-trade window, plus TradingView's economic calendar widget (high impact only).
- **Pre-trade checklist**: your own rules + live auto-checks (news clear, risk ≤ limit). “Take trade” stays locked until everything is ticked.
- **Daily risk guard**: trades taken, R today, loss streak; warning after N consecutive losses; hard “STOP TRADING” lock at max daily loss (R) or max trades.
- **Quick links**: editable (prop dashboard, ForexFactory, news…).

**`playbook.html` — Reference**
Top 20 strategies (typical win-rate ranges, R:R, rules), 22 candlestick patterns, 13 chart patterns, market structure/SMC concepts, indicator cheat sheet, risk rules, glossary — every item with an annotated candlestick chart (SVG, generated from synthetic data).

## Data & privacy
No login and no server. Settings, checklist rules and the daily log live in your browser's `localStorage`. Use **⚙ Settings → Export/Import** to back up or move to another device.

## Deployment
`.github/workflows/pages.yml` deploys to GitHub Pages on every push to `main`, and every 2 hours (Sun–Fri) to refresh `data/calendar.json`.

One-time setup: **Repo → Settings → Pages → Build and deployment → Source: GitHub Actions**.

> Not financial advice. Win rates are typical published/backtest ranges, not guarantees.
