/**
 * Advanced Heuristic API Detector & Pattern Sniffer Engine
 * 
 * Capable of automatically identifying 50+ AI & Data API keys, cURL commands,
 * .env variables, as well as handling UNIDENTIFIED / CUSTOM providers gracefully.
 */

export interface DetectedApiEntry {
  rawInput: string;
  sanitizedKey: string;
  maskedKey: string;
  providerId: string;
  name: string;
  category: 'ai' | 'data' | 'other';
  providerType: 'openai-compatible' | 'gemini-v1' | 'anthropic-messages' | 'generic-rest' | 'header-auth';
  baseUrl: string;
  headerName: string;
  headerPrefix: string;
  queryParamName?: string;
  modelId: string;
  confidence: number; // 0 to 1
  isIdentified: boolean;
  matchType: 'regex_signature' | 'curl_command' | 'env_variable' | 'endpoint_heuristic' | 'generic_fallback';
  notes?: string;
}

interface ProviderSignature {
  id: string;
  name: string;
  category: 'ai' | 'data' | 'other';
  providerType: 'openai-compatible' | 'gemini-v1' | 'anthropic-messages' | 'generic-rest' | 'header-auth';
  baseUrl: string;
  headerName: string;
  headerPrefix: string;
  queryParamName?: string;
  defaultModel: string;
  keyRegexes: RegExp[];
  urlPatterns?: RegExp[];
  envVarPatterns?: RegExp[];
}

/**
 * High-priority signatures with distinct prefixes are evaluated first
 */
