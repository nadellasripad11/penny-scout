"use client";
import { useState, useEffect } from "react";
import type { ScanReport } from "@/lib/types";
import { StockTable } from "./StockTable";
import { SummaryCards } from "./SummaryCards";
import { RefreshCw, Sun, Moon, TrendingUp, Download, Zap, Clock } from "lucide-react";
import Link from "next/link";

const TABS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "swing", label: "Swing Trades" },
  { id: "longterm", label: "Long-Term" },
  { id: "multi", label: "Multibaggers" },
  { id: "squeeze", label: "🔥 Short Squeeze" },
  { id: "prebreakout", label: "🚀 Pre-Breakout" },
  { id: "all", label: "All Stocks" },
];

export function Dashboard() {
  const [report, setReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<"latest" | "hourly">("latest");

  async function fetchReport(mode?: "latest" | "hourly") {
    const m = mode ?? scanMode;
    setLoading(true);
    setError(null);
    try {
      const url = m === "hourly" ? "/api/reports?latest=true&type=hourly" : "/api/reports?latest=true";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      if (!data || !data.id) throw new Error("No report available yet");
      setReport(data as ScanReport);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(mode: "latest" | "hourly") {
    setScanMode(mode);
    fetchReport(mode);
  }

  useEffect(() => { fetchReport(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tabStocks = () => {
    if (!report) return [];
    switch (activeTab) {
      case "today": return report.rankings.topTomorrow ?? [];
      case "week": return report.rankings.topWeek ?? [];
      case "month": return report.rankings.topMonth ?? [];
      case "swing": return report.rankings.topSwings ?? [];
      case "longterm": return report.rankings.topLongTerm ?? [];
      case "multi": return report.rankings.topMultibaggers ?? [];
      case "squeeze": return report.rankings.topShortSqueeze ?? [];
      case "prebreakout": return report.rankings.topPreBreakout ?? [];
      case "all": return report.allStocks.slice(0, 50);
      default: return [];
    }
  };

  const tabLabel = TABS.find((t) => t.id === activeTab)?.label ?? "";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">P</div>
            <div>
              <h1 className="text-base font-bold text-slate-100">PennyScout</h1>
              <p className="text-xs text-slate-500">NASDAQ Penny Stock Research</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                {report.scanType === "morning" ? <Sun size={13} className="text-amber-400" /> : report.scanType === "hourly" ? <Clock size={13} className="text-cyan-400" /> : <Moon size={13} className="text-blue-400" />}
                <span>{report.date} · {report.scanType}{report.scanType === "hourly" ? " (intraday)" : ""}</span>
              </div>
            )}
            {/* Scan mode toggle */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => switchMode("latest")}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${scanMode === "latest" ? "bg-slate-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                <Sun size={11} /> Daily
              </button>
              <button
                onClick={() => switchMode("hourly")}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${scanMode === "hourly" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                <Clock size={11} /> Intraday
              </button>
            </div>
            <Link href="/portfolio" className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white transition-colors">
              <TrendingUp size={12} /> Portfolio
            </Link>
            {report && (
              <a href="/api/export/tradingview?type=watchlist" download className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 rounded-lg text-white transition-colors">
                <Zap size={12} /> TradingView
              </a>
            )}
            <button
              onClick={() => fetchReport()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw size={32} className="animate-spin text-cyan-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Loading latest report...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
            <p className="text-red-400 font-medium mb-2">No report available</p>
            <p className="text-slate-400 text-sm mb-4">{error}</p>
            <p className="text-slate-500 text-xs">
              Trigger a scan by hitting <code className="bg-slate-800 px-1 rounded">/api/scan/morning</code> or wait for the scheduled cron job.
            </p>
          </div>
        )}

        {report && !loading && (
          <>
            {/* Executive Summary */}
            {report.executiveSummary?.biggestCatalyst && (
              <div className="mb-4 bg-cyan-950/30 border border-cyan-800/40 rounded-xl px-4 py-3 text-sm text-cyan-300">
                <span className="font-semibold text-cyan-400">Biggest Catalyst: </span>
                {report.executiveSummary.biggestCatalyst}
              </div>
            )}

            <SummaryCards report={report} />

            {/* Tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <StockTable
              stocks={tabStocks()}
              title={`${tabLabel} — ${tabStocks().length} stocks`}
            />

            {/* Changes */}
            {((report.executiveSummary.newAdditions?.length ?? 0) > 0 || (report.executiveSummary.newRisks?.length ?? 0) > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {(report.executiveSummary.newAdditions?.length ?? 0) > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">New Additions</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {report.executiveSummary.newAdditions!.map((t) => (
                        <span key={t} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs font-mono text-emerald-400">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(report.executiveSummary.newRisks?.length ?? 0) > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">High-Risk Alerts</h4>
                    <div className="space-y-1">
                      {report.executiveSummary.newRisks!.map((r, i) => (
                        <p key={i} className="text-xs text-slate-400">{r}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-slate-600 text-center mt-8">
              Not financial advice. For educational purposes only. Always conduct your own due diligence.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
