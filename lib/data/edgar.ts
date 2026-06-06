// SEC EDGAR — free, no key required, rate limit: 10 req/s
const BASE = "https://data.sec.gov";
const HEADERS = { "User-Agent": "PennyScout research@pennyscout.io" };

export async function getRecentForm4(ticker: string) {
  try {
    // Get CIK from company tickers JSON
    const tickerRes = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: HEADERS,
      next: { revalidate: 86400 },
    });
    if (!tickerRes.ok) return [];
    const tickers = await tickerRes.json();

    const entry = Object.values(tickers as Record<string, { cik_str: number; ticker: string; title: string }>).find(
      (e) => e.ticker.toUpperCase() === ticker.toUpperCase()
    );
    if (!entry) return [];

    const cik = String(entry.cik_str).padStart(10, "0");
    const filingsRes = await fetch(`${BASE}/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=4&dateb=&owner=include&count=10&search_text=&output=atom`, {
      headers: HEADERS,
      next: { revalidate: 3600 },
    });

    if (!filingsRes.ok) return [];
    const text = await filingsRes.text();

    // Parse filing dates from Atom feed
    const dateMatches = [...text.matchAll(/<updated>([^<]+)<\/updated>/g)].map((m) => m[1]);
    const titleMatches = [...text.matchAll(/<category term="([^"]+)"/g)].map((m) => m[1]);

    return dateMatches.slice(0, 5).map((date, i) => ({
      filingDate: date,
      formType: "4",
      category: titleMatches[i] ?? "",
    }));
  } catch {
    return [];
  }
}

export interface SECFiling {
  form: string;
  filedAt: string;
  description: string;
  url: string;
}

export async function getRecent8K(ticker: string): Promise<SECFiling[]> {
  try {
    const since = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    const url = `https://efts.sec.gov/LATEST/search-index?q=%22${ticker}%22&forms=8-K,8-K%2FA&dateRange=custom&startdt=${since}&enddt=${today}&hits.hits._source=period_of_report,display_names,file_date,form_type,period_of_report`;
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    const hits = data?.hits?.hits ?? [];
    return hits.slice(0, 5).map((h: any) => ({
      form: h._source?.form_type ?? "8-K",
      filedAt: h._source?.file_date ?? "",
      description: h._source?.display_names ?? ticker,
      url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${ticker}&type=8-K&dateb=&owner=include&count=10`,
    }));
  } catch {
    return [];
  }
}

export async function getCompanyConcepts(ticker: string, concept = "Revenues") {
  try {
    const tickerRes = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: HEADERS,
      next: { revalidate: 86400 },
    });
    if (!tickerRes.ok) return null;
    const tickers = await tickerRes.json();

    const entry = Object.values(tickers as Record<string, { cik_str: number; ticker: string }>).find(
      (e) => e.ticker.toUpperCase() === ticker.toUpperCase()
    );
    if (!entry) return null;

    const cik = String(entry.cik_str).padStart(10, "0");
    const res = await fetch(`${BASE}/api/xbrl/companyconcept/CIK${cik}/us-gaap/${concept}.json`, {
      headers: HEADERS,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
