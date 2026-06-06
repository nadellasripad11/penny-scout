const BASE = "https://api.polygon.io";
const KEY = () => process.env.POLYGON_API_KEY!;

export interface DailyBar {
  ticker: string;
  c: number;  // close
  h: number;  // high
  l: number;  // low
  o: number;  // open
  v: number;  // volume
  vw: number; // volume-weighted avg
  t: number;  // timestamp
}

// Use grouped daily bars (free tier) — returns all US stocks for a given date
export async function getNasdaqPennyStocks(): Promise<DailyBar[]> {
  // Use previous trading day (skip weekend)
  const date = getPrevTradingDay();
  const url = `${BASE}/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&apiKey=${KEY()}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Polygon grouped bars failed: ${res.status}`);
  const data = await res.json();
  const results: DailyBar[] = data.results ?? [];

  // Filter: price $0.50–$30, volume > 100k, ticker looks like NASDAQ (no dots = no preferred/warrants)
  return results.filter(
    (t) => t.c > 0.5 && t.c <= 30 && t.v > 100_000 && /^[A-Z]{1,5}$/.test(t.ticker)
  );
}

function getPrevTradingDay(): string {
  const d = new Date();
  // If weekend, go back to Friday
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() - 2); // Sunday → Friday
  else if (day === 1) d.setDate(d.getDate() - 3); // Monday → Friday (markets closed weekend)
  else d.setDate(d.getDate() - 1); // Otherwise yesterday
  return d.toISOString().split("T")[0];
}

// Get OHLCV aggregates for technical analysis
export async function getAggregates(
  ticker: string,
  days = 60
): Promise<{ c: number; h: number; l: number; o: number; v: number; t: number }[]> {
  const to = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  const url = `${BASE}/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=120&apiKey=${KEY()}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

// Get ticker details (company info)
export async function getTickerDetails(ticker: string) {
  const url = `${BASE}/v3/reference/tickers/${ticker}?apiKey=${KEY()}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.results ?? null;
}

// Calculate technicals from OHLCV data
export function calculateTechnicals(candles: { c: number; h: number; l: number; o: number; v: number }[]) {
  if (candles.length < 20) return null;

  const closes = candles.map((c) => c.c);
  const volumes = candles.map((c) => c.v);

  const sma = (arr: number[], n: number) => {
    if (arr.length < n) return null;
    return arr.slice(-n).reduce((a, b) => a + b, 0) / n;
  };

  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, Math.min(50, closes.length));
  const ma200 = sma(closes, Math.min(200, closes.length));

  // RSI 14
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }
  const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi14 = 100 - 100 / (1 + rs);

  // Avg volume
  const avgVolume = sma(volumes, 20) ?? 0;
  const relativeVolume = avgVolume > 0 ? (volumes[volumes.length - 1] ?? 0) / avgVolume : 1;

  // Support/resistance (recent 20-day high/low)
  const recent = candles.slice(-20);
  const support = Math.min(...recent.map((c) => c.l));
  const resistance = Math.max(...recent.map((c) => c.h));

  const price = closes[closes.length - 1];
  let trend: "uptrend" | "downtrend" | "sideways" = "sideways";
  if (ma20 && ma50 && price > ma20 && ma20 > ma50) trend = "uptrend";
  else if (ma20 && ma50 && price < ma20 && ma20 < ma50) trend = "downtrend";

  const breakout = ma20 ? price > resistance * 0.97 && price > ma20 : false;

  // Volume trend — is volume building up over last 5 days?
  const recentVols = volumes.slice(-6); // last 6 days
  let consecutiveVolumeGrowthDays = 0;
  for (let i = recentVols.length - 1; i > 0; i--) {
    if (recentVols[i] > recentVols[i - 1]) consecutiveVolumeGrowthDays++;
    else break;
  }
  const volumeTrend: "building" | "declining" | "flat" =
    consecutiveVolumeGrowthDays >= 2 ? "building" :
    recentVols[recentVols.length - 1] < recentVols[0] ? "declining" : "flat";

  // ATR (14-day) as % of price — low ATR = price coiling = potential breakout
  const atrValues = candles.slice(-15).map((c, i, arr) => {
    if (i === 0) return c.h - c.l;
    const prev = arr[i - 1];
    return Math.max(c.h - c.l, Math.abs(c.h - prev.c), Math.abs(c.l - prev.c));
  }).slice(1);
  const atr = atrValues.length > 0 ? atrValues.reduce((a, b) => a + b, 0) / atrValues.length : 0;
  const atrPercent = price > 0 ? (atr / price) * 100 : 0;

  // Distance from resistance as % (how close to breakout)
  const distFromResistancePct = resistance > 0 ? ((resistance - price) / resistance) * 100 : 100;

  return {
    rsi14, ma20, ma50, ma200, support, resistance, trend, breakout,
    avgVolume, relativeVolume,
    volumeTrend, consecutiveVolumeGrowthDays, atrPercent, distFromResistancePct,
  };
}
