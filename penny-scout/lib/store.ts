// Firebase Realtime Database via REST API — reliable in serverless (no SDK, no WebSocket)
// Open rules on socle-journal RTDB allow unauthenticated reads/writes
import type { ScanReport, PaperTrade } from "@/lib/types";

const RTDB = "https://socle-journal-default-rtdb.firebaseio.com";

async function rtdbSet(path: string, data: unknown): Promise<void> {
  const res = await fetch(`${RTDB}/${path}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`RTDB write failed: ${res.status} ${await res.text()}`);
}

async function rtdbGet(path: string): Promise<unknown> {
  const res = await fetch(`${RTDB}/${path}.json`);
  if (!res.ok) throw new Error(`RTDB read failed: ${res.status}`);
  return res.json();
}

/**
 * Save a completed scan report to the database
 */
export async function saveReport(report: ScanReport): Promise<void> {
  await rtdbSet(`scanReports/${report.id}`, report);
}

/**
 * Get the most recent scan report, optionally filtered by type
 */
export async function getLatestReport(scanType?: "morning" | "evening" | "hourly"): Promise<ScanReport | null> {
  const data = await rtdbGet("scanReports");
  if (!data) return null;

  const reports = Object.values(data as Record<string, ScanReport>);
  const filtered = scanType ? reports.filter((r) => r.scanType === scanType) : reports;
  if (filtered.length === 0) return null;

  return filtered.sort((a, b) => b.timestamp - a.timestamp)[0];
}

/**
 * Fetch a specific scan report by ID
 */
export async function getReportById(id: string): Promise<ScanReport | null> {
  const data = await rtdbGet(`scanReports/${id}`);
  return data ? (data as ScanReport) : null;
}

/**
 * Get the N most recent scan reports (default: 10)
 */
export async function getRecentReports(n = 10): Promise<ScanReport[]> {
  const data = await rtdbGet("scanReports");
  if (!data) return [];
  const reports = Object.values(data as Record<string, ScanReport>);
  return reports.sort((a, b) => b.timestamp - a.timestamp).slice(0, n);
}

// Latest non-hourly report — used to cache fundamentals for quick hourly scans
export async function getLatestDailyReport(): Promise<ScanReport | null> {
  const data = await rtdbGet("scanReports");
  if (!data) return null;
  const reports = Object.values(data as Record<string, ScanReport>)
    .filter((r) => r.scanType !== "hourly")
    .sort((a, b) => b.timestamp - a.timestamp);
  return reports[0] ?? null;
}

export async function getTodaysHourlyReports(date: string): Promise<ScanReport[]> {
  const data = await rtdbGet("scanReports");
  if (!data) return [];
  return Object.values(data as Record<string, ScanReport>)
    .filter((r) => r.scanType === "hourly" && r.date === date)
    .sort((a, b) => a.timestamp - b.timestamp);
}

// ── Paper Trading ──────────────────────────────────────────────────────────────

async function rtdbPatch(path: string, data: unknown): Promise<void> {
  const res = await fetch(`${RTDB}/${path}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`RTDB patch failed: ${res.status}`);
}

/**
 * Save a new paper trade (simulated position)
 */
export async function savePaperTrade(trade: PaperTrade): Promise<void> {
  await rtdbSet(`paperTrades/${trade.id}`, trade);
}

/**
 * Get all paper trades, sorted by entry timestamp (newest first)
 */
export async function getPaperTrades(): Promise<PaperTrade[]> {
  const data = await rtdbGet("paperTrades");
  if (!data) return [];
  return Object.values(data as Record<string, PaperTrade>)
    .sort((a, b) => b.entryTimestamp - a.entryTimestamp);
}

/**
 * Get all currently open (unclosed) paper trades
 */
export async function getOpenPositions(): Promise<PaperTrade[]> {
  const trades = await getPaperTrades();
  return trades.filter((t) => t.status === "open");
}

/**
 * Close an open paper trade with exit price and reason
 * Calculates P&L and updates trade status
 */
export async function closePaperTrade(
  id: string,
  exitPrice: number,
  reason: PaperTrade["closeReason"]
): Promise<void> {
  const trade = await rtdbGet(`paperTrades/${id}`) as PaperTrade | null;
  if (!trade) return;
  const pnl = (exitPrice - trade.entryPrice) * trade.shares;
  const pnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
  await rtdbPatch(`paperTrades/${id}`, {
    status: "closed",
    exitPrice,
    exitTimestamp: Date.now(),
    pnl: +pnl.toFixed(2),
    pnlPercent: +pnlPercent.toFixed(2),
    closeReason: reason,
  });
}

export async function getStockHistory(ticker: string, days = 30): Promise<unknown[]> {
  const since = Date.now() - days * 86400000;
  const data = await rtdbGet("scanReports");
  if (!data) return [];

  const reports = Object.values(data as Record<string, ScanReport>);
  return reports
    .filter((r) => r.timestamp >= since)
    .sort((a, b) => a.timestamp - b.timestamp)
    .flatMap((r) => {
      const stock = r.allStocks?.find((s) => s.ticker === ticker);
      return stock ? [{ date: r.date, scanType: r.scanType, ...stock }] : [];
    });
}
