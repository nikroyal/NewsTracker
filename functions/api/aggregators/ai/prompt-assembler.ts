/**
 * Prompt Assembler: Combines System Analyst Instructions, User Custom Prompt, and Company-Isolated News
 */

import { CanonicalArticle } from '@/types/news';
import { SynthesisRequest } from '@/types/ai';

export interface AssembledPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export function assembleSynthesisPrompt(request: SynthesisRequest): AssembledPrompt {
  const { companies, userPrompt, partitionedArticles } = request;

  const systemPrompt = `You are a Senior Wall Street Equity Research Analyst and Corporate Intelligence Specialist.
Your task is to analyze aggregated, deduplicated news across a specified roster of companies and produce an executive-grade intelligence report.

CRITICAL INSTRUCTIONS:
1. STRICT DATA ISOLATION: Each company must be analyzed strictly on its own unique news payload. Do NOT conflate or copy findings across different companies.
2. CREDIBLE CITATIONS: For every key insight, catalyst, or risk, cite the specific article source using its Article ID, Title, and Domain.
3. OBJECTIVE SENTIMENT: Provide a calibrated sentiment score between -1.0 (extremely bearish/catastrophic) and +1.0 (extremely bullish/transformational), centered around 0.0 (neutral).
4. CRITICAL EVENT DETECTION: Explicitly flag high-volatility events (e.g. CEO resignations, SEC or regulatory investigations, M&A acquisitions, lawsuits, earnings surprises).
5. ECOSYSTEM IMPACT MATRIX: Analyze secondary ripple effects between the tracked companies (e.g., if one company's news impacts another's supply chain or market share).
6. OUTPUT FORMAT: You must reply with STRICT JSON ONLY matching the requested schema. Do not include markdown code block ticks outside the JSON.`;

  // Format company news payload
  let companiesNewsPayload = '';

  for (const company of companies) {
    const articles = partitionedArticles[company] || [];
    companiesNewsPayload += `\n### COMPANY: ${company.toUpperCase()}\n`;
    companiesNewsPayload += `Total Unique Articles Available: ${articles.length}\n`;

    if (articles.length === 0) {
      companiesNewsPayload += `(No recent breaking articles found for this company in the current timeframe)\n`;
      continue;
    }

    articles.forEach((art: CanonicalArticle, index: number) => {
      companiesNewsPayload += `\n[Article ${index + 1}] ID: ${art.id}\n`;
      companiesNewsPayload += `Headline: ${art.title}\n`;
      companiesNewsPayload += `Source: ${art.source.name} (${art.source.domain}) | Credibility Score: ${art.source.credibilityScore}\n`;
      companiesNewsPayload += `Published: ${art.publishedAt}\n`;
      companiesNewsPayload += `Summary: ${art.summary}\n`;
      if (art.content && art.content.length > 50) {
        // Truncate to 1000 chars per article if very long to stay within context
        const excerpt = art.content.length > 1000 ? art.content.substring(0, 1000) + '...' : art.content;
        companiesNewsPayload += `Full Text Excerpt: ${excerpt}\n`;
      }
      companiesNewsPayload += `URL: ${art.url}\n`;
    });
  }

  const promptContent = `## USER CUSTOM PROMPT / FOCUS:
${userPrompt || 'Provide an exhaustive corporate intelligence digest highlighting growth catalysts, strategic risks, leadership moves, and regulatory actions.'}

## TRACKED COMPANIES:
${companies.join(', ')}

## INGESTED COMPANY NEWS PAYLOAD:
${companiesNewsPayload}

## REQUIRED JSON OUTPUT SCHEMA:
{
  "globalSummary": "string (high-level executive briefing across all entities)",
  "companyAnalyses": {
    "<CompanyName>": {
      "company": "<CompanyName>",
      "executiveSummary": "string",
      "sentimentScore": number (-1.0 to 1.0),
      "sentimentLabel": "strongly_bearish" | "bearish" | "neutral" | "bullish" | "strongly_bullish",
      "keyCatalysts": ["string", "string"],
      "keyRisks": ["string", "string"],
      "criticalEvents": [
        {
          "title": "string",
          "type": "leadership" | "regulatory" | "m&a" | "litigation" | "earnings",
          "severity": "high" | "medium" | "low",
          "description": "string"
        }
      ],
      "verifiedSourceCitations": [
        {
          "articleId": "string",
          "title": "string",
          "url": "string",
          "sourceName": "string",
          "credibilityScore": number,
          "relevanceQuote": "string"
        }
      ]
    }
  },
  "ecosystemImpactMatrix": [
    {
      "driverCompany": "string",
      "impactedCompany": "string",
      "impactType": "catalyst" | "headwind" | "neutral_dependency",
      "summary": "string",
      "confidence": number (0.0 to 1.0)
    }
  ]
}`;

  return {
    systemPrompt,
    userPrompt: promptContent,
  };
}
