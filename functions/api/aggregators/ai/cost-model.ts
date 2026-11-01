/**
 * AI Model Pricing & Cost Estimation
 * Inspired by sub-cent financial accounting in BusinessOS
 */

export interface ModelPricing {
  inputCostPer1M: number;
  outputCostPer1M: number;
}

export const KNOWN_MODEL_PRICING: Record<string, ModelPricing> = {
  // Google Gemini
  'gemini-2.0-flash': { inputCostPer1M: 0.10, outputCostPer1M: 0.40 },
  'gemini-1.5-flash': { inputCostPer1M: 0.075, outputCostPer1M: 0.30 },
  'gemini-1.5-pro': { inputCostPer1M: 1.25, outputCostPer1M: 5.00 },
  'gemini-2.0-pro-exp': { inputCostPer1M: 1.25, outputCostPer1M: 5.00 },
  'gemini-3.5-flash': { inputCostPer1M: 0.075, outputCostPer1M: 0.30 },

  // OpenAI
  'gpt-4o-mini': { inputCostPer1M: 0.15, outputCostPer1M: 0.60 },
  'gpt-4o': { inputCostPer1M: 2.50, outputCostPer1M: 10.00 },
  'gpt-4-turbo': { inputCostPer1M: 10.00, outputCostPer1M: 30.00 },
  'o1-mini': { inputCostPer1M: 1.10, outputCostPer1M: 4.40 },
  'o3-mini': { inputCostPer1M: 1.10, outputCostPer1M: 4.40 },

  // Anthropic
  'claude-3-5-sonnet-20241022': { inputCostPer1M: 3.00, outputCostPer1M: 15.00 },
  'claude-3-5-haiku-20241022': { inputCostPer1M: 0.80, outputCostPer1M: 4.00 },
  'anthropic/claude-3.5-sonnet': { inputCostPer1M: 3.00, outputCostPer1M: 15.00 },

  // Groq / Meta Open-Weights
  'llama-3.3-70b-versatile': { inputCostPer1M: 0.59, outputCostPer1M: 0.79 },
  'llama-3.1-8b-instant': { inputCostPer1M: 0.05, outputCostPer1M: 0.08 },
  'deepseek-r1-distill-llama-70b': { inputCostPer1M: 0.59, outputCostPer1M: 0.79 },

  // OpenRouter Free & Localhost
  'openrouter/free': { inputCostPer1M: 0.00, outputCostPer1M: 0.00 },
  'localhost': { inputCostPer1M: 0.00, outputCostPer1M: 0.00 },
};

const DEFAULT_PRICING: ModelPricing = {
  inputCostPer1M: 0.20,
  outputCostPer1M: 0.80,
};

export function getModelPricing(modelId: string): ModelPricing {
  if (!modelId) return DEFAULT_PRICING;
  const normalized = modelId.toLowerCase();

  for (const [key, pricing] of Object.entries(KNOWN_MODEL_PRICING)) {
    if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
      return pricing;
    }
  }

  return DEFAULT_PRICING;
}

export function calculateEstimatedCost(
  modelId: string,
  promptTokens: number = 0,
  completionTokens: number = 0
): { estimatedCostUsd: number; inputCostPer1M: number; outputCostPer1M: number } {
  const pricing = getModelPricing(modelId);
  const promptCost = (promptTokens / 1_000_000) * pricing.inputCostPer1M;
  const completionCost = (completionTokens / 1_000_000) * pricing.outputCostPer1M;
  const estimatedCostUsd = Number((promptCost + completionCost).toFixed(6));

  return {
    estimatedCostUsd,
    inputCostPer1M: pricing.inputCostPer1M,
    outputCostPer1M: pricing.outputCostPer1M,
  };
}
