import { NextResponse } from "next/server";
import { getPaperTrades } from "@/lib/store";

async function getLivePrice(ticker: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const trades = await getPaperTrades();
  const open = trades.filter((t) => t.status === "open");

  // Fetch live prices for open positions in parallel
  const prices = await Promise.all(open.map((t) => getLivePrice(t.ticker)));
  const enrichedOpen = open.map((t, i) => {
    const livePrice = prices[i];
    if (!livePrice) return t;
    const pnl = (livePrice - t.entryPrice) * t.shares;
    const pnlPercent = ((livePrice - t.entryPrice) / t.entryPrice) * 100;
    return { ...t, livePrice, livePnl: +pnl.toFixed(2), livePnlPercent: +pnlPercent.toFixed(2) };
  });

  const closed = trades.filter((t) => t.status === "closed");
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const totalPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const livePnl = enrichedOpen.reduce((sum, t: any) => sum + (t.livePnl ?? 0), 0);

  return NextResponse.json({
    openPositions: enrichedOpen,
    closedTrades: closed,
    stats: {
      openCount: open.length,
      closedCount: closed.length,
      winRate: closed.length > 0 ? +((wins / closed.length) * 100).toFixed(1) : 0,
      totalRealizedPnl: +totalPnl.toFixed(2),
      totalUnrealizedPnl: +livePnl.toFixed(2),
      totalPnl: +(totalPnl + livePnl).toFixed(2),
      startingBalance: 10000,
    },
  });
}
