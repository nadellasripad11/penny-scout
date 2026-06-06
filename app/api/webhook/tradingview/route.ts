import { NextResponse } from "next/server";
import { getOpenPositions, closePaperTrade } from "@/lib/store";

// TradingView sends: {"ticker":"BTBT","action":"sell","reason":"target","price":5.10,"secret":"..."}
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ticker, action, reason, price, secret } = body;

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ticker || !price) {
      return NextResponse.json({ error: "Missing ticker or price" }, { status: 400 });
    }

    if (action === "sell" || action === "close") {
      const open = await getOpenPositions();
      const position = open.find((t) => t.ticker === ticker.toUpperCase());
      if (!position) {
        return NextResponse.json({ message: "No open position found", ticker });
      }
      const closeReason: "target" | "stop_loss" | "manual" =
        reason === "target" ? "target" : reason === "stop" ? "stop_loss" : "manual";
      await closePaperTrade(position.id, parseFloat(price), closeReason);
      const pnl = ((parseFloat(price) - position.entryPrice) / position.entryPrice * 100).toFixed(2);
      return NextResponse.json({
        success: true,
        message: `Closed ${ticker} at $${price} (${pnl}% P&L)`,
        closeReason,
      });
    }

    return NextResponse.json({ message: "No action taken", action });
  } catch (err) {
    console.error("TradingView webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
