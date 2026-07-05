import { NextResponse } from "next/server";
import { runScan } from "@/lib/scan";

/**
 * Morning Stock Scan Endpoint
 *
 * Triggered daily at 9:30am ET (market open) via GitHub Actions CRON.
 * Scans full NASDAQ universe, scores stocks on 10 signals, flags pump-and-dump,
 * generates AI narratives, and saves to Firestore.
 *
 * Authentication: Bearer token (CRON_SECRET) required
 * Rate limit: Groq has 14,400 req/day free tier
 * Timeout: 5 minutes (300s) for full scan + AI generation
 *
 * Response:
 * - reportId: Unique identifier for this scan's Firestore document
 * - stocksAnalyzed: Total number of stocks in final report (top ~50)
 * - topPick: Ticker with highest conviction score
 */
export const maxDuration = 300;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Starting morning scan...");
    const report = await runScan("morning");
    return NextResponse.json({
      success: true,
      reportId: report.id,
      stocksAnalyzed: report.allStocks.length,
      topPick: report.executiveSummary.highestConvictionPick?.ticker,
    });
  } catch (err) {
    console.error("Morning scan failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
