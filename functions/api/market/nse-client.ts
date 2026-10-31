/**
 * Indian NSE/BSE Market Resolver & Autocomplete Client
 * Adapted from nikroyal/Indian-Stock-Market-API
 */

import { MarketSearchResult } from './types';

export const POPULAR_NSE_CACHE: Record<string, string> = {
  reliance: 'RELIANCE',
  'reliance industries': 'RELIANCE',
  tcs: 'TCS',
  'tata consultancy': 'TCS',
  infosys: 'INFY',
  infy: 'INFY',
  'hdfc bank': 'HDFCBANK',
  hdfc: 'HDFCBANK',
  'icici bank': 'ICICIBANK',
  icici: 'ICICIBANK',
  itc: 'ITC',
  'bharti airtel': 'BHARTIARTL',
  airtel: 'BHARTIARTL',
  sbi: 'SBIN',
  'state bank': 'SBIN',
  wipro: 'WIPRO',
  'hindustan unilever': 'HINDUNILVR',
  hul: 'HINDUNILVR',
  maruti: 'MARUTI',
  'maruti suzuki': 'MARUTI',
  'asian paints': 'ASIANPAINT',
  'bajaj finance': 'BAJFINANCE',
  titan: 'TITAN',
  'larsen toubro': 'LT',
  lt: 'LT',
  ongc: 'ONGC',
  ntpc: 'NTPC',
  'power grid': 'POWERGRID',
  'coal india': 'COALINDIA',
  adani: 'ADANIENT',
  'adani enterprises': 'ADANIENT',
  'adani ports': 'ADANIPORTS',
  'sun pharma': 'SUNPHARMA',
  'dr reddy': 'DRREDDY',
  cipla: 'CIPLA',
  mahindra: 'M&M',
  'm&m': 'M&M',
  'tata motors': 'TATAMOTORS',
  tatamotors: 'TATAMOTORS',
  'tata steel': 'TATASTEEL',
  tatasteel: 'TATASTEEL',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Normalizes user symbol input:
 * If the user gives "TCS", we can check if it's Indian or global.
 * Suffixes like .NS, .BO, -USD, =X, ^... are preserved.
 */
export function normalizeSymbol(input: string): string {
  const clean = input.trim().toUpperCase();
  if (clean.includes('.') || clean.includes('-') || clean.includes('=') || clean.startsWith('^')) {
    return clean;
  }
  // Check if it's in our known Indian symbols list
  const lower = clean.toLowerCase();
  if (POPULAR_NSE_CACHE[lower]) {
    return `${POPULAR_NSE_CACHE[lower]}.NS`;
  }
  // Default to as-is (e.g. US symbols like AAPL, MSFT, NVDA)
  return clean;
}

/**
 * Direct NSE India autocomplete search with timeout and graceful degradation
 */
export async function tryNseAutocomplete(query: string): Promise<MarketSearchResult[]> {
  try {
    const headers = {
      'User-Agent': UA,
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.nseindia.com/',
      'X-Requested-With': 'XMLHttpRequest',
    };

    const homeRes = await fetch('https://www.nseindia.com', {
      headers,
      signal: AbortSignal.timeout(4000),
    });

    const setCookie = homeRes.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0];

    const res = await fetch(`https://www.nseindia.com/api/search/autocomplete?q=${encodeURIComponent(query)}`, {
      headers: { ...headers, Cookie: cookie },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return [];

    const data: any = await res.json();
    return (data.symbols || [])
      .filter((item: any) => item.result_sub_type === 'equity')
      .map((item: any) => ({
        symbol: `${item.symbol}.NS`,
        name: item.symbol_info || item.symbol,
        exchange: 'NSE',
        type: 'Equity',
        source: 'nse_direct' as const,
      }));
  } catch {
    // NSE rate-limits or blocks datacenter IPs gracefully
    return [];
  }
}

/**
 * Instant local cache search for high-frequency Indian companies
 */
export function searchLocalCache(query: string): MarketSearchResult[] {
  const q = query.trim().toLowerCase();
  const results: MarketSearchResult[] = [];

  for (const [key, symbol] of Object.entries(POPULAR_NSE_CACHE)) {
    if (key.includes(q) || symbol.toLowerCase().includes(q)) {
      results.push({
        symbol: `${symbol}.NS`,
        name: key.toUpperCase(),
        exchange: 'NSE',
        type: 'Equity',
        source: 'cache',
      });
      if (results.length >= 5) break;
    }
  }

  return results;
}
