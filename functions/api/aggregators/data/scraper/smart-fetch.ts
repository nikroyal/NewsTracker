/**
 * Scraper Strategy A: Smart Direct Fetch with Modern Browser Headers & Anti-Bot Spoofing
 */

export interface FetchResult {
  html: string;
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  ok: boolean;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
];

export async function smartFetch(url: string, timeoutMs: number = 7000): Promise<FetchResult> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });

    clearTimeout(timer);

    const headersRecord: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      headersRecord[key.toLowerCase()] = val;
    });

    const html = await response.text();

    return {
      html,
      finalUrl: response.url || url,
      status: response.status,
      headers: headersRecord,
      ok: response.ok,
    };
  } catch (error: any) {
    clearTimeout(timer);
    return {
      html: '',
      finalUrl: url,
      status: error.name === 'AbortError' ? 408 : 500,
      headers: {},
      ok: false,
    };
  }
}
