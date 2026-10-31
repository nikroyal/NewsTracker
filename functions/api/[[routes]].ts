/**
 * Cloudflare Edge API Router (Powered by Hono)
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { DataAggregatorCoordinator } from './aggregators/data';
import { ModelOrchestrator } from './aggregators/ai/orchestrator';
import { marketRouter } from './market/routes';
import { YahooFinanceEdgeClient } from './market/yahoo-client';
import { FinanceToolkitEngine } from './market/toolkit-formulas';

const app = new Hono().basePath('/api');

// CORS middleware
app.use('*', cors());

// Mount Master Financial Market Router (/api/market/*)
app.route('/market', marketRouter);

const dataAggregator = new DataAggregatorCoordinator();
const modelOrchestrator = new ModelOrchestrator();
const marketYahoo = new YahooFinanceEdgeClient();
const marketToolkit = new FinanceToolkitEngine();

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

    // Step B: Query Master Market API in parallel for real-time financials & health scores
    const companyMarketData: Record<string, any> = {};
    await Promise.all(
      companies.map(async (company) => {
        try {
          const quote = await marketYahoo.getQuote(company);
          if (quote) {
            const statements = await marketYahoo.getFinancials(company).catch(() => null);
            const ratios = statements ? marketToolkit.computeRatios(statements, quote) : null;
            const dupont = statements ? marketToolkit.computeDuPont(statements) : null;
            const scores = statements ? marketToolkit.computeScores(statements, quote) : null;
            companyMarketData[company] = { quote, ratios, dupont, scores };
          }
        } catch {
          // Graceful fallback for non-public entities
        }
      })
    );

    // Step C: Synthesize with Model Orchestrator (Enriched with Live Financial Intelligence)
    const aiResult = await modelOrchestrator.synthesize({
      companies,
      userPrompt: body.userPrompt || '',
      partitionedArticles,
      companyMarketData,
      activeProviderId: body.activeProviderId,
      customProviders: body.customProviders || [],
      apiKeys: body.apiKeys || {},
    });

    return c.json({
      report: {
        ...aiResult.report,
        companyMarketData,
      },
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

// 4. In-UI Connection Ping & Deep Probe Identifier
app.post('/sources/test', async (c) => {
  const start = Date.now();
  try {
    const body = await c.req.json();
    const {
      providerId,
      apiKey,
      baseUrl,
      headerName = 'Authorization',
      headerPrefix = 'Bearer',
      queryParamName,
    } = body;

    let targetBase = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
    let availableModels: string[] = [];
    let quotaTelemetry: any = undefined;

    // Helper to extract rate limit headers
    const extractHeaders = (res: Response) => {
      const remainingTokens = res.headers.get('x-ratelimit-remaining-tokens');
      const remainingRequests = res.headers.get('x-ratelimit-remaining-requests');
      const limitTokens = res.headers.get('x-ratelimit-limit-tokens');
      const limitRequests = res.headers.get('x-ratelimit-limit-requests');
      const resetTime = res.headers.get('x-ratelimit-reset-tokens') || res.headers.get('x-ratelimit-reset-requests');

      if (remainingTokens || remainingRequests || limitTokens) {
        quotaTelemetry = {
          remainingTokens: remainingTokens ? Number(remainingTokens) : undefined,
          remainingRequests: remainingRequests ? Number(remainingRequests) : undefined,
          limitTokens: limitTokens ? Number(limitTokens) : undefined,
          limitRequests: limitRequests ? Number(limitRequests) : undefined,
          resetTime: resetTime || undefined,
        };
      }
    };

    // 1. Google Gemini
    if (providerId === 'gemini' || targetBase.includes('generativelanguage.googleapis.com')) {
      if (!apiKey) return c.json({ valid: false, status: 400, healthStatus: 'unauthorized', message: 'Missing Gemini API key' }, 400);
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const res = await fetch(testUrl);
      const latency = Date.now() - start;
      extractHeaders(res);

      if (res.ok) {
        const json: any = await res.json().catch(() => ({}));
        if (Array.isArray(json?.models)) {
          availableModels = json.models
            .map((m: any) => m.name ? m.name.replace(/^models\//, '') : '')
            .filter((name: string) => name && !name.includes('embedding') && !name.includes('aqa'))
            .slice(0, 15);
        }
        return c.json({
          valid: true,
          status: 200,
          latencyMs: latency,
          healthStatus: 'healthy',
          message: `Google Gemini Verified (${availableModels.length} models discovered)`,
          availableModels,
          telemetry: quotaTelemetry,
        });
      } else {
        return c.json({
          valid: false,
          status: res.status,
          latencyMs: latency,
          healthStatus: res.status === 429 ? 'rate_limited' : 'unauthorized',
          message: res.status === 429 ? 'Gemini Quota Exceeded / Rate Limited' : 'Invalid Gemini API Key',
        });
      }
    }

    // 2. Anthropic Claude
    if (providerId === 'anthropic' || targetBase.includes('api.anthropic.com')) {
      if (!apiKey) return c.json({ valid: false, status: 400, healthStatus: 'unauthorized', message: 'Missing Anthropic API key' }, 400);
      const testUrl = 'https://api.anthropic.com/v1/models';
      const res = await fetch(testUrl, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      const latency = Date.now() - start;
      extractHeaders(res);

      if (res.ok) {
        const json: any = await res.json().catch(() => ({}));
        if (Array.isArray(json?.data)) {
          availableModels = json.data.map((m: any) => m.id).slice(0, 15);
        } else {
          availableModels = ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'];
        }
        return c.json({
          valid: true,
          status: 200,
          latencyMs: latency,
          healthStatus: 'healthy',
          message: `Anthropic Claude Connected (${availableModels.length} models available)`,
          availableModels,
          telemetry: quotaTelemetry,
        });
      } else {
        return c.json({
          valid: false,
          status: res.status,
          latencyMs: latency,
          healthStatus: res.status === 429 ? 'rate_limited' : 'unauthorized',
          message: res.status === 429 ? 'Anthropic Rate Limited' : `Anthropic Error (${res.status})`,
        });
      }
    }

    // 3. Finnhub News
    if (providerId === 'finnhub' || targetBase.includes('finnhub.io')) {
      if (!apiKey) return c.json({ valid: false, status: 400, healthStatus: 'unauthorized', message: 'Missing Finnhub API key' }, 400);
      const testUrl = `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`;
      const res = await fetch(testUrl);
      const latency = Date.now() - start;
      extractHeaders(res);

      if (res.ok) {
        return c.json({
          valid: true,
          status: 200,
          latencyMs: latency,
          healthStatus: 'healthy',
          message: 'Finnhub Financial News Stream Verified Active',
          telemetry: quotaTelemetry,
        });
      } else {
        return c.json({
          valid: false,
          status: res.status,
          latencyMs: latency,
          healthStatus: res.status === 429 ? 'rate_limited' : 'unauthorized',
          message: 'Invalid Finnhub API Token',
        });
      }
    }

    // 4. Alpha Vantage
    if (providerId === 'alphavantage' || targetBase.includes('alphavantage.co')) {
      if (!apiKey) return c.json({ valid: false, status: 400, healthStatus: 'unauthorized', message: 'Missing Alpha Vantage key' }, 400);
      const testUrl = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&limit=2&apikey=${apiKey}`;
      const res = await fetch(testUrl);
      const latency = Date.now() - start;
      extractHeaders(res);
      const text = await res.text();
      const valid = res.ok && !text.includes('Error Message') && !text.includes('Invalid API call');

      return c.json({
        valid,
        status: valid ? 200 : 401,
        latencyMs: latency,
        healthStatus: valid ? 'healthy' : 'unauthorized',
        message: valid ? 'Alpha Vantage News Feed Verified' : 'Alpha Vantage Authentication Failed',
        telemetry: quotaTelemetry,
      });
    }

    // 5. Standard OpenAI, Groq, OpenRouter, Perplexity, DeepSeek, Mistral, Together, Cerebras
    // OR ANY UNIDENTIFIED / CUSTOM AI OR REST ENDPOINT
    const authHeaders: Record<string, string> = {};
    if (apiKey) {
      if (headerName === 'queryParam' && queryParamName) {
        // will append to url below
      } else if (headerPrefix) {
        authHeaders[headerName] = `${headerPrefix} ${apiKey}`.trim();
      } else {
        authHeaders[headerName] = apiKey;
      }
    }

    if (!targetBase) {
      targetBase = providerId === 'openai' ? 'https://api.openai.com/v1' :
                   providerId === 'groq' ? 'https://api.groq.com/openai/v1' :
                   providerId === 'openrouter' ? 'https://openrouter.ai/api/v1' :
                   providerId === 'deepseek' ? 'https://api.deepseek.com/v1' :
                   providerId === 'mistral' ? 'https://api.mistral.ai/v1' :
                   providerId === 'perplexity' ? 'https://api.perplexity.ai' :
                   'https://api.openai.com/v1';
    }

    // Probe 1: Attempt to fetch live model catalog (/models)
    let probeUrl = `${targetBase}/models`;
    if (queryParamName && apiKey) {
      probeUrl += `?${encodeURIComponent(queryParamName)}=${encodeURIComponent(apiKey)}`;
    }

    let res = await fetch(probeUrl, {
      method: 'GET',
      headers: authHeaders,
    }).catch(() => null);

    let latency = Date.now() - start;

    if (res && res.ok) {
      extractHeaders(res);
      const json: any = await res.json().catch(() => ({}));
      if (Array.isArray(json?.data)) {
        availableModels = json.data
          .map((m: any) => typeof m === 'string' ? m : m.id)
          .filter(Boolean)
          .slice(0, 20);
      } else if (Array.isArray(json?.models)) {
        availableModels = json.models
          .map((m: any) => typeof m === 'string' ? m : m.id || m.name)
          .filter(Boolean)
          .slice(0, 20);
      }

      return c.json({
        valid: true,
        status: 200,
        latencyMs: latency,
        healthStatus: 'healthy',
        message: `${(body.name || providerId).toUpperCase()} Verified (${availableModels.length} models discovered)`,
        availableModels,
        telemetry: quotaTelemetry,
      });
    }

    // Probe 2: If /models returned 404 or failed (e.g. custom news/data REST API), probe base endpoint
    let fallbackProbeUrl = targetBase;
    if (queryParamName && apiKey) {
      fallbackProbeUrl += (fallbackProbeUrl.includes('?') ? '&' : '?') + `${encodeURIComponent(queryParamName)}=${encodeURIComponent(apiKey)}`;
    }

    res = await fetch(fallbackProbeUrl, {
      method: 'GET',
      headers: authHeaders,
    }).catch(() => null);

    latency = Date.now() - start;

    if (res && (res.ok || res.status === 204 || res.status === 304)) {
      extractHeaders(res);
      return c.json({
        valid: true,
        status: res.status,
        latencyMs: latency,
        healthStatus: 'healthy',
        message: `Custom Endpoint Connected (${res.status})`,
        telemetry: quotaTelemetry,
      });
    }

    if (res) {
      const healthStatus = res.status === 429 ? 'rate_limited' : (res.status === 401 || res.status === 403) ? 'unauthorized' : 'degraded';
      return c.json({
        valid: false,
        status: res.status,
        latencyMs: latency,
        healthStatus,
        message: `Endpoint response HTTP ${res.status} (${healthStatus.replace('_', ' ')})`,
      });
    }

    return c.json({
      valid: false,
      status: 504,
      latencyMs: latency,
      healthStatus: 'degraded',
      message: 'Connection timed out or host unreachable',
    });
  } catch (error: any) {
    return c.json({
      valid: false,
      status: 500,
      latencyMs: Date.now() - start,
      healthStatus: 'degraded',
      message: error.message || 'Connection test failed',
    });
  }
});

// Export Cloudflare Pages Functions onRequest handler
export const onRequest = app.fetch;
export default app;
