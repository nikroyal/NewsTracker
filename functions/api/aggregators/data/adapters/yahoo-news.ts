/**
 * Yahoo Finance News Adapter (Powered by Master Edge Client)
 * Ingests financial wire articles without requiring an API key
 */

import { CanonicalArticle, IDataSourceAdapter } from '@/types/news';
import { YahooFinanceEdgeClient } from '../../../market/yahoo-client';
import { MarketNewsItem } from '../../../market/types';
import { canonicalizeUrl, generateArticleId } from '../deduplicator';
import { scoreCredibility } from '../credibility';

export class YahooNewsAdapter implements IDataSourceAdapter {
  id = 'yahoo-news';
  name = 'Yahoo Finance News Wire';
  private client = new YahooFinanceEdgeClient();

  async fetchCompanyNews(
    company: string,
    _options: { timeframeDays?: number } = {}
  ): Promise<CanonicalArticle[]> {
    try {
      const items: MarketNewsItem[] = await this.client.getNews(company);
      if (!items || items.length === 0) return [];

      return items.map((item: MarketNewsItem) => {
        const canonicalUrl = canonicalizeUrl(item.link);
        const articleId = item.id ? `yfn_${item.id}` : generateArticleId(canonicalUrl, item.title);
        const { score, domain } = scoreCredibility(canonicalUrl, item.publisher || 'Yahoo Finance');

        return {
          id: articleId,
          title: item.title,
          summary: `Reported by ${item.publisher || 'Yahoo Finance'}. Related tickers: ${item.relatedTickers?.join(', ') || company}.`,
          url: item.link,
          canonicalUrl,
          source: {
            name: item.publisher || 'Yahoo Finance',
            domain: domain || 'finance.yahoo.com',
            credibilityScore: score > 0 ? score : 0.88,
          },
          publishedAt: item.publishedAt,
          primaryCompany: company,
          matchedKeywords: [company, ...(item.relatedTickers || [])],
        };
      });
    } catch {
      return [];
    }
  }
}
