/**
 * Yahoo Finance Authenticated Client (Edge Compatible)
 * Implements cookie/crumb authentication and deep module retrieval
 * Adapted from nikroyal/Indian-Stock-Market-API and nikroyal/yfinance
 */

import {
  ChartCandle,
  ChartData,
  FinancialStatements,
  MarketNewsItem,
  MarketQuote,
  MarketSearchResult,
} from './types';
import { normalizeSymbol } from './nse-client';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

let crumbCache: { crumb: string | null; cookie: string | null; expiresAt: number } = {
  crumb: null,
  cookie: null,
  expiresAt: 0,
};

async function getCrumb(forceRefresh = false): Promise<{ crumb: string; cookie: string }> {
  if (!forceRefresh && crumbCache.crumb && crumbCache.cookie && Date.now() < crumbCache.expiresAt) {
    return { crumb: crumbCache.crumb, cookie: crumbCache.cookie };
  }

  const cookieRes = await fetch('https://fc.yahoo.com', {
    headers: { 'User-Agent': UA },
  });
  const setCookie = cookieRes.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0] || '';

  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: cookie },
  });
  const crumb = (await crumbRes.text()).trim();

  crumbCache = {
    crumb,
    cookie,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };

  return { crumb, cookie };
}

async function yahooFetchAuthed(buildUrl: (crumb: string) => string): Promise<Response> {
  let { crumb, cookie } = await getCrumb();
  let res = await fetch(buildUrl(crumb), {
    headers: { 'User-Agent': UA, Cookie: cookie },
  });

  if (res.status === 401) {
    ({ crumb, cookie } = await getCrumb(true));
    res = await fetch(buildUrl(crumb), {
      headers: { 'User-Agent': UA, Cookie: cookie },
    });
  }

  return res;
}

const raw = (field: any) => (field && typeof field === 'object' ? field.raw ?? null : field ?? null);

export class YahooFinanceEdgeClient {
  /**
   * Fetch full quote & overview for a single symbol
   */
  async getQuote(symbolInput: string): Promise<MarketQuote | null> {
    const symbol = normalizeSymbol(symbolInput);
    const modules = 'price,summaryDetail,defaultKeyStatistics,assetProfile';

    const res = await yahooFetchAuthed(
      (crumb) =>
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`
    );

    if (!res.ok) return null;

    const data: any = await res.json();
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const { price = {}, summaryDetail = {}, defaultKeyStatistics = {}, assetProfile = {} } = result;
    if (raw(price.regularMarketPrice) === null) return null;

    return {
      symbol: symbolInput.toUpperCase(),
      normalizedSymbol: symbol,
      companyName: price.longName || price.shortName || symbol,
      exchange: price.exchangeName || (symbol.endsWith('.NS') ? 'NSE' : symbol.endsWith('.BO') ? 'BSE' : 'US'),
      currency: price.currency || 'USD',
      lastPrice: Number(raw(price.regularMarketPrice)),
      change: Number(raw(price.regularMarketChange) ?? 0),
      percentChange: Number(raw(price.regularMarketChangePercent) !== null ? raw(price.regularMarketChangePercent) * 100 : 0),
      open: raw(price.regularMarketOpen) ?? raw(summaryDetail.open),
      dayHigh: raw(price.regularMarketDayHigh),
      dayLow: raw(price.regularMarketDayLow),
      previousClose: raw(price.regularMarketPreviousClose),
      yearHigh: raw(summaryDetail.fiftyTwoWeekHigh),
      yearLow: raw(summaryDetail.fiftyTwoWeekLow),
      volume: raw(price.regularMarketVolume),
      averageVolume: raw(price.averageDailyVolume10Day) ?? raw(summaryDetail.averageVolume),
      marketCap: raw(price.marketCap) ?? raw(summaryDetail.marketCap),
      peRatio: raw(summaryDetail.trailingPE),
      forwardPE: raw(summaryDetail.forwardPE) ?? raw(defaultKeyStatistics.forwardPE),
      dividendYield: raw(summaryDetail.dividendYield) !== null ? raw(summaryDetail.dividendYield) * 100 : null,
      eps: raw(defaultKeyStatistics.trailingEps),
      bookValue: raw(defaultKeyStatistics.bookValue),
      sector: assetProfile.sector || 'N/A',
      industry: assetProfile.industry || 'N/A',
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Batch quote fetch for multiple tickers
   */
  async getBatchQuotes(symbolInputs: string[]): Promise<Record<string, Partial<MarketQuote>>> {
    if (!symbolInputs.length) return {};
    const normalized = symbolInputs.map(normalizeSymbol);

    const res = await yahooFetchAuthed(
      (crumb) =>
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(normalized.join(','))}&crumb=${encodeURIComponent(crumb)}`
    );

    if (!res.ok) return {};

    const data: any = await res.json();
    const map: Record<string, Partial<MarketQuote>> = {};

    for (const q of data?.quoteResponse?.result || []) {
      map[q.symbol] = {
        symbol: q.symbol,
        companyName: q.longName || q.shortName || q.symbol,
        lastPrice: q.regularMarketPrice ?? null,
        change: q.regularMarketChange ?? null,
        percentChange: q.regularMarketChangePercent ?? null,
        volume: q.regularMarketVolume ?? null,
        marketCap: q.marketCap ?? null,
        peRatio: q.trailingPE ?? null,
        exchange: q.exchange ?? 'N/A',
        currency: q.currency ?? 'USD',
      };
    }

    return map;
  }

