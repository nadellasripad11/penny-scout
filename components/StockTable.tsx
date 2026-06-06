"use client";
import { useState } from "react";
import type { ScoredStock } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";
import { ConvictionBar } from "./ConvictionBar";
import { ChevronUp, ChevronDown } from "lucide-react";

type SortKey = keyof ScoredStock;

interface Props {
  stocks: ScoredStock[];
  title: string;
}

export function StockTable({ stocks, title }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("convictionScore");
  const [asc, setAsc] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = [...stocks].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    return asc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc(!asc);
    else { setSortKey(key); setAsc(false); }
  }

  function Th({ label, k }: { label: string; k: SortKey }) {
    return (
      <th
        className="px-3 py-2 text-left text-xs text-slate-400 font-medium cursor-pointer select-none hover:text-slate-200 whitespace-nowrap"
        onClick={() => toggleSort(k)}
      >
        <span className="flex items-center gap-1">
          {label}
          {sortKey === k && (asc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        </span>
      </th>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <Th label="Ticker" k="ticker" />
              <Th label="Company" k="company" />
              <Th label="Price" k="price" />
              <Th label="Mkt Cap" k="marketCap" />
              <Th label="Rev Growth" k="revenueGrowthYoY" />
              <Th label="Score" k="convictionScore" />
              <Th label="Risk" k="riskRating" />
              <Th label="Entry" k="entryPrice" />
              <Th label="Stop" k="stopLoss" />
              <Th label="1W Target" k="targets" />
              <Th label="1Y Return%" k="expectedReturn" />
              <Th label="Prob%" k="probabilityOfSuccess" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <>
                <tr
                  key={s.ticker}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === s.ticker ? null : s.ticker)}
                >
                  <td className="px-3 py-2 font-mono font-bold text-cyan-400">
                    {s.ticker}
                    <span className="ml-1 inline-flex gap-0.5">
                      {s.pumpAndDumpWarning && <span title="Pump & dump risk: tiny float + volume spike + hype + no fundamentals">🚨</span>}
                      {s.marketRegimePenalty && <span title="Score penalised: market is bearish (SPY below 50-day MA)">🐻</span>}
                      {s.stockTwitsBuzzLevel === "high" && <span title="High StockTwits buzz">💬</span>}
                      {s.redditBuzzLevel === "high" && <span title="Trending on Reddit">🔴</span>}
                      {(s.recentSECFilings?.length ?? 0) > 0 && <span title="Recent SEC filing">📋</span>}
                      {s.hasUpcomingEarnings && <span title="Earnings coming">⚡</span>}
                      {s.volumeTrend === "building" && <span title="Volume building">📈</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-300 max-w-[160px] truncate">{s.company}</td>
                  <td className="px-3 py-2 text-slate-200 tabular-nums">${s.price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-400 tabular-nums text-xs">
                    ${s.marketCap ? (s.marketCap / 1e6).toFixed(0) + "M" : "—"}
                  </td>
                  <td className={`px-3 py-2 tabular-nums font-medium text-xs ${s.revenueGrowthYoY && s.revenueGrowthYoY > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {s.revenueGrowthYoY !== undefined ? `${s.revenueGrowthYoY.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-3 py-2 min-w-[120px]">
                    <ConvictionBar score={s.convictionScore} />
                  </td>
                  <td className="px-3 py-2"><RiskBadge risk={s.riskRating} /></td>
                  <td className="px-3 py-2 text-slate-300 tabular-nums">${s.entryPrice.toFixed(2)}</td>
                  <td className="px-3 py-2 text-red-400 tabular-nums">${s.stopLoss.toFixed(2)}</td>
                  <td className="px-3 py-2 text-emerald-400 tabular-nums">${s.targets.oneWeek.toFixed(2)}</td>
                  <td className={`px-3 py-2 tabular-nums font-medium ${s.expectedReturn > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {s.expectedReturn > 0 ? "+" : ""}{s.expectedReturn}%
                    <span className={`ml-1 text-[9px] font-normal ${s.hasAnalystTarget ? "text-cyan-500" : "text-slate-600"}`}>
                      {s.hasAnalystTarget ? "analyst" : "est."}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-400 tabular-nums">{s.probabilityOfSuccess}%</td>
                </tr>
                {expanded === s.ticker && (
                  <tr key={`${s.ticker}-detail`} className="bg-slate-800/20">
                    <td colSpan={12} className="px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="text-emerald-400 font-semibold mb-1">Bull Case</div>
                          <p className="text-slate-300 leading-relaxed">{s.bullCase || "—"}</p>
                        </div>
                        <div>
                          <div className="text-red-400 font-semibold mb-1">Bear Case</div>
                          <p className="text-slate-300 leading-relaxed">{s.bearCase || "—"}</p>
                        </div>
                        <div>
                          <div className="text-cyan-400 font-semibold mb-1">AI Narrative</div>
                          <p className="text-slate-300 leading-relaxed">{s.aiNarrative || "—"}</p>
                        </div>
                        <div>
                          <div className="text-slate-400 font-semibold mb-1">Price Targets</div>
                          <div className="space-y-1 text-slate-300">
                            <div>1 Week: <span className="text-emerald-400">${s.targets.oneWeek}</span> <span className="text-slate-600 text-[9px]">est.</span></div>
                            <div>1 Month: <span className="text-emerald-400">${s.targets.oneMonth}</span> <span className="text-slate-600 text-[9px]">est.</span></div>
                            <div>1 Year: <span className="text-emerald-400">${s.targets.oneYear}</span> <span className={`text-[9px] ${s.hasAnalystTarget ? "text-cyan-500" : "text-slate-600"}`}>{s.hasAnalystTarget ? `analyst · ${s.analystCount} analyst${(s.analystCount ?? 0) > 1 ? "s" : ""} · range $${s.analystTargetLow}–$${s.analystTargetHigh}` : "est."}</span></div>
                            <div>3 Year: <span className="text-emerald-400">${s.targets.threeYear}</span> <span className="text-slate-600 text-[9px]">est.</span></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-semibold mb-1">Financials</div>
                          <div className="space-y-1 text-slate-300">
                            <div>Gross Margin: {s.grossMargin?.toFixed(1) ?? "—"}%</div>
                            <div>Cash: ${s.cash ? (s.cash / 1e6).toFixed(0) + "M" : "—"}</div>
                            <div>Short Interest: {s.shortInterest?.toFixed(1) ?? "—"}%</div>
                            <div>Financial Health: {s.financialHealthAssessment}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-semibold mb-1">Technicals</div>
                          <div className="space-y-1 text-slate-300">
                            <div>RSI(14): {s.rsi14?.toFixed(0) ?? "—"}</div>
                            <div>Trend: {s.trend ?? "—"}</div>
                            <div>Breakout: {s.breakout ? "✅ Yes" : "No"}</div>
                            <div>Rel. Volume: {s.relativeVolume?.toFixed(1) ?? "—"}x</div>
                            <div>Volume Trend: <span className={s.volumeTrend === "building" ? "text-emerald-400" : "text-slate-400"}>{s.volumeTrend ?? "—"}</span></div>
                            <div>Vol Growth Days: {s.consecutiveVolumeGrowthDays ?? 0}</div>
                            <div>ATR%: {s.atrPercent?.toFixed(1) ?? "—"}% {(s.atrPercent ?? 10) < 3 ? "🔴 Coiling" : ""}</div>
                            <div>Float: {s.float ? ((s.float / 1e6).toFixed(1) + "M shares") : "—"}</div>
                            <div>Earnings Soon: {s.hasUpcomingEarnings ? "⚡ Yes" : "No"}</div>
                            {(s.preBreakoutScore ?? 0) > 0 && <div>Pre-Breakout Score: <span className="text-amber-400 font-bold">{s.preBreakoutScore}/30</span></div>}
                          </div>
                        </div>
                      </div>
                      {/* Social Intelligence */}
                      {(s.stockTwitsMessageCount || s.redditMentions || (s.recentSECFilings?.length ?? 0) > 0) && (
                        <div className="mt-3 border-t border-slate-700 pt-3">
                          <div className="text-slate-400 font-semibold mb-2 text-xs">Social Intelligence</div>
                          <div className="flex flex-wrap gap-3 text-xs">
                            {s.stockTwitsMessageCount ? (
                              <div className="bg-blue-950/40 border border-blue-800/40 rounded-lg px-3 py-2">
                                <div className="text-blue-400 font-semibold mb-1">StockTwits</div>
                                <div className="text-slate-300">{s.stockTwitsMessageCount} messages · <span className={s.stockTwitsBullishPct && s.stockTwitsBullishPct > 60 ? "text-emerald-400" : "text-red-400"}>{s.stockTwitsBullishPct}% bullish</span></div>
                                <div className={`text-[10px] mt-0.5 font-semibold ${s.stockTwitsBuzzLevel === "high" ? "text-amber-400" : "text-slate-500"}`}>Buzz: {s.stockTwitsBuzzLevel?.toUpperCase()}</div>
                                {s.stockTwitsTopMessage && <div className="text-slate-400 mt-1 italic">"{s.stockTwitsTopMessage}"</div>}
                              </div>
                            ) : null}
                            {(s.redditMentions ?? 0) > 0 ? (
                              <div className="bg-orange-950/40 border border-orange-800/40 rounded-lg px-3 py-2">
                                <div className="text-orange-400 font-semibold mb-1">Reddit</div>
                                <div className="text-slate-300">{s.redditMentions} posts · {s.redditUpvotes?.toLocaleString()} upvotes</div>
                                <div className={`text-[10px] mt-0.5 font-semibold ${s.redditBuzzLevel === "high" ? "text-amber-400" : "text-slate-500"}`}>Buzz: {s.redditBuzzLevel?.toUpperCase()}</div>
                                {s.redditTopPost && (
                                  <a href={s.redditTopPost.url} target="_blank" rel="noopener noreferrer" className="text-orange-400 mt-1 block hover:underline">
                                    r/{s.redditTopPost.subreddit}: "{s.redditTopPost.title}" ↗
                                  </a>
                                )}
                              </div>
                            ) : null}
                            {(s.recentSECFilings?.length ?? 0) > 0 ? (
                              <div className="bg-yellow-950/40 border border-yellow-800/40 rounded-lg px-3 py-2">
                                <div className="text-yellow-400 font-semibold mb-1">⚡ SEC Filing (last 14 days)</div>
                                {s.recentSECFilings!.map((f, i) => (
                                  <div key={i} className="text-slate-300 text-[11px]">{f.form} · {f.filedAt}</div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {s.recentNews && s.recentNews.length > 0 && (
                        <div className="mt-3 border-t border-slate-700 pt-3">
                          <div className="text-slate-400 font-semibold mb-2 text-xs">Recent News</div>
                          <div className="space-y-1">
                            {s.recentNews.slice(0, 3).map((n, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.sentiment === "positive" ? "bg-emerald-400" : n.sentiment === "negative" ? "bg-red-400" : "bg-slate-400"}`} />
                                <span className="text-slate-300">{n.headline}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
