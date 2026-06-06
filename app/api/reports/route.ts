import { NextResponse } from "next/server";
import { getRecentReports, getLatestReport } from "@/lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const latest = searchParams.get("latest");
  const scanType = searchParams.get("type") as "morning" | "evening" | "hourly" | null;

  try {
    if (latest === "true") {
      const report = await getLatestReport(scanType ?? undefined);
      return NextResponse.json(report);
    }
    const reports = await getRecentReports(20);
    return NextResponse.json(reports);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
