import nodemailer from "nodemailer";
import type { ScanReport, ScoredStock } from "@/lib/types";

function getTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

const scoreColor = (n: number) => n >= 70 ? "#22c55e" : n >= 50 ? "#f59e0b" : "#ef4444";
const riskColor = (r: string) => r === "Low" ? "#22c55e" : r === "Medium" ? "#f59e0b" : "#ef4444";
const returnColor = (n: number) => n >= 50 ? "#22c55e" : n >= 20 ? "#f59e0b" : "#94a3b8";

function highlightCard(s: ScoredStock, rank: number, label: string) {
  return `
  <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px 16px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <div>
        <span style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px">${label} #${rank}</span>
        <div style="font-size:20px;font-weight:700;color:#38bdf8;font-family:monospace;margin-top:2px">${s.ticker}</div>
        <div style="color:#94a3b8;font-size:12px">${s.company}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:700;color:${scoreColor(s.convictionScore)}">${s.convictionScore}</div>
        <div style="font-size:10px;color:#64748b">SCORE</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="color:#64748b;font-size:11px;padding:3px 0;width:33%">Price</td>
        <td style="color:#64748b;font-size:11px;padding:3px 0;padding-left:8px;width:33%">Entry → 1W Target</td>
        <td style="color:#64748b;font-size:11px;padding:3px 0;padding-left:8px">1Y Return</td>
      </tr>
      <tr>
        <td style="color:#f1f5f9;font-size:14px;font-weight:600;padding:2px 0">$${s.price.toFixed(2)}</td>
        <td style="color:#f1f5f9;font-size:13px;font-weight:600;padding:2px 0;padding-left:8px">$${s.entryPrice.toFixed(2)} → <span style="color:#22c55e">$${s.targets.oneWeek.toFixed(2)}</span></td>
        <td style="font-size:14px;font-weight:700;padding:2px 0;padding-left:8px;color:${returnColor(s.expectedReturn)}">${s.expectedReturn > 0 ? "+" : ""}${s.expectedReturn}%</td>
      </tr>
      <tr>
        <td style="color:#64748b;font-size:11px;padding:3px 0">Stop Loss</td>
        <td style="color:#64748b;font-size:11px;padding:3px 0;padding-left:8px">1Y Target</td>
        <td style="color:#64748b;font-size:11px;padding:3px 0;padding-left:8px">Risk</td>
      </tr>
      <tr>
        <td style="color:#ef4444;font-size:13px;font-weight:600;padding:2px 0">$${s.stopLoss.toFixed(2)}</td>
        <td style="color:#22c55e;font-size:13px;font-weight:600;padding:2px 0;padding-left:8px">$${s.targets.oneYear.toFixed(2)}${s.hasAnalystTarget ? ' <span style="color:#38bdf8;font-size:10px">(analyst)</span>' : ""}</td>
        <td style="font-size:13px;font-weight:600;padding:2px 0;padding-left:8px;color:${riskColor(s.riskRating)}">${s.riskRating}</td>
      </tr>
    </table>
    ${s.bullCase ? `<div style="margin-top:10px;padding:8px 10px;background:#0f172a;border-radius:6px;border-left:3px solid #22c55e;color:#94a3b8;font-size:12px;line-height:1.5"><span style="color:#22c55e;font-weight:700">Bull: </span>${s.bullCase}</div>` : ""}
    ${s.aiNarrative ? `<div style="margin-top:6px;padding:8px 10px;background:#0f172a;border-radius:6px;border-left:3px solid #38bdf8;color:#94a3b8;font-size:12px;line-height:1.5">${s.aiNarrative}</div>` : ""}
  </div>`;
}

function compactRow(s: ScoredStock, i: number) {
  const bg = i % 2 === 0 ? "#1e293b" : "#0f172a";
  const revGrowth = s.revenueGrowthYoY !== undefined
    ? `<span style="color:${s.revenueGrowthYoY > 0 ? "#22c55e" : "#ef4444"}">${s.revenueGrowthYoY.toFixed(0)}%</span>`
    : `<span style="color:#475569">—</span>`;
  const badges = [
    s.stockTwitsBuzzLevel === "high" ? "💬" : "",
    s.redditBuzzLevel === "high" ? "🔴" : "",
    (s.recentSECFilings?.length ?? 0) > 0 ? "📋" : "",
    s.hasUpcomingEarnings ? "⚡" : "",
    s.volumeTrend === "building" ? "📈" : "",
    (s.preBreakoutScore ?? 0) >= 10 ? "🚀" : "",
    (s.shortSqueezeScore ?? 0) >= 10 ? "🔥" : "",
  ].filter(Boolean).join("");

  return `
  <tr style="background:${bg}">
    <td style="padding:7px 8px;font-weight:700;color:#38bdf8;font-family:monospace;font-size:13px;white-space:nowrap">${s.ticker}${badges ? `<br><span style="font-size:10px">${badges}</span>` : ""}</td>
    <td style="padding:7px 8px;color:#cbd5e1;font-size:12px;max-width:110px">${s.company.length > 16 ? s.company.slice(0, 16) + "…" : s.company}</td>
    <td style="padding:7px 8px;color:#f1f5f9;font-size:13px;white-space:nowrap;font-weight:600">$${s.price.toFixed(2)}</td>
    <td style="padding:7px 8px;font-weight:700;font-size:14px;color:${scoreColor(s.convictionScore)};text-align:center">${s.convictionScore}</td>
    <td style="padding:7px 8px;color:#94a3b8;font-size:12px;white-space:nowrap">$${s.entryPrice.toFixed(2)}</td>
    <td style="padding:7px 8px;color:#ef4444;font-size:12px;white-space:nowrap">$${s.stopLoss.toFixed(2)}</td>
    <td style="padding:7px 8px;color:#22c55e;font-size:12px;white-space:nowrap">$${s.targets.oneWeek.toFixed(2)}</td>
    <td style="padding:7px 8px;font-size:12px;white-space:nowrap;color:${returnColor(s.expectedReturn)};font-weight:600">${s.expectedReturn > 0 ? "+" : ""}${s.expectedReturn}%</td>
    <td style="padding:7px 8px;font-size:12px;white-space:nowrap">${revGrowth}</td>
    <td style="padding:7px 8px;font-size:12px;white-space:nowrap;color:${riskColor(s.riskRating)};font-weight:600">${s.riskRating}</td>
  </tr>`;
}

