/**
 * OpenRouter AI Adapter
 * Access to 100+ models with live remaining credit balance extraction
 */

import { AIProviderConfig, IAIProviderAdapter, ProviderQuotaTelemetry, SynthesisReport, SynthesisRequest } from '@/types/ai';
import { assembleSynthesisPrompt } from '../prompt-assembler';
import { extractLiveQuotaTelemetry, fetchOpenRouterLiveQuota } from '../usage-tracker';

export class OpenRouterAdapter implements IAIProviderAdapter {
  id = 'openrouter';
  name = 'OpenRouter';

  async generateSynthesis(
    request: SynthesisRequest,
    config: AIProviderConfig
  ): Promise<{ report: SynthesisReport; telemetry: ProviderQuotaTelemetry }> {
    const startTime = Date.now();
    const { systemPrompt, userPrompt } = assembleSynthesisPrompt(request);

    const apiKey = config.apiKey || request.apiKeys?.['openrouter'];
    if (!apiKey) {
      throw new Error('OpenRouter API Key is required. Please add it in Settings.');
    }

    const model = config.defaultModel || 'anthropic/claude-3.5-sonnet';
    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://newstracker.app',
        'X-Title': 'NewsTracker Intelligence Platform',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API (${response.status}): ${errText}`);
    }

    const responseBody: any = await response.json();
    let telemetry = extractLiveQuotaTelemetry({
      providerId: this.id,
      providerName: this.name,
      model,
      headers: response.headers,
      responseBody,
      latencyMs,
    });

    // Query live credit balance directly
    const liveQuota = await fetchOpenRouterLiveQuota(apiKey);
    telemetry = { ...telemetry, ...liveQuota };

    const rawContent = responseBody.choices?.[0]?.message?.content || '{}';
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      const cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      parsedJson = JSON.parse(cleaned);
    }

    const report: SynthesisReport = {
      id: 'rep_' + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      userPrompt: request.userPrompt,
      modelUsed: model,
      providerUsed: this.name,
      globalSummary: parsedJson.globalSummary || 'Analysis complete.',
      companyAnalyses: parsedJson.companyAnalyses || {},
      ecosystemImpactMatrix: parsedJson.ecosystemImpactMatrix || [],
      quotaTelemetry: telemetry,
      executionTimeMs: latencyMs,
    };

    return { report, telemetry };
  }
}
