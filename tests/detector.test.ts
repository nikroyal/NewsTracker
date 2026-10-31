import { describe, it, expect } from 'vitest';
import {
  detectSingleApiKeyOrEndpoint,
  detectApiKeysOrEndpoints,
  maskApiKey,
} from '../src/lib/api-detector';

describe('Advanced Heuristic API Detector & Recorder Engine', () => {
  // 1. Known AI Provider Signatures
  it('correctly detects and identifies OpenAI project and standard keys', () => {
    // Constructed dynamically to avoid git secret-scanning false positives
    const raw = ['sk', 'proj', 'abcdef1234567890abcdef1234567890abcdef1234'].join('-');
    const detected = detectSingleApiKeyOrEndpoint(raw);

    expect(detected.isIdentified).toBe(true);
    expect(detected.providerId).toBe('openai');
    expect(detected.name).toBe('OpenAI Platform');
    expect(detected.category).toBe('ai');
    expect(detected.providerType).toBe('openai-compatible');
    expect(detected.baseUrl).toBe('https://api.openai.com/v1');
    expect(detected.headerName).toBe('Authorization');
    expect(detected.headerPrefix).toBe('Bearer');
    expect(detected.modelId).toBe('gpt-4o-mini');
  });

  it('correctly detects Anthropic Claude keys and sets x-api-key header', () => {
    const raw = ['sk', 'ant', 'api03', 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEF_mock'].join('-');
    const detected = detectSingleApiKeyOrEndpoint(raw);

    expect(detected.isIdentified).toBe(true);
    expect(detected.providerId).toBe('anthropic');
    expect(detected.name).toBe('Anthropic Claude');
    expect(detected.category).toBe('ai');
    expect(detected.providerType).toBe('anthropic-messages');
    expect(detected.baseUrl).toBe('https://api.anthropic.com/v1');
    expect(detected.headerName).toBe('x-api-key');
    expect(detected.headerPrefix).toBe('');
  });

  it('correctly detects Google Gemini keys and sets queryParam auth', () => {
    const raw = 'AIza' + 'Sy' + 'D_mock1234567890abcdefghijklmnopqrst';
    const detected = detectSingleApiKeyOrEndpoint(raw);

    expect(detected.isIdentified).toBe(true);
    expect(detected.providerId).toBe('gemini');
    expect(detected.name).toBe('Google Gemini');
    expect(detected.category).toBe('ai');
    expect(detected.providerType).toBe('gemini-v1');
    expect(detected.headerName).toBe('queryParam');
    expect(detected.queryParamName).toBe('key');
  });

  it('correctly detects Groq Cloud keys and OpenRouter keys', () => {
    const groqKey = 'gsk_' + 'mock1234567890abcdefghijklmnopqrstuvwxyz1234567890';
    const groqDetected = detectSingleApiKeyOrEndpoint(groqKey);
    expect(groqDetected.isIdentified).toBe(true);
    expect(groqDetected.providerId).toBe('groq');
    expect(groqDetected.baseUrl).toBe('https://api.groq.com/openai/v1');

    const openRouterKey = 'sk-' + 'or-v1-' + 'a'.repeat(64);
    const orDetected = detectSingleApiKeyOrEndpoint(openRouterKey);
    expect(orDetected.isIdentified).toBe(true);
    expect(orDetected.providerId).toBe('openrouter');
  });

  // 2. Financial & Corporate News Data Signatures
  it('correctly detects Finnhub Financial News tokens', () => {
    const raw = 'c' + 'mock123456789012345';
    const detected = detectSingleApiKeyOrEndpoint(raw);

    expect(detected.isIdentified).toBe(true);
    expect(detected.providerId).toBe('finnhub');
    expect(detected.category).toBe('data');
    expect(detected.headerName).toBe('X-Finnhub-Token');
  });

  it('correctly detects Alpha Vantage and Polygon.io keys', () => {
    const alphaKey = 'MOCKALPHA1234567';
    const alphaDetected = detectSingleApiKeyOrEndpoint(alphaKey);
    expect(alphaDetected.isIdentified).toBe(true);
    expect(alphaDetected.providerId).toBe('alphavantage');
    expect(alphaDetected.category).toBe('data');

    const polygonKey = 'pk_' + 'mock1234567890123456789012345678';
    const polyDetected = detectSingleApiKeyOrEndpoint(polygonKey);
    expect(polyDetected.isIdentified).toBe(true);
    expect(polyDetected.providerId).toBe('polygon');
    expect(polyDetected.category).toBe('data');
  });

  // 3. cURL Command Parsing
  it('parses cURL commands and sniffs endpoint and authentication token', () => {
    const mockPplx = 'pplx-' + 'f'.repeat(48);
    const curl = `curl https://api.perplexity.ai/chat/completions \\
      -H "Authorization: Bearer ${mockPplx}" \\
      -H "Content-Type: application/json"`;

    const detected = detectSingleApiKeyOrEndpoint(curl);
    expect(detected.isIdentified).toBe(true);
    expect(detected.providerId).toBe('perplexity');
    expect(detected.baseUrl).toBe('https://api.perplexity.ai');
    expect(detected.sanitizedKey).toBe(mockPplx);
    expect(detected.headerName).toBe('Authorization');
    expect(detected.headerPrefix).toBe('Bearer');
  });

  // 4. Multi-Line .env Batch Ingestion
  it('parses multi-line .env configurations into discrete detected entries', () => {
    const mockOpenAi = ['sk', 'proj', 'abcdef1234567890abcdef1234567890abcdef1234'].join('-');
    const mockGroq = 'gsk_' + 'mock1234567890abcdefghijklmnopqrstuvwxyz1234567890';
    const mockFinnhub = 'c' + 'mock123456789012345';

    const envSnippet = `
      # AI Keys
      OPENAI_API_KEY="${mockOpenAi}"
      GROQ_API_KEY="${mockGroq}"
      
      # Data Keys
      FINNHUB_TOKEN="${mockFinnhub}"
    `;

    const batch = detectApiKeysOrEndpoints(envSnippet);
    expect(batch.length).toBe(3);
    expect(batch[0].providerId).toBe('openai');
    expect(batch[1].providerId).toBe('groq');
    expect(batch[2].providerId).toBe('finnhub');
  });

  // 5. UNIDENTIFIED / CUSTOM Models and News Providers
  it('correctly handles UNIDENTIFIED custom AI reasoning endpoint without crashing', () => {
    const customAiUrl = 'https://ai-proxy.my-internal-enterprise.com/v1/chat/completions';
    const curl = `curl -X POST "${customAiUrl}" -H "Authorization: Bearer my-secret-internal-token-123"`;

    const detected = detectSingleApiKeyOrEndpoint(curl);
    expect(detected.isIdentified).toBe(false); // correctly recognizes it as unidentified
    expect(detected.category).toBe('ai');
    expect(detected.providerType).toBe('openai-compatible');
    expect(detected.sanitizedKey).toBe('my-secret-internal-token-123');
    expect(detected.baseUrl).toBe('https://ai-proxy.my-internal-enterprise.com/v1');
    expect(detected.headerName).toBe('Authorization');
    expect(detected.headerPrefix).toBe('Bearer');
  });

  it('correctly handles UNIDENTIFIED custom news REST feed using path heuristics', () => {
    const customNewsUrl = 'https://niche-market-data.io/api/v2/articles/stream';
    const curl = `curl "${customNewsUrl}" -H "X-Custom-Feed-Key: feed-token-998877"`;

    const detected = detectSingleApiKeyOrEndpoint(curl);
    expect(detected.isIdentified).toBe(false);
    expect(detected.category).toBe('data'); // heuristically classified as data because of 'articles' in path
    expect(detected.providerType).toBe('header-auth');
    expect(detected.sanitizedKey).toBe('feed-token-998877');
    expect(detected.headerName).toBe('X-Custom-Feed-Key');
  });

  it('safely handles completely unknown raw token string', () => {
    const unknownRawKey = 'xK9pL2mQ8vR4tY7wZ1aB3cE5gH6jN0sU';
    const detected = detectSingleApiKeyOrEndpoint(unknownRawKey);

    expect(detected.isIdentified).toBe(false);
    expect(detected.sanitizedKey).toBe(unknownRawKey);
    expect(detected.maskedKey).toBeDefined();
    expect(detected.confidence).toBe(0.5);
  });

  // 6. Security & Key Masking
  it('masks sensitive API keys to prevent on-screen leakage', () => {
    const rawKey = ['sk', 'proj', '1234567890abcdef1234567890abcdef'].join('-');
    const masked = maskApiKey(rawKey);

    expect(masked).toContain('••••');
    expect(masked.startsWith('sk-proj-')).toBe(true);
    expect(masked.endsWith('cdef')).toBe(true);
    expect(masked).not.toBe(rawKey);
  });
});
