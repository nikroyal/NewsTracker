/**
 * Google News RSS Adapter (Zero API Key, Unlimited Free Fallback)
 */

import { CanonicalArticle, IDataSourceAdapter } from '@/types/news';
import { canonicalizeUrl, generateArticleId } from '../deduplicator';
import { scoreCredibility } from '../credibility';

export class GoogleRssAdapter implements IDataSourceAdapter {
  id = 'google-rss';
  name = 'Google News Syndication';

  async fetchCompanyNews(
    company: string,
    options: { timeframeDays?: number } = {}
  ): Promise<CanonicalArticle[]> {
    const days = options.timeframeDays || 7;
    const query = encodeURIComponent(`"${company}" when:${days}d`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

    try {
      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      });

      if (!response.ok) {
        return [];
      }

      const xmlText = await response.text();
      return this.parseRssXml(xmlText, company);
    } catch {
      return [];
    }
  }

  private parseRssXml(xml: string, company: string): CanonicalArticle[] {
    const items: CanonicalArticle[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];

      const rawTitle = this.extractTag(itemContent, 'title') || '';
      const rawLink = this.extractTag(itemContent, 'link') || '';
      const pubDate = this.extractTag(itemContent, 'pubDate') || new Date().toISOString();
      const rawSource = this.extractTag(itemContent, 'source') || '';
      const description = this.extractTag(itemContent, 'description') || '';

      // Google News titles are formatted: "Headline - Source Name"
      let title = rawTitle;
      let sourceName = rawSource;
      const dashIndex = rawTitle.lastIndexOf(' - ');
      if (dashIndex !== -1) {
        title = rawTitle.substring(0, dashIndex).trim();
        if (!sourceName) {
          sourceName = rawTitle.substring(dashIndex + 3).trim();
        }
      }

      // Clean HTML tags from description if present
      const cleanSummary = description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      const canonicalUrl = canonicalizeUrl(rawLink);
      const articleId = generateArticleId(canonicalUrl, title);
      const { score, domain } = scoreCredibility(canonicalUrl, sourceName);

      // Check for critical event keywords in headline
      const { isCritical, type } = this.checkCriticalEvent(title);

      items.push({
        id: articleId,
        title,
        summary: cleanSummary || title,
        url: rawLink,
        canonicalUrl,
        source: {
          name: sourceName || domain || 'Google News',
          domain,
          credibilityScore: score,
        },
        publishedAt: new Date(pubDate).toISOString(),
        primaryCompany: company,
        matchedKeywords: [company],
        isCriticalEvent: isCritical,
        criticalEventType: type,
      });
    }

    return items;
  }

  private extractTag(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    if (!match) return '';
    return (match[1] || match[2] || '').trim();
  }

  private checkCriticalEvent(title: string): { isCritical: boolean; type?: 'leadership' | 'regulatory' | 'm&a' | 'litigation' | 'earnings' } {
    const t = title.toLowerCase();
    if (t.includes('sec') || t.includes('investigation') || t.includes('antitrust') || t.includes('subpoena') || t.includes('doj')) {
      return { isCritical: true, type: 'regulatory' };
    }
    if (t.includes('ceo') || t.includes('resigns') || t.includes('steps down') || t.includes('appointed') || t.includes('fired') || t.includes('oust')) {
      return { isCritical: true, type: 'leadership' };
    }
    if (t.includes('acquire') || t.includes('acquisition') || t.includes('merger') || t.includes('buyout') || t.includes('takeover')) {
      return { isCritical: true, type: 'm&a' };
    }
    if (t.includes('lawsuit') || t.includes('sues') || t.includes('verdict') || t.includes('patent infringement')) {
      return { isCritical: true, type: 'litigation' };
    }
    if (t.includes('q1') || t.includes('q2') || t.includes('q3') || t.includes('q4') || t.includes('earnings') || t.includes('revenue misses') || t.includes('revenue beats')) {
      return { isCritical: true, type: 'earnings' };
    }
    return { isCritical: false };
  }
}
