import type { StockData, ScoredStock } from "@/lib/types";

// ── Pump & Dump Detection ────────────────────────────────────────────────────
// Classic pump pattern: tiny float + sudden volume explosion + heavy social buzz
// + no real revenue/fundamentals. These get flagged, NOT filtered — you still
// see them but with a warning so you can decide with eyes open.
function detectPumpAndDump(s: StockData): boolean {
  const floatM = (s.float ?? 1e9) / 1e6;
  const rv = s.relativeVolume ?? 1;
  const socialHype =
    s.stockTwitsBuzzLevel === "high" || s.redditBuzzLevel === "high";
  const noRevenue = !s.revenue || s.revenue < 1_000_000; // essentially no real business
  const massiveVolumeSpike = rv > 5;
  const tinyFloat = floatM < 10;

  // Require 3+ signals to flag — reduces false positives
  let signals = 0;
  if (tinyFloat) signals++;
  if (massiveVolumeSpike) signals++;
  if (socialHype) signals++;
  if (noRevenue) signals++;
  if ((s.recentSECFilings?.length ?? 0) === 0 && rv > 8) signals++; // huge move, no SEC filing = no real catalyst
  return signals >= 3;
}

interface ScoreBreakdown {
  financialStrength: number;
  revenueGrowth: number;
  profitability: number;
  cashPosition: number;
  insiderOwnership: number;
  institutionalOwnership: number;
  technicalStrength: number;
  momentum: number;
  newsAndCatalysts: number;
  industryTailwinds: number;
  total: number;
}

const HIGH_GROWTH_SECTORS = [
  "Technology", "Semiconductors", "Biotechnology", "Cybersecurity",
  "Artificial Intelligence", "Defense", "Aerospace", "Quantum Computing",
  "Nuclear Energy", "Space Technology", "Robotics", "Fintech", "Cloud",
];

function scoreFinancialStrength(s: StockData): number {
  let score = 10;
  if (s.currentRatio && s.currentRatio > 2) score += 4;
  else if (s.currentRatio && s.currentRatio > 1) score += 2;
  else if (s.currentRatio && s.currentRatio < 1) score -= 3;
  if (s.debtToEquity !== undefined && s.debtToEquity < 0.5) score += 3;
  else if (s.debtToEquity && s.debtToEquity > 2) score -= 3;
  if (s.grossMargin && s.grossMargin > 50) score += 3;
  return Math.max(0, Math.min(20, score));
}

function scoreRevenueGrowth(s: StockData): number {
  const g = s.revenueGrowthYoY;
  if (!g) return 5;
  if (g > 50) return 15;
  if (g > 30) return 13;
  if (g > 20) return 11;
  if (g > 10) return 9;
  if (g > 0) return 7;
  if (g > -10) return 4;
  return 2;
}

function scoreProfitability(s: StockData): number {
  let score = 5;
  if (s.netMargin !== undefined) {
    if (s.netMargin > 20) score = 10;
    else if (s.netMargin > 10) score = 8;
    else if (s.netMargin > 0) score = 6;
    else if (s.netMargin > -20) score = 4;
    else score = 2;
  }
  if (s.freeCashFlow && s.freeCashFlow > 0) score = Math.min(10, score + 1);
  return score;
}

function scoreCashPosition(s: StockData): number {
  if (!s.cash) return 5;
  const runway = s.cashBurnRate && s.cashBurnRate < 0
    ? s.cash / Math.abs(s.cashBurnRate)
    : 999;
  if (runway > 24) return 10;
  if (runway > 12) return 7;
  if (runway > 6) return 4;
  return 2;
}

function scoreInsiderOwnership(s: StockData): number {
  const pct = s.insiderOwnership ?? 0;
  if (pct > 20) return 10;
  if (pct > 10) return 8;
  if (pct > 5) return 6;
  return 4;
}

function scoreInstitutionalOwnership(s: StockData): number {
  const pct = s.institutionalOwnership ?? 0;
  if (pct > 50) return 10;
  if (pct > 30) return 8;
  if (pct > 15) return 6;
  return 4;
}

function scoreTechnicalStrength(s: StockData): number {
  let score = 5;
  if (s.trend === "uptrend") score += 3;
  else if (s.trend === "downtrend") score -= 2;
  if (s.breakout) score += 2;
  if (s.rsi14 && s.rsi14 > 50 && s.rsi14 < 70) score += 1;
  if (s.rsi14 && s.rsi14 > 70) score -= 1; // overbought
  if (s.rsi14 && s.rsi14 < 30) score -= 1; // oversold (could be reversal though)
  return Math.max(0, Math.min(10, score));
}

function scoreMomentum(s: StockData): number {
  const rv = s.relativeVolume ?? 1;
  if (rv > 3) return 5;
  if (rv > 2) return 4;
  if (rv > 1.5) return 3;
  return 2;
}

