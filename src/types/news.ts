/**
 * Data Aggregator & News Types
 */

export interface CanonicalArticle {
  id: string;               // SHA-256 hash of normalized URL
  title: string;
  summary: string;
  content?: string;         // Full scraped article text (via advanced scraper)
  url: string;
  canonicalUrl: string;     // URL stripped of UTM/tracking tags
  source: {
    name: string;
    domain: string;
    credibilityScore: number; // 0.0 - 1.0 (Tier 1 financial = 0.95, wires = 0.90, etc.)
  };
  publishedAt: string;      // ISO 8601 string
  primaryCompany: string;   // Strict company assignment
  matchedKeywords: string[];
  isScrapedFullText?: boolean;
  scrapeStrategyUsed?: 'jsonld' | 'readability' | 'jina-reader' | 'direct' | 'fallback';
  sentimentHint?: 'bullish' | 'bearish' | 'neutral';
  isCriticalEvent?: boolean;
  criticalEventType?: 'leadership' | 'regulatory' | 'm&a' | 'litigation' | 'earnings';
}

export interface DataSourceConfig {
  id: string;
  name: string;
  enabled: boolean;
  apiKey?: string;
  endpointUrl?: string;
  type: 'builtin' | 'rss' | 'generic-rest';
  method?: 'GET' | 'POST';
  authHeader?: string;       // e.g. "Bearer {API_KEY}" or "X-Finnhub-Token {API_KEY}"
  queryParamMapping?: {
    query: string;
    from?: string;
    limit?: string;
  };
  fieldMapping?: {
    itemsPath?: string;      // e.g. "articles" or "data"
    title: string;
    summary: string;
    url: string;
    publishedAt: string;
    sourceName?: string;
    content?: string;
  };
  customHeaders?: Record<string, string>;
}

export interface IDataSourceAdapter {
  id: string;
  name: string;
  fetchCompanyNews(
    company: string,
    options: {
      timeframeDays?: number;
      apiKey?: string;
      customConfig?: DataSourceConfig;
    }
  ): Promise<CanonicalArticle[]>;
}

export interface CompanyPartitionResult {
  company: string;
  articles: CanonicalArticle[];
  totalRetrieved: number;
  totalUnique: number;
}

export interface AggregationResult {
  partitionedResults: Record<string, CompanyPartitionResult>;
  allArticles: CanonicalArticle[];
  totalSourcesQueried: number;
  executionTimeMs: number;
}
