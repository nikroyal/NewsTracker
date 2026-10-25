/**
 * Company Data Isolation Engine: Guarantees unique, non-overlapping news payloads per company
 */

import { CanonicalArticle, CompanyPartitionResult } from '@/types/news';

export interface PartitionOptions {
  companies: string[];
  maxArticlesPerCompany?: number;
}

/**
 * Calculates how prominently a company is featured in an article
 */
export function calculateEntityProminence(article: CanonicalArticle, company: string): number {
  const normCompany = company.toLowerCase().trim();
  const title = article.title.toLowerCase();
  const summary = (article.summary || '').toLowerCase();
  const content = (article.content || '').toLowerCase();

  let score = 0;

  // Title presence (highest weight)
  if (title.includes(normCompany)) {
    score += 15;
    // Extra boost if title begins with or centers on company
    if (title.startsWith(normCompany)) {
      score += 5;
    }
  }

  // Summary mentions
  const summaryMatches = (summary.match(new RegExp('\\b' + normCompany + '\\b', 'g')) || []).length;
  score += summaryMatches * 4;

  // Content body mentions
  if (content) {
    const contentMatches = (content.match(new RegExp('\\b' + normCompany + '\\b', 'g')) || []).length;
    score += Math.min(contentMatches * 2, 20); // Cap at 20
  }

  // Explicit primary tag matching
  if (article.primaryCompany && article.primaryCompany.toLowerCase() === normCompany) {
    score += 8;
  }

  return score;
}

/**
 * Partitions articles into strictly non-overlapping, unique company buckets
 */
export function partitionCompanyArticles(
  articles: CanonicalArticle[],
  companies: string[],
  maxPerCompany: number = 25
): Record<string, CompanyPartitionResult> {
  const results: Record<string, CompanyPartitionResult> = {};
  const globallyAssignedArticleIds = new Set<string>();

  // Initialize buckets
  for (const company of companies) {
    results[company] = {
      company,
      articles: [],
      totalRetrieved: 0,
      totalUnique: 0,
    };
  }

  // Score every article against every company
  const scoredAssignments: { article: CanonicalArticle; company: string; score: number }[] = [];

  for (const article of articles) {
    let bestCompany = '';
    let maxScore = -1;

    for (const company of companies) {
      const score = calculateEntityProminence(article, company);
      if (score > 0 && score > maxScore) {
        maxScore = score;
        bestCompany = company;
      }
    }

    if (bestCompany && maxScore > 0) {
      scoredAssignments.push({
        article: { ...article, primaryCompany: bestCompany },
        company: bestCompany,
        score: maxScore,
      });
    }
  }

  // Sort assignments by score descending (highest quality entity associations first)
  scoredAssignments.sort((a, b) => b.score - a.score);

  // Assign greedily to guarantee zero duplicate article IDs across company buckets
  for (const item of scoredAssignments) {
    const articleId = item.article.id || item.article.canonicalUrl;
    
    // Check if article was already assigned to any other company
    if (globallyAssignedArticleIds.has(articleId)) {
      continue; // Strictly non-overlapping!
    }

    const bucket = results[item.company];
    if (bucket && bucket.articles.length < maxPerCompany) {
      bucket.articles.push(item.article);
      globallyAssignedArticleIds.add(articleId);
    }
  }

  // Calculate totals and sort articles within each company by publication date and credibility
  for (const company of companies) {
    const bucket = results[company];
    bucket.articles.sort((a: CanonicalArticle, b: CanonicalArticle) => {
      // Prioritize critical events, then recency, then credibility
      if (a.isCriticalEvent && !b.isCriticalEvent) return -1;
      if (!a.isCriticalEvent && b.isCriticalEvent) return 1;

      const dateA = new Date(a.publishedAt).getTime() || 0;
      const dateB = new Date(b.publishedAt).getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;

      return (b.source.credibilityScore || 0) - (a.source.credibilityScore || 0);
    });

    bucket.totalRetrieved = bucket.articles.length;
    bucket.totalUnique = bucket.articles.length;
  }

  return results;
}
