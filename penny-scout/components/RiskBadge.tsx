"use client";
type Risk = "Low" | "Medium" | "High" | "Very High";
const colors: Record<Risk, string> = {
  Low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  High: "bg-red-500/20 text-red-400 border-red-500/30",
  "Very High": "bg-red-900/30 text-red-300 border-red-700/50",
};
export function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${colors[risk]}`}>
      {risk}
    </span>
  );
}
