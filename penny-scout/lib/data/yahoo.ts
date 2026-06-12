// Two-stage screener:
// 1. Alpha Vantage TOP_GAINERS_LOSERS (free, demo key) — today's movers
// 2. Yahoo Finance v8 chart — batch price lookup for NASDAQ ticker list

export interface YahooQuote {
  ticker: string;
  price: number;
  volume: number;
  marketCap: number;
  changePercent: number;
  avgVolume: number;
}

const YF_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; research/1.0)" };
const YF_TIMEOUT_MS = 8000; // abort if Yahoo hangs — prevents the whole scan from stalling

// ── Market regime: is SPY above or below its 50-day MA? ─────────────────────
export interface MarketRegime {
  bearish: boolean;   // true = broad market in downtrend → penalise all scores
  spyPrice: number;
  spyMa50: number;
}
export async function getMarketRegime(): Promise<MarketRegime> {
  try {
    const url = "https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=65d";
    const res = await fetch(url, {
      headers: YF_HEADERS,
      signal: AbortSignal.timeout(YF_TIMEOUT_MS),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { bearish: false, spyPrice: 0, spyMa50: 0 };
    const data = await res.json();
    const closes: number[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const valid = closes.filter(Boolean);
    if (valid.length < 10) return { bearish: false, spyPrice: 0, spyMa50: 0 };
    const spyPrice = valid[valid.length - 1];
    const last50 = valid.slice(-50);
    const spyMa50 = last50.reduce((a, b) => a + b, 0) / last50.length;
    // Bearish = SPY more than 2% below its 50-day MA
    return { bearish: spyPrice < spyMa50 * 0.98, spyPrice: +spyPrice.toFixed(2), spyMa50: +spyMa50.toFixed(2) };
  } catch {
    return { bearish: false, spyPrice: 0, spyMa50: 0 };
  }
}

// ── Alpha Vantage: today's most active + gainers + losers ────────────────────
async function getAlphaVantageMovers(): Promise<YahooQuote[]> {
  const key = process.env.ALPHA_VANTAGE_KEY ?? "demo";
  const res = await fetch(
    `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${key}`,
    { next: { revalidate: 3600 }, signal: AbortSignal.timeout(YF_TIMEOUT_MS) }
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (data["Information"] || data["Note"]) return []; // rate limited

  const all = [
    ...(data.top_gainers ?? []),
    ...(data.top_losers ?? []),
    ...(data.most_actively_traded ?? []),
  ];

  return all
    .filter((q: any) => {
      const price = parseFloat(q.price ?? "0");
      const vol = parseInt(q.volume ?? "0", 10);
      // Lower threshold for micro-cap pre-breakout candidates
      const minVol = price < 3 ? 30_000 : 100_000;
      return price >= 0.5 && price <= 30 && vol > minVol && /^[A-Z]{1,5}$/.test(q.ticker ?? "");
    })
    .map((q: any) => ({
      ticker: q.ticker,
      price: parseFloat(q.price),
      volume: parseInt(q.volume, 10),
      marketCap: 0,
      changePercent: parseFloat(q.change_percentage ?? "0"),
      avgVolume: 0,
    }));
}

// ── NASDAQ trader list (official, free) ─────────────────────────────────────
// File format: Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares
// Column 6 = "Y" means it's an ETF — skip those entirely
async function getNasdaqTickerList(): Promise<{ tickers: string[]; etfSet: Set<string> }> {
  const res = await fetch(
    "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt",
    { headers: { "User-Agent": "research/1.0" }, next: { revalidate: 86400 } }
  );
  if (!res.ok) return { tickers: [], etfSet: new Set() };
  const text = await res.text();

  const etfSet = new Set<string>();
  const tickers: string[] = [];

  for (const line of text.split("\n").slice(1)) {
    const cols = line.split("|");
    const ticker = cols[0]?.trim();
    if (!ticker || !/^[A-Z]{2,5}$/.test(ticker)) continue;
    if (cols[6]?.trim() === "Y") {
      etfSet.add(ticker); // track ETFs so we can filter Alpha Vantage movers too
    } else {
      tickers.push(ticker);
    }
  }

  return { tickers, etfSet };
}

// ── Yahoo Finance v8 chart — single ticker price lookup ──────────────────────
async function getYFPrice(ticker: string): Promise<YahooQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: YF_HEADERS,
      signal: AbortSignal.timeout(YF_TIMEOUT_MS),
      next: { revalidate: 900 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice ?? 0;
    const volume = meta.regularMarketVolume ?? 0;
    const marketCap = meta.marketCap ?? 0;
    const minVol = price < 3 ? 30_000 : 100_000;
    if (price < 0.5 || price > 30 || volume < minVol) return null;
    // Skip large-caps that happen to be in the penny price range (e.g. airline stocks on bad days)
    if (marketCap > 500_000_000) return null;
    return {
      ticker,
      price,
      volume,
      marketCap,
      changePercent: 0,
      avgVolume: 0,
    };
  } catch {
    return null;
  }
}

// Parallel batch with concurrency cap
async function batchGetPrices(tickers: string[], concurrency = 40): Promise<YahooQuote[]> {
  const results: YahooQuote[] = [];
  for (let i = 0; i < tickers.length; i += concurrency) {
    const batch = tickers.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map(getYFPrice));
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    }
  }
  return results;
}

// ── Main export ──────────────────────────────────────────────────────────────
export async function getNasdaqPennyStocks(): Promise<YahooQuote[]> {
  // Run both sources in parallel
  const [movers, { tickers: allTickers, etfSet }] = await Promise.all([
    getAlphaVantageMovers(),
    getNasdaqTickerList(),
  ]);

  // Filter Alpha Vantage movers: remove ETFs identified from the NASDAQ list
  const filteredMovers = movers.filter((m) => !etfSet.has(m.ticker));

  console.log(`AV movers: ${movers.length} → ${filteredMovers.length} after ETF filter | NASDAQ stocks (non-ETF): ${allTickers.length}`);

  // Remove tickers already found via AV movers to avoid duplicate API calls
  const moverSet = new Set(filteredMovers.map((m) => m.ticker));
  const remaining = allTickers.filter((t) => !moverSet.has(t));

  // Batch price lookup for the full NASDAQ list
  const broadResults = await batchGetPrices(remaining, 40);

  // Merge, dedupe, sort by volume
  const all = [...filteredMovers, ...broadResults];
  const seen = new Set<string>();
  const deduped = all.filter((q) => {
    if (seen.has(q.ticker)) return false;
    seen.add(q.ticker);
    return true;
  });

  console.log(`Total penny stocks found: ${deduped.length}`);
  return deduped.sort((a, b) => b.volume - a.volume);
}
