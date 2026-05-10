/**
 * URL Link Reader Utility
 * 
 * Fetches and parses content from URLs:
 * - Web pages (HTML)
 * - JSON APIs
 * - Plain text files
 * - Media previews (metadata only)
 */

export interface LinkContent {
  type: "webpage" | "json" | "api" | "media" | "unknown";
  content: string;
  url: string;
  title?: string;
  description?: string;
  contentType?: string;
  size?: number;
  metadata?: Record<string, any>;
}

export interface ReadLinkOptions {
  maxSize?: number; // bytes, default 10MB
  timeout?: number; // ms, default 10s
  followRedirects?: boolean;
  parseMetadata?: boolean;
}

/**
 * Fetch and read content from a URL
 */
export async function readLinkContent(
  url: string,
  options: ReadLinkOptions = {}
): Promise<LinkContent> {
  const { maxSize = 10 * 1024 * 1024, timeout = 10000, parseMetadata = true } = options;

  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const contentLength = response.headers.get("content-length");
    const size = contentLength ? parseInt(contentLength) : undefined;

    if (size && size > maxSize) {
      throw new Error(`Content too large: ${(size / 1024 / 1024).toFixed(2)}MB (max ${(maxSize / 1024 / 1024).toFixed(2)}MB)`);
    }

    // JSON API
    if (contentType.includes("application/json")) {
      const json = await response.json();
      const content = typeof json === "string" ? json : JSON.stringify(json, null, 2);

      return {
        type: "json",
        content: content.substring(0, 50000), // Limit to 50KB
        url,
        contentType,
        size: content.length,
        metadata: {
          isAPI: true,
          fields: typeof json === "object" ? Object.keys(json) : [],
        },
      };
    }

    // HTML webpage
    if (contentType.includes("text/html")) {
      const html = await response.text();
      const text = extractTextFromHTML(html);
      const metadata = parseHTMLMetadata(html);

      return {
        type: "webpage",
        content: text.substring(0, 50000),
        url,
        title: metadata.title,
        description: metadata.description,
        contentType,
        size: text.length,
        metadata: {
          ...metadata,
          htmlLength: html.length,
        },
      };
    }

    // Plain text
    if (contentType.includes("text/plain") || contentType.includes("text/markdown")) {
      const text = await response.text();

      return {
        type: "webpage",
        content: text.substring(0, 50000),
        url,
        contentType,
        size: text.length,
      };
    }

    // Media (images, videos, audio)
    if (contentType.startsWith("image/") || contentType.startsWith("video/") || contentType.startsWith("audio/")) {
      const mediaType = contentType.split("/")[0];
      return {
        type: "media",
        content: `[${mediaType.toUpperCase()}] ${url}`,
        url,
        contentType,
        size,
        metadata: {
          mediaType,
          note: "Use Claude vision API to analyze media",
        },
      };
    }

    // Unknown type but try to read as text
    const text = await response.text();
    return {
      type: "unknown",
      content: text.substring(0, 50000),
      url,
      contentType,
      size: text.length,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw new Error(`Failed to fetch ${url}: ${err.message}`);
  }
}

/**
 * Extract main text content from HTML
 */
function extractTextFromHTML(html: string): string {
  // Remove scripts and styles
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "");

  // Convert common HTML tags to markdown
  text = text
    .replace(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi, "\n\n# $1\n")
    .replace(/<p[^>]*>([^<]*)<\/p>/gi, "$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>([^<]*)<\/li>/gi, "- $1\n")
    .replace(/<a\s+href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi, "[$2]($1)")
    .replace(/<code[^>]*>([^<]*)<\/code>/gi, "`$1`");

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  text = decodeHTMLEntities(text);

  // Clean up whitespace
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return text;
}

/**
 * Parse metadata from HTML head
 */
function parseHTMLMetadata(html: string): Record<string, any> {
  const metadata: Record<string, any> = {};

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) {
    metadata.title = decodeHTMLEntities(titleMatch[1].trim());
  }

  // Extract meta description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  if (descMatch) {
    metadata.description = decodeHTMLEntities(descMatch[1].trim());
  }

  // Extract OG tags (Open Graph)
  const ogMatches = html.matchAll(/<meta\s+property=["']og:([^"']*)["']\s+content=["']([^"']*)["']/gi);
  for (const match of ogMatches) {
    metadata[`og:${match[1]}`] = decodeHTMLEntities(match[2]);
  }

  // Extract canonical URL
  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
  if (canonicalMatch) {
    metadata.canonical = canonicalMatch[1];
  }

  return metadata;
}

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&nbsp;": " ",
  };

  let result = text;
  Object.entries(entities).forEach(([entity, char]) => {
    result = result.replace(new RegExp(entity, "g"), char);
  });

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (match, decimal) => {
    return String.fromCharCode(parseInt(decimal, 10));
  });

  result = result.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  return result;
}

/**
 * Validate if a URL is accessible and returns a preview
 */
export async function previewLink(
  url: string,
  options: Omit<ReadLinkOptions, "maxSize"> & { maxSize?: number } = {}
): Promise<{ valid: boolean; title?: string; description?: string; error?: string }> {
  try {
    const content = await readLinkContent(url, { ...options, maxSize: 1024 * 1024 });
    return {
      valid: true,
      title: content.title,
      description: content.description,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err.message,
    };
  }
}

/**
 * Get a summary of link content for chat context
 */
export function summarizeLinkContent(linkContent: LinkContent, maxChars: number = 2000): string {
  let summary = `🔗 **${linkContent.title || linkContent.url}**`;

  if (linkContent.description) {
    summary += `\n${linkContent.description}`;
  }

  summary += `\n\n${linkContent.content.substring(0, maxChars)}`;

  if (linkContent.content.length > maxChars) {
    summary += "\n... (content truncated)";
  }

  summary += `\n\n*[Source: ${linkContent.url}]*`;

  return summary;
}