function scoreNewsAndCatalysts(s: StockData): number {
  let score = 2;
  const posNews = (s.recentNews ?? []).filter((n) => n.sentiment === "positive").length;
  const insiderBuys = (s.recentInsiderTrades ?? []).filter((t) => t.transactionType === "buy").length;
  score += Math.min(3, posNews);
  score += Math.min(2, insiderBuys);
  return Math.min(5, score);
}

function scorePreBreakout(s: StockData): number {
  let score = 0;

  // LOW FLOAT = biggest driver of explosive moves
  const floatM = (s.float ?? 1e9) / 1e6;
  if (floatM < 2)       score += 9;
  else if (floatM < 5)  score += 7;
  else if (floatM < 10) score += 5;
  else if (floatM < 20) score += 3;
  else if (floatM < 50) score += 1;

  // VOLUME BUILDING — quiet accumulation before the explosion
  const cvgd = s.consecutiveVolumeGrowthDays ?? 0;
  if (cvgd >= 4) score += 6;
  else if (cvgd >= 3) score += 4;
  else if (cvgd >= 2) score += 2;
  else if (cvgd >= 1) score += 1;

  if (s.volumeTrend === "building") score += 2;

  // RELATIVE VOLUME — elevated but not yet exploded (1.5x–8x = building, >8x = already popped)
  const rv = s.relativeVolume ?? 1;
  if (rv >= 1.5 && rv < 3)  score += 3;
  else if (rv >= 3 && rv < 8) score += 4;
  else if (rv >= 8)           score += 1; // already running, less predictive

  // PRICE COILING — tight ATR = spring loading
  const atr = s.atrPercent ?? 10;
  if (atr < 2)       score += 4;
  else if (atr < 3)  score += 3;
  else if (atr < 5)  score += 2;
  else if (atr < 7)  score += 1;

  // NEAR RESISTANCE — about to break out
  const dist = s.distFromResistancePct ?? 100;
  if (dist < 1)      score += 5;
  else if (dist < 3) score += 3;
  else if (dist < 5) score += 2;
  else if (dist < 8) score += 1;

  // UPCOMING CATALYST — earnings, news = ignition
  if (s.hasUpcomingEarnings) score += 5;
  if ((s.recentInsiderTrades ?? []).some((t) => t.transactionType === "buy")) score += 2;
  if ((s.recentNews ?? []).filter((n) => n.sentiment === "positive").length >= 2) score += 2;

  // SHORT INTEREST — squeeze fuel
  if ((s.shortInterest ?? 0) > 20) score += 3;
  else if ((s.shortInterest ?? 0) > 10) score += 2;

  // RSI in "loading zone" (40–65) — not yet overbought, momentum building
  if (s.rsi14 && s.rsi14 >= 40 && s.rsi14 <= 65) score += 2;

  // SOCIAL BUZZ — people talking about it before it moves
  if (s.stockTwitsBuzzLevel === "high") score += 5;
  else if (s.stockTwitsBuzzLevel === "medium") score += 3;
  else if (s.stockTwitsBuzzLevel === "low") score += 1;
  if ((s.stockTwitsBullishPct ?? 50) > 75) score += 2; // heavily bullish sentiment
  if (s.redditBuzzLevel === "high") score += 4;
  else if (s.redditBuzzLevel === "medium") score += 2;
  else if (s.redditBuzzLevel === "low") score += 1;
  if ((s.redditUpvotes ?? 0) > 500) score += 2; // viral post

  // SEC 8-K FILING — material event in last 14 days = real catalyst
  if ((s.recentSECFilings?.length ?? 0) > 0) score += 5;

  return Math.min(35, score); // bumped cap to 35 to accommodate social signals
}

function scoreShortSqueeze(s: StockData): number {
  let score = 0;
  const si = s.shortInterest ?? 0;
  if (si > 25) score += 5;
  else if (si > 20) score += 4;
  else if (si > 15) score += 3;
  else if (si > 10) score += 2;
  else if (si > 5) score += 1;

  const rv = s.relativeVolume ?? 1;
  if (rv > 3) score += 4;
  else if (rv > 2) score += 3;
  else if (rv > 1.5) score += 2;
  else if (rv > 1) score += 1;

  if (s.breakout) score += 3;
  if (s.trend === "uptrend") score += 2;

  const floatM = (s.float ?? 1e9) / 1e6;
  if (floatM < 5) score += 4;
  else if (floatM < 10) score += 3;
  else if (floatM < 20) score += 2;
  else if (floatM < 50) score += 1;

  // Social buzz drives squeezes (Reddit/WallStreetBets effect)
  if (s.stockTwitsBuzzLevel === "high" || s.redditBuzzLevel === "high") score += 3;
  if ((s.stockTwitsBullishPct ?? 50) > 70) score += 2;

  return Math.min(25, score);
}

