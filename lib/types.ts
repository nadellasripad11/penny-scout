export interface StockData {
  ticker: string;
  company: string;
  sector: string;
  industry: string;
  price: number;
  marketCap: number;
  enterpriseValue?: number;
  // Financials
  revenue?: number;
  revenueGrowthYoY?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  eps?: number;
  // Balance sheet
  cash?: number;
  totalDebt?: number;
  debtToEquity?: number;
  currentRatio?: number;
  bookValue?: number;
  freeCashFlow?: number;
  cashBurnRate?: number;
  // Trading stats
  avgVolume?: number;
  volume?: number;
  relativeVolume?: number;
  float?: number;
  sharesOutstanding?: number;
  shortInterest?: number;
  daysToCover?: number;
  // Ownership
  insiderOwnership?: number;
  institutionalOwnership?: number;
  // Valuation
  ps?: number;
  pb?: number;
  evRevenue?: number;
  evEbitda?: number;
  pegRatio?: number;
  fairValue?: number;
  analystRating?: string;
  analystPriceTarget?: number;      // mean consensus (real)
  analystTargetHigh?: number;       // highest analyst target (real)
  analystTargetLow?: number;        // lowest analyst target (real)
  analystCount?: number;            // how many analysts cover it
  // Technical
  rsi14?: number;
  ma20?: number;
  ma50?: number;
  ma200?: number;
  support?: number;
  resistance?: number;
  trend?: "uptrend" | "downtrend" | "sideways";
  breakout?: boolean;
  momentumScore?: number;
  // Pre-breakout signals
  volumeTrend?: "building" | "declining" | "flat";
  consecutiveVolumeGrowthDays?: number;
  atrPercent?: number;           // ATR as % of price — low = coiling
  distFromResistancePct?: number; // how close to resistance breakout
  hasUpcomingEarnings?: boolean;
  // News/catalysts
  recentNews?: NewsItem[];
  recentInsiderTrades?: InsiderTrade[];
  catalysts?: string[];
  // Social signals
  stockTwitsBullishPct?: number;
  stockTwitsMessageCount?: number;
  stockTwitsBuzzLevel?: "high" | "medium" | "low";
  stockTwitsTopMessage?: string;
  redditMentions?: number;
  redditUpvotes?: number;
  redditBuzzLevel?: "high" | "medium" | "low" | "none";
  redditTopPost?: { title: string; upvotes: number; subreddit: string; url: string };
  recentSECFilings?: { form: string; filedAt: string; description: string; url: string }[];
  socialBuzzScore?: number;
  // Leadership
  ceo?: string;
  founder?: string;
  headquarters?: string;
  yearFounded?: number;
}

export interface NewsItem {
  headline: string;
  summary: string;
  source: string;
  datetime: number;
  sentiment?: "positive" | "negative" | "neutral";
  url?: string;
}

export interface InsiderTrade {
  name: string;
  title: string;
  transactionType: "buy" | "sell";
  shares: number;
  value: number;
  date: string;
  filingDate: string;
}

export interface ScoredStock extends StockData {
  convictionScore: number;
  riskRating: "Low" | "Medium" | "High" | "Very High";
  bullCase: string;
  bearCase: string;
  financialHealthAssessment: "Excellent" | "Good" | "Average" | "Weak";
  targets: {
    oneWeek: number;
    oneMonth: number;
    oneYear: number;
    threeYear: number;
  };
  entryPrice: number;
  stopLoss: number;
  expectedReturn: number;
  probabilityOfSuccess: number;
  timeframe: "today" | "week" | "month" | "longterm";
  aiNarrative?: string;
  hasAnalystTarget?: boolean;
  shortSqueezeScore?: number;
  preBreakoutScore?: number;
  pumpAndDumpWarning?: boolean;  // classic pump signals — treat with extreme caution
  marketRegimePenalty?: boolean; // score penalised because broader market is bearish
}

export interface PaperTrade {
  id: string;
  ticker: string;
  company: string;
  entryPrice: number;
  shares: number;
  positionValue: number;
  targetPrice: number;
  stopLoss: number;
  entryTimestamp: number;
  exitTimestamp?: number;
  exitPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  status: "open" | "closed";
  closeReason?: "target" | "stop_loss" | "manual" | "webhook";
  scanReportId: string;
  convictionScore: number;
}

export interface ScanReport {
  id: string;
  date: string;
  scanType: "morning" | "evening" | "hourly";
  timestamp: number;
  totalStocksFound: number;   // full NASDAQ penny universe found before top-N filter
  executiveSummary: {
    topToday: ScoredStock[];
    topWeek: ScoredStock[];
    topMonth: ScoredStock[];
    topLongTerm: ScoredStock[];
    topMultibaggers: ScoredStock[];
    biggestCatalyst: string;
    highestConvictionPick: ScoredStock;
    newAdditions: string[];
    removedStocks: string[];
    upgrades: string[];
    downgrades: string[];
    newInsiderBuying: string[];
    newInstitutionalBuying: string[];
    newRisks: string[];
  };
  rankings: {
    topTomorrow: ScoredStock[];
    topWeek: ScoredStock[];
    topMonth: ScoredStock[];
    topSwings: ScoredStock[];
    topLongTerm: ScoredStock[];
    topMultibaggers: ScoredStock[];
    topShortSqueeze: ScoredStock[];
    topPreBreakout: ScoredStock[];
  };
  allStocks: ScoredStock[];
  previousReportId?: string;
}
