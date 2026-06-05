const BASE = "https://finnhub.io/api/v1";
const KEY = () => process.env.FINNHUB_API_KEY!;

// Rate limiting: 60 calls/min on free tier
async function finnhubFetch(path: string, ttl = 3600) {
  const url = `${BASE}${path}&token=${KEY()}`;
  const res = await fetch(url, { next: { revalidate: ttl } });
  if (!res.ok) return null;
  return res.json();
}

export async function getBasicFinancials(ticker: string) {
  return finnhubFetch(`/stock/metric?symbol=${ticker}&metric=all`);
}

export async function getCompanyProfile(ticker: string) {
  return finnhubFetch(`/stock/profile2?symbol=${ticker}`, 86400);
}

export async function getCompanyNews(ticker: string): Promise<any[]> {
  const to = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const data = await finnhubFetch(`/company-news?symbol=${ticker}&from=${from}&to=${to}`, 1800);
  return Array.isArray(data) ? data.slice(0, 10) : [];
}

export async function getInsiderTransactions(ticker: string) {
  const data = await finnhubFetch(`/stock/insider-transactions?symbol=${ticker}`, 3600);
  return data?.data ?? [];
}

export async function getRecommendations(ticker: string) {
  const data = await finnhubFetch(`/stock/recommendation?symbol=${ticker}`, 3600);
  return Array.isArray(data) ? data[0] ?? null : null;
}

export async function getPriceTarget(ticker: string) {
  return finnhubFetch(`/stock/price-target?symbol=${ticker}`, 3600);
}

export async function getEarningsCalendar(ticker: string) {
  const to = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  const from = new Date().toISOString().split("T")[0];
  const data = await finnhubFetch(`/calendar/earnings?symbol=${ticker}&from=${from}&to=${to}`, 3600);
  return data?.earningsCalendar ?? [];
}

export async function getMarketNews(category: "general" | "merger" = "general") {
  const data = await finnhubFetch(`/news?category=${category}`, 1800);
  return Array.isArray(data) ? data.slice(0, 20) : [];
}

// Parse financials into our format
export function parseFinancials(profile: any, metrics: any) {
  const m = metrics?.metric ?? {};
  const s = metrics?.series?.annual ?? {};

  return {
    revenue: m["revenuePerShareTTM"] && profile?.shareOutstanding
      ? m["revenuePerShareTTM"] * profile.shareOutstanding * 1e6
      : undefined,
    revenueGrowthYoY: m["revenueGrowthTTMYoy"] ? m["revenueGrowthTTMYoy"] * 100 : undefined,
    grossMargin: m["grossMarginTTM"],
    operatingMargin: m["operatingMarginTTM"],
    netMargin: m["netMarginTTM"],
    eps: m["epsTTM"],
    cash: m["cashAndEquivalentsPerShareAnnual"] && profile?.shareOutstanding
      ? m["cashAndEquivalentsPerShareAnnual"] * profile.shareOutstanding * 1e6
      : undefined,
    totalDebt: m["totalDebtToTotalAssetAnnual"] ? undefined : undefined,
    debtToEquity: m["totalDebt/totalEquityAnnual"],
    currentRatio: m["currentRatioAnnual"],
    bookValue: m["bookValuePerShareAnnual"],
    freeCashFlow: m["freeCashFlowPerShareTTM"] && profile?.shareOutstanding
      ? m["freeCashFlowPerShareTTM"] * profile.shareOutstanding * 1e6
      : undefined,
    ps: m["psTTM"],
    pb: m["pbAnnual"],
    pegRatio: m["pegNormalizedAnnual"],
    shortInterest: m["shortInterest"],
    float: profile?.shareOutstanding ? profile.shareOutstanding * 1e6 : undefined,
    sharesOutstanding: profile?.shareOutstanding ? profile.shareOutstanding * 1e6 : undefined,
    insiderOwnership: m["insiderOwnershipPercentage"],
    institutionalOwnership: m["institutionalOwnershipPercentage"],
    marketCap: profile?.marketCapitalization ? profile.marketCapitalization * 1e6 : undefined,
    ceo: profile?.name ?? undefined,
  };
}

export function parseSentiment(news: any[]) {
  return news.map((n: any) => ({
    headline: n.headline,
    summary: n.summary,
    source: n.source,
    datetime: n.datetime,
    url: n.url,
    sentiment: (n.sentiment === 1 ? "positive" : n.sentiment === -1 ? "negative" : "neutral") as "positive" | "negative" | "neutral",
  }));
}

export function parseInsiderTrades(trades: any[]) {
  return trades
    .filter((t: any) => Math.abs(t.change) > 0)
    .slice(0, 10)
    .map((t: any) => ({
      name: t.name,
      title: t.position ?? "",
      transactionType: t.change > 0 ? ("buy" as const) : ("sell" as const),
      shares: Math.abs(t.change),
      value: Math.abs(t.change) * (t.transactionPrice ?? 0),
      date: t.transactionDate ?? "",
      filingDate: t.filingDate ?? "",
    }));
}
