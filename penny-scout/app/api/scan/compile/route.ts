import { NextResponse } from "next/server";
import { compileDailySummary } from "@/lib/scan";

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Starting end-of-day compile...");
    const report = await compileDailySummary();
    return NextResponse.json({
      success: true,
      reportId: report.id,
      totalStocks: report.allStocks.length,
      topPick: report.executiveSummary.highestConvictionPick?.ticker,
    });
  } catch (err) {
    console.error("Daily compile failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
