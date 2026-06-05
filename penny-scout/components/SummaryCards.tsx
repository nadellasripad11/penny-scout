"use client";
import type { ScanReport } from "@/lib/types";
import { TrendingUp, Star, AlertTriangle, Plus, ArrowUp, ArrowDown } from "lucide-react";

export function SummaryCards({ report }: { report: ScanReport }) {
  const { executiveSummary: es } = report;
  const top = es.highestConvictionPick;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star size={14} className="text-amber-400" />
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Top Pick</span>
        </div>
        <div className="text-2xl font-bold font-mono text-cyan-400">{top?.ticker ?? "—"}</div>
        <div className="text-xs text-slate-400 mt-0.5 truncate">{top?.company ?? ""}</div>
        <div className="text-xs text-emerald-400 mt-1">Score: {top?.convictionScore ?? "—"}/100</div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-emerald-400" />
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Screened</span>
        </div>
        <div className="text-2xl font-bold text-slate-200">{report.allStocks.length}</div>
        <div className="text-xs text-slate-400 mt-0.5">NASDAQ stocks $0.50–$30</div>
        <div className="text-xs text-slate-500 mt-1">{report.scanType} scan</div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Plus size={14} className="text-cyan-400" />
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Changes</span>
        </div>
        <div className="flex gap-3 mt-1">
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-400">{es.newAdditions?.length ?? 0}</div>
            <div className="text-xs text-slate-500">New</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400">{es.upgrades?.length ?? 0}</div>
            <div className="text-xs text-slate-500">
              <ArrowUp size={10} className="inline" />Up
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-400">{es.downgrades?.length ?? 0}</div>
            <div className="text-xs text-slate-500">
              <ArrowDown size={10} className="inline" />Down
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={14} className="text-red-400" />
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Multibagger</span>
        </div>
        <div className="text-2xl font-bold font-mono text-cyan-400">
          {es.topMultibaggers[0]?.ticker ?? "—"}
        </div>
        <div className="text-xs text-slate-400 mt-0.5 truncate">{es.topMultibaggers[0]?.company ?? ""}</div>
        <div className="text-xs text-amber-400 mt-1">
          3Y: ${es.topMultibaggers[0]?.targets.threeYear ?? "—"}
        </div>
      </div>
    </div>
  );
}
