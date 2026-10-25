import { describe, it, expect } from 'vitest';
import { parseJsonLd } from '../functions/api/aggregators/data/scraper/jsonld-parser';
import { extractReadabilityText } from '../functions/api/aggregators/data/scraper/readability';
import { getCachedScrape, setCachedScrape } from '../functions/api/aggregators/data/scraper/throttler';

describe('Advanced Web Scraper Strategies', () => {
  it('Strategy B: Extracts clean articleBody from schema.org/NewsArticle JSON-LD', () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": "Federal Reserve Holds Interest Rates Steady",
            "datePublished": "2026-10-25T14:00:00Z",
            "articleBody": "WASHINGTON — The Federal Reserve on Wednesday voted unanimously to keep its benchmark interest rate unchanged at 4.25 percent, citing steady economic growth and moderating consumer price inflation. Fed Chair stated that the committee remains highly attentive to inflation risks while labor markets remain resilient."
          }
          </script>
        </head>
        <body>
          <div class="ad-banner">Buy crypto now!</div>
          <p>Some random teaser text</p>
        </body>
      </html>
    `;

    const parsed = parseJsonLd(mockHtml);
    expect(parsed).not.toBeNull();
    expect(parsed?.hasArticleBody).toBe(true);
    expect(parsed?.body).toContain('Federal Reserve on Wednesday voted unanimously');
    expect(parsed?.body).not.toContain('Buy crypto now!');
  });

  it('Strategy C: Cleans noise, cookie banners, and extracts paragraphs via DOM readability', () => {
    const rawHtml = `
      <html>
        <body>
          <header><nav>Home | Market | Politics</nav></header>
          <div class="cookie-consent-modal">Please accept cookies to continue reading.</div>
          <article>
            <p>Tesla Motors announced a substantial expansion of its Austin Gigafactory facility today, intending to ramp production of next-generation commercial robotic fleets.</p>
            <div class="ad-container">Advertisement placeholder banner</div>
            <p>The capital expenditure plan involves an estimated three billion dollars over the next eighteen months, backed by strong free cash flow generation from automotive sales.</p>
          </article>
          <footer>Copyright 2026 All Rights Reserved</footer>
        </body>
      </html>
    `;

    const text = extractReadabilityText(rawHtml);
    expect(text).toContain('Tesla Motors announced a substantial expansion');
    expect(text).toContain('The capital expenditure plan involves an estimated three billion');
    expect(text).not.toContain('cookie-consent-modal');
    expect(text).not.toContain('Advertisement placeholder');
    expect(text).not.toContain('Home | Market | Politics');
  });

  it('Session Cache: Stores and retrieves scraped content without refetching', () => {
    const testUrl = 'https://www.ft.com/content/12345';
    const testContent = 'Financial Times exclusive report on global semiconductors.';

    setCachedScrape(testUrl, testContent, 'jsonld');
    const cached = getCachedScrape(testUrl);

    expect(cached).not.toBeNull();
    expect(cached?.content).toBe(testContent);
    expect(cached?.strategy).toBe('jsonld');
  });
});
