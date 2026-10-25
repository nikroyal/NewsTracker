/**
 * Data API Aggregator Coordinator
 * Ingests from multiple data sources, runs full-text scraper, deduplicates, and partitions by company
 */

import { AggregationResult, CanonicalArticle, DataSourceConfig, IDataSourceAdapter } from '@/types/news';
import { GoogleRssAdapter } from './adapters/google-rss';
import { FinnhubAdapter } from './adapters/finnhub';
import { GenericRestAdapter } from './adapters/generic-rest';
import { deduplicateArticles } from './deduplicator';
import { partitionCompanyArticles } from './partitioner';
import { scrapeArticleFullText } from './scraper/scraper-engine';

export interface AggregationOptions {
  companies: string[];
  timeframeDays?: number;
  apiKeys?: Record<string, string>;
  customSources?: DataSourceConfig[];
  enableScraper?: boolean;
  maxScrapePerCompany?: number;
}

export class DataAggregatorCoordinator {
  private adapters: Map<string, IDataSourceAdapter> = new Map();

  constructor() {
    this.registerAdapter(new GoogleRssAdapter());
    this.registerAdapter(new FinnhubAdapter());
    this.registerAdapter(new GenericRestAdapter());
  }

  registerAdapter(adapter: IDataSourceAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  async aggregate(options: AggregationOptions): Promise<AggregationResult> {
    const startTime = Date.now();
    const {
      companies,
      timeframeDays = 7,
      apiKeys = {},
      customSources = [],
      enableScraper = true,
      maxScrapePerCompany = 5,
    } = options;

    const rawArticles: CanonicalArticle[] = [];
    let sourcesQueried = 0;

    // 1. Fetch from active adapters per company
    for (const company of companies) {
      // Always query Google RSS (Zero-key fallback)
      const rssAdapter = this.adapters.get('google-rss');
      if (rssAdapter) {
        sourcesQueried++;
        const rssArticles = await rssAdapter.fetchCompanyNews(company, { timeframeDays });
        rawArticles.push(...rssArticles);
      }

      // Query Finnhub if key provided or company looks like a ticker
      if (apiKeys['finnhub']) {
        const finnhubAdapter = this.adapters.get('finnhub');
        if (finnhubAdapter) {
          sourcesQueried++;
          const finnhubArticles = await finnhubAdapter.fetchCompanyNews(company, {
            timeframeDays,
            apiKey: apiKeys['finnhub'],
          });
          rawArticles.push(...finnhubArticles);
        }
      }

      // Query any custom user-configured REST sources
      for (const customSrc of customSources.filter(s => s.enabled)) {
        const genericAdapter = this.adapters.get('generic-rest');
        if (genericAdapter) {
          sourcesQueried++;
          const customArticles = await genericAdapter.fetchCompanyNews(company, {
            timeframeDays,
            apiKey: customSrc.apiKey || apiKeys[customSrc.id],
            customConfig: customSrc,
          });
          rawArticles.push(...customArticles);
        }
      }
    }

    // 2. Multi-level Deduplication
    const deduplicated = deduplicateArticles(rawArticles);

    // 3. Strict Non-Overlapping Company Partitioning
    const partitioned = partitionCompanyArticles(deduplicated, companies, 20);

    // 4. Advanced Full-Text Web Scraper (enrich top articles to eliminate snippet truncation)
    if (enableScraper) {
      for (const company of companies) {
        const companyBucket = partitioned[company];
        if (!companyBucket) continue;

        // Scrape top articles for depth
        const articlesToScrape = companyBucket.articles.slice(0, maxScrapePerCompany);
        for (const article of articlesToScrape) {
          // If summary is short or no content
          if (!article.content || article.content.length < 200) {
            try {
              const scrapeResult = await scrapeArticleFullText(article.url);
              if (scrapeResult.success && scrapeResult.content) {
                article.content = scrapeResult.content;
                article.isScrapedFullText = true;
                article.scrapeStrategyUsed = scrapeResult.strategy;
              }
            } catch {
              // Graceful degrade to original summary
            }
          }
        }
      }
    }

    // Collect all unique articles across all buckets
    const allPartitionedArticles: CanonicalArticle[] = [];
    for (const company of companies) {
      allPartitionedArticles.push(...(partitioned[company]?.articles || []));
    }

    return {
      partitionedResults: partitioned,
      allArticles: allPartitionedArticles,
      totalSourcesQueried: sourcesQueried,
      executionTimeMs: Date.now() - startTime,
    };
  }
}
