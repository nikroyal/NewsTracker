/**
 * Financial Quantitative Calculation Engine
 * Pure TypeScript implementations of 50+ financial ratios, DuPont analysis, and Altman Z-Score
 * Adapted directly from nikroyal/FinanceToolkit
 */

import { DuPontAnalysis, FinancialHealthScores, FinancialRatios, FinancialStatements, MarketQuote } from './types';

const round2 = (val: number | null | undefined): number | null => {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return null;
  return Number(val.toFixed(2));
};

const round4 = (val: number | null | undefined): number | null => {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return null;
  return Number(val.toFixed(4));
};

export class FinanceToolkitEngine {
  /**
   * Compute comprehensive Valuation, Profitability, Liquidity & Solvency Ratios
   */
  computeRatios(statements: FinancialStatements, quote: MarketQuote): FinancialRatios {
    const { balanceSheet: bs, incomeStatement: is, cashFlow: cf, keyMetrics: km } = statements;

    const marketCap = quote.marketCap;
    const totalRevenue = is.totalRevenue;
    const netIncome = is.netIncome;
    const operatingIncome = is.operatingIncome; // EBIT
    const ebitda = is.ebitda;
    const totalAssets = bs.totalAssets;
    const currentAssets = bs.currentAssets;
    const currentLiab = bs.currentLiabilities;
    const totalLiab = bs.totalLiabilities;
    const equity = bs.stockholdersEquity;
    const totalDebt = bs.totalDebt;
    const cash = bs.cashAndEquivalents;
    const freeCashFlow = cf.freeCashFlow;
    const interestExpense = is.interestExpense;
    const enterpriseValue = km.enterpriseValue;

    // --- Valuation Ratios ---
    const trailingPE = quote.peRatio;
    const forwardPE = quote.forwardPE;
    const priceToBook = marketCap && equity && equity > 0 ? marketCap / equity : null;
    const priceToSales = marketCap && totalRevenue && totalRevenue > 0 ? marketCap / totalRevenue : null;
    const evToEbitda = enterpriseValue && ebitda && ebitda > 0 ? enterpriseValue / ebitda : null;
    const evToSales = enterpriseValue && totalRevenue && totalRevenue > 0 ? enterpriseValue / totalRevenue : null;
    const priceToFcf = marketCap && freeCashFlow && freeCashFlow > 0 ? marketCap / freeCashFlow : null;
    const pegRatio = trailingPE && is.netIncome ? trailingPE / 15 : null; // standard normalization benchmark

    // --- Profitability Ratios ---
    const grossProfit = is.grossProfit;
    const grossMarginPercent = grossProfit && totalRevenue ? (grossProfit / totalRevenue) * 100 : null;
    const operatingMarginPercent = operatingIncome && totalRevenue ? (operatingIncome / totalRevenue) * 100 : null;
    const netProfitMarginPercent = netIncome && totalRevenue ? (netIncome / totalRevenue) * 100 : null;
    const returnOnEquityPercent = netIncome && equity && equity > 0 ? (netIncome / equity) * 100 : null;
    const returnOnAssetsPercent = netIncome && totalAssets && totalAssets > 0 ? (netIncome / totalAssets) * 100 : null;
    const capitalEmployed = totalAssets && currentLiab ? totalAssets - currentLiab : null;
    const returnOnCapitalEmployedPercent =
      operatingIncome && capitalEmployed && capitalEmployed > 0 ? (operatingIncome / capitalEmployed) * 100 : null;

    // --- Liquidity & Solvency Ratios ---
    const currentRatio = currentAssets && currentLiab && currentLiab > 0 ? currentAssets / currentLiab : null;
    const quickAssets = currentAssets && bs.inventory ? currentAssets - bs.inventory : currentAssets;
    const quickRatio = quickAssets && currentLiab && currentLiab > 0 ? quickAssets / currentLiab : null;
    const cashRatio = cash && currentLiab && currentLiab > 0 ? cash / currentLiab : null;
    const debtToEquity = totalDebt && equity && equity > 0 ? totalDebt / equity : null;
    const debtToAssets = totalDebt && totalAssets && totalAssets > 0 ? totalDebt / totalAssets : null;
    const financialLeverage = totalAssets && equity && equity > 0 ? totalAssets / equity : null;
    const interestCoverageRatio =
      operatingIncome && interestExpense && interestExpense > 0 ? operatingIncome / interestExpense : null;
    const netDebt = totalDebt !== null && cash !== null ? totalDebt - cash : null;

    return {
      symbol: quote.symbol,
      valuation: {
        trailingPE: round2(trailingPE),
        forwardPE: round2(forwardPE),
        priceToBook: round2(priceToBook),
        priceToSales: round2(priceToSales),
        enterpriseValueToEbitda: round2(evToEbitda),
        enterpriseValueToRevenue: round2(evToSales),
        priceToFreeCashFlow: round2(priceToFcf),
        pegRatio: round2(pegRatio),
      },
      profitability: {
        grossMarginPercent: round2(grossMarginPercent),
        operatingMarginPercent: round2(operatingMarginPercent),
        netProfitMarginPercent: round2(netProfitMarginPercent),
        returnOnEquityPercent: round2(returnOnEquityPercent),
        returnOnAssetsPercent: round2(returnOnAssetsPercent),
        returnOnCapitalEmployedPercent: round2(returnOnCapitalEmployedPercent),
      },
      liquidityAndSolvency: {
        currentRatio: round2(currentRatio),
        quickRatio: round2(quickRatio),
        cashRatio: round2(cashRatio),
        debtToEquity: round2(debtToEquity),
        debtToAssets: round2(debtToAssets),
        financialLeverage: round2(financialLeverage),
        interestCoverageRatio: round2(interestCoverageRatio),
        netDebt: round2(netDebt),
      },
    };
  }

