import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import type { ScoredStock, ScanReport } from "@/lib/types";

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}
function getGemini() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GEMINI_MODEL = "gemini-2.0-flash";

// Try Groq first, fall back to Gemini if rate-limited
async function complete(systemPrompt: string, userPrompt: string, maxTokens = 600): Promise<string> {
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await getGroq().chat.completions.create({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      return res.choices[0]?.message?.content ?? "";
    } catch (err: any) {
      // 429 = rate limited, fall through to Gemini
      if (!String(err?.status ?? err?.message).includes("429")) throw err;
      console.warn("Groq rate-limited, falling back to Gemini");
    }
  }

  // Gemini fallback
  const genai = getGemini();
  const response = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `${systemPrompt}\n\n${userPrompt}`,
  });
  return response.text ?? "";
}

export async function generateStockNarrative(
  stock: ScoredStock,
  previousReport?: ScanReport
): Promise<{ bullCase: string; bearCase: string; aiNarrative: string }> {
  const prev = previousReport?.allStocks.find((s) => s.ticker === stock.ticker);

  const systemPrompt =
    "You are a hedge fund analyst. Respond only with valid JSON matching the requested schema exactly. Be specific, concise, and data-driven.";

  const userPrompt = `Generate a concise, data-driven analysis for the following NASDAQ stock.

Stock: ${stock.ticker} — ${stock.company}
Price: $${stock.price} | Market Cap: $${(stock.marketCap / 1e6).toFixed(0)}M
Sector: ${stock.sector} | Industry: ${stock.industry}
Revenue Growth YoY: ${stock.revenueGrowthYoY?.toFixed(1) ?? "N/A"}%
Gross Margin: ${stock.grossMargin?.toFixed(1) ?? "N/A"}%
Cash: $${stock.cash ? (stock.cash / 1e6).toFixed(0) : "N/A"}M
Debt/Equity: ${stock.debtToEquity?.toFixed(2) ?? "N/A"}
Short Interest: ${stock.shortInterest?.toFixed(1) ?? "N/A"}%
Insider Ownership: ${stock.insiderOwnership?.toFixed(1) ?? "N/A"}%
Institutional Ownership: ${stock.institutionalOwnership?.toFixed(1) ?? "N/A"}%
RSI (14): ${stock.rsi14?.toFixed(0) ?? "N/A"}
Trend: ${stock.trend ?? "N/A"} | Breakout: ${stock.breakout ? "Yes" : "No"}
Relative Volume: ${stock.relativeVolume?.toFixed(1) ?? "N/A"}x
Financial Health: ${stock.financialHealthAssessment}
Conviction Score: ${stock.convictionScore}/100
Risk Rating: ${stock.riskRating}
${prev ? `Previous conviction score: ${prev.convictionScore}/100 (${stock.convictionScore > prev.convictionScore ? "UPGRADED" : stock.convictionScore < prev.convictionScore ? "DOWNGRADED" : "UNCHANGED"})` : "New addition to watchlist."}
Recent News: ${stock.recentNews?.slice(0, 3).map((n) => n.headline).join("; ") || "None"}
Insider Activity: ${stock.recentInsiderTrades?.slice(0, 3).map((t) => `${t.name} ${t.transactionType} ${t.shares.toLocaleString()} shares`).join("; ") || "None"}

Respond in JSON with exactly these three fields:
{
  "bullCase": "2-3 sentence bull thesis focusing on catalysts, growth drivers, and upside.",
  "bearCase": "2-3 sentence bear case focusing on key risks and downside scenarios.",
  "aiNarrative": "3-4 sentence comprehensive overview covering business quality, current setup, catalysts, and recommendation context."
}`;

  const text = await complete(systemPrompt, userPrompt, 600);
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      bullCase: "Strong fundamentals with positive catalysts identified.",
      bearCase: "Small-cap risks including liquidity and execution uncertainty.",
      aiNarrative: text.slice(0, 300),
    };
  }
}

export async function generateExecutiveSummary(
  report: Omit<ScanReport, "executiveSummary">,
  previousReport?: ScanReport
): Promise<string> {
  const topPicks = report.rankings.topTomorrow
    .slice(0, 3)
    .map((s) => `${s.ticker} (score: ${s.convictionScore})`)
    .join(", ");

  const newAdditions = report.rankings.topTomorrow
    .filter((s) => !previousReport?.allStocks.find((p) => p.ticker === s.ticker))
    .map((s) => s.ticker);

  const userPrompt = `Write a 150-word executive summary of today's ${report.scanType} NASDAQ penny stock scan.

Date: ${report.date} | Scan: ${report.scanType.toUpperCase()}
Total stocks screened: ${report.allStocks.length}
Top picks: ${topPicks}
New additions: ${newAdditions.join(", ") || "None"}
Top multibagger: ${report.rankings.topMultibaggers[0]?.ticker ?? "None"} (${report.rankings.topMultibaggers[0]?.company ?? ""})

Write a professional, actionable executive summary. Mention key themes, top opportunities, and notable changes from previous scan.`;

  return complete(
    "You are the lead analyst at a hedge fund. Be concise, professional, and actionable.",
    userPrompt,
    300
  );
}
