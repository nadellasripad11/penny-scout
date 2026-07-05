# Testing Guide — PennyScout

This guide covers testing the stock screener locally and validating production behavior.

## Local Development

### Start dev server

```bash
npm run dev
# Open http://localhost:3000
```

### Manual API testing

**Trigger hourly scan:**
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/scan/hourly
```

**Fetch latest report:**
```bash
curl http://localhost:3000/api/reports
```

**Get specific stock data:**
```bash
curl "http://localhost:3000/api/stock?ticker=AAPL"
```

## Unit Testing

### Run existing tests
```bash
npm test
```

### Test key functions individually

**Test scoring model:**
```typescript
import { scoreStock } from '@/lib/analysis/scoring';
import { StockData } from '@/lib/types';

const testStock: StockData = {
  ticker: 'AAPL',
  price: 150,
  marketCap: 2500000000000,
  revenueGrowthYoY: 0.10,
  // ... other fields
};

const result = scoreStock(testStock);
console.log('Conviction:', result.convictionScore); // expect 0-100
```

**Test pump-and-dump detection:**
```typescript
import { detectPumpAndDump } from '@/lib/analysis/alerts';

const pumpSignals = {
  float: 5000000,          // <10M
  relativeVolume: 8,       // >5x
  stockTwitsBuzz: 'high',
  revenue: 500000,         // <$1M
  priceMovePercent: 150,   // large move
};

const isFlagged = detectPumpAndDump(pumpSignals);
console.log('Pump-and-dump risk:', isFlagged); // expect true
```

## Integration Testing

### Test end-to-end flow

1. **Verify data sources:**
   ```bash
   npm run dev
   # Check browser console for API calls to Finnhub, Polygon, StockTwits
   # Should see successful responses
   ```

2. **Verify scoring:**
   - Browse to http://localhost:3000/reports
   - Check that stocks are ranked 0-100
   - Verify risky stocks have risk warnings

3. **Verify email delivery:**
   - Check Resend dashboard for test emails
   - Verify email content matches report data

4. **Verify Firestore persistence:**
   - Go to Firebase Console → Firestore
   - Trigger scan: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/scan/hourly`
   - Check `scanReports` collection for new document

## Production Validation

### Monitor first scan

1. **Enable GitHub Actions workflow**
   - Repository → Actions → Enable workflows

2. **Check first run:**
   - Go to Actions tab → Select workflow run
   - View logs for any errors
   - Expected runtime: 2–5 minutes

3. **Verify Firestore data:**
   - Firebase Console → Firestore
   - Should see new documents in `scanReports` and `stocks`

4. **Check email delivery:**
   - Resend Dashboard → Emails
   - Should see outgoing digest emails
   - Check your inbox for delivery

### Performance validation

**Target metrics:**
- Scan latency: <5s per 10 stocks (API dependent)
- Email delivery: <30s from end-of-market
- Uptime: 99.5% during market hours

**Monitor with:**
- Vercel Analytics: https://vercel.com/dashboard → [Project] → Analytics
- Firestore metrics: Firebase Console → Firestore → Metrics

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized on API | Missing/wrong CRON_SECRET | Verify env var matches Vercel + local |
| Scan hangs | Groq API timeout | Check Groq quota; use Gemini fallback |
| No emails sent | Resend rate limit | Check Resend dashboard; try Nodemailer fallback |
| Firestore errors | Missing RLS rules | Add rule: `allow read, write: if true;` (dev only) |
| Missing stock data | API rate limits | Polygon/Finnhub throttled; add caching layer |

## Load Testing

For high-volume scans (>100 stocks):

```bash
# Simulate concurrent requests
ab -n 10 -c 5 -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/scan/hourly
```

Expected: <5 second response time with 300s timeout.

## Regression Testing

Before deploying, verify:

- [ ] All API endpoints return 200 on valid requests
- [ ] Auth fails with 401 on missing CRON_SECRET
- [ ] Scan reports have all required fields
- [ ] Top stocks are ranked correctly (conviction 0-100)
- [ ] Email content is properly formatted
- [ ] Firestore documents persist correctly
- [ ] No console errors in logs
