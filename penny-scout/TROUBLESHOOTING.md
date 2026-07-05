# Troubleshooting & FAQ — PennyScout

Common issues and solutions for running PennyScout.

## API & Integration Issues

### "Unauthorized" (401) on scan endpoints

**Symptom:** `curl` returns `{ error: "Unauthorized" }`

**Cause:** CRON_SECRET is missing, wrong, or malformed

**Fix:**
```bash
# Verify locally
echo $CRON_SECRET  # should print 64-char hex string

# Verify on Vercel
vercel env list   # CRON_SECRET should be listed

# Match them exactly
openssl rand -hex 32  # generate new one
vercel env add CRON_SECRET  # set on Vercel
export CRON_SECRET="$(openssl rand -hex 32)"  # set locally
```

### Finnhub API returns "Invalid API key"

**Cause:** FINNHUB_API_KEY is empty, expired, or has wrong permissions

**Fix:**
1. Go to https://finnhub.io → Dashboard
2. Copy API key from top-right
3. Set locally: `export FINNHUB_API_KEY="your_key"`
4. Verify: `curl "https://finnhub.io/api/v1/company?symbol=AAPL&token=$FINNHUB_API_KEY"`

### Groq API rate limit exceeded

**Symptom:** `"Error: Rate limit exceeded"`

**Cause:** >14,400 requests/day free tier limit hit

**Fix:**
1. Groq resets daily at UTC midnight
2. Wait 24 hours, or
3. Set `GEMINI_API_KEY` fallback (auto-switches on Groq rate limit)
4. Consider upgrading to paid Groq plan

### Polygon.io returns "Access Denied"

**Cause:** Free tier limitations or expired credentials

**Fix:**
1. Verify POLYGON_API_KEY is correct
2. Check free tier includes the data you need (end-of-day vs. minute bars)
3. Upgrade to paid plan if needed

## Scan & Scoring Issues

### Scan completes but scores are all 0 or very low

**Cause:** Missing API data or malformed responses

**Debug:**
```bash
npm run dev
# In browser console, check:
# 1. Network tab for failed API calls
# 2. Console for parsing errors
# 3. Firestore logs for validation failures
```

**Fix:**
- Ensure all API keys are valid and have correct permissions
- Check API quota usage (especially Finnhub)
- Verify stock data matches StockData schema

### Pump-and-dump detector missing obvious pumps

**Cause:** Thresholds may be too conservative

**Current thresholds:**
- Float <10M shares
- Relative volume >5x
- High social buzz (StockTwits >100 msgs/hour OR Reddit >50 upvotes)
- Revenue <$1M
- Price move >50% in single day

**Adjust in `/lib/analysis/alerts.ts`** if needed

### Top picks seem random or don't make sense

**Cause:** Weighting is off or data is stale

**Debug:** Check `ARCHITECTURE.md` for 10-signal weighting
- Financial strength (15%)
- Revenue growth (15%)
- Profitability (10%)
- etc.

**Fix:** Verify all APIs are returning fresh data (not cached)

## Deployment Issues

### GitHub Actions workflow not running

**Symptom:** No workflow runs in Actions tab

**Cause:** Workflows are disabled or CRON_SECRET not set

**Fix:**
1. Repository → Settings → Actions → Enable
2. Vercel env has CRON_SECRET set
3. Workflow file exists at `.github/workflows/scan.yml`

### "Vercel function timeout" after 60s

**Cause:** Scan takes >60s, exceeds default timeout

**Fix:** Increase timeout in API route:
```typescript
export const maxDuration = 300;  // 5 minutes
```

### Firestore missing new scan reports

**Cause:** Missing write permissions or RLS rules are too strict

**Debug:**
1. Firebase Console → Firestore → Data
2. Check if collections exist: `scanReports`, `stocks`
3. Firestore → Rules → Check security rules

**Fix for development:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // dev only!
    }
  }
}
```

**Fix for production:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scanReports/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;  // authenticated writes only
    }
  }
}
```

### Emails not sending

**Symptom:** Scan runs but no digest email arrives

**Cause:** Resend API key invalid, email address bounced, or network error

**Debug:**
1. Resend Dashboard → Emails → Check delivery status
2. Look for bounce/invalid email errors
3. Check spam/junk folder

**Fix:**
1. Verify RESEND_API_KEY is correct
2. Verify DIGEST_EMAIL is valid
3. Test locally with manual email:
   ```bash
   npm run dev
   # Call /api/scan/hourly and check Resend dashboard
   ```

## Performance & Cost Issues

### Scan takes 5+ minutes

**Cause:** API latency or timeout

**Profile the bottleneck:**
```bash
# Add console.time() in scan.ts
console.time('fetchData');
await fetchAllAPIs();
console.timeEnd('fetchData');  // logs duration

console.time('scoring');
await scoreAllStocks();
console.timeEnd('scoring');

console.time('aiNarratives');
await generateNarratives();
console.timeEnd('aiNarratives');
```

**Fix:**
- Data fetch slow? Check API quotas, consider caching
- Scoring slow? Reduce number of stocks or optimize calculations
- AI generation slow? Use Gemini fallback, batch requests

### High Groq API costs

**Current usage:**
- 1 narrative/stock = ~500 tokens
- Top 10 stocks = 5,000 tokens/scan
- 7 scans/day = 35,000 tokens/day
- Free tier: 14,400 tokens/day → **upgrade needed at 7 scans/day**

**Cost optimization:**
1. Reduce top-N stocks (generate narratives for top 5 instead of 10)
2. Batch narrative generation (send 10 stocks in 1 request)
3. Cache narratives for same stocks (if scores haven't changed >5%)

### Firebase costs exceeded

**Free tier:** 20K reads/day, 5K writes/day

**Usage estimate:**
- 1 scan = ~50 reads (fetch stock data) + 5 writes (save new data)
- 7 scans = 350 reads + 35 writes → well under free tier

**Reduce costs:**
- Set TTL on old documents (auto-delete >30 days old)
- Use Firestore indexes for common queries
- Migrate to cheaper storage if archiving scans

## Local Development Issues

### "Cannot find module" errors

**Cause:** Dependencies not installed or path mismatch

**Fix:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### TypeScript errors in IDE but `npm run dev` works

**Cause:** IDE using old TypeScript version

**Fix:**
```bash
# Use project's TypeScript
npx tsc --version  # should match tsconfig.json

# Force IDE to use project TS (VS Code)
# Cmd+Shift+P → TypeScript: Select TypeScript Version → Use Workspace Version
```

### `.env.local` not loaded

**Cause:** File not in root directory or not formatted correctly

**Fix:**
```bash
# Ensure it's in project root, not in /app or /lib
ls -la .env.local

# Check format (no quotes around values)
echo $GROQ_API_KEY  # should print actual key

# Restart dev server after changing .env.local
npm run dev
```

## Getting Help

**Before posting an issue:**
1. Check this guide and ARCHITECTURE.md
2. Run `npm run dev` and check browser console
3. Check Vercel/Firebase/Groq dashboards for API errors
4. Enable debug logging: `DEBUG=penny-scout npm run dev`

**Report issues to:** GitHub Issues with:
- Error message (full stack trace)
- Steps to reproduce
- Which API is failing (Finnhub/Groq/Firestore/etc)
- Environment (local/production)

---

**Last updated:** 2024-07-05
