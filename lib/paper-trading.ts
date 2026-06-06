import type { ScoredStock, PaperTrade } from "@/lib/types";
import { getOpenPositions, savePaperTrade, closePaperTrade } from "@/lib/store";

const POSITION_SIZE = 500; // $ per trade
const MAX_OPEN = 10;
const SLIPPAGE = 0.02; // 2% — accounts for bid-ask spread on penny stocks

export async function autoPaperTrade(
  topPicks: ScoredStock[],
  scanReportId: string
): Promise<void> {
  try {
    const open = await getOpenPositions();
    const openTickers = new Set(open.map((t) => t.ticker));

    // Check if any open positions hit target or stop loss
    for (const pos of open) {
      const current = topPicks.find((s) => s.ticker === pos.ticker);
      if (!current) continue;
      if (current.price >= pos.targetPrice) {
        await closePaperTrade(pos.id, current.price, "target");
        openTickers.delete(pos.ticker);
      } else if (current.price <= pos.stopLoss) {
        await closePaperTrade(pos.id, current.price, "stop_loss");
        openTickers.delete(pos.ticker);
      }
    }

    // Open new positions for top picks not already held
    const openCount = open.filter((t) => t.status === "open" && openTickers.has(t.ticker)).length;
    const slots = MAX_OPEN - openCount;
    if (slots <= 0) return;

    const newPicks = topPicks
      .filter((s) => !openTickers.has(s.ticker) && s.convictionScore >= 55)
      .slice(0, Math.min(slots, 5));

    for (const stock of newPicks) {
      // Skip pump & dump flagged stocks — too risky to paper trade
      if (stock.pumpAndDumpWarning) continue;
      // Apply slippage: in reality you'd pay ask price, not mid
      const entryPrice = +(stock.price * (1 + SLIPPAGE)).toFixed(4);
      const shares = +(POSITION_SIZE / entryPrice).toFixed(4);
      const trade: PaperTrade = {
        id: `${stock.ticker}_${Date.now()}`,
        ticker: stock.ticker,
        company: stock.company,
        entryPrice,
        shares,
        positionValue: POSITION_SIZE,
        targetPrice: stock.targets.oneWeek,
        stopLoss: stock.stopLoss,
        entryTimestamp: Date.now(),
        status: "open",
        scanReportId,
        convictionScore: stock.convictionScore,
      };
      await savePaperTrade(trade);
    }
  } catch (err) {
    console.error("Auto paper trade error:", err);
  }
}
