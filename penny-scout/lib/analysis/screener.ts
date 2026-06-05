import { getNasdaqPennyStocks } from "@/lib/data/yahoo";
import { getAggregates, getTickerDetails, calculateTechnicals } from "@/lib/data/polygon";
import { getBasicFinancials, getCompanyProfile, getCompanyNews, getInsiderTransactions, getRecommendations, getPriceTarget, getEarningsCalendar, parseFinancials, parseSentiment, parseInsiderTrades } from "@/lib/data/finnhub";
import { getStockTwitsData } from "@/lib/data/stocktwits";
import { getRedditMentions } from "@/lib/data/reddit";
import { getRecent8K } from "@/lib/data/edgar";
import type { StockData } from "@/lib/types";

// Enrich top N candidates with full data
export async function enrichStock(ticker: string, price: number, volume: number): Promise<StockData | null> {
  try {
    // Parallel fetch all data sources
    const [profile, metrics, news, insiders, recs, priceTarget, earnings, candles, details, stocktwits, reddit, sec8k] = await Promise.allSettled([
      getCompanyProfile(ticker),
      getBasicFinancials(ticker),
      getCompanyNews(ticker),
      getInsiderTransactions(ticker),
      getRecommendations(ticker),
      getPriceTarget(ticker),
      getEarningsCalendar(ticker),
      getAggregates(ticker, 60),
      getTickerDetails(ticker),
      getStockTwitsData(ticker),
      getRedditMentions(ticker),
      getRecent8K(ticker),
    ]);

    const profileData = profile.status === "fulfilled" ? profile.value : null;
    const metricsData = metrics.status === "fulfilled" ? metrics.value : null;
    const newsData = news.status === "fulfilled" ? news.value : [];
    const insidersData = insiders.status === "fulfilled" ? insiders.value : [];
    const recsData = recs.status === "fulfilled" ? recs.value : null;
    const priceTargetData = priceTarget.status === "fulfilled" ? priceTarget.value : null;
    const earningsData = earnings.status === "fulfilled" ? earnings.value : [];
    const candlesData = candles.status === "fulfilled" ? candles.value : [];
    const stocktwitsData = stocktwits.status === "fulfilled" ? stocktwits.value : null;
    const redditData = reddit.status === "fulfilled" ? reddit.value : null;
    const sec8kData = sec8k.status === "fulfilled" ? sec8k.value : [];
    const detailsData = details.status === "fulfilled" ? details.value : null;

    const financials = parseFinancials(profileData, metricsData);
    const technicals = candlesData.length > 0 ? calculateTechnicals(candlesData) : null;
    const parsedNews = parseSentiment(newsData);
    const parsedInsiders = parseInsiderTrades(insidersData);

    // Analyst rating from recommendations
    let analystRating: string | undefined;
    if (recsData) {
      const { strongBuy = 0, buy = 0, hold = 0, sell = 0, strongSell = 0 } = recsData;
      const total = strongBuy + buy + hold + sell + strongSell;
      if (total > 0) {
        const score = (strongBuy * 5 + buy * 4 + hold * 3 + sell * 2 + strongSell * 1) / total;
        analystRating = score > 4 ? "Strong Buy" : score > 3.5 ? "Buy" : score > 2.5 ? "Hold" : "Sell";
      }
    }

    // Real analyst price targets from Finnhub consensus
    const analystPriceTarget: number | undefined =
      priceTargetData?.targetMean > 0 ? +priceTargetData.targetMean.toFixed(2) : undefined;
    const analystTargetHigh: number | undefined =
      priceTargetData?.targetHigh > 0 ? +priceTargetData.targetHigh.toFixed(2) : undefined;
    const analystTargetLow: number | undefined =
      priceTargetData?.targetLow > 0 ? +priceTargetData.targetLow.toFixed(2) : undefined;
    const analystCount: number | undefined =
      priceTargetData?.numberOfAnalysts > 0 ? priceTargetData.numberOfAnalysts : undefined;

    const company = profileData?.name ?? detailsData?.name ?? ticker;
    const sector = profileData?.finnhubIndustry ?? detailsData?.sic_description ?? "Unknown";

    const resolvedMarketCap = financials.marketCap ?? price * (financials.sharesOutstanding ?? 1);

    return {
      ticker,
      company,
      sector,
      industry: profileData?.finnhubIndustry ?? sector,
      price,
      ...financials,
      marketCap: resolvedMarketCap,
      volume,
      avgVolume: technicals?.avgVolume ?? undefined,
      relativeVolume: technicals?.relativeVolume ?? undefined,
      rsi14: technicals?.rsi14 ?? undefined,
      ma20: technicals?.ma20 ?? undefined,
      ma50: technicals?.ma50 ?? undefined,
      ma200: technicals?.ma200 ?? undefined,
      support: technicals?.support ?? undefined,
      resistance: technicals?.resistance ?? undefined,
      trend: technicals?.trend ?? undefined,
      breakout: technicals?.breakout ?? undefined,
      volumeTrend: technicals?.volumeTrend ?? undefined,
      consecutiveVolumeGrowthDays: technicals?.consecutiveVolumeGrowthDays ?? 0,
      atrPercent: technicals?.atrPercent ?? undefined,
      distFromResistancePct: technicals?.distFromResistancePct ?? undefined,
      hasUpcomingEarnings: Array.isArray(earningsData) ? earningsData.length > 0 : false,
      analystRating,
      analystPriceTarget,
      analystTargetHigh,
      analystTargetLow,
      analystCount,
      // Social signals
      stockTwitsBullishPct: stocktwitsData?.bullishPct,
      stockTwitsMessageCount: stocktwitsData?.messageCount,
      stockTwitsBuzzLevel: stocktwitsData?.buzzLevel,
      stockTwitsTopMessage: stocktwitsData?.topMessage,
      redditMentions: redditData?.totalMentions,
      redditUpvotes: redditData?.totalUpvotes,
      redditBuzzLevel: redditData?.buzzLevel,
      redditTopPost: redditData?.topPost,
      recentSECFilings: sec8kData,
      recentNews: parsedNews,
      recentInsiderTrades: parsedInsiders,
      ceo: profileData?.name ?? undefined,
      headquarters: profileData?.country ?? undefined,
    };
  } catch (err) {
    console.error(`Failed to enrich ${ticker}:`, err);
    return null;
  }
}