function scoreIndustryTailwinds(s: StockData): number {
  const isHighGrowth = HIGH_GROWTH_SECTORS.some(
    (sec) => s.sector?.includes(sec) || s.industry?.includes(sec)
  );
  return isHighGrowth ? 5 : 3;
}

function assessRisk(s: StockData): "Low" | "Medium" | "High" | "Very High" {
  let risk = 0;
  if (s.marketCap < 50_000_000) risk += 3;
  else if (s.marketCap < 200_000_000) risk += 2;
  else if (s.marketCap < 500_000_000) risk += 1;
  if (s.shortInterest && s.shortInterest > 20) risk += 2;
  if (s.debtToEquity && s.debtToEquity > 3) risk += 2;
  if (s.cashBurnRate && s.cash && Math.abs(s.cashBurnRate) > 0) {
    const runway = s.cash / Math.abs(s.cashBurnRate);
    if (runway < 6) risk += 3;
    else if (runway < 12) risk += 1;
  }
  if (s.revenueGrowthYoY && s.revenueGrowthYoY < -20) risk += 1;

  if (risk >= 6) return "Very High";
  if (risk >= 4) return "High";
  if (risk >= 2) return "Medium";
  return "Low";
}

function assessFinancialHealth(s: StockData): "Excellent" | "Good" | "Average" | "Weak" {
  let pts = 0;
  if (s.currentRatio && s.currentRatio > 2) pts += 2;
  if (s.debtToEquity !== undefined && s.debtToEquity < 1) pts += 2;
  if (s.grossMargin && s.grossMargin > 40) pts += 2;
  if (s.freeCashFlow && s.freeCashFlow > 0) pts += 2;
  if (s.revenueGrowthYoY && s.revenueGrowthYoY > 10) pts += 2;
  if (pts >= 8) return "Excellent";
  if (pts >= 5) return "Good";
  if (pts >= 3) return "Average";
  return "Weak";
}

function estimateTargets(s: StockData, score: number) {
  const base = s.price;
  const multiplier = score / 50;

  // Boost multiplier for small-cap high-growth stocks — they have outsized upside
  const isHighGrowth = HIGH_GROWTH_SECTORS.some(
    (sec) => s.sector?.includes(sec) || s.industry?.includes(sec)
  );
  const smallCap = s.marketCap < 300_000_000;
  const growthBoost = (isHighGrowth && smallCap) ? 1.5 : smallCap ? 1.2 : 1.0;

  return {
    oneWeek:   +(base * (1 + 0.08  * multiplier)).toFixed(2),              // up to ~16%
    oneMonth:  +(base * (1 + 0.25  * multiplier)).toFixed(2),              // up to ~50%
    oneYear:   +(base * (1 + 1.5   * multiplier * growthBoost)).toFixed(2), // up to ~450% for small-cap growth
    threeYear: +(base * (1 + 4.5   * multiplier * growthBoost)).toFixed(2), // multibagger range
  };
}

