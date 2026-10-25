/**
 * Cloudflare Edge API Router (Powered by Hono)
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { DataAggregatorCoordinator } from './aggregators/data';
import { ModelOrchestrator } from './aggregators/ai/orchestrator';

const app = new Hono().basePath('/api');

// CORS middleware
app.use('*', cors());

const dataAggregator = new DataAggregatorCoordinator();
const modelOrchestrator = new ModelOrchestrator();

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'NewsTracker Edge API', timestamp: new Date().toISOString() });
});

// 1. Ingest, deduplicate, and partition company news
app.post('/news/aggregate', async (c) => {
  try {
    const body = await c.req.json();
    const companies = body.companies || [];

    if (!Array.isArray(companies) || companies.length === 0) {
      return c.json({ error: 'At least one company must be specified' }, 400);
    }

    const result = await dataAggregator.aggregate({
      companies,
      timeframeDays: body.timeframeDays || 7,
      apiKeys: body.apiKeys || {},
      customSources: body.customSources || [],
      enableScraper: body.enableScraper !== false,
      maxScrapePerCompany: body.maxScrapePerCompany || 3,
    });

    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message || 'Data aggregation failed' }, 500);
  }
});

// 2. Synthesize partitioned company news with Model Orchestrator
app.post('/ai/synthesize', async (c) => {
  try {
    const body = await c.req.json();
    const result = await modelOrchestrator.synthesize(body);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message || 'Model orchestration failed' }, 500);
  }
});

// 3. Complete End-to-End Pipeline (Fetch -> Scrape -> Isolate -> Synthesize)
app.post('/pipeline/run', async (c) => {
  try {
    const body = await c.req.json();
    const companies = body.companies || [];

    if (!Array.isArray(companies) || companies.length === 0) {
      return c.json({ error: 'At least one company must be specified' }, 400);
    }

    // Step A: Aggregate & Partition News
    const aggResult = await dataAggregator.aggregate({
      companies,
      timeframeDays: body.timeframeDays || 7,
      apiKeys: body.apiKeys || {},
      customSources: body.customSources || [],
      enableScraper: body.enableScraper !== false,
      maxScrapePerCompany: body.maxScrapePerCompany || 3,
    });

    // Extract partitioned articles map
    const partitionedArticles: Record<string, any[]> = {};
    for (const company of companies) {
      partitionedArticles[company] = aggResult.partitionedResults[company]?.articles || [];
    }

    // Step B: Synthesize with Model Orchestrator
    const aiResult = await modelOrchestrator.synthesize({
      companies,
      userPrompt: body.userPrompt || '',
      partitionedArticles,
      activeProviderId: body.activeProviderId,
      customProviders: body.customProviders || [],
      apiKeys: body.apiKeys || {},
    });

    return c.json({
      report: aiResult.report,
      telemetry: aiResult.telemetry,
      aggregation: {
        totalUniqueArticles: aggResult.allArticles.length,
        sourcesQueried: aggResult.totalSourcesQueried,
        executionTimeMs: aggResult.executionTimeMs,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Pipeline execution failed' }, 500);
  }
});

// 4. In-UI Connection Ping Tester for API Keys & Custom Endpoints
app.post('/sources/test', async (c) => {
  const start = Date.now();
  try {
    const body = await c.req.json();
    const { providerId, apiKey, baseUrl, model } = body;

    if (!providerId) {
      return c.json({ error: 'providerId is required' }, 400);
    }

    // Test Gemini
    if (providerId === 'gemini') {
      if (!apiKey) return c.json({ valid: false, message: 'Missing API key' }, 400);
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const res = await fetch(testUrl);
      const latency = Date.now() - start;
      if (res.ok) {
        return c.json({ valid: true, status: 200, latencyMs: latency, message: 'Google Gemini Connected Successfully' });
      } else {
        return c.json({ valid: false, status: res.status, latencyMs: latency, message: 'Invalid Gemini API Key' });
      }
    }

    // Test OpenAI / Groq / OpenRouter / Custom OpenAI-compatible
    if (providerId === 'openai' || providerId === 'groq' || providerId === 'openrouter' || baseUrl) {
      const targetBase = (baseUrl || (
        providerId === 'openai' ? 'https://api.openai.com/v1' :
        providerId === 'groq' ? 'https://api.groq.com/openai/v1' :
        'https://openrouter.ai/api/v1'
      )).replace(/\/+$/, '');

      const testUrl = `${targetBase}/models`;
      const res = await fetch(testUrl, {
        headers: { ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}) },
      });
      const latency = Date.now() - start;

      if (res.ok) {
        return c.json({ valid: true, status: 200, latencyMs: latency, message: `${providerId.toUpperCase()} Connected Successfully` });
      } else {
        return c.json({ valid: false, status: res.status, latencyMs: latency, message: `Failed to connect to ${providerId} (${res.status})` });
      }
    }

    // Test Finnhub
    if (providerId === 'finnhub') {
      if (!apiKey) return c.json({ valid: false, message: 'Missing Finnhub API key' }, 400);
      const testUrl = `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`;
      const res = await fetch(testUrl);
      const latency = Date.now() - start;
      if (res.ok) {
        return c.json({ valid: true, status: 200, latencyMs: latency, message: 'Finnhub API Connected Successfully' });
      } else {
        return c.json({ valid: false, status: res.status, latencyMs: latency, message: 'Invalid Finnhub API Key' });
      }
    }

    return c.json({ valid: true, status: 200, latencyMs: Date.now() - start, message: 'Endpoint acknowledged' });
  } catch (error: any) {
    return c.json({ valid: false, status: 500, latencyMs: Date.now() - start, message: error.message || 'Connection failed' });
  }
});

// Export Cloudflare Pages Functions onRequest handler
export const onRequest = app.fetch;
export default app;
