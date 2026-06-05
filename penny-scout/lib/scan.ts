// Shared scan logic used by both morning and evening routes
import { runScreener, runQuickScreener } from "@/lib/analysis/screener";
import { scoreStock, rankStocks } from "@/lib/analysis/scorer";
import { generateStockNarrative, generateExecutiveSummary } from "@/lib/analysis/claude";
import { saveReport, getLatestReport, getTodaysHourlyReports } from "@/lib/store";
import { sendDigestEmail } from "@/lib/email";
import { autoPaperTrade } from "@/lib/paper-trading";
import type { ScanReport, ScoredStock } from "@/lib/types";

// Check if market is currently open (9:30am–4pm ET, Mon–Fri)
function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  // Convert UTC to ET (UTC-4 in EDT, UTC-5 in EST)
  // Use a simple heuristic: ET = UTC - 4 (approx, handles most of year)
  const etHour = now.getUTCHours() - 4;
  const etMin = now.getUTCMinutes();
  const etMinutes = etHour * 60 + etMin;
  return etMinutes >= 9 * 60 + 30 && etMinutes < 16 * 60; // 9:30 to 16:00
}

export async function runHourlyScan(): Promise<ScanReport> {
  if (!isMarketOpen()) {
    throw new Error("Market is closed — hourly scan skipped");
  }

  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const hour = now.getUTCHours().toString().padStart(2, "0");
  const reportId = `${date}_hourly_${hour}`;

  // Quick scan: 20 stocks, fast sources only (no Finnhub fundamentals — they don't change hourly)
  const rawStocks = await runQuickScreener(20);
  if (rawStocks.length === 0) throw new Error("Screener returned no stocks");

  const scored = rawStocks.map(scoreStock);

  // AI narratives for top 10 only (faster)
  const top10 = [...scored].sort((a, b) => b.convictionScore - a.convictionScore).slice(0, 10);
  const narrativeResults = await Promise.allSettled(
    top10.map((s) => generateStockNarrative(s, undefined))
  );

  const enrichedStocks: ScoredStock[] = scored.map((s) => {
    const idx = top10.findIndex((t) => t.ticker === s.ticker);
    if (idx === -1) return s;
    const result = narrativeResults[idx];
    if (result.status !== "fulfilled") return s;
    return { ...s, ...result.value };
  });

  const { topToday, topWeek, topMonth, topLongTerm, topMultibaggers, topShortSqueeze, topPreBreakout, ranked } = rankStocks(enrichedStocks);

  const biggestCatalyst = enrichedStocks
    .flatMap((s) => s.recentNews ?? [])
    .filter((n) => n.sentiment === "positive")
    .sort((a, b) => b.datetime - a.datetime)[0]?.headline ?? "No major catalysts identified";

  const report: ScanReport = {
    id: reportId,
    date,
    scanType: "hourly",
    timestamp: Date.now(),
    rankings: {
      topTomorrow: topToday,
      topWeek,
      topMonth,
      topSwings: topWeek,
      topLongTerm,
      topMultibaggers,
      topShortSqueeze,
      topPreBreakout,
    },
    allStocks: enrichedStocks,
    executiveSummary: {
      topToday: topToday.slice(0, 5),
      topWeek: topWeek.slice(0, 5),
      topMonth: topMonth.slice(0, 5),
      topLongTerm: topLongTerm.slice(0, 5),
      topMultibaggers: topMultibaggers.slice(0, 5),
      biggestCatalyst,
      highestConvictionPick: ranked[0],
      newAdditions: [],
      removedStocks: [],
      upgrades: [],
      downgrades: [],
      newInsiderBuying: enrichedStocks
        .filter((s) => (s.recentInsiderTrades ?? []).some((t) => t.transactionType === "buy"))
        .map((s) => s.ticker)
        .slice(0, 5),
      newInstitutionalBuying: [],
      newRisks: enrichedStocks
        .filter((s) => s.riskRating === "Very High")
        .map((s) => `${s.ticker}: ${s.bearCase}`)
        .slice(0, 3),
    },
  };

  await saveReport(report).catch((e) => console.error("Failed to save hourly report:", e));

  // Auto paper-trade top pre-breakout + high conviction picks
  await autoPaperTrade(ranked.slice(0, 5), reportId);

  // Send hourly email with ALL stocks
  const now2 = new Date();
  const etHour2 = now2.getUTCHours() - 4;
  const timeLabel = `${etHour2 > 12 ? etHour2 - 12 : etHour2}${etHour2 >= 12 ? "pm" : "am"} ET`;
  const digestEmails = (process.env.DIGEST_EMAILS ?? process.env.DIGEST_EMAIL ?? "")
    .split(",").map((e) => e.trim()).filter(Boolean);
  if (digestEmails.length > 0 && process.env.GMAIL_USER) {
    const hourlyText = `Hourly scan at ${timeLabel}: ${enrichedStocks.length} stocks analyzed. Top pick: ${ranked[0]?.ticker} (score ${ranked[0]?.convictionScore}/100). ${(report.rankings.topPreBreakout?.length ?? 0)} pre-breakout candidates, ${(report.rankings.topShortSqueeze?.length ?? 0)} short squeeze candidates detected.`;
    await sendDigestEmail(report, hourlyText, digestEmails, timeLabel).catch((e) =>
      console.error("Failed to send hourly email:", e)
    );
  }

  return report;
}

