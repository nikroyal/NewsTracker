/**
 * Universal OpenAI-Compatible AI Provider Adapter
 * Works with ANY standard OpenAI-compatible API (DeepSeek, Together AI, Mistral, Groq, Ollama, vLLM, custom endpoints)
 */

import { AIProviderConfig, IAIProviderAdapter, ProviderQuotaTelemetry, SynthesisReport, SynthesisRequest } from '@/types/ai';
import { assembleSynthesisPrompt } from '../prompt-assembler';
import { extractLiveQuotaTelemetry } from '../usage-tracker';

export class GenericOpenAICompatibleAdapter implements IAIProviderAdapter {
  id: string;
  name: string;

  constructor(id: string = 'openai-compatible', name: string = 'OpenAI-Compatible Model') {
    this.id = id;
    this.name = name;
  }

  async generateSynthesis(
    request: SynthesisRequest,
    config: AIProviderConfig
  ): Promise<{ report: SynthesisReport; telemetry: ProviderQuotaTelemetry }> {
    const startTime = Date.now();
    const { systemPrompt, userPrompt } = assembleSynthesisPrompt(request);

    const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const endpoint = `${baseUrl}/chat/completions`;
    const apiKey = config.apiKey || request.apiKeys?.[config.id] || request.apiKeys?.['openai'];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.defaultModel || 'gpt-4o-mini',
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
      throw new Error(`AI Provider ${config.name} (${response.status}): ${errText}`);
    }

    const responseBody: any = await response.json();
    const telemetry = extractLiveQuotaTelemetry({
      providerId: config.id,
      providerName: config.name,
      model: config.defaultModel,
      headers: response.headers,
      responseBody,
      latencyMs,
      customMapping: config.headerQuotaMapping,
    });

    const rawContent = responseBody.choices?.[0]?.message?.content || '{}';
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      // Clean possible markdown code fences
      const cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      parsedJson = JSON.parse(cleaned);
    }

    const report: SynthesisReport = {
      id: 'rep_' + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      userPrompt: request.userPrompt,
      modelUsed: config.defaultModel,
      providerUsed: config.name,
      globalSummary: parsedJson.globalSummary || 'Analysis complete.',
      companyAnalyses: parsedJson.companyAnalyses || {},
      ecosystemImpactMatrix: parsedJson.ecosystemImpactMatrix || [],
      quotaTelemetry: telemetry,
      executionTimeMs: latencyMs,
    };

    return { report, telemetry };
  }
}
