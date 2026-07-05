# Deployment Guide — PennyScout

This guide covers deploying PennyScout to Vercel and configuring GitHub Actions for automated scans.

## Prerequisites

- Vercel account (free tier works)
- GitHub repository (fork or clone)
- All environment variables from `ENV.md`

## 1. Deploy to Vercel

### Via CLI

```bash
npm i -g vercel
vercel login
vercel  # from project root
```

### Via GitHub Integration

1. Go to vercel.com → Add New → Project
2. Select your GitHub repo
3. Vercel auto-detects Next.js and sets build/start commands
4. Click Deploy

## 2. Set Environment Variables

```bash
vercel env add GROQ_API_KEY
vercel env add FINNHUB_API_KEY
vercel env add POLYGON_API_KEY
vercel env add RESEND_API_KEY
vercel env add DIGEST_EMAIL
vercel env add CRON_SECRET
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
# ... add all other FIREBASE_* keys
```

**Important:** All `NEXT_PUBLIC_*` variables are visible in client code. Only use them for non-sensitive data.

## 3. Configure GitHub Actions (Cron Triggers)

Scans run automatically via GitHub Actions `.github/workflows/scan.yml`:

```yaml
# 7 scans per market day (9:30am–4pm ET)
- cron: "30 14 * * 1-5"   # 9:30am ET
- cron: "00 15 * * 1-5"   # 10:00am ET
- cron: "00 16 * * 1-5"   # 11:00am ET
- cron: "00 17 * * 1-5"   # 12:00pm ET
- cron: "00 18 * * 1-5"   # 1:00pm ET
- cron: "00 19 * * 1-5"   # 2:00pm ET
- cron: "00 20 * * 1-5"   # 3:00pm ET
- cron: "00 21 * * 1-5"   # 4:00pm ET (daily compile)
```

The workflow POSTs to `https://<your-vercel-app>/api/scan/hourly` with Bearer token auth.

## 4. Verify Deployment

### Check Vercel logs
```bash
vercel logs
```

### Manual scan trigger
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<your-vercel-app>.vercel.app/api/scan/hourly
```

### Check Firestore
- Go to Firebase Console → Firestore
- Collections: `scanReports`, `stocks`, `paperTrades`

## 5. Monitor Production

**Vercel Logs:** https://vercel.com/dashboard → [Project] → Deployments → Function Logs

**Error tracking:** Check Vercel Analytics for runtime errors

**Email delivery:** Check Resend dashboard for bounce/delivery stats

**Cost monitoring:**
- Groq: Free tier covers ~150 scans/month (14,400 req/day)
- Vercel: 100 function invocations free/month
- Firebase: Free tier (20K reads/day)

**When to upgrade:**
- Groq: >150 scans/month → $0.10/1M tokens
- Vercel: >100 function invocations → pay-as-you-go
- Firebase: >20K reads/day → $0.06/100K reads

## 6. Troubleshooting

**Scans not running?**
- Verify GitHub Actions are enabled in repo settings
- Check Actions tab → Workflow runs for errors
- Confirm CRON_SECRET is set in Vercel env

**Emails not sending?**
- Check Resend dashboard for bounces
- Verify DIGEST_EMAIL is valid
- Test locally: `npm run dev` + manual API call

**AI narratives slow/timeout?**
- Groq rate limit: 14,400 req/day (≈200/hr)
- If hitting limit, use GEMINI_API_KEY fallback
- Consider reducing top-N stocks per scan

**Firebase errors?**
- Verify all FIREBASE_* keys are set correctly
- Check Firestore RLS rules allow unauthenticated writes
- Ensure Firestore database is in same region as Vercel

## 7. Rollback

If a deployment breaks production:

```bash
vercel rollback        # rollback to previous deployment
vercel --prod          # redeploy current code to production
```

Or use Vercel dashboard: Deployments → Select past version → Promote

## 8. Cost Optimization

**Reduce API calls:**
- Filter stocks earlier (price/volume thresholds)
- Reduce top-N stocks per scan (currently 50)
- Cache external API responses for 1 hour

**Batch AI requests:**
- Instead of 50 individual Groq calls, batch into groups
- Reduces token usage by ~20%

**Use Firestore efficiently:**
- Composite indexes for common queries
- Set TTL for old scan reports (>30 days)
