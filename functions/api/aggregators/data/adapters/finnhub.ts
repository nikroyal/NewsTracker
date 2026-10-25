/**
 * Finnhub Corporate News Adapter
 */

import { CanonicalArticle, IDataSourceAdapter } from '@/types/news';
import { canonicalizeUrl, generateArticleId } from '../deduplicator';
import { scoreCredibility } from '../credibility';

export class FinnhubAdapter implements IDataSourceAdapter {
  id = 'finnhub';
  name = 'Finnhub Financial News';

  async fetchCompanyNews(
    company: string,
    options: { timeframeDays?: number; apiKey?: string } = {}
  ): Promise<CanonicalArticle[]> {
    if (!options.apiKey) {
      return [];
    }

    const days = options.timeframeDays || 7;
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - days);

    const toStr = toDate.toISOString().split('T')[0];
    const fromStr = fromDate.toISOString().split('T')[0];

    const endpoint = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(company)}&from=${fromStr}&to=${toStr}&token=${options.apiKey}`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) return [];

      const rawItems: any[] = await response.json();
      if (!Array.isArray(rawItems)) return [];

      return rawItems.map(item => {
        const title = item.headline || '';
        const rawUrl = item.url || '';
        const canonicalUrl = canonicalizeUrl(rawUrl);
        const articleId = item.id ? `finnhub_${item.id}` : generateArticleId(canonicalUrl, title);
        const { score, domain } = scoreCredibility(canonicalUrl, item.source);

        return {
          id: articleId,
          title,
          summary: item.summary || title,
          url: rawUrl,
          canonicalUrl,
          source: {
            name: item.source || domain || 'Finnhub',
            domain,
            credibilityScore: score,
          },
          publishedAt: item.datetime ? new Date(item.datetime * 1000).toISOString() : new Date().toISOString(),
          primaryCompany: company,
          matchedKeywords: [company, item.category].filter(Boolean),
        };
      });
    } catch {
      return [];
    }
  }
}
