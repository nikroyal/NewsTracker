/**
 * Google Gemini AI Adapter (GenerativeLanguage API)
 */

import { AIProviderConfig, IAIProviderAdapter, ProviderQuotaTelemetry, SynthesisReport, SynthesisRequest } from '@/types/ai';
import { assembleSynthesisPrompt } from '../prompt-assembler';
import { extractLiveQuotaTelemetry } from '../usage-tracker';

export class GeminiAdapter implements IAIProviderAdapter {
  id = 'gemini';
  name = 'Google Gemini';

  async generateSynthesis(
    request: SynthesisRequest,
    config: AIProviderConfig
  ): Promise<{ report: SynthesisReport; telemetry: ProviderQuotaTelemetry }> {
    const startTime = Date.now();
    const { systemPrompt, userPrompt } = assembleSynthesisPrompt(request);

    const apiKey = config.apiKey || request.apiKeys?.['gemini'];
    if (!apiKey) {
      throw new Error('Google Gemini API Key is required. Please add it in Settings.');
    }

    const model = config.defaultModel || 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Gemini API (${response.status}): ${errText}`);
    }

    const responseBody: any = await response.json();
    const telemetry = extractLiveQuotaTelemetry({
      providerId: this.id,
      providerName: this.name,
      model,
      headers: response.headers,
      responseBody,
      latencyMs,
    });

    const candidateText = responseBody.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(candidateText);
    } catch {
      const cleaned = candidateText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
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
