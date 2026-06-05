import { NextResponse } from "next/server";
import { runScan } from "@/lib/scan";

export const maxDuration = 300;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Starting evening scan...");
    const report = await runScan("evening");
    return NextResponse.json({
      success: true,
      reportId: report.id,
      stocksAnalyzed: report.allStocks.length,
      topPick: report.executiveSummary.highestConvictionPick?.ticker,
    });
  } catch (err) {
    console.error("Evening scan failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
