# Environment Variables Guide

This document details all required and optional environment variables for PennyScout.

## Required Variables

### Data APIs

**POLYGON_API_KEY** — Market data provider  
- Get it from: https://polygon.io
- Free tier: includes end-of-day data (sufficient for this app)
- Required for: Historical price/volume data, technical indicators

**FINNHUB_API_KEY** — Fundamental data  
- Get it from: https://finnhub.io
- Free tier: 60 API calls/minute
- Required for: Company financials, earnings, insider trades, news

### AI/LLM

**GROQ_API_KEY** — Fast inference (primary)  
- Get it from: https://console.groq.com/keys
- Free tier: 14,400 requests/day (Llama 3.3 70B)
- Required for: Generating AI narratives for top stock picks

### Email Delivery

**RESEND_API_KEY** — Transactional email  
- Get it from: https://resend.com
- Free tier: 3,000 emails/month
- Required for: Sending daily stock digest emails

**DIGEST_EMAIL** — Recipient email address  
- Example: `your@email.com`
- Required for: Digest delivery target

### Firebase/Firestore

**NEXT_PUBLIC_FIREBASE_API_KEY**  
**NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN**  
**NEXT_PUBLIC_FIREBASE_PROJECT_ID**  
**NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET**  
**NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID**  
**NEXT_PUBLIC_FIREBASE_APP_ID**  

- Get all from: Firebase Console > Project Settings
- Required for: Storing scan reports and historical data

### Cron Security

**CRON_SECRET** — Webhook authentication  
- Generate: `openssl rand -hex 32`
- Required for: Securing GitHub Actions POST requests
- Must be set identically in Vercel project settings

## Optional Variables

**GEMINI_API_KEY** — Fallback LLM  
- Get it from: https://aistudio.google.com
- Free tier: 2 requests/minute
- Purpose: Fallback when Groq is rate-limited

**NODEMAILER_USER** / **NODEMAILER_PASSWORD** — Email fallback  
- SMTP credentials for email fallback
- Purpose: If Resend service fails
- Example: Gmail App Password if using Gmail

**SLACK_WEBHOOK_URL** — Slack alerts  
- Get it from: Slack Workspace > Apps & Integrations > Incoming Webhooks
- Purpose: Real-time stock alerts (future feature)

## Setup Instructions

1. Copy template:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in all **required** variables from the services above

3. Test locally:
   ```bash
   npm run dev
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/scan/hourly
   ```

4. Deploy to Vercel:
   ```bash
   vercel env add POLYGON_API_KEY
   vercel env add FINNHUB_API_KEY
   # ... repeat for all required keys
   ```

## Cost Breakdown (Monthly)

| Service | Free Tier | Cost if exceeded |
|---------|-----------|------------------|
| Groq | 14,400 req/day | $0.10/1M tokens |
| Finnhub | 60 calls/min | $0 (rate-limited) |
| Resend | 3,000 emails | $0.20 per 100 emails |
| Firebase | 20K reads/day free | $0.06/100K reads |
| Polygon.io | Limited data | Pay-as-you-go |

**Typical cost:** $0–5/month (heavily Finnhub and Groq dependent)
