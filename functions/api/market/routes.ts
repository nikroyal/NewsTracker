/**
 * Master Financial Market Router (Hono / Cloudflare Edge)
 * Combines Indian-Stock-Market-API, yfinance, and FinanceToolkit
 */

import { Hono } from 'hono';
import { YahooFinanceEdgeClient } from './yahoo-client';
import { FinanceToolkitEngine } from './toolkit-formulas';
import { searchLocalCache, tryNseAutocomplete } from './nse-client';

export const marketRouter = new Hono();

const yahoo = new YahooFinanceEdgeClient();
const toolkit = new FinanceToolkitEngine();

// 1. API Directory & Documentation
marketRouter.get('/', (c) => {
  return c.json({
    service: 'Master Financial Intelligence Edge API',
    status: 'online',
    version: '1.0.0',
    capabilities: [
      'Real-time NSE/BSE & Global Equities Quotes',
      'Batch Multi-Symbol Quotes',
      'NSE Direct Autocomplete & Yahoo Fuzzy Search',
      'Historical OHLCV Candlestick Time Series',
      'Corporate Financial Statements (Balance Sheet, Income, Cash Flow)',
      '50+ Quantitative Financial Ratios (Valuation, Profitability, Solvency)',
      '3-Stage & 5-Stage DuPont ROE Decomposition',
      'Altman Z-Score Distress Model & Piotroski Financial Health',
      'Corporate Financial News Ingestion',
    ],
    endpoints: {
      quote: 'GET /api/market/quote?symbol={SYMBOL}',
      batch: 'GET /api/market/batch?symbols={SYM1,SYM2,...}',
      search: 'GET /api/market/search?q={QUERY}',
      chart: 'GET /api/market/chart?symbol={SYMBOL}&range={1d|5d|1mo|1y}&interval={1m|5m|1d}',
      financials: 'GET /api/market/financials?symbol={SYMBOL}',
      ratios: 'GET /api/market/ratios?symbol={SYMBOL}',
      dupont: 'GET /api/market/dupont?symbol={SYMBOL}',
      scores: 'GET /api/market/scores?symbol={SYMBOL}',
      news: 'GET /api/market/news?symbol={SYMBOL}',
      overview: 'GET /api/market/overview?symbol={SYMBOL} (Unified all-in-one bundle)',
    },
  });
});

// 2. Real-time Single Quote
marketRouter.get('/quote', async (c) => {
  const symbol = c.req.query('symbol');
  if (!symbol) {
    return c.json({ error: 'Query parameter "symbol" is required' }, 400);
  }

  try {
    const quote = await yahoo.getQuote(symbol);
    if (!quote) {
      return c.json({ error: `Quote not found for symbol "${symbol}"` }, 404);
    }
    return c.json(quote);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to fetch quote' }, 500);
  }
});