export async function runScan(scanType: "morning" | "evening"): Promise<ScanReport> {
  const date = new Date().toISOString().split("T")[0];
  const reportId = `${date}_${scanType}`;

  // Get previous report for comparison
  const previousReport = await getLatestReport(scanType).catch(() => null);

  // Screen and enrich stocks
  const rawStocks = await runScreener(100);
  if (rawStocks.length === 0) throw new Error("Screener returned no stocks");

  // Score all stocks
  const scored = rawStocks.map(scoreStock);

  // Generate AI narratives for top 20 candidates
  const top20 = [...scored].sort((a, b) => b.convictionScore - a.convictionScore).slice(0, 20);
  const narrativeResults = await Promise.allSettled(
    top20.map((s) => generateStockNarrative(s, previousReport ?? undefined))
  );

  const enrichedStocks: ScoredStock[] = scored.map((s) => {
    const idx = top20.findIndex((t) => t.ticker === s.ticker);
    if (idx === -1) return s;
    const result = narrativeResults[idx];
    if (result.status !== "fulfilled") return s;
    return { ...s, ...result.value };
  });

  // Rank stocks
  const { topToday, topWeek, topMonth, topLongTerm, topMultibaggers, topShortSqueeze, topPreBreakout, ranked } = rankStocks(enrichedStocks);

  // Detect changes vs previous report
  const prevTickers = new Set(previousReport?.allStocks.map((s) => s.ticker) ?? []);
  const currTickers = new Set(enrichedStocks.map((s) => s.ticker));

  const newAdditions = enrichedStocks
    .filter((s) => !prevTickers.has(s.ticker) && s.convictionScore > 60)
    .map((s) => s.ticker);

  const removedStocks = (previousReport?.allStocks ?? [])
    .filter((s) => !currTickers.has(s.ticker) && s.convictionScore > 60)
    .map((s) => s.ticker);

  const upgrades = enrichedStocks
    .filter((s) => {
      const prev = previousReport?.allStocks.find((p) => p.ticker === s.ticker);
      return prev && s.convictionScore > prev.convictionScore + 5;
    })
    .map((s) => s.ticker);

  const downgrades = enrichedStocks
    .filter((s) => {
      const prev = previousReport?.allStocks.find((p) => p.ticker === s.ticker);
      return prev && s.convictionScore < prev.convictionScore - 5;
    })
    .map((s) => s.ticker);

  const newInsiderBuying = enrichedStocks
    .filter((s) => (s.recentInsiderTrades ?? []).some((t) => t.transactionType === "buy"))
    .map((s) => s.ticker)
    .slice(0, 5);

  const partialReport: Omit<ScanReport, "executiveSummary"> = {
    id: reportId,
    date,
    scanType,
    timestamp: Date.now(),
    rankings: {
      topTomorrow: topToday,
      topWeek,
      topMonth,
      topSwings: topWeek,
      topLongTerm,
      topMultibaggers,
      topShortSqueeze,
      topPreBreakout,
    },
    allStocks: enrichedStocks,
    previousReportId: previousReport?.id,
  };

  const summaryText = await generateExecutiveSummary(partialReport, previousReport ?? undefined).catch(
    () => `${scanType.toUpperCase()} scan complete. ${enrichedStocks.length} stocks analyzed. Top pick: ${ranked[0]?.ticker} with conviction score ${ranked[0]?.convictionScore}.`
  );

  const biggestCatalyst = enrichedStocks
    .flatMap((s) => s.recentNews ?? [])
    .filter((n) => n.sentiment === "positive")
    .sort((a, b) => b.datetime - a.datetime)[0]?.headline ?? "No major catalysts identified";

  const report: ScanReport = {
    ...partialReport,
    executiveSummary: {
      topToday: topToday.slice(0, 5),
      topWeek: topWeek.slice(0, 5),
      topMonth: topMonth.slice(0, 5),
      topLongTerm: topLongTerm.slice(0, 5),
      topMultibaggers: topMultibaggers.slice(0, 5),
      biggestCatalyst,
      highestConvictionPick: ranked[0],
      newAdditions,
      removedStocks,
      upgrades,
      downgrades,
      newInsiderBuying,
      newInstitutionalBuying: [],
      newRisks: enrichedStocks
        .filter((s) => s.riskRating === "Very High")
        .map((s) => `${s.ticker}: ${s.bearCase}`)
        .slice(0, 3),
    },
  };

  // Save report
  await saveReport(report).catch((e) => console.error("Failed to save report:", e));

  // Auto paper-trade top picks
  await autoPaperTrade(ranked.slice(0, 10), reportId);

  // Send email digest to all configured recipients
  const digestEmails = (process.env.DIGEST_EMAILS ?? process.env.DIGEST_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (digestEmails.length > 0 && process.env.GMAIL_USER) {
    await sendDigestEmail(report, summaryText, digestEmails).catch((e) =>
      console.error("Failed to send email:", e)
    );
  }

  return report;
}

// ── End-of-day compile: merge all hourly scans into one big daily report ──────
export async function compileDailySummary(): Promise<ScanReport> {
  const date = new Date().toISOString().split("T")[0];

  // Fetch all of today's hourly reports
  const hourlyReports = await getTodaysHourlyReports(date);
  if (hourlyReports.length === 0) {
    throw new Error("No hourly reports found for today — cannot compile");
  }

  // Merge all stocks, keeping the most recent version of each ticker
  const stockMap = new Map<string, ScoredStock>();
  for (const r of hourlyReports) {
    for (const s of r.allStocks) {
      const existing = stockMap.get(s.ticker);
      if (!existing || r.timestamp > (hourlyReports.find((h) => h.allStocks.some((x) => x.ticker === s.ticker && x === existing))?.timestamp ?? 0)) {
        stockMap.set(s.ticker, s);
      }
    }
  }

  const mergedStocks = Array.from(stockMap.values());
  console.log(`Daily compile: merged ${mergedStocks.length} unique stocks from ${hourlyReports.length} hourly scans`);

  // Re-rank the merged set
  const { topToday, topWeek, topMonth, topLongTerm, topMultibaggers, topShortSqueeze, topPreBreakout, ranked } = rankStocks(mergedStocks);

  const biggestCatalyst = mergedStocks
    .flatMap((s) => s.recentNews ?? [])
    .filter((n) => n.sentiment === "positive")
    .sort((a, b) => b.datetime - a.datetime)[0]?.headline ?? "No major catalysts identified";

  const reportId = `${date}_daily`;
  const report: ScanReport = {
    id: reportId,
    date,
    scanType: "morning", // treated as the main daily report the website shows
    timestamp: Date.now(),
    rankings: {
      topTomorrow: topToday,
      topWeek,
      topMonth,
      topSwings: topWeek,
      topLongTerm,
      topMultibaggers,
      topShortSqueeze,
      topPreBreakout,
    },
    allStocks: mergedStocks,
    executiveSummary: {
      topToday: topToday.slice(0, 5),
      topWeek: topWeek.slice(0, 5),
      topMonth: topMonth.slice(0, 5),
      topLongTerm: topLongTerm.slice(0, 5),
      topMultibaggers: topMultibaggers.slice(0, 5),
      biggestCatalyst,
      highestConvictionPick: ranked[0],
      newAdditions: [],
      removedStocks: [],
      upgrades: [],
      downgrades: [],
      newInsiderBuying: mergedStocks
        .filter((s) => (s.recentInsiderTrades ?? []).some((t) => t.transactionType === "buy"))
        .map((s) => s.ticker)
        .slice(0, 5),
      newInstitutionalBuying: [],
      newRisks: mergedStocks
        .filter((s) => s.riskRating === "Very High")
        .map((s) => `${s.ticker}: ${s.bearCase}`)
        .slice(0, 3),
    },
    previousReportId: hourlyReports[hourlyReports.length - 1]?.id,
  };

  await saveReport(report).catch((e) => console.error("Failed to save daily compile:", e));

  console.log(`Daily compile saved: ${reportId} with ${mergedStocks.length} stocks from ${hourlyReports.length} scans`);
  return report;
}
