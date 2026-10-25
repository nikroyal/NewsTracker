/**
 * Domain Concurrency Queue & Session Cache
 * Prevents IP rate-limiting and duplicate scraping of the same URL
 */

import { extractDomain } from '../credibility';

interface CacheEntry {
  content: string;
  strategy: 'jsonld' | 'readability' | 'jina-reader' | 'direct' | 'fallback';
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const activeDomainRequests = new Map<string, number>();
const MAX_CONCURRENT_PER_DOMAIN = 2;

export function getCachedScrape(url: string): CacheEntry | null {
  const cached = memoryCache.get(url);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60 * 12) { // 12 hours
    return cached;
  }
  return null;
}

export function setCachedScrape(
  url: string,
  content: string,
  strategy: 'jsonld' | 'readability' | 'jina-reader' | 'direct' | 'fallback'
) {
  memoryCache.set(url, {
    content,
    strategy,
    timestamp: Date.now(),
  });
}

/**
 * Executes a task respecting max concurrent requests per domain
 */
export async function throttledScrape<T>(url: string, task: () => Promise<T>): Promise<T> {
  const domain = extractDomain(url);

  // Wait if too many concurrent requests to this domain
  while ((activeDomainRequests.get(domain) || 0) >= MAX_CONCURRENT_PER_DOMAIN) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const currentCount = activeDomainRequests.get(domain) || 0;
  activeDomainRequests.set(domain, currentCount + 1);

  try {
    return await task();
  } finally {
    const updatedCount = activeDomainRequests.get(domain) || 1;
    activeDomainRequests.set(domain, Math.max(0, updatedCount - 1));
  }
}
