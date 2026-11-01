/**
 * BusinessOS Merged Types for Single-User Financial OS
 */

export interface TrackedStock {
  id: string;
  ticker: string;
  symbol: string;
  name: string;
  exchange: 'NASDAQ' | 'NYSE' | 'NSE' | 'BSE' | string;
  country: 'US' | 'India' | string;
  currency: 'USD' | 'INR' | string;
  addedAt: string;
  notes?: string;

  // Live Telemetry (Enriched dynamically by Master Market API)
  livePrice?: number;
  changePercent?: number;
  marketCap?: string | number;
  peRatio?: number;
  yearLow?: number;
  yearHigh?: number;
  sector?: string;
  altmanZone?: 'safe' | 'grey' | 'distress';
  dupontRoe?: number;
  lastUpdated?: string;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modelUsed?: string;
  cached?: boolean;
  costSavedUsd?: number;
  citations?: {
    title: string;
    source: string;
    url?: string;
    quote?: string;
  }[];
  financialMetricsSnapshot?: {
    ticker: string;
    price: string;
    peRatio?: string;
    altmanScore?: string;
    dupontRoe?: string;
  }[];
}

export interface CopilotSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: CopilotMessage[];
}

export interface MarketIndexQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
  currency: string;
  region: 'US' | 'India' | 'Global';
  lastUpdated: string;
}

export interface OpportunitySignal {
  id: string;
  ticker: string;
  companyName: string;
  exchange: string;
  signalType: 'value_discount' | 'dupont_moat' | 'solvency_resilience' | 'breakout';
  title: string;
  description: string;
  confidence: 'High' | 'Medium' | 'Low';
  metrics: {
    peRatio?: number;
    altmanZScore?: number;
    dupontRoe?: number;
    currentRatio?: number;
  };
  detectedAt: string;
}

export interface OnboardingProgress {
  hasCompletedTour: boolean;
  checklistDismissed: boolean;
  completedTasks: string[];
  lastDismissedAt?: string;
}
