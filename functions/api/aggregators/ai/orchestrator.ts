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

export class ModelOrchestrator {
  private adapters: Map<string, IAIProviderAdapter> = new Map();
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
      id: 'openai',
      name: 'OpenAI',
      protocol: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o-mini',
      enabled: true,
      headerQuotaMapping: {
        remainingTokens: 'x-ratelimit-remaining-tokens',
        remainingRequests: 'x-ratelimit-remaining-requests',
      },
    },
    {
      id: 'groq',
      name: 'Groq Cloud',
      protocol: 'openai-compatible',
      baseUrl: 'https://api.groq.com/openai/v1',
      defaultModel: 'llama-3.3-70b-versatile',
      enabled: true,
      headerQuotaMapping: {
        remainingTokens: 'x-ratelimit-remaining-tokens',
        remainingRequests: 'x-ratelimit-remaining-requests',
      },
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
  }

  /**
   * Registers ANY new custom AI provider dynamically
   */
  registerCustomProvider(config: AIProviderConfig): void {
    if (config.protocol === 'openai-compatible' || !this.adapters.has(config.id)) {
      this.adapters.set(config.id, new GenericOpenAICompatibleAdapter(config.id, config.name));
    }
  }

  /**
   * Synthesizes company intelligence with automatic multi-model failover
   */
  async synthesize(request: SynthesisRequest): Promise<{ report: SynthesisReport; telemetry: ProviderQuotaTelemetry }> {
    // Register any custom providers passed in the request
    if (request.customProviders && Array.isArray(request.customProviders)) {
      for (const customConfig of request.customProviders) {
        this.registerCustomProvider(customConfig);
      }
    }

    // Determine execution queue
    const allProviders: AIProviderConfig[] = [
      ...(request.customProviders || []),
      ...this.defaultProviders,
    ];

    // Priority: requested activeProviderId first, followed by other available providers with keys
    const preferredId = request.activeProviderId || 'gemini';
    const queue: AIProviderConfig[] = [];

    const preferred = allProviders.find(p => p.id === preferredId);
    if (preferred) queue.push(preferred);

    for (const p of allProviders) {
      if (p.id !== preferredId && p.enabled) {
        // Only queue if an API key is available
        const hasKey = p.apiKey || request.apiKeys?.[p.id];
        if (hasKey) {
          queue.push(p);
        }
      }
    }

    // If no provider has API keys configured, return a rich mock synthesis
    // so the user can test the UI and PDF generation immediately!
    if (queue.length === 0 || !this.hasAnyApiKey(request)) {
      return this.generateSimulatedReport(request);
    }

    // Execute with failover
    const errors: string[] = [];

    for (const providerConfig of queue) {
      try {
        let adapter = this.adapters.get(providerConfig.id);
        if (!adapter) {
          adapter = new GenericOpenAICompatibleAdapter(providerConfig.id, providerConfig.name);
          this.adapters.set(providerConfig.id, adapter);
        }

        const result = await adapter.generateSynthesis(request, providerConfig);
        return result;
      } catch (err: any) {
        errors.push(`[${providerConfig.name}]: ${err.message || String(err)}`);
        // Continue to next provider in failover queue
      }
    }

    // If all providers failed, fall back to simulated report with error warnings
    const fallback = this.generateSimulatedReport(request);
    fallback.report.globalSummary += ` (Note: Upstream AI providers encountered errors: ${errors.join('; ')})`;
    return fallback;
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
