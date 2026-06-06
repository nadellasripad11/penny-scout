"use client";
import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Download, Webhook, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Position {
  id: string; ticker: string; company: string;
  entryPrice: number; shares: number; positionValue: number;
  targetPrice: number; stopLoss: number; entryTimestamp: number;
  livePrice?: number; livePnl?: number; livePnlPercent?: number;
  convictionScore: number;
}
interface ClosedTrade extends Position {
  exitPrice: number; pnl: number; pnlPercent: number;
  closeReason: string; exitTimestamp: number;
}
interface Stats {
  openCount: number; closedCount: number; winRate: number;
  totalRealizedPnl: number; totalUnrealizedPnl: number;
  totalPnl: number; startingBalance: number;
}

export default function PortfolioPage() {
  const [data, setData] = useState<{ openPositions: Position[]; closedTrades: ClosedTrade[]; stats: Stats } | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio");
      setData(await res.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const pnlColor = (n: number) => n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-slate-400";
  const pnlBg = (n: number) => n > 0 ? "bg-emerald-500/10 border-emerald-500/30" : n < 0 ? "bg-red-500/10 border-red-500/30" : "bg-slate-800 border-slate-700";
  const fmt = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2);
  const fmtPct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";

  const WEBHOOK_URL = "https://penny-scout.vercel.app/api/webhook/tradingview";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-100">Paper Portfolio</h1>
              <p className="text-xs text-slate-500">Auto-tracked from daily scans</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/api/export/tradingview?type=watchlist" download className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
              <Download size={12} /> Watchlist
            </a>
            <a href="/api/export/tradingview?type=pine" download className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 rounded-lg text-white transition-colors">
              <Download size={12} /> Pine Alerts
            </a>
            <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading && (
          <div className="flex items-center justify-center h-48">
            <RefreshCw size={28} className="animate-spin text-cyan-500" />
          </div>
        )}

        {data && !loading && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total P&L", value: `$${fmt(data.stats.totalPnl)}`, color: pnlColor(data.stats.totalPnl) },
                { label: "Unrealized", value: `$${fmt(data.stats.totalUnrealizedPnl)}`, color: pnlColor(data.stats.totalUnrealizedPnl) },
                { label: "Realized", value: `$${fmt(data.stats.totalRealizedPnl)}`, color: pnlColor(data.stats.totalRealizedPnl) },
                { label: "Win Rate", value: `${data.stats.winRate}%`, color: data.stats.winRate >= 50 ? "text-emerald-400" : "text-red-400" },
              ].map((s) => (
                <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Open Positions */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <h2 className="font-semibold text-sm text-slate-200">Open Positions ({data.stats.openCount})</h2>
                <span className="text-xs text-slate-500">$500/position · auto-managed</span>
              </div>
              {data.openPositions.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">No open positions. Run a scan to auto-enter trades.</div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {data.openPositions.map((p) => (
                    <div key={p.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-bold text-cyan-400 font-mono">{p.ticker}</span>
                          <span className="text-slate-500 text-xs ml-2">{p.company}</span>
                        </div>
                        <div className={`text-sm font-bold ${pnlColor(p.livePnlPercent ?? 0)}`}>
                          {fmtPct(p.livePnlPercent ?? 0)} · ${fmt(p.livePnl ?? 0)}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs text-slate-500">
                        <div>Entry <span className="text-slate-300">${p.entryPrice.toFixed(2)}</span></div>
                        <div>Live <span className="text-slate-200 font-semibold">${p.livePrice?.toFixed(2) ?? "—"}</span></div>
                        <div>Target <span className="text-emerald-400">${p.targetPrice.toFixed(2)}</span></div>
                        <div>Stop <span className="text-red-400">${p.stopLoss.toFixed(2)}</span></div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${(p.livePnlPercent ?? 0) >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(100, Math.abs(p.livePnlPercent ?? 0) * 3)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trade History */}
            {data.closedTrades.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800">
                  <h2 className="font-semibold text-sm text-slate-200">Trade History ({data.stats.closedCount})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800">
                        <th className="px-4 py-2 text-left">Ticker</th>
                        <th className="px-4 py-2 text-right">Entry</th>
                        <th className="px-4 py-2 text-right">Exit</th>
                        <th className="px-4 py-2 text-right">P&L</th>
                        <th className="px-4 py-2 text-right">Return</th>
                        <th className="px-4 py-2 text-left">Reason</th>
                        <th className="px-4 py-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {data.closedTrades.map((t) => (
                        <tr key={t.id} className={`border rounded ${pnlBg(t.pnl)}`}>
                          <td className="px-4 py-2 font-bold text-cyan-400 font-mono">{t.ticker}</td>
                          <td className="px-4 py-2 text-right text-slate-300">${t.entryPrice.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right text-slate-300">${t.exitPrice.toFixed(2)}</td>
                          <td className={`px-4 py-2 text-right font-semibold ${pnlColor(t.pnl)}`}>${fmt(t.pnl)}</td>
                          <td className={`px-4 py-2 text-right font-semibold ${pnlColor(t.pnlPercent)}`}>{fmtPct(t.pnlPercent)}</td>
                          <td className="px-4 py-2 text-slate-400 capitalize">{t.closeReason?.replace("_", " ")}</td>
                          <td className="px-4 py-2 text-slate-500">{new Date(t.exitTimestamp).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TradingView Setup */}
            <div className="bg-slate-900 border border-indigo-800/40 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Webhook size={16} className="text-indigo-400" />
                <h2 className="font-semibold text-sm text-slate-200">TradingView Setup</h2>
              </div>
              <div className="space-y-4 text-sm text-slate-400">
                <div>
                  <p className="text-slate-300 font-medium mb-1">Step 1 — Import watchlist</p>
                  <p>Download the watchlist file above and import it in TradingView: <span className="text-slate-300">Watchlist → ⋮ → Import list of symbols</span></p>
                </div>
                <div>
                  <p className="text-slate-300 font-medium mb-1">Step 2 — Add Pine Script alerts</p>
                  <p>Download the Pine Alerts file, paste each stock's script into TradingView's Pine Editor, then <span className="text-slate-300">Add to chart</span>. Set the alert webhook URL to:</p>
                  <div className="mt-2 bg-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-cyan-300 break-all">{WEBHOOK_URL}</div>
                </div>
                <div>
                  <p className="text-slate-300 font-medium mb-1">Step 3 — Alert message format</p>
                  <p>The Pine Script already includes the correct JSON. When TradingView fires, it auto-closes the paper trade here.</p>
                </div>
                <div className="bg-indigo-950/40 border border-indigo-800/30 rounded-lg p-3 text-xs text-indigo-300">
                  💡 Paper trades auto-open every morning & evening from the scanner. TradingView alerts auto-close them when price hits your target or stop loss.
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
