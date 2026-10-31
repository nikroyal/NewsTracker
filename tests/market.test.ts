import { describe, it, expect } from 'vitest';
import { normalizeSymbol, searchLocalCache } from '../functions/api/market/nse-client';
import { FinanceToolkitEngine } from '../functions/api/market/toolkit-formulas';
import { FinancialStatements, MarketQuote } from '../functions/api/market/types';
import app from '../functions/api/[[routes]]';

describe('Market Resolver & NSE Normalization', () => {
  it('correctly normalizes known Indian companies to .NS', () => {
    expect(normalizeSymbol('tcs')).toBe('TCS.NS');
    expect(normalizeSymbol('reliance')).toBe('RELIANCE.NS');
    expect(normalizeSymbol('infy')).toBe('INFY.NS');
  });

  it('preserves existing exchange suffixes', () => {
    expect(normalizeSymbol('TCS.NS')).toBe('TCS.NS');
    expect(normalizeSymbol('RELIANCE.BO')).toBe('RELIANCE.BO');
    expect(normalizeSymbol('AAPL')).toBe('AAPL');
    expect(normalizeSymbol('BTC-USD')).toBe('BTC-USD');
  });

  it('searches the instant local cache', () => {
    const results = searchLocalCache('tata');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.symbol.includes('TCS') || r.symbol.includes('TATA'))).toBe(true);
  });
});

describe('FinanceToolkit Mathematical Engine', () => {
  const engine = new FinanceToolkitEngine();

  const mockQuote: MarketQuote = {
    symbol: 'TCS.NS',
    normalizedSymbol: 'TCS.NS',
    companyName: 'Tata Consultancy Services',
    exchange: 'NSE',
    currency: 'INR',
    lastPrice: 4000,
    change: 50,
    percentChange: 1.25,
    open: 3950,
    dayHigh: 4020,
    dayLow: 3940,
    previousClose: 3950,
    yearHigh: 4500,
    yearLow: 3300,
    volume: 1500000,
    averageVolume: 1800000,
    marketCap: 1400000000000, // 1.4 Trillion
    peRatio: 30.5,
    forwardPE: 27.2,
    dividendYield: 1.5,
    eps: 131.14,
    bookValue: 260.0,
    sector: 'Technology',
    industry: 'Information Technology Services',
    lastUpdated: new Date().toISOString(),
  };

  const mockStatements: FinancialStatements = {
    symbol: 'TCS.NS',
    currency: 'INR',
    balanceSheet: {
      totalAssets: 150000000000,
      currentAssets: 100000000000,
      cashAndEquivalents: 30000000000,
      inventory: 5000000000,
      totalLiabilities: 50000000000,
      currentLiabilities: 40000000000,
      totalDebt: 10000000000,
      workingCapital: 60000000000,
      retainedEarnings: 80000000000,
      stockholdersEquity: 100000000000,
    },
    incomeStatement: {
      totalRevenue: 240000000000,
      costOfRevenue: 130000000000,
      grossProfit: 110000000000,
      operatingExpenses: 50000000000,
      operatingIncome: 60000000000, // EBIT
      ebitda: 65000000000,
      interestExpense: 1000000000,
      incomeTaxExpense: 13000000000,
      netIncome: 46000000000,
    },
    cashFlow: {
      operatingCashFlow: 52000000000,
      capitalExpenditures: 8000000000,
      freeCashFlow: 44000000000,
    },
    keyMetrics: {
      sharesOutstanding: 3600000000,
      enterpriseValue: 1380000000000,
      beta: 0.75,
    },
  };

  it('computes accurate valuation, profitability, and solvency ratios', () => {
    const ratios = engine.computeRatios(mockStatements, mockQuote);

    // Profitability
    expect(ratios.profitability.grossMarginPercent).toBe(45.83); // (110 / 240) * 100
    expect(ratios.profitability.operatingMarginPercent).toBe(25.0); // (60 / 240) * 100
    expect(ratios.profitability.netProfitMarginPercent).toBe(19.17); // (46 / 240) * 100
    expect(ratios.profitability.returnOnEquityPercent).toBe(46.0); // (46 / 100) * 100
    expect(ratios.profitability.returnOnAssetsPercent).toBe(30.67); // (46 / 150) * 100

    // Solvency & Liquidity
    expect(ratios.liquidityAndSolvency.currentRatio).toBe(2.5); // 100 / 40
    expect(ratios.liquidityAndSolvency.quickRatio).toBe(2.38); // (100 - 5) / 40
    expect(ratios.liquidityAndSolvency.debtToEquity).toBe(0.1); // 10 / 100
    expect(ratios.liquidityAndSolvency.interestCoverageRatio).toBe(60.0); // 60 / 1
  });

  it('performs 3-stage and 5-stage DuPont decomposition accurately', () => {
    const dupont = engine.computeDuPont(mockStatements);

    // 3-Stage: Net Margin (0.1917) * Asset Turnover (1.6) * Equity Multiplier (1.5) = 46.0% ROE
    expect(dupont.threeStage.assetTurnover).toBe(1.6);
    expect(dupont.threeStage.equityMultiplier).toBe(1.5);
    expect(dupont.threeStage.returnOnEquity).toBe(46.0);

    // 5-Stage ROE check
    expect(dupont.fiveStage.returnOnEquity).toBeCloseTo(46.0, 1);
  });

  it('calculates Altman Z-Score and correctly assigns Safe Zone', () => {
    const scores = engine.computeScores(mockStatements, mockQuote);

    expect(scores.altmanZScore.score).toBeGreaterThan(2.99);
    expect(scores.altmanZScore.zone).toBe('Safe Zone');
    expect(scores.piotroskiFScoreEstimate.rating).toBe('Strong');
  });
});

describe('Master Market API Router (/api/market/*)', () => {
  it('returns service directory on GET /api/market', async () => {
    const res = await app.request('/api/market');
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.service).toBe('Master Financial Intelligence Edge API');
    expect(data.status).toBe('online');
    expect(data.capabilities.length).toBeGreaterThan(5);
  });

  it('handles search queries on GET /api/market/search', async () => {
    const res = await app.request('/api/market/search?q=tcs');
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.query).toBe('tcs');
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results.length).toBeGreaterThan(0);
  });

  it('validates missing symbol parameter on GET /api/market/quote', async () => {
    const res = await app.request('/api/market/quote');
    expect(res.status).toBe(400);

    const data: any = await res.json();
    expect(data.error).toContain('symbol');
  });
});
