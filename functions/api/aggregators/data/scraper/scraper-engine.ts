/**
 * Advanced Web Scraper Waterfall Controller
 * Executes Strategies A -> B -> C -> D with caching and throttling
 */

import { smartFetch } from './smart-fetch';
import { parseJsonLd } from './jsonld-parser';
import { extractReadabilityText } from './readability';
import { fetchViaReaderProxy } from './reader-proxy';
import { getCachedScrape, setCachedScrape, throttledScrape } from './throttler';

export interface ScrapedContentResult {
  content: string;
  strategy: 'jsonld' | 'readability' | 'jina-reader' | 'direct' | 'fallback';
  success: boolean;
  charCount: number;
}

export async function scrapeArticleFullText(url: string): Promise<ScrapedContentResult> {
  // 1. Check session cache
  const cached = getCachedScrape(url);
  if (cached) {
    return {
      content: cached.content,
      strategy: cached.strategy,
      success: true,
      charCount: cached.content.length,
    };
  }

  return await throttledScrape(url, async () => {
    // 2. Strategy A: Direct Smart Fetch
    const fetchResult = await smartFetch(url);

    // If Direct fetch succeeded (200 OK)
    if (fetchResult.ok && fetchResult.html) {
      // Strategy B: JSON-LD Structured extraction (Cleanest, zero ad noise)
      const jsonLdResult = parseJsonLd(fetchResult.html);
      if (jsonLdResult && jsonLdResult.body && jsonLdResult.body.length > 150) {
        setCachedScrape(url, jsonLdResult.body, 'jsonld');
        return {
          content: jsonLdResult.body,
          strategy: 'jsonld',
          success: true,
          charCount: jsonLdResult.body.length,
        };
      }

      // Strategy C: Semantic DOM Readability extraction
      const readabilityText = extractReadabilityText(fetchResult.html);
      if (readabilityText && readabilityText.length > 150) {
        setCachedScrape(url, readabilityText, 'readability');
        return {
          content: readabilityText,
          strategy: 'readability',
          success: true,
          charCount: readabilityText.length,
        };
      }
    }

    // 3. Strategy D: Edge Reader Fallback (If 403 / Turnstile / empty DOM)
    const readerText = await fetchViaReaderProxy(url);
    if (readerText && readerText.length > 150) {
      setCachedScrape(url, readerText, 'jina-reader');
      return {
        content: readerText,
        strategy: 'jina-reader',
        success: true,
        charCount: readerText.length,
      };
    }

    // Fallback if everything fails
    return {
      content: '',
      strategy: 'fallback',
      success: false,
      charCount: 0,
    };
  });
}
