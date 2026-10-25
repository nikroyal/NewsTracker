import { describe, it, expect } from 'vitest';
import { partitionCompanyArticles } from '../functions/api/aggregators/data/partitioner';
import { CanonicalArticle } from '../src/types/news';

describe('Company Isolation Engine (Strict Non-Overlapping Guarantee)', () => {
  it('guarantees zero duplicate article records across company buckets', () => {
    const crossCompanyArticle: CanonicalArticle = {
      id: 'art_cross_1',
      title: 'Apple and Microsoft Form Strategic Enterprise Cloud Alliance',
      summary: 'Apple and Microsoft announced a wide-ranging partnership integrating macOS with Azure cloud infrastructure.',
      url: 'https://www.wsj.com/apple-microsoft-alliance',
      canonicalUrl: 'https://www.wsj.com/apple-microsoft-alliance',
      source: { name: 'Wall Street Journal', domain: 'wsj.com', credibilityScore: 0.95 },
      publishedAt: '2026-10-25T12:00:00Z',
      primaryCompany: '',
      matchedKeywords: ['Apple', 'Microsoft'],
    };

    const appleArticle: CanonicalArticle = {
      id: 'art_apple_only',
      title: 'Apple iPhone 18 Pro Max Sets Pre-Order Records in Asia',
      summary: 'Consumers queued up across Tokyo and Shanghai for Apple latest flagship device.',
      url: 'https://www.bloomberg.com/apple-iphone-18',
      canonicalUrl: 'https://www.bloomberg.com/apple-iphone-18',
      source: { name: 'Bloomberg', domain: 'bloomberg.com', credibilityScore: 0.95 },
      publishedAt: '2026-10-25T11:00:00Z',
      primaryCompany: 'Apple',
      matchedKeywords: ['Apple'],
    };

    const msftArticle: CanonicalArticle = {
      id: 'art_msft_only',
      title: 'Microsoft Azure Revenue Surges 34% in Cloud Computing Boom',
      summary: 'Microsoft reported robust fourth-quarter cloud computing growth driven by generative AI demand.',
      url: 'https://www.reuters.com/microsoft-azure-earnings',
      canonicalUrl: 'https://www.reuters.com/microsoft-azure-earnings',
      source: { name: 'Reuters', domain: 'reuters.com', credibilityScore: 0.96 },
      publishedAt: '2026-10-25T11:30:00Z',
      primaryCompany: 'Microsoft',
      matchedKeywords: ['Microsoft'],
    };

    const allArticles = [crossCompanyArticle, appleArticle, msftArticle];
    const partitioned = partitionCompanyArticles(allArticles, ['Apple', 'Microsoft']);

    // Check Apple's bucket
    expect(partitioned['Apple']).toBeDefined();
    expect(partitioned['Microsoft']).toBeDefined();

    const appleIds = partitioned['Apple'].articles.map(a => a.id);
    const msftIds = partitioned['Microsoft'].articles.map(a => a.id);

    // CRITICAL: Ensure no overlap!
    const overlap = appleIds.filter(id => msftIds.includes(id));
    expect(overlap.length).toBe(0);

    // Each company should have unique articles
    expect(appleIds).toContain('art_apple_only');
    expect(msftIds).toContain('art_msft_only');
  });
});