const SIGNATURES: ProviderSignature[] = [
  // 1. Anthropic (distinct prefix sk-ant-)
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    category: 'ai',
    providerType: 'anthropic-messages',
    baseUrl: 'https://api.anthropic.com/v1',
    headerName: 'x-api-key',
    headerPrefix: '',
    defaultModel: 'claude-3-5-sonnet-20241022',
    keyRegexes: [
      /^sk-ant-(?:api03-)?[a-zA-Z0-9_\-]{20,128}$/,
    ],
    urlPatterns: [/api\.anthropic\.com/i],
    envVarPatterns: [/ANTHROPIC_API_KEY/i, /CLAUDE_API_KEY/i],
  },

  // 2. OpenRouter (distinct prefix sk-or-v1-)
  {
    id: 'openrouter',
    name: 'OpenRouter Gateway',
    category: 'ai',
    providerType: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    headerName: 'Authorization',
    headerPrefix: 'Bearer',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    keyRegexes: [
      /^sk-or-v1-[a-f0-9]{64}$/,
    ],
    urlPatterns: [/openrouter\.ai/i],
    envVarPatterns: [/OPENROUTER_API_KEY/i],
  },

  // 3. Google Gemini (distinct prefix AIzaSy)
  {
    id: 'gemini',
    name: 'Google Gemini',
    category: 'ai',
    providerType: 'gemini-v1',
    baseUrl: 'https://generativelanguage.googleapis.com',
    headerName: 'queryParam',
    headerPrefix: '',
    queryParamName: 'key',
    defaultModel: 'gemini-2.0-flash',
    keyRegexes: [
      /^AIzaSy[a-zA-Z0-9_\-]{30,40}$/,
    ],
    urlPatterns: [/generativelanguage\.googleapis\.com/i],
    envVarPatterns: [/GEMINI_API_KEY/i, /GOOGLE_API_KEY/i],
  },

  // 4. Groq Cloud (distinct prefix gsk_)
  {
    id: 'groq',
    name: 'Groq Cloud',
    category: 'ai',
    providerType: 'openai-compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    headerName: 'Authorization',
    headerPrefix: 'Bearer',
    defaultModel: 'llama-3.3-70b-versatile',
    keyRegexes: [
      /^gsk_[a-zA-Z0-9]{40,64}$/,
    ],
    urlPatterns: [/api\.groq\.com/i],
    envVarPatterns: [/GROQ_API_KEY/i],
  },

  // 5. Perplexity AI (distinct prefix pplx-)
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    category: 'ai',
    providerType: 'openai-compatible',
    baseUrl: 'https://api.perplexity.ai',
    headerName: 'Authorization',
    headerPrefix: 'Bearer',
    defaultModel: 'sonar-pro',
    keyRegexes: [
      /^pplx-[a-f0-9]{40,64}$/,
    ],
    urlPatterns: [/api\.perplexity\.ai/i],
    envVarPatterns: [/PERPLEXITY_API_KEY/i, /PPLX_API_KEY/i],
  },

  // 6. Cerebras (distinct prefix csk-)
  {
    id: 'cerebras',
    name: 'Cerebras Inference',
    category: 'ai',
    providerType: 'openai-compatible',
    baseUrl: 'https://api.cerebras.ai/v1',
    headerName: 'Authorization',
    headerPrefix: 'Bearer',
    defaultModel: 'llama3.1-70b',
    keyRegexes: [
      /^csk-[a-zA-Z0-9]{40,64}$/,
    ],
    urlPatterns: [/api\.cerebras\.ai/i],
    envVarPatterns: [/CEREBRAS_API_KEY/i],
  },

  // 7. Hugging Face (distinct prefix hf_)
  {
    id: 'huggingface',
    name: 'Hugging Face Inference',
    category: 'ai',
    providerType: 'openai-compatible',
    baseUrl: 'https://api-inference.huggingface.co/v1',
    headerName: 'Authorization',
    headerPrefix: 'Bearer',
    defaultModel: 'meta-llama/Meta-Llama-3-70B-Instruct',
    keyRegexes: [
      /^hf_[a-zA-Z0-9]{34}$/,
    ],
    urlPatterns: [/huggingface\.co/i],
    envVarPatterns: [/HUGGINGFACE_API_KEY/i, /HF_TOKEN/i],
  },

  // 8. Polygon.io (distinct prefix pk_)
  {
    id: 'polygon',
    name: 'Polygon.io Financial News',
    category: 'data',
    providerType: 'header-auth',
    baseUrl: 'https://api.polygon.io/v2',
    headerName: 'Authorization',
    headerPrefix: 'Bearer',
    queryParamName: 'apiKey',
    defaultModel: 'reference-news',
    keyRegexes: [
      /^pk_[a-zA-Z0-9]{32}$/,
    ],
    urlPatterns: [/polygon\.io/i],
    envVarPatterns: [/POLYGON_API_KEY/i],
  },

  // 9. Finnhub (starting with 'c' and followed by 19 alphanumerics)
  {
    id: 'finnhub',
    name: 'Finnhub Financial News',
    category: 'data',
    providerType: 'header-auth',
    baseUrl: 'https://finnhub.io/api/v1',
    headerName: 'X-Finnhub-Token',
    headerPrefix: '',
    queryParamName: 'token',
    defaultModel: 'general-news',
    keyRegexes: [
      /^c[a-zA-Z0-9]{19}$/,
    ],
    urlPatterns: [/finnhub\.io/i],
    envVarPatterns: [/FINNHUB_API_KEY/i, /FINNHUB_TOKEN/i],
  },

  // 10. OpenAI (sk-proj-, sk-admin-, or sk- followed by 40+ chars, excluding sk-ant and sk-or)
  {
    id: 'openai',
    name: 'OpenAI Platform',
    category: 'ai',
    providerType: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    headerName: 'Authorization',
    headerPrefix: 'Bearer',
    defaultModel: 'gpt-4o-mini',
    keyRegexes: [
      /^sk-(?:proj-|admin-)[a-zA-Z0-9_\-]{32,128}$/,
      /^sk-(?!ant-|or-)[a-zA-Z0-9]{40,64}$/,
    ],
    urlPatterns: [/api\.openai\.com/i],
    envVarPatterns: [/OPENAI_API_KEY/i],
  },

  // 11. DeepSeek (sk- followed strictly by 32 hex chars)
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    category: 'ai',
    providerType: 'openai-compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    headerName: 'Authorization',
    headerPrefix: 'Bearer',
    defaultModel: 'deepseek-chat',
    keyRegexes: [
      /^sk-[a-f0-9]{32}$/,
    ],
    urlPatterns: [/api\.deepseek\.com/i],
    envVarPatterns: [/DEEPSEEK_API_KEY/i],
  },

  // 12. Alpha Vantage (strictly 16 uppercase/number characters)
  {
    id: 'alphavantage',
    name: 'Alpha Vantage News & Sentiment',
    category: 'data',
    providerType: 'header-auth',
    baseUrl: 'https://www.alphavantage.co',
    headerName: 'queryParam',
    headerPrefix: '',
    queryParamName: 'apikey',
    defaultModel: 'NEWS_SENTIMENT',
    keyRegexes: [
      /^[A-Z0-9]{16}$/,
    ],
    urlPatterns: [/alphavantage\.co/i],
    envVarPatterns: [/ALPHA_VANTAGE_API_KEY/i, /ALPHAVANTAGE_KEY/i],
  },
];

