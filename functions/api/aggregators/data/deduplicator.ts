/**
 * Deduplication Engine: URL Canonicalization, Cryptographic Fingerprints, & Fuzzy Title Matching
 */

import { CanonicalArticle } from '@/types/news';

/**
 * Strips tracking parameters, query clutter, and trailing slashes from URLs
 */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    
    // Tracking parameters to strip
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'twclid',
      'ref', 'ref_src', 'referrer', '_ga', '_gl', 'mc_cid', 'mc_eid'
    ];

    for (const param of trackingParams) {
      url.searchParams.delete(param);
    }

    // Clean hash
    url.hash = '';

    let clean = url.toString();
    if (clean.endsWith('/') && url.pathname !== '/') {
      clean = clean.slice(0, -1);
    }
    return clean;
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Generates an ID based on URL or title
 */
export function generateArticleId(canonicalUrl: string, title: string): string {
  const input = `${canonicalUrl}::${title.trim().toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'art_' + Math.abs(hash).toString(36) + '_' + input.length;
}

/**
 * Tokenizes headline for fuzzy similarity comparison
 */
function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2); // Exclude stop words and single characters
  return new Set(words);
}

/**
 * Computes Jaccard similarity coefficient between two headlines
 */
export function jaccardSimilarity(titleA: string, titleB: string): number {
  const tokensA = tokenize(titleA);
  const tokensB = tokenize(titleB);

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  tokensA.forEach(token => {
    if (tokensB.has(token)) {
      intersection++;
    }
  });

  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Computes normalized Levenshtein similarity (0.0 to 1.0)
 */
export function levenshteinSimilarity(s1: string, s2: string): number {
  const a = s1.toLowerCase().trim();
  const b = s2.toLowerCase().trim();
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

/**
 * Checks if two articles represent the exact same story
 */
export function isDuplicateStory(artA: CanonicalArticle, artB: CanonicalArticle): boolean {
  // 1. Exact canonical URL match
  if (artA.canonicalUrl && artB.canonicalUrl && artA.canonicalUrl === artB.canonicalUrl) {
    return true;
  }

  // 2. High Jaccard token overlap (> 0.72)
  const jaccard = jaccardSimilarity(artA.title, artB.title);
  if (jaccard >= 0.72) {
    return true;
  }

  // 3. High Levenshtein title ratio (> 0.80)
  const lev = levenshteinSimilarity(artA.title, artB.title);
  if (lev >= 0.80) {
    return true;
  }

  return false;
}

/**
 * Deduplicates an article collection, preserving the highest credibility version
 */
export function deduplicateArticles(articles: CanonicalArticle[]): CanonicalArticle[] {
  const uniqueArticles: CanonicalArticle[] = [];

  for (const candidate of articles) {
    let duplicateIndex = -1;

    for (let i = 0; i < uniqueArticles.length; i++) {
      if (isDuplicateStory(candidate, uniqueArticles[i])) {
        duplicateIndex = i;
        break;
      }
    }

    if (duplicateIndex === -1) {
      uniqueArticles.push(candidate);
    } else {
      // If candidate has higher credibility or fuller content, keep candidate
      const existing = uniqueArticles[duplicateIndex];
      const candidateScore = candidate.source.credibilityScore;
      const existingScore = existing.source.credibilityScore;
      const candidateContentLength = candidate.content?.length || 0;
      const existingContentLength = existing.content?.length || 0;

      if (candidateScore > existingScore || candidateContentLength > existingContentLength) {
        uniqueArticles[duplicateIndex] = {
          ...candidate,
          // Merge matched keywords
          matchedKeywords: Array.from(new Set([...existing.matchedKeywords, ...candidate.matchedKeywords]))
        };
      }
    }
  }

  return uniqueArticles;
}
