/**
 * Model Orchestrator & AI Types
 */

import { CanonicalArticle } from './news';

export interface UniversalApiKeyEntry {
  id: string;
  name: string;               // e.g. "Google Gemini", "Groq Llama 3", "Polygon Financials", "AlphaVantage", "Custom LLM"
  category: 'ai' | 'data' | 'other';
  providerType: 'openai-compatible' | 'gemini-v1' | 'anthropic-messages' | 'generic-rest' | 'header-auth';
  baseUrl?: string;           // endpoint base URL (e.g. https://api.openai.com/v1, https://api.perplexity.ai)
  apiKey: string;             // secret key or token
  headerName?: string;        // e.g. "Authorization", "X-Api-Key", "token"
  headerPrefix?: string;      // e.g. "Bearer", ""
  queryParamName?: string;    // e.g. "apikey", "token"
  modelId?: string;           // e.g. "gemini-2.0-flash", "llama-3.3-70b", "gpt-4o"
  testUrl?: string;           // URL to ping when testing connection
  enabled: boolean;
  notes?: string;
  updatedAt: string;
}

export interface ProviderQuotaTelemetry {
  providerId: string;
  providerName: string;
  model: string;
  remainingTokens?: number;
  limitTokens?: number;
  remainingRequests?: number;
  limitRequests?: number;
  resetTokensTimestamp?: string;
  resetRequestsTimestamp?: string;
  creditBalanceUsd?: number;
  isFreeTier?: boolean;
  lastQueryCostUsd?: number;
  latencyMs: number;
  tokensConsumedLastQuery?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProviderConfig {
  id: string;
  name: string;
  protocol: 'openai-compatible' | 'gemini-v1' | 'anthropic-messages' | 'generic-rest';
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  enabled: boolean;
  isCustom?: boolean;
  headerQuotaMapping?: {
    remainingTokens?: string;    // e.g. "x-ratelimit-remaining-tokens"
    remainingRequests?: string;  // e.g. "x-ratelimit-remaining-requests"
    limitTokens?: string;        // e.g. "x-ratelimit-limit-tokens"
    resetTokens?: string;        // e.g. "x-ratelimit-reset-tokens"
  };
  accountUsageEndpoint?: string; // e.g. "/api/v1/auth/key" for OpenRouter
}

export interface EcosystemImpactRow {
  driverCompany: string;
  impactedCompany: string;
  impactType: 'catalyst' | 'headwind' | 'neutral_dependency';
  summary: string;
  confidence: number;
}

export interface CompanyAnalysis {
  company: string;
  executiveSummary: string;
  sentimentScore: number; // -1.0 to +1.0
  sentimentLabel: 'strongly_bearish' | 'bearish' | 'neutral' | 'bullish' | 'strongly_bullish';
  keyCatalysts: string[];
  keyRisks: string[];
  criticalEvents: {
    title: string;
    type: 'leadership' | 'regulatory' | 'm&a' | 'litigation' | 'earnings';
    severity: 'high' | 'medium' | 'low';
    description: string;
  }[];
  verifiedSourceCitations: {
    articleId: string;
    title: string;
    url: string;
    sourceName: string;
    credibilityScore: number;
    relevanceQuote: string;
  }[];
}

export interface SynthesisReport {
  id: string;
  timestamp: string;
  userPrompt: string;
  modelUsed: string;
  providerUsed: string;
  globalSummary: string;
  companyAnalyses: Record<string, CompanyAnalysis>;
  ecosystemImpactMatrix: EcosystemImpactRow[];
  quotaTelemetry: ProviderQuotaTelemetry;
  executionTimeMs: number;
}

export interface SynthesisRequest {
  companies: string[];
  userPrompt: string;
  partitionedArticles: Record<string, CanonicalArticle[]>;
  activeProviderId?: string;
  customProviders?: AIProviderConfig[];
  apiKeys?: Record<string, string>;
  stream?: boolean;
}

export interface IAIProviderAdapter {
  id: string;
  name: string;
  generateSynthesis(
    request: SynthesisRequest,
    config: AIProviderConfig
  ): Promise<{ report: SynthesisReport; telemetry: ProviderQuotaTelemetry }>;
}
