/**
 * Source Credibility & Provenance Scoring
 */

const KNOWN_DOMAINS: Record<string, number> = {
  // Tier 1: Gold Standard Financial & Primary News Wires (0.90 - 0.98)
  'reuters.com': 0.96,
  'bloomberg.com': 0.95,
  'wsj.com': 0.95,
  'ft.com': 0.95,
  'sec.gov': 0.98,
  'apnews.com': 0.93,
  'barrons.com': 0.91,

  // Tier 2: Respected Business & Tech Media (0.80 - 0.89)
  'cnbc.com': 0.88,
  'marketwatch.com': 0.87,
  'forbes.com': 0.82,
  'techcrunch.com': 0.85,
  'theverge.com': 0.83,
  'wired.com': 0.83,
  'fortune.com': 0.84,
  'investors.com': 0.85,
  'seekingalpha.com': 0.80,

  // Tier 3: Official Syndication & Press Wires (0.75 - 0.85)
  'prnewswire.com': 0.85,
  'businesswire.com': 0.85,
  'globenewswire.com': 0.84,
  'finance.yahoo.com': 0.82,
  'businessinsider.com': 0.78,
  'fool.com': 0.75,
};

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return 'unknown';
  }
}

export function scoreCredibility(url: string, sourceName?: string): { score: number; domain: string } {
  const domain = extractDomain(url);

  // Exact match
  if (KNOWN_DOMAINS[domain]) {
    return { score: KNOWN_DOMAINS[domain], domain };
  }

  // Suffix/Subdomain match (e.g. finance.yahoo.com -> yahoo.com)
  for (const [known, score] of Object.entries(KNOWN_DOMAINS)) {
    if (domain.endsWith('.' + known) || domain === known) {
      return { score, domain };
    }
  }

  // Name heuristic check
  if (sourceName) {
    const lowerName = sourceName.toLowerCase();
    if (lowerName.includes('reuters') || lowerName.includes('bloomberg') || lowerName.includes('wall street journal')) {
      return { score: 0.93, domain };
    }
    if (lowerName.includes('sec') || lowerName.includes('regulatory') || lowerName.includes('federal reserve')) {
      return { score: 0.95, domain };
    }
    if (lowerName.includes('pr newswire') || lowerName.includes('business wire')) {
      return { score: 0.85, domain };
    }
  }

  // Default baseline for unverified blogs / unknown sources
  return { score: 0.55, domain };
}
