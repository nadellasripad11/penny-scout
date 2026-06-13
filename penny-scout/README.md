# PennyScout

Automated stock screener that scans the full NASDAQ universe hourly during market hours, scores every stock on 10 fundamental + technical signals, generates AI narratives for the top picks, and emails a daily digest.

**Live:** https://penny-scout.vercel.app

---

## How it works

GitHub Actions triggers a scan every hour from 9:30am-4pm ET (Mon-Fri). Each scan:

1. **Screens** the NASDAQ universe - filters by price, volume, float, and relative volume thresholds
2. **Scores** every qualifying stock on 10 signals: financial strength, revenue growth, profitability, cash position, insider/institutional ownership, technical momentum, news catalysts, and sector tailwinds (0-100 conviction score)
3. **Flags** pump-and-dump patterns automatically - tiny float + volume explosion + social hype + no revenue triggers a warning
4. **Generates AI narratives** for the top 10 using Groq (Llama 3.3 70B) with Gemini 2.0 Flash as fallback on rate limits
5. **Stores** reports in Firebase Firestore
6. **Emails** a digest at market close via Resend

At end-of-day, a separate workflow compiles all hourly reports into a full daily summary.

---

## Stack

| | |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI |
| Backend | Next.js API Routes (serverless) |
| Scheduling | GitHub Actions (7 cron triggers/day on market days) |
| AI | Groq (Llama 3.3 70B) with Gemini 2.0 Flash fallback |
| Database | Firebase Firestore |
| Email | Resend + Nodemailer |
| Data sources | Yahoo Finance, Finnhub, StockTwits, Reddit |
| Deploy | Vercel |

---

## Architecture

```
GitHub Actions (cron)
  POST /api/scan/hourly      # runs during market hours, 7x/day
  POST /api/scan/compile     # runs at 5pm ET, compiles daily report

/api/scan/hourly
  runQuickScreener()         # fetch NASDAQ candidates from multiple sources
  scoreStock()               # 10-signal scoring model
  detectPumpAndDump()        # flag suspicious patterns
  generateStockNarrative()   # Groq/Gemini AI per top-10 stock
  saveReport()               # write to Firestore
  sendDigestEmail()          # Resend email on final scan

/api/scan/compile
  getTodaysHourlyReports()   # pull all hourly reports from Firestore
  rankStocks()               # aggregate conviction scores
  generateExecutiveSummary() # end-of-day AI summary
  saveDailyReport()          # write compiled report
```

---

## Scoring model

Each stock gets a 0-100 conviction score from 10 weighted signals:

| Signal | What it measures |
|---|---|
| Financial strength | D/E ratio, current ratio |
| Revenue growth | YoY and QoQ |
| Profitability | gross margin, operating income |
| Cash position | vs. burn rate |
| Insider ownership | % held by insiders |
| Institutional ownership | % held by institutions |
| Technical momentum | RSI, MA crossovers |
| Relative volume | vs. 30-day average |
| News & catalysts | recent SEC filings, press releases |
| Sector tailwinds | high-growth sector bonus |

Pump-and-dump detection: 3+ of (float <10M shares, relative volume >5x, high social buzz on StockTwits/Reddit, revenue <$1M, large price move with no SEC filing) triggers a flag.

---

## Running locally

```bash
git clone https://github.com/nadellasripad11/penny-scout
cd penny-scout
npm install
cp .env.example .env.local
# Fill in: GROQ_API_KEY, GEMINI_API_KEY, FIREBASE_*, RESEND_API_KEY, CRON_SECRET
npm run dev
```

Trigger a manual scan:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/scan/hourly
```

---

## Roadmap

- [ ] Options flow integration (unusual activity detection)
- [ ] Backtesting framework - simulate historical performance of top-scored picks
- [ ] Slack/Discord webhook for real-time alerts
- [ ] Portfolio tracking with actual P&L vs. paper trades
