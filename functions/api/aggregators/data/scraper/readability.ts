/**
 * Scraper Strategy C: Semantic DOM Readability Heuristic
 * Extracts article paragraphs, stripping ads, navbars, cookie overlays, and boilerplate
 */

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
}

export function extractReadabilityText(html: string): string {
  if (!html) return '';

  // 1. Remove non-content elements
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // 2. Remove elements with common banner / cookie / paywall / ad classes
  const noisePattern = /<(div|section|aside|div)[^>]*(class|id)=["'][^"']*(cookie|consent|paywall|nag-wall|ad-|ad_|banner|newsletter|popup|modal)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi;
  cleaned = cleaned.replace(noisePattern, '');

  // 3. Extract all paragraph tags
  const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pRegex.exec(cleaned)) !== null) {
    const rawP = match[1];
    const text = decodeHtmlEntities(stripTags(rawP));

    // Keep paragraphs with meaningful content (more than 4 words, not copyright boilerplate)
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length >= 8 && !isBoilerplate(text)) {
      paragraphs.push(text);
    }
  }

  // If paragraphs were found, join them
  if (paragraphs.length >= 2) {
    return paragraphs.join('\n\n');
  }

  // Fallback: If minimal <p> tags, try finding <article> content
  const articleMatch = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    const articleText = decodeHtmlEntities(stripTags(articleMatch[1]));
    if (articleText.length > 150) {
      return articleText;
    }
  }

  return '';
}

function isBoilerplate(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('all rights reserved') ||
    lower.includes('terms of service') ||
    lower.includes('privacy policy') ||
    lower.includes('click here to subscribe') ||
    lower.includes('sign up for our newsletter') ||
    lower.includes('follow us on twitter') ||
    lower.includes('read our cookie policy')
  );
}