// 3. Batch Quotes (Multi-Symbol in 1 HTTP round-trip)
marketRouter.get('/batch', async (c) => {
  const symbolsParam = c.req.query('symbols') || c.req.query('tickers');
  if (!symbolsParam) {
    return c.json({ error: 'Query parameter "symbols" is required (comma-separated)' }, 400);
  }

  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return c.json({ error: 'At least one valid symbol is required' }, 400);
  }

  try {
    const quotes = await yahoo.getBatchQuotes(symbols);
    return c.json({
      count: Object.keys(quotes).length,
      quotes,
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to fetch batch quotes' }, 500);
  }
});

// 4. Symbol & Company Search (NSE Direct + Cache + Yahoo Fallback)
marketRouter.get('/search', async (c) => {
  const q = c.req.query('q');
  if (!q || q.trim().length === 0) {
    return c.json({ error: 'Query parameter "q" is required' }, 400);
  }

  try {
    // 1. Instant cache match
    const cacheHits = searchLocalCache(q);

    // 2. Parallel fetch from NSE direct and Yahoo Search
    const [nseHits, yahooHits] = await Promise.all([
      tryNseAutocomplete(q),
      yahoo.search(q),
    ]);

    // Deduplicate by symbol
    const seen = new Set<string>();
    const combined = [];

    for (const item of [...cacheHits, ...nseHits, ...yahooHits]) {
      const key = item.symbol.toUpperCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    }

    return c.json({
      query: q,
      count: combined.length,
      results: combined.slice(0, 15),
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Search failed' }, 500);
  }
});

// 5. Historical OHLCV Candlestick Chart Bars
marketRouter.get('/chart', async (c) => {
  const symbol = c.req.query('symbol');
  const range = c.req.query('range') || '1mo';
  const interval = c.req.query('interval') || '1d';

  if (!symbol) {
    return c.json({ error: 'Query parameter "symbol" is required' }, 400);
  }

  try {
    const chart = await yahoo.getChart(symbol, range, interval);
    if (!chart) {
      return c.json({ error: `Chart data not found for symbol "${symbol}"` }, 404);
    }
    return c.json(chart);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to fetch chart' }, 500);
  }
});

// 6. Corporate Financial Statements (Balance Sheet, Income, Cash Flow)
marketRouter.get('/financials', async (c) => {
  const symbol = c.req.query('symbol');
  if (!symbol) {
    return c.json({ error: 'Query parameter "symbol" is required' }, 400);
  }

  try {
    const financials = await yahoo.getFinancials(symbol);
    if (!financials) {
      return c.json({ error: `Financial statements not found for symbol "${symbol}"` }, 404);
    }
    return c.json(financials);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to fetch financial statements' }, 500);
  }
});

// 7. Quantitative Financial Ratios (FinanceToolkit Engine)
marketRouter.get('/ratios', async (c) => {
  const symbol = c.req.query('symbol');
  if (!symbol) {
    return c.json({ error: 'Query parameter "symbol" is required' }, 400);
  }

  try {
    const [statements, quote] = await Promise.all([
      yahoo.getFinancials(symbol),
      yahoo.getQuote(symbol),
    ]);

    if (!statements || !quote) {
      return c.json({ error: `Required financial data not available for symbol "${symbol}"` }, 404);
    }

    const ratios = toolkit.computeRatios(statements, quote);
    return c.json(ratios);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to compute financial ratios' }, 500);
  }
});

// 8. Extended DuPont Analysis (3-Stage & 5-Stage ROE Decomposition)
marketRouter.get('/dupont', async (c) => {
  const symbol = c.req.query('symbol');
  if (!symbol) {
    return c.json({ error: 'Query parameter "symbol" is required' }, 400);
  }

  try {
    const statements = await yahoo.getFinancials(symbol);
    if (!statements) {
      return c.json({ error: `Financial statements not available for symbol "${symbol}"` }, 404);
    }

    const dupont = toolkit.computeDuPont(statements);
    return c.json(dupont);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to compute DuPont analysis' }, 500);
  }
});

// 9. Altman Z-Score Bankruptcy Model & Health Scores
marketRouter.get('/scores', async (c) => {
  const symbol = c.req.query('symbol');
  if (!symbol) {
    return c.json({ error: 'Query parameter "symbol" is required' }, 400);
  }

  try {
    const [statements, quote] = await Promise.all([
      yahoo.getFinancials(symbol),
      yahoo.getQuote(symbol),
    ]);

    if (!statements || !quote) {
      return c.json({ error: `Financial data not available for symbol "${symbol}"` }, 404);
    }

    const scores = toolkit.computeScores(statements, quote);
    return c.json(scores);
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to compute health scores' }, 500);
  }
});

// 10. Corporate Financial News Wire
marketRouter.get('/news', async (c) => {
  const symbol = c.req.query('symbol');
  if (!symbol) {
    return c.json({ error: 'Query parameter "symbol" is required' }, 400);
  }

  try {
    const news = await yahoo.getNews(symbol);
    return c.json({
      symbol: symbol.toUpperCase(),
      count: news.length,
      articles: news,
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to fetch financial news' }, 500);
  }
});

// 11. Unified Master Overview Bundle (Quote + Key Ratios + DuPont + Altman Z + News in ONE Call)
marketRouter.get('/overview', async (c) => {
  const symbol = c.req.query('symbol');
  if (!symbol) {
    return c.json({ error: 'Query parameter "symbol" is required' }, 400);
  }

  try {
    const [quote, statements, news] = await Promise.all([
      yahoo.getQuote(symbol),
      yahoo.getFinancials(symbol),
      yahoo.getNews(symbol),
    ]);

    if (!quote) {
      return c.json({ error: `Could not resolve symbol "${symbol}"` }, 404);
    }

    const ratios = statements ? toolkit.computeRatios(statements, quote) : null;
    const dupont = statements ? toolkit.computeDuPont(statements) : null;
    const scores = statements ? toolkit.computeScores(statements, quote) : null;

    return c.json({
      symbol: quote.symbol,
      companyName: quote.companyName,
      exchange: quote.exchange,
      currency: quote.currency,
      quote,
      ratios,
      dupont,
      scores,
      recentNews: news.slice(0, 5),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to generate financial overview' }, 500);
  }
});