function sectionDivider(emoji: string, label: string, count: number) {
  return `
  <tr>
    <td colspan="10" style="padding:10px 8px 5px;background:#0f172a;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-top:2px solid #334155">
      ${emoji} ${label} &nbsp;<span style="color:#475569;font-weight:400">(${count} stocks)</span>
    </td>
  </tr>`;
}

export async function sendDigestEmail(
  report: ScanReport,
  summary: string,
  to: string | string[],
  timeLabel?: string   // e.g. "11am ET" for hourly emails; undefined = daily
) {
  const isHourly = report.scanType === "hourly";
  const isMorning = report.scanType === "morning";
  const emoji = isHourly ? "🕐" : isMorning ? "☀️" : "🌙";
  const titleLabel = isHourly
    ? `Intraday Scan — ${timeLabel ?? "Market Hours"}`
    : isMorning ? "Pre-Market Report" : "End-of-Day Report";

  // Sort all stocks by conviction score
  const allSorted = [...report.allStocks].sort((a, b) => b.convictionScore - a.convictionScore);
  const topPicks = allSorted.slice(0, 5);
  const preBreakout = (report.rankings.topPreBreakout ?? []).slice(0, 5);
  const shortSqueeze = (report.rankings.topShortSqueeze ?? []).slice(0, 5);

  // Buckets for full table
  const highConv = allSorted.filter((s) => s.convictionScore >= 65);
  const midConv  = allSorted.filter((s) => s.convictionScore >= 40 && s.convictionScore < 65);
  const watchlist = allSorted.filter((s) => s.convictionScore < 40);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PennyScout Report</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:700px;margin:0 auto;padding:16px">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e3a5f,#0f172a);border:1px solid #1e40af;border-radius:12px;padding:20px;margin-bottom:16px;text-align:center">
    <div style="font-size:28px;margin-bottom:6px">${emoji}</div>
    <h1 style="margin:0 0 4px;color:#38bdf8;font-size:22px;font-weight:700">PennyScout ${titleLabel}</h1>
    <div style="color:#94a3b8;font-size:13px">${report.date}${timeLabel ? ` &nbsp;·&nbsp; ${timeLabel}` : ""} &nbsp;·&nbsp; <strong style="color:#f1f5f9">${allSorted.length} stocks scanned</strong></div>
    <div style="margin-top:8px;color:#64748b;font-size:12px">
      Top pick: <strong style="color:#22c55e">${topPicks[0]?.ticker ?? "—"}</strong>
      &nbsp;·&nbsp; Score: <strong style="color:#f59e0b">${topPicks[0]?.convictionScore ?? "—"}/100</strong>
      &nbsp;·&nbsp; 🚀 ${(report.rankings.topPreBreakout?.length ?? 0)} pre-breakout
      &nbsp;·&nbsp; 🔥 ${(report.rankings.topShortSqueeze?.length ?? 0)} squeeze
    </div>
  </div>

  <!-- AI Summary -->
  <div style="background:#1e293b;border-left:4px solid #38bdf8;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:16px;color:#cbd5e1;font-size:14px;line-height:1.6">
    ${summary}
  </div>

  <!-- Top 5 Highlights -->
  <div style="background:#0f172a;border-radius:10px;padding:12px 14px;margin-bottom:16px">
    <div style="color:#38bdf8;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">🏆 Top 5 Highest Conviction</div>
    ${topPicks.map((s, i) => highlightCard(s, i + 1, "Pick")).join("")}
  </div>

  ${preBreakout.length > 0 ? `
  <!-- Pre-Breakout -->
  <div style="background:#0f172a;border-radius:10px;padding:12px 14px;margin-bottom:16px">
    <div style="color:#f59e0b;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">🚀 Pre-Breakout Candidates</div>
    ${preBreakout.map((s, i) => highlightCard(s, i + 1, "Pre-Breakout")).join("")}
  </div>` : ""}

  ${shortSqueeze.length > 0 ? `
  <!-- Short Squeeze -->
  <div style="background:#0f172a;border-radius:10px;padding:12px 14px;margin-bottom:16px">
    <div style="color:#ef4444;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">🔥 Short Squeeze Watch</div>
    ${shortSqueeze.map((s, i) => highlightCard(s, i + 1, "Squeeze")).join("")}
  </div>` : ""}

  <!-- Full Scan Results — Every Stock -->
  <div style="background:#1e293b;border-radius:10px;overflow:hidden;margin-bottom:16px">
    <div style="background:#0f172a;padding:12px 16px;border-bottom:1px solid #334155">
      <span style="color:#f1f5f9;font-weight:700;font-size:14px">📊 All ${allSorted.length} Stocks Scanned</span>
    </div>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
    <table style="width:100%;border-collapse:collapse;min-width:580px">
      <thead>
        <tr style="background:#0f172a">
          <th style="padding:7px 8px;text-align:left;color:#64748b;font-size:11px;font-weight:600;white-space:nowrap">Ticker</th>
          <th style="padding:7px 8px;text-align:left;color:#64748b;font-size:11px;font-weight:600">Company</th>
          <th style="padding:7px 8px;text-align:left;color:#64748b;font-size:11px;font-weight:600">Price</th>
          <th style="padding:7px 8px;text-align:center;color:#64748b;font-size:11px;font-weight:600">Score</th>
          <th style="padding:7px 8px;text-align:left;color:#64748b;font-size:11px;font-weight:600">Entry</th>
          <th style="padding:7px 8px;text-align:left;color:#64748b;font-size:11px;font-weight:600">Stop</th>
          <th style="padding:7px 8px;text-align:left;color:#64748b;font-size:11px;font-weight:600">1W Tgt</th>
          <th style="padding:7px 8px;text-align:left;color:#64748b;font-size:11px;font-weight:600">1Y Ret%</th>
          <th style="padding:7px 8px;text-align:left;color:#64748b;font-size:11px;font-weight:600">RevGro</th>
          <th style="padding:7px 8px;text-align:left;color:#64748b;font-size:11px;font-weight:600">Risk</th>
        </tr>
      </thead>
      <tbody>
        ${highConv.length > 0 ? sectionDivider("🟢", "High Conviction — Score ≥ 65", highConv.length) : ""}
        ${highConv.map((s, i) => compactRow(s, i)).join("")}
        ${midConv.length > 0 ? sectionDivider("🟡", "Watch List — Score 40–64", midConv.length) : ""}
        ${midConv.map((s, i) => compactRow(s, i)).join("")}
        ${watchlist.length > 0 ? sectionDivider("⚪", "Low Priority — Score < 40", watchlist.length) : ""}
        ${watchlist.map((s, i) => compactRow(s, i)).join("")}
      </tbody>
    </table>
    </div>
  </div>

  ${(report.executiveSummary.newAdditions?.length ?? 0) > 0 ? `
  <div style="background:#1e293b;border-radius:10px;padding:14px 16px;margin-bottom:16px">
    <div style="color:#22c55e;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">🆕 New vs Yesterday</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${report.executiveSummary.newAdditions!.map((t) =>
        `<span style="background:#16a34a20;border:1px solid #16a34a40;color:#22c55e;padding:4px 10px;border-radius:6px;font-family:monospace;font-size:13px;font-weight:700">${t}</span>`
      ).join("")}
    </div>
  </div>` : ""}

  ${(report.executiveSummary.newRisks?.length ?? 0) > 0 ? `
  <div style="background:#1e293b;border-radius:10px;padding:14px 16px;margin-bottom:16px">
    <div style="color:#ef4444;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">⚠️ High-Risk Alerts</div>
    ${report.executiveSummary.newRisks!.map((r) =>
      `<div style="color:#94a3b8;font-size:13px;padding:4px 0;border-bottom:1px solid #334155">${r}</div>`
    ).join("")}
  </div>` : ""}

  <!-- Footer -->
  <div style="text-align:center;color:#475569;font-size:11px;padding:16px 0;border-top:1px solid #1e293b;margin-top:8px">
    PennyScout · Not financial advice · Educational purposes only<br>
    Always do your own due diligence before trading.<br>
    <a href="https://penny-scout.vercel.app" style="color:#334155">penny-scout.vercel.app</a>
  </div>

</div>
</body>
</html>`;

  const subjectEmoji = isHourly ? "🕐" : isMorning ? "☀️" : "🌙";
  const subjectLabel = isHourly
    ? `${timeLabel ?? "Intraday"} Scan`
    : isMorning ? "Pre-Market" : "End-of-Day";

  await getTransport().sendMail({
    from: `PennyScout <${process.env.GMAIL_USER}>`,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject: `${subjectEmoji} PennyScout ${subjectLabel} — ${report.date} · ${allSorted.length} stocks · Top: ${topPicks[0]?.ticker ?? "—"} (${topPicks[0]?.convictionScore ?? "—"}/100)`,
    html,
  });
}
