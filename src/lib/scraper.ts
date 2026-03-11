export interface ScrapedCompany {
  name?: string;
  description?: string;
  logoUrl?: string;
  linkedinUrl?: string;
  website?: string;
}

function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  const entities: Record<string, string> = {
    '&#x27;': "'",
    '&#39;': "'",
    '&apos;': "'",
    '&quot;': '"',
    '&#34;': '"',
    '&amp;': '&',
    '&#38;': '&',
    '&lt;': '<',
    '&#60;': '<',
    '&gt;': '>',
    '&#62;': '>',
    '&nbsp;': ' ',
    '&#160;': ' ',
    '&hellip;': '...',
    '&#8230;': '...',
    '&ndash;': '–',
    '&#8211;': '–',
    '&mdash;': '—',
    '&#8212;': '—',
  };
  return text.replace(/&#?\w+;|&\w+;/g, (match) => entities[match] || match);
}

export async function scrapeCompanyFromUrl(url: string): Promise<ScrapedCompany> {
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
  const hostname = new URL(normalizedUrl).hostname;

  try {
    const res = await fetch(normalizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MetaPLM/1.0; +https://metaplm.com)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const result: ScrapedCompany = { website: normalizedUrl };

    // Extract meta description
    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    if (descMatch) result.description = decodeHtmlEntities(descMatch[1].trim().slice(0, 500));

    // Extract company name from og:site_name or title
    const siteNameMatch =
      html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<title>([^<]+)<\/title>/i);
    if (siteNameMatch) {
      result.name = decodeHtmlEntities(siteNameMatch[1].trim().split(/[|\-–]/)[0].trim().slice(0, 100));
    }

    // Extract logo - og:image or favicon
    const ogImageMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogImageMatch) {
      const imgUrl = ogImageMatch[1];
      result.logoUrl = imgUrl.startsWith("http") ? imgUrl : `${normalizedUrl}${imgUrl}`;
    } else {
      // Try favicon from HTML
      const faviconMatch =
        html.match(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i) ||
        html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i);
      if (faviconMatch) {
        const favUrl = faviconMatch[1];
        result.logoUrl = favUrl.startsWith("http") ? favUrl : favUrl.startsWith("//") ? `https:${favUrl}` : `${normalizedUrl}${favUrl.startsWith("/") ? "" : "/"}${favUrl}`;
      } else {
        // Google favicon service as fallback
        result.logoUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
      }
    }

    // Extract LinkedIn URL
    const linkedinMatch = html.match(
      /https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[a-zA-Z0-9_-]+/i
    );
    if (linkedinMatch) result.linkedinUrl = linkedinMatch[0];

    return result;
  } catch {
    // Return partial data with clearbit logo fallback
    return {
      website: normalizedUrl,
      logoUrl: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
      name: hostname.replace(/^www\./, "").split(".")[0],
    };
  }
}
