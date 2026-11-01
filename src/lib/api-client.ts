/**
 * Typed API Client for Cloudflare Edge Functions
 */

import { AggregationResult } from '../types/news';
import { AIProviderConfig, ProviderQuotaTelemetry, SynthesisReport } from '../types/ai';

export interface PipelineRunResponse {
  report: SynthesisReport;
  telemetry: ProviderQuotaTelemetry;
  aggregation: {
    totalUniqueArticles: number;
    sourcesQueried: number;
    executionTimeMs: number;
  };
}

export async function runFullPipeline(params: {
  companies: string[];
  userPrompt: string;
  activeProviderId?: string;
  customProviders?: AIProviderConfig[];
  apiKeys?: Record<string, string>;
  timeframeDays?: number;
  enableScraper?: boolean;
}): Promise<PipelineRunResponse> {
  const response = await fetch('/api/pipeline/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Pipeline failed with status ${response.status}`);
  }

  return await response.json();
}

export async function testEndpointConnection(params: {
  providerId: string;
  name?: string;
  apiKey?: string;
  baseUrl?: string;
  headerName?: string;
  headerPrefix?: string;
  queryParamName?: string;
  model?: string;
}): Promise<{
  valid: boolean;
  status: number;
  latencyMs: number;
  message: string;
  healthStatus: 'healthy' | 'degraded' | 'rate_limited' | 'unauthorized' | 'untested';
  availableModels?: string[];
  telemetry?: {
    remainingTokens?: number;
    remainingRequests?: number;
    limitTokens?: number;
    limitRequests?: number;
    resetTime?: string;
  };
}> {
  const response = await fetch('/api/sources/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  return await response.json();
}


export async function queryCopilotChat(params: {
  message: string;
  history?: Array<{ role: string; content: string }>;
  contextStocks?: Array<{ ticker: string; symbol?: string }>;
  apiKeys?: Record<string, string>;
  customProviders?: AIProviderConfig[];
  activeProviderId?: string;
}): Promise<{
  role: 'assistant';
  content: string;
  timestamp: string;
  modelUsed: string;
  providerUsed: string;
  cached?: boolean;
  costSavedUsd?: number;
  financialMetricsSnapshot?: Array<{ ticker: string; price: string; peRatio?: string }>;
  telemetry: ProviderQuotaTelemetry;
}> {
  const response = await fetch('/api/copilot/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Copilot request failed with status ${response.status}`);
  }

  return await response.json();
}

export async function fetchMarketIndices(): Promise<Array<{
  symbol: string;
  name: string;
  region: 'US' | 'India' | 'Global';
  price: number;
  change: number;
  percentChange: number;
  currency: string;
  lastUpdated: string;
}>> {
  const response = await fetch('/api/market/indices');
  if (!response.ok) {
    throw new Error(`Failed to fetch indices (${response.status})`);
  }
  const data = await response.json();
  return data.indices || [];
}

export async function fetchBatchQuotes(symbols: string[]): Promise<Record<string, any>> {
  if (!symbols || symbols.length === 0) return {};
  const response = await fetch(`/api/market/batch?symbols=${encodeURIComponent(symbols.join(','))}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch batch quotes (${response.status})`);
  }
  return await response.json();
}

export async function fetchStockOverview(symbol: string): Promise<any> {
  const response = await fetch(`/api/market/overview?symbol=${encodeURIComponent(symbol)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch overview for ${symbol} (${response.status})`);
  }
  return await response.json();
}

export async function searchMarketSymbols(query: string): Promise<Array<{
  symbol: string;
  name: string;
  exch: string;
  type: string;
}>> {
  if (!query || query.trim().length === 0) return [];
  const response = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.results || [];
}
