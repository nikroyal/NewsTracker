/**
 * Central Model Orchestrator
 * Coordinates multi-provider AI execution, dynamic custom API registration, and smart auto-failover
 */

import {
  AIProviderConfig,
  IAIProviderAdapter,
  ProviderQuotaTelemetry,
  SynthesisReport,
  SynthesisRequest,
} from '@/types/ai';
import { CanonicalArticle } from '@/types/news';
import { GeminiAdapter } from './adapters/gemini';
import { OpenRouterAdapter } from './adapters/openrouter';
import { GenericOpenAICompatibleAdapter } from './adapters/generic-openai';
import { AnthropicMessagesAdapter } from './adapters/anthropic';
import { globalSynthesisCache } from './cache-manager';
import { calculateEstimatedCost } from './cost-model';

export class ModelOrchestrator {
  private adapters: Map<string, IAIProviderAdapter> = new Map();
  private providerCooldowns: Map<string, number> = new Map();
  private defaultProviders: AIProviderConfig[] = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      protocol: 'gemini-v1',
      baseUrl: 'https://generativelanguage.googleapis.com',
      defaultModel: 'gemini-2.0-flash',
      enabled: true,
    },
    {
      id: 'groq',
      name: 'Groq Cloud',
      protocol: 'openai-compatible',
      baseUrl: 'https://api.groq.com/openai/v1',
      defaultModel: 'llama-3.3-70b-versatile',
      enabled: true,
    },
    {
      id: 'openai',
      name: 'OpenAI',
      protocol: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o-mini',
      enabled: true,
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      protocol: 'openai-compatible',
      baseUrl: 'https://openrouter.ai/api/v1',
      defaultModel: 'anthropic/claude-3.5-sonnet',
      enabled: true,
    },
  ];

  constructor() {
    this.adapters.set('gemini', new GeminiAdapter());
    this.adapters.set('openrouter', new OpenRouterAdapter());
    this.adapters.set('openai', new GenericOpenAICompatibleAdapter('openai', 'OpenAI'));
    this.adapters.set('groq', new GenericOpenAICompatibleAdapter('groq', 'Groq'));
    this.adapters.set('anthropic', new AnthropicMessagesAdapter('anthropic', 'Anthropic Claude'));
  }

  /**
   * Registers ANY new custom AI provider dynamically
   */
  registerCustomProvider(config: AIProviderConfig): void {
    if (config.protocol === 'anthropic-messages') {
      this.adapters.set(config.id, new AnthropicMessagesAdapter(config.id, config.name));
    } else if (config.protocol === 'gemini-v1') {
      this.adapters.set(config.id, new GeminiAdapter());
    } else {
      this.adapters.set(config.id, new GenericOpenAICompatibleAdapter(config.id, config.name));
    }
  }

  /**
   * Synthesizes company intelligence with automatic multi-model failover strictly in user-configured order
   */
  async synthesize(request: SynthesisRequest): Promise<{ report: SynthesisReport; telemetry: ProviderQuotaTelemetry }> {
    // Register any custom providers passed in the request
    if (request.customProviders && Array.isArray(request.customProviders)) {
      for (const customConfig of request.customProviders) {
        this.registerCustomProvider(customConfig);
      }
    }

    // Determine execution queue:
    // If user provided a custom / configured provider list, strictly use that list in their exact sequence!
    const allProviders: AIProviderConfig[] = (request.customProviders && request.customProviders.length > 0)
      ? request.customProviders
      : this.defaultProviders;

    // Priority: requested activeProviderId first, followed by other providers in their exact rearrangeable order
    const preferredId = request.activeProviderId || allProviders[0]?.id || 'gemini';
    const queue: AIProviderConfig[] = [];

    const preferred = allProviders.find(p => p.id === preferredId);
    if (preferred && preferred.enabled) {
      queue.push(preferred);
    }

    for (const p of allProviders) {
      if (p.id !== preferredId && p.enabled) {
        // Queue if an API key is available or if provider is free tier / self-hosted
        const hasKey = p.apiKey || request.apiKeys?.[p.id] || (p.baseUrl && (p.baseUrl.includes('localhost') || p.baseUrl.includes('127.0.0.1')));
        if (hasKey) {
          queue.push(p);
        }
      }
    }

    // 1. Dual-Layer Edge Response Cache Check (inspired by BusinessOS SHA-256 cache)
    const preferredModel = preferred?.defaultModel || 'gemini-2.0-flash';
    let cacheKey = '';
    if (!request.bypassCache) {
      try {
        cacheKey = await globalSynthesisCache.generateKey(request, preferredModel);
        const cached = globalSynthesisCache.get(cacheKey);
        if (cached) {
          const cost = calculateEstimatedCost(preferredModel, cached.promptTokens, cached.completionTokens);
          return {
            report: {
              ...cached.report,
              cached: true,
              costSavedUsd: cost.estimatedCostUsd,
              executionTimeMs: 1,
            },
            telemetry: {
              ...cached.report.quotaTelemetry,
              cached: true,
              costSavedUsd: cost.estimatedCostUsd,
              latencyMs: 1,
            },
          };
        }
      } catch {
        // Proceed with live execution if cache check encounters unexpected issue
      }
    }

    // If no provider has API keys configured, return a rich mock synthesis
    // so the user can test the UI and PDF generation immediately!
    if (queue.length === 0 || !this.hasAnyApiKey(request)) {
      return this.generateSimulatedReport(request);
    }

    // 2. Execute with failover and cooldown bypass
    const errors: string[] = [];

    for (const providerConfig of queue) {
      // Check active cooldown state (skip hammered / rate-limited providers immediately)
      const cooldownUntil = this.providerCooldowns.get(providerConfig.id) || 0;
      if (Date.now() < cooldownUntil) {
        const remainingSec = Math.ceil((cooldownUntil - Date.now()) / 1000);
        errors.push(`[${providerConfig.name}]: Skipping provider (cooling down for ${remainingSec}s due to previous rate limits)`);
        continue;
      }

      try {
        let adapter = this.adapters.get(providerConfig.id);
        if (!adapter) {
          adapter = new GenericOpenAICompatibleAdapter(providerConfig.id, providerConfig.name);
          this.adapters.set(providerConfig.id, adapter);
        }

        const result = await adapter.generateSynthesis(request, providerConfig);

        // 3. Sub-cent Financial Cost Estimation
        const pTokens = result.telemetry.tokensConsumedLastQuery?.promptTokens || 0;
        const cTokens = result.telemetry.tokensConsumedLastQuery?.completionTokens || 0;
        const cost = calculateEstimatedCost(providerConfig.defaultModel, pTokens, cTokens);
        result.telemetry.estimatedCostUsd = cost.estimatedCostUsd;
        result.report.quotaTelemetry.estimatedCostUsd = cost.estimatedCostUsd;

        // 4. Populate Edge Response Cache for instant subsequent recall
        if (cacheKey) {
          globalSynthesisCache.set(cacheKey, result.report);
        }

        return result;
      } catch (err: any) {
        const errMsg = err.message || String(err);
        errors.push(`[${providerConfig.name}]: ${errMsg}`);

        // Set cooldown if rate-limited (HTTP 429) or overloaded (HTTP 503)
        const isRateLimit = errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('quota');
        const isOverload = errMsg.includes('503') || errMsg.toLowerCase().includes('overloaded');
        if (isRateLimit || isOverload) {
          const cooldownDuration = providerConfig.cooldownDurationMs || 120_000;
          this.providerCooldowns.set(providerConfig.id, Date.now() + cooldownDuration);
        }
      }
    }

    // If all providers failed, fall back to simulated report with error warnings
    const fallback = this.generateSimulatedReport(request);
    fallback.report.globalSummary += ` (Note: Upstream AI providers encountered errors: ${errors.join('; ')})`;
    return fallback;
  }

  /**
   * Returns current active cooldowns across all providers
   */
  getCooldowns(): Record<string, { inCooldown: boolean; remainingSec: number }> {
    const result: Record<string, { inCooldown: boolean; remainingSec: number }> = {};
    const now = Date.now();
    for (const [providerId, cooldownUntil] of this.providerCooldowns.entries()) {
      const remainingSec = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
      result[providerId] = {
        inCooldown: remainingSec > 0,
        remainingSec,
      };
    }
    return result;
  }

  /**
   * Resets all provider cooldowns
   */
  clearCooldowns(): void {
    this.providerCooldowns.clear();
  }

  /**
   * Returns edge response cache telemetry metrics
   */
  getCacheMetrics(): { size: number; hits: number; misses: number; hitRate: number } {
    return globalSynthesisCache.getMetrics();
  }

  /**
   * Clears the edge response cache
   */
  clearCache(): void {
    globalSynthesisCache.clear();
  }

  private hasAnyApiKey(request: SynthesisRequest): boolean {
    if (!request.apiKeys) return false;
    return Object.values(request.apiKeys).some((k: string) => Boolean(k && k.trim().length > 5));
  }

  /**
   * High-fidelity simulated intelligence report for immediate out-of-the-box testing without keys
   */
  private generateSimulatedReport(request: SynthesisRequest): { report: SynthesisReport; telemetry: ProviderQuotaTelemetry } {
    const { companies, partitionedArticles } = request;
    const companyAnalyses: SynthesisReport['companyAnalyses'] = {};

    for (const company of companies) {
      const articles = partitionedArticles[company] || [];
      const hasArticles = articles.length > 0;

      const catalysts: string[] = [];
      const risks: string[] = [];
      const criticalEvents: any[] = [];
      const verifiedCitations: any[] = [];

      articles.slice(0, 3).forEach((art: CanonicalArticle, _i: number) => {
        verifiedCitations.push({
          articleId: art.id,
          title: art.title,
          url: art.url,
          sourceName: art.source.name,
          credibilityScore: art.source.credibilityScore,
          relevanceQuote: `Confirmed via ${art.source.name}: "${art.title}" published on ${art.publishedAt.split('T')[0]}.`,
        });

        if (art.isCriticalEvent) {
          criticalEvents.push({
            title: art.title,
            type: art.criticalEventType || 'regulatory',
            severity: 'high',
            description: `High-volatility event detected from ${art.source.name}.`,
          });
        }
      });

      if (catalysts.length === 0) {
        catalysts.push(`Expansion in core enterprise segments and operational execution.`);
        catalysts.push(`Positive market sentiment and momentum in ongoing technological development.`);
      }
      if (risks.length === 0) {
        risks.push(`Macroeconomic interest rate sensitivity and competitive landscape shifts.`);
        risks.push(`Potential regulatory scrutiny on multi-market integration.`);
      }

      companyAnalyses[company] = {
        company,
        executiveSummary: hasArticles
          ? `Analysis of ${articles.length} verified news reports indicates solid strategic positioning for ${company}. Key developments center around recent corporate announcements and market expansions.`
          : `No major new breaking headlines recorded in the current monitoring window for ${company}. Baseline operational parameters remain steady.`,
        sentimentScore: hasArticles ? 0.45 : 0.05,
        sentimentLabel: hasArticles ? 'bullish' : 'neutral',
        keyCatalysts: catalysts,
        keyRisks: risks,
        criticalEvents,
        verifiedSourceCitations: verifiedCitations,
      };
    }

    // Generate cross-company ecosystem impact matrix
    const matrix: SynthesisReport['ecosystemImpactMatrix'] = [];
    if (companies.length >= 2) {
      for (let i = 0; i < companies.length - 1; i++) {
        matrix.push({
          driverCompany: companies[i],
          impactedCompany: companies[i + 1],
          impactType: i % 2 === 0 ? 'catalyst' : 'headwind',
          summary: `${companies[i]}'s supply chain and product roadmap influence operational timelines for ${companies[i + 1]}.`,
          confidence: 0.85,
        });
      }
    }

    const telemetry: ProviderQuotaTelemetry = {
      providerId: 'demo-simulator',
      providerName: 'Simulated Engine (Add API Keys in Settings to Enable Live LLM)',
      model: 'demo-analyst-v1',
      remainingTokens: 1000000,
      remainingRequests: 5000,
      latencyMs: 180,
      tokensConsumedLastQuery: {
        promptTokens: 840,
        completionTokens: 620,
        totalTokens: 1460,
      },
    };

    const report: SynthesisReport = {
      id: 'rep_' + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      userPrompt: request.userPrompt,
      modelUsed: 'demo-analyst-v1',
      providerUsed: 'Demo Engine',
      globalSummary: `Executive briefing compiled across ${companies.length} tracked entities: ${companies.join(', ')}. Macro themes reflect disciplined capital allocation, innovation acceleration, and proactive risk management.`,
      companyAnalyses,
      ecosystemImpactMatrix: matrix,
      quotaTelemetry: telemetry,
      executionTimeMs: 180,
    };

    return { report, telemetry };
  }
}
