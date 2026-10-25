import { describe, it, expect } from 'vitest';
import { ModelOrchestrator } from '../functions/api/aggregators/ai/orchestrator';
import { extractLiveQuotaTelemetry } from '../functions/api/aggregators/ai/usage-tracker';
import { AIProviderConfig, SynthesisRequest } from '../src/types/ai';

describe('Model Orchestrator & Live Usage Meter', () => {
  it('extracts live quota telemetry directly from HTTP response headers with zero hardcoding', () => {
    const headers = {
      'x-ratelimit-remaining-tokens': '842100',
      'x-ratelimit-remaining-requests': '4990',
      'x-ratelimit-limit-tokens': '1000000',
      'x-ratelimit-reset-tokens': '24s',
    };

    const telemetry = extractLiveQuotaTelemetry({
      providerId: 'groq',
      providerName: 'Groq Cloud',
      model: 'llama-3.3-70b',
      headers,
      latencyMs: 145,
    });

    expect(telemetry.remainingTokens).toBe(842100);
    expect(telemetry.remainingRequests).toBe(4990);
    expect(telemetry.limitTokens).toBe(1000000);
    expect(telemetry.resetTokensTimestamp).toBe('24s');
    expect(telemetry.latencyMs).toBe(145);
  });

  it('can register ANY new custom AI API dynamically', () => {
    const orchestrator = new ModelOrchestrator();

    const customApiConfig: AIProviderConfig = {
      id: 'deepseek_custom',
      name: 'DeepSeek AI Gateway',
      protocol: 'openai-compatible',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: 'sk-test-deepseek-key',
      defaultModel: 'deepseek-chat',
      enabled: true,
      isCustom: true,
    };

    // Register dynamic API
    orchestrator.registerCustomProvider(customApiConfig);

    // Verify orchestrator recognized the adapter
    const adapter = (orchestrator as any).adapters.get('deepseek_custom');
    expect(adapter).toBeDefined();
    expect(adapter.id).toBe('deepseek_custom');
  });

  it('generates a high-fidelity intelligence report with company analyses and impact matrix', async () => {
    const orchestrator = new ModelOrchestrator();

    const mockRequest: SynthesisRequest = {
      companies: ['Apple', 'TSMC'],
      userPrompt: 'Analyze recent supply chain news and chip lead times.',
      partitionedArticles: {
        Apple: [
          {
            id: 'art_1',
            title: 'Apple Expands Custom Silicon Design Operations',
            summary: 'Apple is investing in custom architecture teams in Munich.',
            url: 'https://reuters.com/apple-silicon',
            canonicalUrl: 'https://reuters.com/apple-silicon',
            source: { name: 'Reuters', domain: 'reuters.com', credibilityScore: 0.96 },
            publishedAt: '2026-10-25T10:00:00Z',
            primaryCompany: 'Apple',
            matchedKeywords: ['Apple'],
          },
        ],
        TSMC: [
          {
            id: 'art_2',
            title: 'TSMC Begins 2nm Wafer Mass Production in Taiwan',
            summary: 'TSMC officially started commercial mass production of its 2-nanometer node.',
            url: 'https://bloomberg.com/tsmc-2nm',
            canonicalUrl: 'https://bloomberg.com/tsmc-2nm',
            source: { name: 'Bloomberg', domain: 'bloomberg.com', credibilityScore: 0.95 },
            publishedAt: '2026-10-25T09:00:00Z',
            primaryCompany: 'TSMC',
            matchedKeywords: ['TSMC'],
          },
        ],
      },
    };

    const result = await orchestrator.synthesize(mockRequest);

    expect(result.report).toBeDefined();
    expect(result.report.companyAnalyses['Apple']).toBeDefined();
    expect(result.report.companyAnalyses['TSMC']).toBeDefined();
    expect(result.report.ecosystemImpactMatrix.length).toBeGreaterThan(0);
    expect(result.telemetry.remainingTokens).toBeDefined();
  });
});
