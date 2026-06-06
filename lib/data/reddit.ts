// Reddit public JSON API — no key required
// Searches r/pennystocks, r/wallstreetbets, r/stocks, r/smallstreetbets
const RD_HEADERS = { "User-Agent": "PennyScout/1.0 research@pennyscout.io" };

const SUBREDDITS = ["pennystocks", "wallstreetbets", "stocks", "smallstreetbets", "Daytrading"];

export interface RedditData {
  totalMentions: number;
  totalUpvotes: number;
  topPost?: { title: string; upvotes: number; subreddit: string; url: string };
  subredditsFound: string[];
  buzzLevel: "high" | "medium" | "low" | "none";
}

async function searchSubreddit(sub: string, ticker: string): Promise<any[]> {
  try {
    const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(ticker)}&sort=new&limit=5&restrict_sr=true&t=week`;
    const res = await fetch(url, { headers: RD_HEADERS, next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data?.children?.map((c: any) => c.data) ?? [];
  } catch {
    return [];
  }
}

export async function getRedditMentions(ticker: string): Promise<RedditData> {
  // Search all subreddits in parallel
  const results = await Promise.allSettled(SUBREDDITS.map((s) => searchSubreddit(s, ticker)));

  const allPosts: any[] = [];
  const subredditsFound: string[] = [];

  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value.length > 0) {
      allPosts.push(...r.value);
      subredditsFound.push(SUBREDDITS[i]);
    }
  });

  if (allPosts.length === 0) {
    return { totalMentions: 0, totalUpvotes: 0, subredditsFound: [], buzzLevel: "none" };
  }

  const totalUpvotes = allPosts.reduce((sum, p) => sum + (p.score ?? 0), 0);
  const top = [...allPosts].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

  const buzzLevel =
    allPosts.length >= 10 || totalUpvotes >= 500 ? "high" :
    allPosts.length >= 4 || totalUpvotes >= 100 ? "medium" :
    allPosts.length >= 1 ? "low" : "none";

  return {
    totalMentions: allPosts.length,
    totalUpvotes,
    topPost: top ? {
      title: top.title?.slice(0, 100),
      upvotes: top.score,
      subreddit: top.subreddit,
      url: `https://reddit.com${top.permalink}`,
    } : undefined,
    subredditsFound,
    buzzLevel,
  };
}
