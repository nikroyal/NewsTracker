import { describe, it, expect } from 'vitest';
import {
  canonicalizeUrl,
  isDuplicateStory,
  deduplicateArticles,
  jaccardSimilarity,
  levenshteinSimilarity,
} from '../functions/api/aggregators/data/deduplicator';
import { CanonicalArticle } from '../src/types/news';

describe('Deduplicator Engine', () => {
  it('strips tracking parameters and hashes from URLs', () => {
    const rawUrl = 'https://www.reuters.com/technology/apple-ai-launch-2026?utm_source=twitter&utm_medium=social&utm_campaign=breaking&fbclid=12345#comments';
    const clean = canonicalizeUrl(rawUrl);
    expect(clean).toBe('https://www.reuters.com/technology/apple-ai-launch-2026');
  });

  it('detects high semantic similarity in syndicated wire headlines', () => {
    const titleA = 'Apple Unveils Next-Generation AI Chip for Datacenters';
    const titleB = 'Apple Unveils Next-Gen AI Chip for Data Centers';

    // Levenshtein catches slight spelling and hyphenation variations
    const lev = levenshteinSimilarity(titleA, titleB);
    expect(lev).toBeGreaterThan(0.80);

    // Jaccard catches token overlap across syndicated headlines
    const syndicatedA = 'Federal Reserve holds interest rate steady at 4.25 percent';
    const syndicatedB = 'Federal Reserve holds interest rate steady amid cooling inflation';
    const jaccard = jaccardSimilarity(syndicatedA, syndicatedB);
    expect(jaccard).toBeGreaterThan(0.50);
  });

  it('deduplicates articles and preserves the version with higher credibility score', () => {
    const lowCredArticle: CanonicalArticle = {
      id: 'art_blog_1',
      title: 'NVIDIA Announces Blackwell Ultra GPUs',
      summary: 'Nvidia announced its new Blackwell ultra architecture.',
      url: 'https://randomtechblog.xyz/nvidia-blackwell?utm_source=rss',
      canonicalUrl: 'https://randomtechblog.xyz/nvidia-blackwell',
      source: { name: 'Random Tech Blog', domain: 'randomtechblog.xyz', credibilityScore: 0.45 },
      publishedAt: '2026-10-25T10:00:00Z',
      primaryCompany: 'NVIDIA',
      matchedKeywords: ['NVIDIA'],
    };

    const tier1Article: CanonicalArticle = {
      id: 'art_reuters_1',
      title: 'Nvidia Announces Blackwell Ultra GPUs',
      summary: 'Chip titan Nvidia Corp unveiled its next-generation Blackwell Ultra GPU lineup on Monday.',
      url: 'https://www.reuters.com/technology/nvidia-blackwell-ultra',
      canonicalUrl: 'https://www.reuters.com/technology/nvidia-blackwell-ultra',
      source: { name: 'Reuters', domain: 'reuters.com', credibilityScore: 0.96 },
      publishedAt: '2026-10-25T10:05:00Z',
      primaryCompany: 'NVIDIA',
      matchedKeywords: ['NVIDIA'],
    };

    expect(isDuplicateStory(lowCredArticle, tier1Article)).toBe(true);

    const merged = deduplicateArticles([lowCredArticle, tier1Article]);
    expect(merged.length).toBe(1);
    expect(merged[0].source.credibilityScore).toBe(0.96);
    expect(merged[0].source.name).toBe('Reuters');
  });
});
