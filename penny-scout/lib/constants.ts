/**
 * Global configuration constants
 *
 * Centralized settings for screening, scoring, and thresholds
 */

// ── Screening Thresholds ────────────────────────────────────────────────────
export const SCREEN = {
  /** Price range (USD) — exclude micro-cap and blue-chip extremes */
  PRICE_MIN: 1,
  PRICE_MAX: 500,

  /** Minimum daily volume (shares) — ensure liquidity */
  VOLUME_MIN: 100_000,

  /** Maximum float (shares) — focus on volatile small-cap candidates */
  FLOAT_MAX: 500_000_000,

  /** Minimum market cap (USD) — avoid shell companies */
  MARKET_CAP_MIN: 50_000_000,

  /** Relative volume threshold (>0.5x = above average activity) */
  RELATIVE_VOLUME_MIN: 0.5,
};

// ── Scoring Model Weights (must sum to 100) ────────────────────────────────
export const SCORING_WEIGHTS = {
  FINANCIAL_STRENGTH: 0.15,
  REVENUE_GROWTH: 0.15,
  PROFITABILITY: 0.1,
  CASH_POSITION: 0.1,
  INSIDER_OWNERSHIP: 0.08,
  INSTITUTIONAL_OWNERSHIP: 0.07,
  TECHNICAL_MOMENTUM: 0.12,
  RELATIVE_VOLUME: 0.08,
  CATALYSTS: 0.1,
  SECTOR_TAILWINDS: 0.07,
};

// ── Pump-and-Dump Detection ──────────────────────────────────────────────
export const PUMP_DETECTION = {
  /** Float threshold (shares) — tiny float = easy manipulation */
  FLOAT_THRESHOLD: 10_000_000,

  /** Relative volume spike — unusual activity */
  VOLUME_SPIKE_THRESHOLD: 5,

  /** Minimum social buzz requirement (messages or mentions) */
  SOCIAL_BUZZ_MIN: 100,

  /** Revenue threshold (USD) — no real business */
  REVENUE_THRESHOLD: 1_000_000,

  /** Price move threshold (%) — suspicious gain with no catalyst */
  PRICE_MOVE_THRESHOLD: 50,

  /** Triggers required to flag as pump-and-dump (3+ = flag) */
  TRIGGERS_REQUIRED: 3,
};

// ── Report Generation ────────────────────────────────────────────────────
export const REPORT = {
  /** Number of stocks to include in top picks */
  TOP_STOCKS_COUNT: 50,

  /** Limit for AI narrative generation (to control costs) */
  AI_NARRATIVE_LIMIT: 10,

  /** Minimum conviction score to include in report */
  MIN_CONVICTION_SCORE: 30,
};

// ── API Rate Limits (Free Tiers) ────────────────────────────────────────
export const RATE_LIMITS = {
  /** Groq: 14,400 requests/day free tier */
  GROQ_DAILY_LIMIT: 14_400,

  /** Finnhub: 60 calls/minute free tier */
  FINNHUB_RATE_PER_MIN: 60,

  /** Polygon.io: free tier limitations on minute bars */
  POLYGON_LIMITED: true,
};

// ── Market Hours (ET/US) ────────────────────────────────────────────────
export const MARKET_HOURS = {
  /** Market open (9:30am ET in minutes) */
  OPEN_TIME: 570,

  /** Market close (4:00pm ET in minutes) */
  CLOSE_TIME: 960,

  /** Scan interval during market hours (minutes) */
  SCAN_INTERVAL: 60,

  /** Time zones: US Eastern is UTC-5 (EST) or UTC-4 (EDT) */
  TIMEZONE_OFFSET_EST: -5,
  TIMEZONE_OFFSET_EDT: -4,
};

// ── Timeframes for Targeting ────────────────────────────────────────────
export const TIMEFRAMES = {
  DAY_TRADE: "today",
  SWING: "week",
  MEDIUM: "month",
  LONG_TERM: "longterm",
} as const;

// ── Cache & Persistence ────────────────────────────────────────────────
export const CACHE = {
  /** Cache fundamentals for 24 hours (86400 seconds) */
  STOCK_FUNDAMENTALS_TTL: 86400,

  /** Keep scan reports for 30 days before archiving */
  SCAN_REPORT_RETENTION_DAYS: 30,

  /** Refresh social signals hourly (3600 seconds) */
  SOCIAL_SIGNALS_TTL: 3600,
};
