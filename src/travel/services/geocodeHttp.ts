/**
 * Pure helpers for building the Geoapify request URL and for sanitizing
 * upstream responses before they reach server-side logs. Kept framework-free
 * so they can be unit-tested and so secret redaction lives in exactly one
 * place. Nothing here ever sees or stores the API key itself.
 */

export const GEOCODE_ENDPOINT = "https://api.geoapify.com/v1/geocode/search";

/**
 * Build the documented Geoapify forward-geocoding request:
 * `GET /v1/geocode/search?text=...&format=json&limit=...&apiKey=...`
 * Forgetting `apiKey` here makes Geoapify answer 401 "Invalid apiKey" for
 * every request, regardless of key validity — hence the dedicated test.
 */
export const buildGeoapifyUrl = (query: string, apiKey: string, limit: number): URL => {
  const url = new URL(GEOCODE_ENDPOINT);
  url.searchParams.set("text", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("apiKey", apiKey);
  return url;
};

/** Log-safe copy of the request URL: same shape, key replaced. */
export const redactedUrlForLog = (url: URL): string => {
  const copy = new URL(url.toString());
  if (copy.searchParams.has("apiKey")) copy.searchParams.set("apiKey", "[redacted]");
  return copy.toString();
};

const MAX_LOG_CHARS = 300;

/**
 * Redact api-key-looking values (URL query form and JSON form) and truncate
 * to keep log lines small. Applied to every upstream error body before
 * logging so a key can never leak into Vercel Runtime Logs.
 */
export const sanitizeForLog = (text: string): string =>
  text
    .replace(/([?&]apiKey=)[^&\s"']+/gi, "$1[redacted]")
    .replace(/("(?:api[_-]?key)"\s*:\s*")[^"]*"/gi, '$1[redacted]"')
    .replace(/\b(api[_-]?key["']?\s*[:=]\s*["']?)[A-Za-z0-9_-]+/gi, "$1[redacted]")
    .slice(0, MAX_LOG_CHARS);
