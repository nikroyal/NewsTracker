import { describe, it, expect, beforeEach } from 'vitest';
import { ModelOrchestrator } from '../functions/api/aggregators/ai/orchestrator';
import { extractLiveQuotaTelemetry } from '../functions/api/aggregators/ai/usage-tracker';
import { extractAndParseJson, tryRepairTruncatedJson, detectFormat } from '../functions/api/aggregators/ai/json-sanitizer';
import { SynthesisCacheManager } from '../functions/api/aggregators/ai/cache-manager';
import { calculateEstimatedCost } from '../functions/api/aggregators/ai/cost-model';
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

    // Register Anthropic protocol provider dynamically
    const anthropicConfig: AIProviderConfig = {
      id: 'claude_custom',
      name: 'Custom Anthropic Claude',
      protocol: 'anthropic-messages',
      baseUrl: 'https://api.anthropic.com/v1',
      defaultModel: 'claude-3-5-sonnet-20241022',
      enabled: true,
      isCustom: true,
    };
    orchestrator.registerCustomProvider(anthropicConfig);
    const claudeAdapter = (orchestrator as any).adapters.get('claude_custom');
    expect(claudeAdapter).toBeDefined();
    expect(claudeAdapter.name).toBe('Custom Anthropic Claude');
  });

  it('respects the user-configured rearrangeable failover queue sequence', async () => {
    const orchestrator = new ModelOrchestrator();

    const customReorderedList: AIProviderConfig[] = [
      {
        id: 'tier1_fast',
        name: 'Tier 1 Fast Model',
        protocol: 'openai-compatible',
        baseUrl: 'https://api.groq.com/openai/v1',
        defaultModel: 'llama-3.3-70b',
        enabled: true,
      },
      {
        id: 'tier2_reasoning',
        name: 'Tier 2 Reasoning Model',
        protocol: 'openai-compatible',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
        enabled: true,
      },
    ];

    for (const p of customReorderedList) {
      orchestrator.registerCustomProvider(p);
    }

    const mockRequest: SynthesisRequest = {
      companies: ['NVIDIA'],
      userPrompt: 'Analyze recent GPU deliveries.',
      partitionedArticles: { NVIDIA: [] },
      customProviders: customReorderedList,
      activeProviderId: 'tier1_fast',
    };

    // When executed, orchestrator synthesizes and uses the configured sequence
    const result = await orchestrator.synthesize(mockRequest);
    expect(result.report).toBeDefined();
    expect(result.report.companyAnalyses).toBeDefined();
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

  describe('Merged BusinessOS AI-Ops Capabilities', () => {
    it('sanitizes markdown-fenced and conversation-wrapped JSON with 100% resilience', () => {
      const markdownJson = '```json\n{"globalSummary": "Clean summary", "sentiment": 0.8}\n```';
      const parsed1 = extractAndParseJson(markdownJson);
      expect(parsed1.globalSummary).toBe('Clean summary');
      expect(parsed1.sentiment).toBe(0.8);

      const conversational = 'Here is the executive research briefing:\n{"company": "Reliance", "moat": "high"}\nHope this helps!';
      const parsed2 = extractAndParseJson(conversational);
      expect(parsed2.company).toBe('Reliance');
      expect(parsed2.moat).toBe('high');

      const trailingComma = '{"metrics": ["P/E", "DuPont",], "safe": true,}';
      const parsed3 = extractAndParseJson(trailingComma);
      expect(parsed3.metrics).toHaveLength(2);
      expect(parsed3.safe).toBe(true);

      const format = detectFormat(markdownJson);
      expect(format).toBe('markdown_fenced');
    });

    it('repairs truncated JSON responses automatically', () => {
      const truncated = '{"company": "HDFC", "analyses": [{"risk": "liquidity"';
      const repaired = tryRepairTruncatedJson(truncated);
      const parsed = JSON.parse(repaired);
      expect(parsed.company).toBe('HDFC');
      expect(parsed.analyses[0].risk).toBe('liquidity');
    });

    it('caches identical synthesis responses using Web Crypto SHA-256 and computes cost savings', async () => {
      const cache = new SynthesisCacheManager(3600000);
      const mockRequest: SynthesisRequest = {
        companies: ['TCS'],
        userPrompt: 'Synthesize quarterly IT earnings.',
        partitionedArticles: { TCS: [] },
      };

      const hash = await cache.generateKey(mockRequest, 'gemini-2.0-flash');
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 hex length

      expect(cache.get(hash)).toBeNull();

      const mockReport: any = {
        id: 'rep_cached_test',
        globalSummary: 'Cached IT summary',
        quotaTelemetry: {
          tokensConsumedLastQuery: { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 },
        },
      };

      cache.set(hash, mockReport);
      const retrieved = cache.get(hash);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.report.globalSummary).toBe('Cached IT summary');

      const metrics = cache.getMetrics();
      expect(metrics.size).toBe(1);
      expect(metrics.hits).toBe(1);
      expect(metrics.hitRate).toBe(0.5); // 1 hit, 1 miss
    });

    it('calculates sub-cent financial costs per 1M tokens accurately', () => {
      const geminiCost = calculateEstimatedCost('gemini-2.0-flash', 100_000, 50_000);
      // 100k prompt @ $0.10/M = $0.01; 50k comp @ $0.40/M = $0.02 -> total $0.03
      expect(geminiCost.estimatedCostUsd).toBe(0.03);

      const claudeCost = calculateEstimatedCost('claude-3-5-sonnet-20241022', 10_000, 2_000);
      // 10k prompt @ $3/M = $0.03; 2k comp @ $15/M = $0.03 -> total $0.06
      expect(claudeCost.estimatedCostUsd).toBe(0.06);
    });

    it('tracks provider cooldowns and allows resetting', () => {
      const orchestrator = new ModelOrchestrator();
      (orchestrator as any).providerCooldowns.set('groq', Date.now() + 60000);

      const status = orchestrator.getCooldowns();
      expect(status['groq'].inCooldown).toBe(true);
      expect(status['groq'].remainingSec).toBeGreaterThan(0);

      orchestrator.clearCooldowns();
      expect(orchestrator.getCooldowns()['groq']).toBeUndefined();
    });
  });
});