// QUICK enrich — only fast sources (no Finnhub fundamentals/news/insiders).
// Used for hourly scans to stay well under the 300s timeout.
// Skips: getBasicFinancials, getCompanyNews, getInsiderTransactions, getRecommendations, getPriceTarget, getEarningsCalendar
// Keeps: getCompanyProfile (name/sector), Polygon candles+details, StockTwits, Reddit, EDGAR 8-K
export async function enrichStockQuick(ticker: string, price: number, volume: number): Promise<StockData | null> {
  try {
    const [profile, candles, details, stocktwits, reddit, sec8k] = await Promise.allSettled([
      getCompanyProfile(ticker),
      getAggregates(ticker, 60),
      getTickerDetails(ticker),
      getStockTwitsData(ticker),
      getRedditMentions(ticker),
      getRecent8K(ticker),
    ]);

    const profileData = profile.status === "fulfilled" ? profile.value : null;
    const candlesData = candles.status === "fulfilled" ? candles.value : [];
    const detailsData = details.status === "fulfilled" ? details.value : null;
    const stocktwitsData = stocktwits.status === "fulfilled" ? stocktwits.value : null;
    const redditData = reddit.status === "fulfilled" ? reddit.value : null;
    const sec8kData = sec8k.status === "fulfilled" ? sec8k.value : [];

    const technicals = candlesData.length > 0 ? calculateTechnicals(candlesData) : null;
    const company = profileData?.name ?? detailsData?.name ?? ticker;
    const sector = profileData?.finnhubIndustry ?? detailsData?.sic_description ?? "Unknown";

    return {
      ticker,
      company,
      sector,
      industry: sector,
      price,
      marketCap: price * 1_000_000, // rough placeholder without fundamentals
      volume,
      avgVolume: technicals?.avgVolume ?? undefined,
      relativeVolume: technicals?.relativeVolume ?? undefined,
      rsi14: technicals?.rsi14 ?? undefined,
      ma20: technicals?.ma20 ?? undefined,
      ma50: technicals?.ma50 ?? undefined,
      ma200: technicals?.ma200 ?? undefined,
      support: technicals?.support ?? undefined,
      resistance: technicals?.resistance ?? undefined,
      trend: technicals?.trend ?? undefined,
      breakout: technicals?.breakout ?? undefined,
      volumeTrend: technicals?.volumeTrend ?? undefined,
      consecutiveVolumeGrowthDays: technicals?.consecutiveVolumeGrowthDays ?? 0,
      atrPercent: technicals?.atrPercent ?? undefined,
      distFromResistancePct: technicals?.distFromResistancePct ?? undefined,
      hasUpcomingEarnings: false,
      stockTwitsBullishPct: stocktwitsData?.bullishPct,
      stockTwitsMessageCount: stocktwitsData?.messageCount,
      stockTwitsBuzzLevel: stocktwitsData?.buzzLevel,
      stockTwitsTopMessage: stocktwitsData?.topMessage,
      redditMentions: redditData?.totalMentions,
      redditUpvotes: redditData?.totalUpvotes,
      redditBuzzLevel: redditData?.buzzLevel,
      redditTopPost: redditData?.topPost,
      recentSECFilings: sec8kData,
    };
  } catch (err) {
    console.error(`Failed to quick-enrich ${ticker}:`, err);
    return null;
  }
}

