import { NextResponse } from "next/server";
import { runHourlyScan } from "@/lib/scan";

export const maxDuration = 300;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Starting hourly scan...");
    const report = await runHourlyScan();
    return NextResponse.json({
      success: true,
      reportId: report.id,
      stocksAnalyzed: report.allStocks.length,
      topPick: report.executiveSummary.highestConvictionPick?.ticker,
    });
  } catch (err) {
    const msg = String(err);
    // Market closed is not an error — just a no-op
    if (msg.includes("Market is closed")) {
      return NextResponse.json({ success: true, skipped: true, reason: msg });
    }
    console.error("Hourly scan failed:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