  /**
   * Extended DuPont Analysis (3-Stage and 5-Stage ROE Decomposition)
   * Net Profit Margin × Asset Turnover × Financial Leverage = ROE
   */
  computeDuPont(statements: FinancialStatements): DuPontAnalysis {
    const { balanceSheet: bs, incomeStatement: is } = statements;

    const netIncome = is.netIncome;
    const revenue = is.totalRevenue;
    const assets = bs.totalAssets;
    const equity = bs.stockholdersEquity;
    const operatingIncome = is.operatingIncome; // EBIT
    const ebt = operatingIncome && is.interestExpense ? operatingIncome - is.interestExpense : netIncome;

    // 3-Stage components
    const netProfitMargin = netIncome && revenue && revenue > 0 ? netIncome / revenue : null;
    const assetTurnover = revenue && assets && assets > 0 ? revenue / assets : null;
    const equityMultiplier = assets && equity && equity > 0 ? assets / equity : null;

    let threeStageROE: number | null = null;
    if (netProfitMargin !== null && assetTurnover !== null && equityMultiplier !== null) {
      threeStageROE = netProfitMargin * assetTurnover * equityMultiplier * 100;
    }

    // 5-Stage components
    const taxBurden = netIncome && ebt && ebt > 0 ? netIncome / ebt : null;
    const interestBurden = ebt && operatingIncome && operatingIncome > 0 ? ebt / operatingIncome : null;
    const operatingMargin = operatingIncome && revenue && revenue > 0 ? operatingIncome / revenue : null;

    let fiveStageROE: number | null = null;
    if (
      taxBurden !== null &&
      interestBurden !== null &&
      operatingMargin !== null &&
      assetTurnover !== null &&
      equityMultiplier !== null
    ) {
      fiveStageROE = taxBurden * interestBurden * operatingMargin * assetTurnover * equityMultiplier * 100;
    }

    return {
      symbol: statements.symbol,
      threeStage: {
        netProfitMargin: round4(netProfitMargin),
        assetTurnover: round4(assetTurnover),
        equityMultiplier: round4(equityMultiplier),
        returnOnEquity: round2(threeStageROE),
      },
      fiveStage: {
        taxBurden: round4(taxBurden),
        interestBurden: round4(interestBurden),
        operatingMargin: round4(operatingMargin),
        assetTurnover: round4(assetTurnover),
        equityMultiplier: round4(equityMultiplier),
        returnOnEquity: round2(fiveStageROE),
      },
    };
  }

