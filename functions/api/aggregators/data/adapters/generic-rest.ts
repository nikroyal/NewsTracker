/**
 * Universal Generic REST Adapter
 * Allows users to plug in ANY custom news or data API with configurable query parameters and field mappings
 */

import { CanonicalArticle, DataSourceConfig, IDataSourceAdapter } from '@/types/news';
import { canonicalizeUrl, generateArticleId } from '../deduplicator';
import { scoreCredibility } from '../credibility';

export class GenericRestAdapter implements IDataSourceAdapter {
  id = 'generic-rest';
  name = 'Universal REST Data Adapter';

  async fetchCompanyNews(
    company: string,
    options: {
      timeframeDays?: number;
      apiKey?: string;
      customConfig?: DataSourceConfig;
    } = {}
  ): Promise<CanonicalArticle[]> {
    const config = options.customConfig;
    if (!config || !config.endpointUrl) return [];

    try {
      const url = new URL(config.endpointUrl);
      
      // Inject query parameters
      const qParam = config.queryParamMapping?.query || 'q';
      url.searchParams.set(qParam, company);

      if (config.queryParamMapping?.limit) {
        url.searchParams.set(config.queryParamMapping.limit, '25');
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...(config.customHeaders || {}),
      };

      // Add auth header if present
      if (options.apiKey || config.apiKey) {
        const key = options.apiKey || config.apiKey;
        if (config.authHeader) {
          headers['Authorization'] = config.authHeader.replace('{API_KEY}', key!);
        } else {
          headers['Authorization'] = `Bearer ${key}`;
        }
      }

      const response = await fetch(url.toString(), {
        method: config.method || 'GET',
        headers,
      });

      if (!response.ok) return [];

      const json = await response.json();
      return this.mapResponse(json, company, config);
    } catch {
      return [];
    }
  }

  private mapResponse(json: any, company: string, config: DataSourceConfig): CanonicalArticle[] {
    const fieldMapping = config.fieldMapping || {
      title: 'title',
      summary: 'description',
      url: 'url',
      publishedAt: 'publishedAt',
      sourceName: 'source.name',
    };

    // Locate items array
    let items = json;
    if (fieldMapping.itemsPath) {
      const parts = fieldMapping.itemsPath.split('.');
      for (const part of parts) {
        if (items && typeof items === 'object' && part in items) {
          items = items[part];
        }
      }
    } else if (json.articles && Array.isArray(json.articles)) {
      items = json.articles;
    } else if (json.data && Array.isArray(json.data)) {
      items = json.data;
    } else if (json.results && Array.isArray(json.results)) {
      items = json.results;
    }

    if (!Array.isArray(items)) return [];

    return items.map((raw: any) => {
      const title = this.getNestedValue(raw, fieldMapping.title) || '';
      const summary = this.getNestedValue(raw, fieldMapping.summary) || title;
      const rawUrl = this.getNestedValue(raw, fieldMapping.url) || '';
      const publishedAt = this.getNestedValue(raw, fieldMapping.publishedAt) || new Date().toISOString();
      const sourceName = this.getNestedValue(raw, fieldMapping.sourceName || 'source') || config.name;
      const content = fieldMapping.content ? this.getNestedValue(raw, fieldMapping.content) : undefined;

      const canonicalUrl = canonicalizeUrl(rawUrl);
      const articleId = generateArticleId(canonicalUrl, title);
      const { score, domain } = scoreCredibility(canonicalUrl, typeof sourceName === 'string' ? sourceName : undefined);

      return {
        id: articleId,
        title,
        summary,
        content,
        url: rawUrl,
        canonicalUrl,
        source: {
          name: typeof sourceName === 'string' ? sourceName : domain || config.name,
          domain,
          credibilityScore: score,
        },
        publishedAt: new Date(publishedAt).toISOString(),
        primaryCompany: company,
        matchedKeywords: [company],
      };
    });
  }

  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  }
}