// Quick screener for hourly scans — no Finnhub rate-limit pauses, runs in ~20-30s
export async function runQuickScreener(maxStocks = 20): Promise<StockData[]> {
  console.log("Running quick screener...");
  const bars = await getNasdaqPennyStocks();
  console.log(`Found ${bars.length} NASDAQ penny stocks`);

  const candidates = bars
    .map((s) => ({
      ticker: s.ticker,
      price: s.price,
      volume: s.volume,
      relVol: s.avgVolume > 0 ? s.volume / s.avgVolume : 1,
    }))
    .sort((a, b) => b.relVol - a.relVol)
    .slice(0, maxStocks);

  console.log(`Quick-enriching top ${candidates.length} candidates...`);

  // No rate-limit pauses needed — only 1 Finnhub call per stock (profile)
  const enriched: StockData[] = [];
  for (let i = 0; i < candidates.length; i += 10) {
    const batch = candidates.slice(i, i + 10);
    const results = await Promise.allSettled(
      batch.map((c) => enrichStockQuick(c.ticker, c.price, c.volume))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) enriched.push(r.value);
    }
  }

  return enriched;
}

// Main screener: get all NASDAQ penny stocks, pick top 50 by volume/momentum, enrich them
export async function runScreener(maxStocks = 50): Promise<StockData[]> {
  console.log("Running screener...");
  const bars = await getNasdaqPennyStocks();
  console.log(`Found ${bars.length} NASDAQ penny stocks`);

  // Rank by relative volume (vs avg) then absolute volume as tiebreaker
  const candidates = bars
    .map((s) => ({
      ticker: s.ticker,
      price: s.price,
      volume: s.volume,
      relVol: s.avgVolume > 0 ? s.volume / s.avgVolume : 1,
    }))
    .sort((a, b) => b.relVol - a.relVol)
    .slice(0, maxStocks);

  console.log(`Enriching top ${candidates.length} candidates...`);

  // Enrich in batches of 5 to respect rate limits
  const enriched: StockData[] = [];
  for (let i = 0; i < candidates.length; i += 5) {
    const batch = candidates.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map((c) => enrichStock(c.ticker, c.price, c.volume))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        enriched.push(r.value);
      }
    }
    // Brief pause between batches to respect Finnhub 60/min limit
    if (i + 5 < candidates.length) {
      await new Promise((res) => setTimeout(res, 5000));
    }
  }

  return enriched;
}