// scoreStock now accepts optional market context flags set at scan time
export function scoreStock(s: StockData, opts: { marketBearish?: boolean } = {}): ScoredStock {
  const breakdown: ScoreBreakdown = {
    financialStrength: scoreFinancialStrength(s),
    revenueGrowth: scoreRevenueGrowth(s),
    profitability: scoreProfitability(s),
    cashPosition: scoreCashPosition(s),
    insiderOwnership: scoreInsiderOwnership(s),
    institutionalOwnership: scoreInstitutionalOwnership(s),
    technicalStrength: scoreTechnicalStrength(s),
    momentum: scoreMomentum(s),
    newsAndCatalysts: scoreNewsAndCatalysts(s),
    industryTailwinds: scoreIndustryTailwinds(s),
    total: 0,
  };
  breakdown.total = Math.round(
    breakdown.financialStrength +
    breakdown.revenueGrowth +
    breakdown.profitability +
    breakdown.cashPosition +
    breakdown.insiderOwnership +
    breakdown.institutionalOwnership +
    breakdown.technicalStrength +
    breakdown.momentum +
    breakdown.newsAndCatalysts +
    breakdown.industryTailwinds
  );

  const riskRating = assessRisk(s);
  const financialHealthAssessment = assessFinancialHealth(s);

  // ── Pump & Dump check ──────────────────────────────────────────────────────
  const pumpAndDumpWarning = detectPumpAndDump(s);
  // Penalise score hard — still shows up but ranked lower
  if (pumpAndDumpWarning) breakdown.total = Math.max(10, breakdown.total - 25);

  // ── Bearish market regime penalty ─────────────────────────────────────────
  const marketRegimePenalty = !!opts.marketBearish;
  if (marketRegimePenalty) breakdown.total = Math.max(5, breakdown.total - 15);

  // ── Short squeeze quality filter ──────────────────────────────────────────
  // Many penny stocks have high short interest because they're genuinely bad
  // companies. Legitimate squeezes need some business quality.
  const squeezeScore = scoreShortSqueeze(s);
  const financiallyWeak = financialHealthAssessment === "Weak" &&
    !s.revenueGrowthYoY && (s.shortInterest ?? 0) > 20;
  const adjustedSqueezeScore = financiallyWeak ? Math.floor(squeezeScore * 0.5) : squeezeScore;

  const modelTargets = estimateTargets(s, breakdown.total);

  // Use real analyst 1Y target if available, otherwise fall back to model estimate
  const hasAnalystTarget = !!(s.analystPriceTarget && s.analystPriceTarget > 0);
  const targets = {
    oneWeek:   modelTargets.oneWeek,
    oneMonth:  modelTargets.oneMonth,
    oneYear:   hasAnalystTarget ? s.analystPriceTarget! : modelTargets.oneYear,
    threeYear: modelTargets.threeYear,
  };

  // Risk-adjusted probability — pump stocks capped at 30%
  const riskPenalty = { Low: 0, Medium: 5, High: 15, "Very High": 25 }[riskRating];
  const rawProbability = Math.max(10, Math.min(90, breakdown.total - riskPenalty));
  const probabilityOfSuccess = pumpAndDumpWarning ? Math.min(30, rawProbability) : rawProbability;

  const entryPrice = s.price;

  // ── ATR-based stop loss ───────────────────────────────────────────────────
  // Fixed % stops get hit by normal penny-stock daily noise.
  // Use 2× the 14-day ATR as the stop distance, clamped to [8%, 30%].
  // This means the stop is only triggered by a move LARGER than normal volatility.
  const atrPct = s.atrPercent ?? (riskRating === "Low" ? 4 : riskRating === "Medium" ? 6 : 10);
  const stopPct = Math.max(0.08, Math.min(0.30, (atrPct * 2) / 100));
  const stopLoss = +(s.price * (1 - stopPct)).toFixed(2);

  const expectedReturn = +((targets.oneYear - s.price) / s.price * 100).toFixed(1);

  return {
    ...s,
    convictionScore: breakdown.total,
    riskRating,
    financialHealthAssessment,
    bullCase: "",
    bearCase: "",
    targets,
    entryPrice,
    stopLoss,
    expectedReturn,
    probabilityOfSuccess,
    hasAnalystTarget,
    shortSqueezeScore: adjustedSqueezeScore,
    preBreakoutScore: scorePreBreakout(s),
    pumpAndDumpWarning,
    marketRegimePenalty,
    timeframe: "month",
  };
}

export function rankStocks(stocks: ScoredStock[]) {
  const byScore = [...stocks].sort((a, b) => b.convictionScore - a.convictionScore);

  const topToday = byScore
    .filter((s) => s.relativeVolume && s.relativeVolume > 1.5 && s.trend === "uptrend")
    .slice(0, 5);

  const topWeek = byScore
    .filter((s) => s.breakout || (s.rsi14 && s.rsi14 > 50))
    .slice(0, 5);

  const topMonth = byScore.slice(0, 5);

  const topLongTerm = byScore
    .filter((s) => s.financialHealthAssessment === "Excellent" || s.financialHealthAssessment === "Good")
    .slice(0, 5);

  const topMultibaggers = byScore
    .filter((s) => {
      const isHighGrowth = HIGH_GROWTH_SECTORS.some(
        (sec) => s.sector?.includes(sec) || s.industry?.includes(sec)
      );
      return isHighGrowth && s.marketCap < 300_000_000 && s.convictionScore > 50;
    })
    .slice(0, 5);

  const topShortSqueeze = [...stocks]
    .filter((s) => (s.shortInterest ?? 0) > 8 && (s.relativeVolume ?? 0) > 1.2)
    .sort((a, b) => (b.shortSqueezeScore ?? 0) - (a.shortSqueezeScore ?? 0))
    .slice(0, 10);

  // Pre-breakout: NOT already exploding (rv < 10), but signals building
  const topPreBreakout = [...stocks]
    .filter((s) => (s.preBreakoutScore ?? 0) >= 8 && (s.relativeVolume ?? 0) < 10)
    .sort((a, b) => (b.preBreakoutScore ?? 0) - (a.preBreakoutScore ?? 0))
    .slice(0, 15);

  return { topToday, topWeek, topMonth, topLongTerm, topMultibaggers, topShortSqueeze, topPreBreakout, ranked: byScore };
}
