/**
 * Edge Response Cache for AI Synthesis
 * Uses standard Web Crypto SHA-256 hashing to eliminate redundant LLM calls and API costs
 * Inspired by BusinessOS Dual-Layer Cache Architecture
 */

import { SynthesisReport, SynthesisRequest } from '@/types/ai';

export interface CacheEntry {
  report: SynthesisReport;
  promptTokens: number;
  completionTokens: number;
  cachedAt: number;
  expiresAt: number;
}

export class SynthesisCacheManager {
  private inMemoryCache: Map<string, CacheEntry> = new Map();
  private defaultTtlMs: number = 2 * 60 * 60 * 1000; // 2 hours
  private hits: number = 0;
  private misses: number = 0;

  constructor(ttlMs?: number) {
    if (ttlMs) this.defaultTtlMs = ttlMs;
  }

  /**
   * Computes deterministic SHA-256 hash using the Web Crypto API
   */
  async computeHash(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generates a unique cache key based on the prompt, tracked companies, and requested model
   */
  async generateKey(request: SynthesisRequest, modelId: string): Promise<string> {
    const sortedCompanies = [...request.companies].sort().join(',');
    const prompt = (request.userPrompt || '').trim();
    const articlesCount = Object.values(request.partitionedArticles || {})
      .map(list => (list || []).length)
      .reduce((a, b) => a + b, 0);

    const rawKey = `${sortedCompanies}|||${prompt}|||${modelId}|||${articlesCount}`;
    return this.computeHash(rawKey);
  }

  /**
   * Retrieves a cached report if not expired
   */
  get(key: string): CacheEntry | null {
    const entry = this.inMemoryCache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.inMemoryCache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry;
  }

  /**
   * Stores a synthesis report in the cache with expiration
   */
  set(key: string, report: SynthesisReport, ttlMs?: number): void {
    const pTokens = report.quotaTelemetry?.tokensConsumedLastQuery?.promptTokens || 0;
    const cTokens = report.quotaTelemetry?.tokensConsumedLastQuery?.completionTokens || 0;
    const effectiveTtl = ttlMs || this.defaultTtlMs;

    this.inMemoryCache.set(key, {
      report,
      promptTokens: pTokens,
      completionTokens: cTokens,
      cachedAt: Date.now(),
      expiresAt: Date.now() + effectiveTtl,
    });
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.inMemoryCache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Returns cache metrics
   */
  getMetrics(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.inMemoryCache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Number((this.hits / total).toFixed(4)) : 0,
    };
  }
}

export const globalSynthesisCache = new SynthesisCacheManager();