  /**
   * Historical Candlestick Chart Bars (OHLCV)
   * Equivalent to yfinance.Ticker.history()
   */
  async getChart(symbolInput: string, range = '1mo', interval = '1d'): Promise<ChartData | null> {
    const symbol = normalizeSymbol(symbolInput);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;

    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;

    const data: any = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const timestamps: number[] = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const candles: ChartCandle[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      candles.push({
        timestamp: ts * 1000,
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: quotes.open?.[i] !== undefined && quotes.open?.[i] !== null ? Number(quotes.open[i].toFixed(2)) : null,
        high: quotes.high?.[i] !== undefined && quotes.high?.[i] !== null ? Number(quotes.high[i].toFixed(2)) : null,
        low: quotes.low?.[i] !== undefined && quotes.low?.[i] !== null ? Number(quotes.low[i].toFixed(2)) : null,
        close: quotes.close?.[i] !== undefined && quotes.close?.[i] !== null ? Number(quotes.close[i].toFixed(2)) : null,
        volume: quotes.volume?.[i] ?? null,
      });
    }

    return {
      symbol: symbolInput.toUpperCase(),
      currency: meta.currency || 'USD',
      range,
      interval,
      previousClose: meta.chartPreviousClose ?? null,
      candles,
    };
  }

  /**
   * Deep Balance Sheet, Income Statement & Cash Flow
   * Equivalent to yfinance.Ticker.financials & balance_sheet
   */
  async getFinancials(symbolInput: string): Promise<FinancialStatements | null> {
    const symbol = normalizeSymbol(symbolInput);
    const modules =
      'financialData,defaultKeyStatistics,balanceSheetHistory,incomeStatementHistory,cashflowStatementHistory,price';

    const res = await yahooFetchAuthed(
      (crumb) =>
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`
    );

    if (!res.ok) return null;

    const data: any = await res.json();
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const bs = result.balanceSheetHistory?.balanceSheetStatements?.[0] || {};
    const is = result.incomeStatementHistory?.incomeStatementHistory?.[0] || {};
    const cf = result.cashflowStatementHistory?.cashflowStatements?.[0] || {};
    const fd = result.financialData || {};
    const ks = result.defaultKeyStatistics || {};
    const pr = result.price || {};

    const totalAssets = raw(bs.totalAssets);
    const currentAssets = raw(bs.totalCurrentAssets);
    const currentLiab = raw(bs.totalCurrentLiabilities);
    const totalLiab = raw(bs.totalLiab);
    const equity = raw(bs.totalStockholderEquity);
    const workingCap = currentAssets !== null && currentLiab !== null ? currentAssets - currentLiab : null;

    return {
      symbol: symbolInput.toUpperCase(),
      currency: pr.currency || 'USD',
      balanceSheet: {
        totalAssets,
        currentAssets,
        cashAndEquivalents: raw(bs.cash) ?? raw(fd.totalCash),
        inventory: raw(bs.inventory),
        totalLiabilities: totalLiab,
        currentLiabilities: currentLiab,
        totalDebt: raw(fd.totalDebt) ?? raw(bs.shortLongTermDebt),
        workingCapital: workingCap,
        retainedEarnings: raw(bs.retainedEarnings),
        stockholdersEquity: equity,
      },
      incomeStatement: {
        totalRevenue: raw(is.totalRevenue) ?? raw(fd.totalRevenue),
        costOfRevenue: raw(is.costOfRevenue),
        grossProfit: raw(is.grossProfit) ?? raw(fd.grossProfits),
        operatingExpenses: raw(is.totalOperatingExpenses),
        operatingIncome: raw(is.operatingIncome) ?? raw(fd.operatingIncome),
        ebitda: raw(fd.ebitda),
        interestExpense: raw(is.interestExpense),
        incomeTaxExpense: raw(is.incomeTaxExpense),
        netIncome: raw(is.netIncome),
      },
      cashFlow: {
        operatingCashFlow: raw(cf.totalCashFromOperatingActivities) ?? raw(fd.operatingCashflow),
        capitalExpenditures: raw(cf.capitalExpenditures),
        freeCashFlow: raw(fd.freeCashflow),
      },
      keyMetrics: {
        sharesOutstanding: raw(ks.sharesOutstanding),
        enterpriseValue: raw(ks.enterpriseValue),
        beta: raw(ks.beta),
      },
    };
  }

  /**
   * Search tickers and companies
   */
  async search(query: string): Promise<MarketSearchResult[]> {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];

    const data: any = await res.json();
    const quotes: any[] = data.quotes || [];

    return quotes.map((q) => ({
      symbol: q.symbol,
      name: q.longname || q.shortname || q.symbol,
      exchange: q.exchange || 'N/A',
      type: q.quoteType || 'Equity',
      sector: q.sector,
      industry: q.industry,
      source: 'yahoo' as const,
    }));
  }

  /**
   * Fetch company financial news items
   */
  async getNews(symbolInput: string): Promise<MarketNewsItem[]> {
    const symbol = normalizeSymbol(symbolInput);
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=15`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];

    const data: any = await res.json();
    const news: any[] = data.news || [];

    return news.map((item) => ({
      id: item.uuid || String(Date.now()),
      title: item.title,
      publisher: item.publisher,
      link: item.link,
      publishedAt: new Date((item.providerPublishTime || Date.now() / 1000) * 1000).toISOString(),
      relatedTickers: item.relatedTickers || [],
    }));
  }
}
