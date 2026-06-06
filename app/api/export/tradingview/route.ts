import { NextResponse } from "next/server";
import { getLatestReport } from "@/lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "watchlist"; // watchlist | pine

  const report = await getLatestReport();
  if (!report) return NextResponse.json({ error: "No report" }, { status: 404 });

  const top10 = report.rankings.topTomorrow?.slice(0, 10) ?? report.allStocks.slice(0, 10);
  const webhookUrl = `https://penny-scout.vercel.app/api/webhook/tradingview`;
  const secret = process.env.CRON_SECRET ?? "";

  if (type === "watchlist") {
    const lines = top10.map((s) => `NASDAQ:${s.ticker}`).join("\n");
    return new Response(lines, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="pennyscout-${report.date}.txt"`,
      },
    });
  }

  if (type === "pine") {
    const scripts = top10.map((s) => `
// ── PennyScout: ${s.ticker} (${s.company}) ──
// Generated: ${report.date} | Score: ${s.convictionScore}/100 | Risk: ${s.riskRating}
//@version=5
indicator("PennyScout: ${s.ticker}", overlay=true, max_lines_count=10)

entry  = ${s.entryPrice}
target = ${s.targets.oneWeek}
stop   = ${s.stopLoss}

line.new(bar_index-1, entry,  bar_index, entry,  color=color.new(color.green,  60), width=1, style=line.style_dashed)
line.new(bar_index-1, target, bar_index, target, color=color.new(color.lime,   40), width=2)
line.new(bar_index-1, stop,   bar_index, stop,   color=color.new(color.red,    40), width=2)

label.new(bar_index, target, "TARGET $${s.targets.oneWeek}", color=color.lime,  style=label.style_label_left, size=size.small)
label.new(bar_index, stop,   "STOP $${s.stopLoss}",          color=color.red,   style=label.style_label_left, size=size.small)
label.new(bar_index, entry,  "ENTRY $${s.entryPrice}",       color=color.green, style=label.style_label_left, size=size.small)

// Alert conditions — set webhook to: ${webhookUrl}
alertcondition(ta.crossover(close, target), "🎯 ${s.ticker} Target Hit",   '{"ticker":"${s.ticker}","action":"sell","reason":"target","price":' + str.tostring(close) + ',"secret":"${secret}"}')
alertcondition(ta.crossunder(close, stop),  "🛑 ${s.ticker} Stop Loss",    '{"ticker":"${s.ticker}","action":"sell","reason":"stop","price":"'  + str.tostring(close) + ',"secret":"${secret}"}')
    `.trim()).join("\n\n// ─────────────────────────────────────────────────────────\n\n");

    return new Response(scripts, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="pennyscout-alerts-${report.date}.pine"`,
      },
    });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
