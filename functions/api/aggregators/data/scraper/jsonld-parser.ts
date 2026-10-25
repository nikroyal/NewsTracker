/**
 * Scraper Strategy B: Structured JSON-LD & Microdata Extractor
 * Extracts publisher-provided schema.org/NewsArticle data with zero advertising noise
 */

export interface ParsedJsonLd {
  title?: string;
  body?: string;
  datePublished?: string;
  author?: string;
  publisher?: string;
  hasArticleBody: boolean;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

export function parseJsonLd(html: string): ParsedJsonLd | null {
  if (!html) return null;

  const scriptRegex = /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const rawJson = match[1].trim();
    if (!rawJson) continue;

    try {
      const data = JSON.parse(rawJson);
      const article = findArticleNode(data);

      if (article) {
        let body = article.articleBody || article.text || article.description;
        if (body && typeof body === 'string' && body.length > 80) {
          body = decodeHtmlEntities(body.trim());
          return {
            title: article.headline || article.name,
            body,
            datePublished: article.datePublished || article.dateCreated,
            author: typeof article.author === 'string' ? article.author : article.author?.name,
            publisher: typeof article.publisher === 'string' ? article.publisher : article.publisher?.name,
            hasArticleBody: !!article.articleBody,
          };
        }
      }
    } catch {
      // Ignore JSON parse errors in malformed script tags and continue
    }
  }

  return null;
}

function findArticleNode(obj: any): any | null {
  if (!obj || typeof obj !== 'object') return null;

  // Handle @graph array
  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      const found = findArticleNode(item);
      if (found) return found;
    }
  }

  // Handle array of JSON-LD objects
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findArticleNode(item);
      if (found) return found;
    }
  }

  const type = obj['@type'];
  const validTypes = ['NewsArticle', 'Article', 'Report', 'AnalysisNewsArticle', 'FinancialArticle', 'TechArticle'];

  if (typeof type === 'string' && validTypes.some(t => type.toLowerCase() === t.toLowerCase())) {
    return obj;
  }

  if (Array.isArray(type) && type.some(t => validTypes.some(vt => String(t).toLowerCase() === vt.toLowerCase()))) {
    return obj;
  }

  return null;
}
