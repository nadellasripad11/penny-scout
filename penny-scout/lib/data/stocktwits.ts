// StockTwits public API — no key required
const ST_HEADERS = { "User-Agent": "PennyScout/1.0 research@pennyscout.io" };

export interface StockTwitsData {
  messageCount: number;       // messages in last ~30 fetched
  bullishCount: number;
  bearishCount: number;
  bullishPct: number;         // % of sentiment-tagged msgs that are bullish
  buzzLevel: "high" | "medium" | "low";
  topMessage?: string;
}

export async function getStockTwitsData(ticker: string): Promise<StockTwitsData | null> {
  try {
    const res = await fetch(
      `https://api.stocktwits.com/api/2/streams/symbol/${ticker}.json`,
      { headers: ST_HEADERS, next: { revalidate: 900 } }
    );
    if (!res.ok) return null;
    const data = await res.json();

    const messages: any[] = data?.messages ?? [];
    if (messages.length === 0) return null;

    let bullish = 0, bearish = 0;
    for (const m of messages) {
      const s = m?.entities?.sentiment?.basic;
      if (s === "Bullish") bullish++;
      else if (s === "Bearish") bearish++;
    }

    const tagged = bullish + bearish;
    const bullishPct = tagged > 0 ? Math.round((bullish / tagged) * 100) : 50;
    const buzzLevel = messages.length >= 20 ? "high" : messages.length >= 8 ? "medium" : "low";

    // Get top message by likes
    const top = [...messages].sort((a, b) => (b.likes?.total ?? 0) - (a.likes?.total ?? 0))[0];
    const topMessage = top?.body?.slice(0, 120);

    return { messageCount: messages.length, bullishCount: bullish, bearishCount: bearish, bullishPct, buzzLevel, topMessage };
  } catch {
    return null;
  }
}
