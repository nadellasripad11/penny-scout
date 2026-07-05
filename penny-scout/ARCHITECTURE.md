# Architecture Guide — PennyScout

This document outlines the system design, data flow, and key components of PennyScout.

## System Overview

```
GitHub Actions (Cron)
    ↓
Vercel Edge Request
    ↓
Next.js API Route (/api/scan/hourly)
    ├→ Data Collection Layer
    │   ├→ Finnhub (fundamentals, earnings, insiders)
    │   ├→ Polygon.io (historical prices, technicals)
    │   ├→ Yahoo Finance (realtime quotes)
    │   └→ StockTwits/Reddit (social signals)
    │
    ├→ Analysis Layer
    │   ├→ Screener (filter by price/volume/float)
    │   ├→ Scoring Model (10-signal conviction score)
    │   └→ Pump-and-Dump Detector
    │
    ├→ AI Narrative Generation
    │   ├→ Groq (Llama 3.3 70B) - Primary
    │   └→ Gemini (fallback on rate limit)
    │
    └→ Storage & Distribution
        ├→ Firestore (scan reports, stock data)
        ├→ Realtime DB (paper trades)
        └→ Resend (email digest)
```

## Data Flow

### 1. Data Ingestion (5-10s)

**Finnhub API:**
- Company fundamentals (revenue, earnings, margins)
- Insider trading activity
- News and press releases
- Analyst ratings and price targets

**Polygon.io:**
- Historical OHLC (open, high, low, close) prices
- Volume data and technical indicators
- Options data (future: unusual activity detection)

**StockTwits / Reddit:**
- Bullish/bearish sentiment percentage
- Message volume and activity trends
- Buzz intensity classification

**Yahoo Finance:**
- Real-time stock quotes
- Market cap and enterprise value
- Institutional/insider ownership %

### 2. Screening & Scoring (10-30s)

**Quick Screen:**
- Price: $1 - $500 (penny stocks + small caps)
- Volume: >100K shares (liquidity requirement)
- Float: <500M shares (volatile candidates)
- Relative volume: >0.5x (activity filter)
- Market cap: >$50M (avoid micro-caps)

**10-Signal Scoring Model:**
- **Financial Strength** (15%): Debt-to-equity, current ratio
- **Revenue Growth** (15%): YoY & QoQ trends
- **Profitability** (10%): Gross margin, operating margin, net margin
- **Cash Position** (10%): Cash vs. burn rate for unprofitable companies
- **Insider Ownership** (8%): % owned by company insiders (bullish signal)
- **Institutional Ownership** (7%): % owned by institutional investors
- **Technical Momentum** (12%): RSI, moving average crossovers
- **Relative Volume** (8%): Current volume vs. 30-day average
- **Catalysts** (10%): Earnings, FDA approvals, buybacks, news
- **Sector Tailwinds** (7%): High-growth sectors (biotech, AI, renewables)

**Scoring formula:**
```
convictionScore = Σ(signal_weight × signal_score) / 100
Result: 0-100 (higher = more bullish)
```

### 3. Pump-and-Dump Detection

Flags triggered if 3+ of these are true:
- Float <10M shares (tiny float = easy to manipulate)
- Relative volume >5x (unusual activity explosion)
- High social buzz (StockTwits/Reddit mentions surging)
- Revenue <$1M (no actual business)
- Large price move (50%+ gain with no filing/news)

**Action:** Flag as "Very High Risk" and include warning in narrative

### 4. AI Narrative Generation (2-4s per stock)

For top 10-15 stocks:
- **Primary:** Groq Llama 3.3 70B (~200ms latency)
- **Fallback:** Gemini 2.0 Flash (rate limit handling)

**Narrative includes:**
- Bull case: why this stock is attractive
- Bear case: risks and downside scenarios
- Financial health assessment
- 1-week / 1-month / 1-year price targets
- Entry, stop-loss, expected return
- Probability of success

### 5. Report Compilation (1-2s)

Aggregates:
- Top stocks by conviction score
- Top stocks by timeframe (day-trade, swing, long-term)
- Top short squeeze candidates
- Top pre-breakout plays
- Biggest catalysts across the universe
- New insider buying activity
- Institutional accumulation patterns

### 6. Distribution (1s)

**Email digest via Resend:**
- Formatted HTML with top 10 stocks
- Links to full reports
- Risk warnings for pump signals
- Market summary and sentiment

**Stored in Firestore:**
- Full scan report (searchable, queryable)
- Individual stock data (cached for 24h)
- Paper trading results (if enabled)

## Database Schema

### Firestore Collections

**scanReports/**
```
{
  id: "scan_20240705_143000"
  date: "2024-07-05"
  scanType: "hourly" | "daily"
  timestamp: 1720198200000
  totalStocksFound: 2847
  executiveSummary: { ... }
  rankings: { ... }
  allStocks: [ ... ]
}
```

**stocks/**
```
{
  ticker: "NVDA"
  company: "NVIDIA Corporation"
  fundamentals: { ... }
  technicals: { ... }
  socialSignals: { ... }
  lastUpdated: 1720198200000
  cacheTTL: 86400 (24h)
}
```

**paperTrades/** (Realtime DB)
```
{
  ticker: "AAPL"
  entryPrice: 150.25
  shares: 100
  targetPrice: 165.00
  stopLoss: 140.00
  status: "open" | "closed"
  pnl: 1500.00
  pnlPercent: 9.95
}
```

## Performance Targets

| Operation | Target | Actual |
|-----------|--------|--------|
| Data fetch (APIs) | <10s | ~8s |
| Screening & scoring | <30s | ~25s |
| AI narratives (top 10) | <40s | ~35s |
| Firestore save | <5s | ~2s |
| Email delivery | <30s | ~15s |
| **Total scan time** | **<120s** | **~90s** |

**Groq bottleneck:** Generating narratives for top stocks (2-3s each at 200ms latency)

**Optimization:** Batch AI requests, cache common narratives, use fallback model on rate limits

## Scaling Considerations

**Current capacity:**
- 7 scans/day × 30 days = 210 scans/month
- Groq: 14,400 req/day free (covers ~200 scans)
- Vercel: 100 function invocations free (covers <200/month)
- Firebase: 20K reads/day free (covers ~600/month)

**Upgrade triggers:**
- Groq: >150 scans/month → $0.10/1M tokens
- Vercel: >100 invocations → pay-as-you-go
- Firebase: >20K reads → $0.06/100K reads

**To scale to 100+ scans/day:**
- Implement request batching to Groq
- Add in-memory caching (Redis) for fundamentals
- Use composite Firestore indexes
- Migrate to Vercel Enterprise for better limits

## Future Architecture

**Phase 2 (Q4 2024):**
- Add backtesting engine (replay trades, measure ROI)
- WebRTC for real-time alerts (sub-second latency)
- Discord/Slack bot integration

**Phase 3 (2025):**
- Multi-asset class (options, crypto, forex)
- Portfolio optimization with ML
- White-label SaaS version for hedge funds
