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
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}): Promise<{ valid: boolean; status?: number; latencyMs?: number; message?: string }> {
  const response = await fetch('/api/sources/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  return await response.json();
}
