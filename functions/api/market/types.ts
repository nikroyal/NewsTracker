/**
 * Unified Financial Market Data Types
 * Merges capabilities from Indian-Stock-Market-API, yfinance, and FinanceToolkit
 */

export interface MarketQuote {
  symbol: string;
  normalizedSymbol: string;
  companyName: string;
  exchange: string;
  currency: string;
  lastPrice: number;
  change: number;
  percentChange: number;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  volume: number | null;
  averageVolume: number | null;
  marketCap: number | null;
  peRatio: number | null;
  forwardPE: number | null;
  dividendYield: number | null;
  eps: number | null;
  bookValue: number | null;
  sector: string;
  industry: string;
  lastUpdated: string;
}

export interface ChartCandle {
  timestamp: number;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface ChartData {
  symbol: string;
  currency: string;
  range: string;
  interval: string;
  previousClose: number | null;
  candles: ChartCandle[];
}

export interface FinancialStatements {
  symbol: string;
  currency: string;
  balanceSheet: {
    totalAssets: number | null;
    currentAssets: number | null;
    cashAndEquivalents: number | null;
    inventory: number | null;
    totalLiabilities: number | null;
    currentLiabilities: number | null;
    totalDebt: number | null;
    workingCapital: number | null;
    retainedEarnings: number | null;
    stockholdersEquity: number | null;
  };
  incomeStatement: {
    totalRevenue: number | null;
    costOfRevenue: number | null;
    grossProfit: number | null;
    operatingExpenses: number | null;
    operatingIncome: number | null; // EBIT
    ebitda: number | null;
    interestExpense: number | null;
    incomeTaxExpense: number | null;
    netIncome: number | null;
  };
  cashFlow: {
    operatingCashFlow: number | null;
    capitalExpenditures: number | null;
    freeCashFlow: number | null;
  };
  keyMetrics: {
    sharesOutstanding: number | null;
    enterpriseValue: number | null;
    beta: number | null;
  };
}

export interface FinancialRatios {
  symbol: string;
  valuation: {
    trailingPE: number | null;
    forwardPE: number | null;
    priceToBook: number | null;
    priceToSales: number | null;
    enterpriseValueToEbitda: number | null;
    enterpriseValueToRevenue: number | null;
    priceToFreeCashFlow: number | null;
    pegRatio: number | null;
  };
  profitability: {
    grossMarginPercent: number | null;
    operatingMarginPercent: number | null;
    netProfitMarginPercent: number | null;
    returnOnEquityPercent: number | null;
    returnOnAssetsPercent: number | null;
    returnOnCapitalEmployedPercent: number | null;
  };
  liquidityAndSolvency: {
    currentRatio: number | null;
    quickRatio: number | null;
    cashRatio: number | null;
    debtToEquity: number | null;
    debtToAssets: number | null;
    financialLeverage: number | null;
    interestCoverageRatio: number | null;
    netDebt: number | null;
  };
}

export interface DuPontAnalysis {
  symbol: string;
  threeStage: {
    netProfitMargin: number | null;
    assetTurnover: number | null;
    equityMultiplier: number | null; // Financial Leverage
    returnOnEquity: number | null; // NPM * AT * EM
  };
  fiveStage: {
    taxBurden: number | null;       // Net Income / EBT
    interestBurden: number | null;  // EBT / EBIT
    operatingMargin: number | null; // EBIT / Revenue
    assetTurnover: number | null;   // Revenue / Total Assets
    equityMultiplier: number | null;// Total Assets / Equity
    returnOnEquity: number | null;
  };
}

export interface FinancialHealthScores {
  symbol: string;
  altmanZScore: {
    score: number | null;
    zone: 'Safe Zone' | 'Grey Zone' | 'Distress Zone' | 'Insufficient Data';
    description: string;
    components: {
      workingCapitalToAssets: number | null;
      retainedEarningsToAssets: number | null;
      ebitToAssets: number | null;
      marketCapToLiabilities: number | null;
      salesToAssets: number | null;
    };
  };
  piotroskiFScoreEstimate: {
    score: number;
    maxScore: number;
    rating: 'Strong' | 'Average' | 'Weak';
  };
}

export interface MarketSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  sector?: string;
  industry?: string;
  source: 'nse_direct' | 'yahoo' | 'cache';
}

export interface MarketNewsItem {
  id: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  relatedTickers: string[];
}
