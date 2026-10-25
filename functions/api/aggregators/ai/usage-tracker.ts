/**
 * Live Dynamic Usage & Quota Extractor
 * Parses rate-limit headers and usage endpoints directly from upstream AI providers with ZERO hardcoding
 */

import { ProviderQuotaTelemetry } from '@/types/ai';

export interface ParseHeaderOptions {
  providerId: string;
  providerName: string;
  model: string;
  headers: Headers | Record<string, string>;
  responseBody?: any;
  latencyMs: number;
  customMapping?: {
    remainingTokens?: string;
    remainingRequests?: string;
    limitTokens?: string;
    resetTokens?: string;
  };
}

export function extractLiveQuotaTelemetry(options: ParseHeaderOptions): ProviderQuotaTelemetry {
  const { providerId, providerName, model, headers, responseBody, latencyMs, customMapping } = options;

  const getHeader = (name: string): string | null => {
    if (!headers) return null;
    if (typeof (headers as Headers).get === 'function') {
      return (headers as Headers).get(name);
    }
    const record = headers as Record<string, string>;
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(record)) {
      if (k.toLowerCase() === lower) return String(v);
    }
    return null;
  };

  // 1. Parse remaining tokens
  let remainingTokens: number | undefined;
  const tokenHeaderKey = customMapping?.remainingTokens || 'x-ratelimit-remaining-tokens';
  const tokenHeaderVal = getHeader(tokenHeaderKey) || getHeader('anthropic-ratelimit-tokens-remaining');
  if (tokenHeaderVal) {
    const parsed = parseInt(tokenHeaderVal, 10);
    if (!isNaN(parsed)) remainingTokens = parsed;
  }

  // 2. Parse remaining requests
  let remainingRequests: number | undefined;
  const reqHeaderKey = customMapping?.remainingRequests || 'x-ratelimit-remaining-requests';
  const reqHeaderVal = getHeader(reqHeaderKey) || getHeader('anthropic-ratelimit-requests-remaining');
  if (reqHeaderVal) {
    const parsed = parseInt(reqHeaderVal, 10);
    if (!isNaN(parsed)) remainingRequests = parsed;
  }

  // 3. Parse limits
  let limitTokens: number | undefined;
  const limitTokenKey = customMapping?.limitTokens || 'x-ratelimit-limit-tokens';
  const limitTokenVal = getHeader(limitTokenKey);
  if (limitTokenVal) {
    const parsed = parseInt(limitTokenVal, 10);
    if (!isNaN(parsed)) limitTokens = parsed;
  }

  let limitRequests: number | undefined;
  const limitReqVal = getHeader('x-ratelimit-limit-requests');
  if (limitReqVal) {
    const parsed = parseInt(limitReqVal, 10);
    if (!isNaN(parsed)) limitRequests = parsed;
  }

  // 4. Parse reset timestamps
  let resetTokensTimestamp: string | undefined;
  const resetTokenKey = customMapping?.resetTokens || 'x-ratelimit-reset-tokens';
  const resetVal = getHeader(resetTokenKey) || getHeader('x-ratelimit-reset-requests');
  if (resetVal) {
    resetTokensTimestamp = resetVal;
  }

  // 5. Parse token counts from response body if present
  let tokensConsumedLastQuery: ProviderQuotaTelemetry['tokensConsumedLastQuery'];
  if (responseBody) {
    // Standard OpenAI/Groq/OpenRouter usage format
    if (responseBody.usage) {
      tokensConsumedLastQuery = {
        promptTokens: responseBody.usage.prompt_tokens || 0,
        completionTokens: responseBody.usage.completion_tokens || 0,
        totalTokens: responseBody.usage.total_tokens || 0,
      };
    }
    // Google Gemini usageMetadata format
    else if (responseBody.usageMetadata) {
      tokensConsumedLastQuery = {
        promptTokens: responseBody.usageMetadata.promptTokenCount || 0,
        completionTokens: responseBody.usageMetadata.candidatesTokenCount || 0,
        totalTokens: responseBody.usageMetadata.totalTokenCount || 0,
      };
    }
  }

  return {
    providerId,
    providerName,
    model,
    remainingTokens,
    limitTokens,
    remainingRequests,
    limitRequests,
    resetTokensTimestamp,
    latencyMs,
    tokensConsumedLastQuery,
  };
}

/**
 * Directly queries OpenRouter's live credit balance endpoint
 */
export async function fetchOpenRouterLiveQuota(apiKey: string): Promise<Partial<ProviderQuotaTelemetry>> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) return {};

    const json: any = await res.json();
    if (json?.data) {
      const data = json.data;
      const creditRemaining = data.limit !== null ? Math.max(0, (data.limit || 0) - (data.usage || 0)) : undefined;
      return {
        creditBalanceUsd: creditRemaining,
        isFreeTier: data.is_free_tier,
      };
    }
    return {};
  } catch {
    return {};
  }
}
