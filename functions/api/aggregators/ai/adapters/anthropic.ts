/**
 * Anthropic Claude Messages API Adapter
 * Directly interfaces with Anthropic's /v1/messages endpoint
 */

import { AIProviderConfig, IAIProviderAdapter, ProviderQuotaTelemetry, SynthesisReport, SynthesisRequest } from '@/types/ai';
import { assembleSynthesisPrompt } from '../prompt-assembler';
import { extractLiveQuotaTelemetry } from '../usage-tracker';

export class AnthropicMessagesAdapter implements IAIProviderAdapter {
  id: string;
  name: string;

  constructor(id: string = 'anthropic', name: string = 'Anthropic Claude') {
    this.id = id;
    this.name = name;
  }

  async generateSynthesis(
    request: SynthesisRequest,
    config: AIProviderConfig
  ): Promise<{ report: SynthesisReport; telemetry: ProviderQuotaTelemetry }> {
    const startTime = Date.now();
    const { systemPrompt, userPrompt } = assembleSynthesisPrompt(request);

    const baseUrl = (config.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
    const endpoint = `${baseUrl}/messages`;
    const apiKey = config.apiKey || request.apiKeys?.[config.id] || request.apiKeys?.['anthropic'];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.defaultModel || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt + '\nIMPORTANT: Return ONLY valid, minified JSON matching the requested schema. Do not enclose in markdown blocks.',
        messages: [
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic (${response.status}): ${errText}`);
    }

    const responseBody: any = await response.json();
    const telemetry = extractLiveQuotaTelemetry({
      providerId: config.id,
      providerName: config.name,
      model: config.defaultModel || 'claude-3-5-sonnet-20241022',
      headers: response.headers,
      responseBody,
      latencyMs,
    });

    const rawContent = responseBody.content?.[0]?.text || '{}';
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
      modelUsed: config.defaultModel || 'claude-3-5-sonnet-20241022',
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
