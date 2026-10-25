/**
 * Scraper Strategy D: Edge Reader Fallback (Jina Reader Proxy)
 * Bypasses 403 / anti-bot Turnstile challenges by proxying through reader-mode renderer
 */

export async function fetchViaReaderProxy(targetUrl: string, timeoutMs: number = 8000): Promise<string> {
  const proxyUrl = `https://r.jina.ai/${targetUrl}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(proxyUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/plain,text/markdown',
        'X-No-Cache': 'true',
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      return '';
    }

    const markdown = await response.text();
    // Basic cleanup of markdown links or Jina header if any
    const lines = markdown.split('\n');
    const contentLines = lines.filter(line => {
      const trimmed = line.trim();
      return (
        !trimmed.startsWith('Title:') &&
        !trimmed.startsWith('URL Source:') &&
        !trimmed.startsWith('Markdown Content:')
      );
    });

    const cleanContent = contentLines.join('\n').trim();
    return cleanContent.length > 100 ? cleanContent : '';
  } catch {
    clearTimeout(timer);
    return '';
  }
}