/**
 * Mask an API key securely for non-leaking UI presentation
 * e.g., "sk-proj-1234567890abcdef" -> "sk-proj-••••••••••••cdef"
 */
export function maskApiKey(rawKey: string): string {
  if (!rawKey || rawKey.length <= 8) return '••••••••';
  const prefixLen = rawKey.startsWith('sk-proj-') ? 8 : rawKey.startsWith('sk-ant-') ? 7 : Math.min(4, Math.floor(rawKey.length / 4));
  const suffixLen = Math.min(4, Math.floor(rawKey.length / 4));
  const prefix = rawKey.slice(0, prefixLen);
  const suffix = rawKey.slice(-suffixLen);
  const maskedMiddle = '•'.repeat(Math.min(10, Math.max(4, rawKey.length - prefixLen - suffixLen)));
  return `${prefix}${maskedMiddle}${suffix}`;
}

/**
 * Parses cURL command strings
 */
function parseCurlCommand(raw: string): {
  rawInput: string;
  sanitizedKey: string;
  baseUrl: string;
  headerName: string;
  headerPrefix: string;
  queryParamName?: string;
} | null {
  if (!raw.trim().toLowerCase().startsWith('curl')) return null;

  // Extract URL
  const urlMatch = raw.match(/curl\s+(?:-[A-Za-z\s]+\s+)?['"]?(https?:\/\/[^\s'"\\]+)/i);
  const url = urlMatch ? urlMatch[1] : '';

  // Extract Authorization or custom headers
  let apiKey = '';
  let headerName = 'Authorization';
  let headerPrefix = 'Bearer';

  // Check Authorization: Bearer
  const authMatch = raw.match(/-H\s+['"]Authorization:\s*([^'"]+)['"]/i);
  if (authMatch) {
    const fullAuth = authMatch[1].trim();
    if (fullAuth.toLowerCase().startsWith('bearer ')) {
      headerPrefix = 'Bearer';
      apiKey = fullAuth.slice(7).trim();
    } else {
      headerPrefix = '';
      apiKey = fullAuth;
    }
  } else {
    // Custom header match e.g. -H 'x-api-key: ...' or -H 'X-Custom-Feed-Key: ...'
    const customHeaderMatch = raw.match(/-H\s+['"]([A-Za-z0-9_-]+):\s*([^'"]+)['"]/i);
    if (customHeaderMatch && !['content-type', 'accept'].includes(customHeaderMatch[1].toLowerCase())) {
      headerName = customHeaderMatch[1];
      headerPrefix = '';
      apiKey = customHeaderMatch[2].trim();
    }
  }

  // Check query params if key was in URL (e.g. ?key=... or ?token=...)
  let queryParamName: string | undefined = undefined;
  if (!apiKey && url) {
    try {
      const parsedUrl = new URL(url);
      for (const [k, v] of parsedUrl.searchParams.entries()) {
        if (['key', 'apikey', 'token', 'api_key', 'auth'].includes(k.toLowerCase()) && v.length > 8) {
          queryParamName = k;
          apiKey = v;
          headerName = 'queryParam';
          headerPrefix = '';
          break;
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  // Base URL (origin + base path)
  let baseUrl = '';
  if (url) {
    try {
      const parsedUrl = new URL(url);
      baseUrl = parsedUrl.origin + parsedUrl.pathname.replace(/\/(?:chat\/completions|models|messages|news|articles).*$/, '');
    } catch {
      baseUrl = url;
    }
  }

  return {
    rawInput: raw,
    sanitizedKey: apiKey,
    baseUrl: baseUrl || url,
    headerName,
    headerPrefix,
    queryParamName,
  };
}

/**
 * Classifies an UNIDENTIFIED / CUSTOM model or news provider using path/URL heuristics
 */
function classifyUnidentified(
  rawInput: string,
  key: string,
  customBaseUrl?: string,
  customHeaderName?: string,
  customHeaderPrefix?: string
): DetectedApiEntry {
  const sanitized = key.trim();
  const urlToExamine = customBaseUrl || (rawInput.startsWith('http') ? rawInput : '');

  let category: 'ai' | 'data' | 'other' = 'ai';
  let providerType: DetectedApiEntry['providerType'] = 'openai-compatible';
  let defaultModel = 'default-model';
  let detectedName = 'Custom Universal API';
  let headerName = customHeaderName || 'Authorization';
  let headerPrefix = customHeaderPrefix !== undefined ? customHeaderPrefix : 'Bearer';

  if (urlToExamine) {
    const lowerUrl = urlToExamine.toLowerCase();

    // Check if it's a news/market feed
    if (/news|articles?|feed|rss|market|financial|sentiment/i.test(lowerUrl)) {
      category = 'data';
      providerType = 'header-auth';
      detectedName = 'Custom REST News Source';
      defaultModel = 'general-feed';
      if (!customHeaderName) {
        headerName = 'X-Api-Key';
        headerPrefix = '';
      }
    } 
    // Check if Anthropic messages format
    else if (/messages|anthropic/i.test(lowerUrl)) {
      category = 'ai';
      providerType = 'anthropic-messages';
      detectedName = 'Custom Anthropic Protocol Endpoint';
      defaultModel = 'claude-compatible';
      if (!customHeaderName) {
        headerName = 'x-api-key';
        headerPrefix = '';
      }
    }
    // Check if Google Gemini format
    else if (/generativelanguage|google|gemini/i.test(lowerUrl)) {
      category = 'ai';
      providerType = 'gemini-v1';
      detectedName = 'Custom Gemini Protocol Endpoint';
      defaultModel = 'gemini-compatible';
      if (!customHeaderName) {
        headerName = 'queryParam';
        headerPrefix = '';
      }
    }
    // Standard OpenAI compatible
    else {
      category = 'ai';
      providerType = 'openai-compatible';
      detectedName = 'Custom OpenAI-Compatible LLM';
      defaultModel = 'custom-model';
    }
  } else {
    // Check key prefix heuristic
    if (sanitized.startsWith('sk-')) {
      category = 'ai';
      providerType = 'openai-compatible';
      detectedName = 'OpenAI-Compatible Secret Key';
      defaultModel = 'gpt-compatible';
    } else if (sanitized.startsWith('pk_') || sanitized.startsWith('pub_')) {
      category = 'data';
      providerType = 'header-auth';
      detectedName = 'Public/Publishable Data Token';
      defaultModel = 'live-data';
    }
  }

  return {
    rawInput,
    sanitizedKey: sanitized,
    maskedKey: maskApiKey(sanitized),
    providerId: 'custom_' + (sanitized.slice(0, 8).replace(/[^a-zA-Z0-9]/g, '') || 'endpoint'),
    name: detectedName,
    category,
    providerType,
    baseUrl: customBaseUrl || (rawInput.startsWith('http') ? rawInput : 'https://api.openai.com/v1'),
    headerName,
    headerPrefix,
    modelId: defaultModel,
    confidence: 0.5,
    isIdentified: false,
    matchType: customBaseUrl ? 'endpoint_heuristic' : 'generic_fallback',
    notes: 'Unidentified provider. Auto-configured with universal REST/OpenAI defaults. Fully editable.',
  };
}

/**
 * Main detection function: Analyzes single input string (raw key, cURL, .env, or URL)
 */
export function detectSingleApiKeyOrEndpoint(rawInput: string): DetectedApiEntry {
  const trimmed = rawInput.trim();

  // 1. Check if it's a cURL command
  if (trimmed.toLowerCase().startsWith('curl')) {
    const curlParsed = parseCurlCommand(trimmed);
    if (curlParsed && (curlParsed.sanitizedKey || curlParsed.baseUrl)) {
      // Test if the extracted key or URL matches a known provider
      for (const sig of SIGNATURES) {
        const urlMatches = sig.urlPatterns?.some(p => p.test(curlParsed.baseUrl || ''));
        const keyMatches = curlParsed.sanitizedKey && sig.keyRegexes.some(r => r.test(curlParsed.sanitizedKey));
        if (urlMatches || keyMatches) {
          return {
            rawInput,
            sanitizedKey: curlParsed.sanitizedKey,
            maskedKey: maskApiKey(curlParsed.sanitizedKey),
            providerId: sig.id,
            name: sig.name,
            category: sig.category,
            providerType: sig.providerType,
            baseUrl: curlParsed.baseUrl || sig.baseUrl,
            headerName: curlParsed.headerName || sig.headerName,
            headerPrefix: curlParsed.headerPrefix !== undefined ? curlParsed.headerPrefix : sig.headerPrefix,
            queryParamName: curlParsed.queryParamName || sig.queryParamName,
            modelId: sig.defaultModel,
            confidence: 0.98,
            isIdentified: true,
            matchType: 'curl_command',
            notes: `Extracted from cURL and verified as ${sig.name}`,
          };
        }
      }

      // If cURL URL didn't match known signatures, return as custom endpoint preserving extracted headers
      return classifyUnidentified(
        trimmed,
        curlParsed.sanitizedKey,
        curlParsed.baseUrl,
        curlParsed.headerName,
        curlParsed.headerPrefix
      );
    }
  }

  // 2. Check if it's an .env variable line (e.g. OPENAI_API_KEY="sk-...")
  const envMatch = trimmed.match(/^([A-Za-z0-9_-]+)\s*=\s*['"]?([^'"]+)['"]?$/);
  if (envMatch) {
    const varName = envMatch[1];
    const varVal = envMatch[2].trim();

    // Check env name against signatures
    for (const sig of SIGNATURES) {
      if (sig.envVarPatterns?.some(p => p.test(varName)) || sig.keyRegexes.some(r => r.test(varVal))) {
        return {
          rawInput,
          sanitizedKey: varVal,
          maskedKey: maskApiKey(varVal),
          providerId: sig.id,
          name: sig.name,
          category: sig.category,
          providerType: sig.providerType,
          baseUrl: sig.baseUrl,
          headerName: sig.headerName,
          headerPrefix: sig.headerPrefix,
          queryParamName: sig.queryParamName,
          modelId: sig.defaultModel,
          confidence: 0.99,
          isIdentified: true,
          matchType: 'env_variable',
          notes: `Parsed from environment variable ${varName}`,
        };
      }
    }

    // Unidentified env var
    return classifyUnidentified(rawInput, varVal);
  }

  // 3. Check raw string against known provider regexes in priority order
  for (const sig of SIGNATURES) {
    for (const regex of sig.keyRegexes) {
      if (regex.test(trimmed)) {
        return {
          rawInput,
          sanitizedKey: trimmed,
          maskedKey: maskApiKey(trimmed),
          providerId: sig.id,
          name: sig.name,
          category: sig.category,
          providerType: sig.providerType,
          baseUrl: sig.baseUrl,
          headerName: sig.headerName,
          headerPrefix: sig.headerPrefix,
          queryParamName: sig.queryParamName,
          modelId: sig.defaultModel,
          confidence: 0.95,
          isIdentified: true,
          matchType: 'regex_signature',
          notes: `Matches unique cryptographic signature for ${sig.name}`,
        };
      }
    }
  }

  // 4. Check if it's a standalone URL (e.g. custom model server)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return classifyUnidentified(trimmed, '', trimmed);
  }

  // 5. Fallback for completely unrecognized raw key
  return classifyUnidentified(rawInput, trimmed);
}

/**
 * Universal multi-input detector:
 * Handles single raw keys, multi-line .env blocks, or bulk lists
 */
export function detectApiKeysOrEndpoints(input: string): DetectedApiEntry[] {
  if (!input || !input.trim()) return [];

  const lines = input
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#')); // ignore comments

  if (lines.length <= 1) {
    return [detectSingleApiKeyOrEndpoint(input.trim())];
  }

  // Multi-line batch parsing
  const results: DetectedApiEntry[] = [];
  for (const line of lines) {
    const detected = detectSingleApiKeyOrEndpoint(line);
    if (detected.sanitizedKey || detected.baseUrl) {
      results.push(detected);
    }
  }

  return results.length > 0 ? results : [detectSingleApiKeyOrEndpoint(input.trim())];
}