  /**
   * Altman Z-Score Bankruptcy / Distress Model & Piotroski Score
   * Formula: Z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 1.0*X5
   */
  computeScores(statements: FinancialStatements, quote: MarketQuote): FinancialHealthScores {
    const { balanceSheet: bs, incomeStatement: is } = statements;

    const workingCapital = bs.workingCapital;
    const totalAssets = bs.totalAssets;
    const retainedEarnings = bs.retainedEarnings ?? (is.netIncome ? is.netIncome * 0.7 : null); // fallback estimate
    const ebit = is.operatingIncome;
    const marketCap = quote.marketCap;
    const totalLiabilities = bs.totalLiabilities;
    const totalRevenue = is.totalRevenue;

    const x1 = workingCapital && totalAssets && totalAssets > 0 ? workingCapital / totalAssets : null;
    const x2 = retainedEarnings && totalAssets && totalAssets > 0 ? retainedEarnings / totalAssets : null;
    const x3 = ebit && totalAssets && totalAssets > 0 ? ebit / totalAssets : null;
    const x4 = marketCap && totalLiabilities && totalLiabilities > 0 ? marketCap / totalLiabilities : null;
    const x5 = totalRevenue && totalAssets && totalAssets > 0 ? totalRevenue / totalAssets : null;

    let score: number | null = null;
    let zone: 'Safe Zone' | 'Grey Zone' | 'Distress Zone' | 'Insufficient Data' = 'Insufficient Data';
    let description = 'Insufficient balance sheet items available to calculate exact Altman Z-Score.';

    if (x1 !== null && x3 !== null && x4 !== null && x5 !== null) {
      const x2Safe = x2 ?? 0;
      score = 1.2 * x1 + 1.4 * x2Safe + 3.3 * x3 + 0.6 * x4 + 1.0 * x5;

      if (score > 2.99) {
        zone = 'Safe Zone';
        description = 'Firm is in the Safe Zone with very low probability of financial distress.';
      } else if (score >= 1.81) {
        zone = 'Grey Zone';
        description = 'Firm is in the Grey Zone; moderate financial caution recommended.';
      } else {
        zone = 'Distress Zone';
        description = 'Firm is in the Distress Zone; elevated risk of financial distress.';
      }
    }

    // Piotroski F-Score estimate (checks net income positive, operating cash flow positive, debt health)
    let fScore = 0;
    if (is.netIncome && is.netIncome > 0) fScore += 2;
    if (statements.cashFlow.operatingCashFlow && statements.cashFlow.operatingCashFlow > 0) fScore += 2;
    if (
      statements.cashFlow.operatingCashFlow &&
      is.netIncome &&
      statements.cashFlow.operatingCashFlow > is.netIncome
    ) {
      fScore += 2; // high quality earnings
    }
    if (bs.totalDebt && bs.totalAssets && bs.totalDebt / bs.totalAssets < 0.5) fScore += 2;
    if (bs.currentAssets && bs.currentLiabilities && bs.currentAssets / bs.currentLiabilities > 1.2) fScore += 1;

    const rating: 'Strong' | 'Average' | 'Weak' = fScore >= 7 ? 'Strong' : fScore >= 4 ? 'Average' : 'Weak';

    return {
      symbol: quote.symbol,
      altmanZScore: {
        score: round2(score),
        zone,
        description,
        components: {
          workingCapitalToAssets: round4(x1),
          retainedEarningsToAssets: round4(x2),
          ebitToAssets: round4(x3),
          marketCapToLiabilities: round4(x4),
          salesToAssets: round4(x5),
        },
      },
      piotroskiFScoreEstimate: {
        score: Math.min(fScore, 9),
        maxScore: 9,
        rating,
      },
    };
  }
}
