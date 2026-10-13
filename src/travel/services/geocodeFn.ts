import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { mapGeocodeResults } from "@/travel/services/geocodeAdapter";
import { buildGeoapifyUrl, redactedUrlForLog, sanitizeForLog } from "@/travel/services/geocodeHttp";
import type { GeocodeErrorCode, GeocodeResult } from "@/travel/types";

/**
 * Server-side destination geocoding via the Geoapify Geocoding API.
 *
 * The GEOAPIFY_API_KEY is read from the server environment only; this module's
 * handler body is compiled out of the client bundle by TanStack Start, and the
 * key is never part of the request payload or the response. Responses are
 * reduced to the small GeocodeCandidate shape the UI needs.
 */

const TIMEOUT_MS = 8000;
const MAX_RESULTS = 6;

/** Vercel/Node expose process.env; Cloudflare-style runtimes expose global env bindings. */
const readEnv = (key: string): string | undefined => {
  // .trim(): keys pasted into dashboard env fields often carry a trailing
  // newline/space, which Geoapify would reject as an invalid key.
  const fromProcess = typeof process !== "undefined" ? process.env?.[key]?.trim() : undefined;
  if (fromProcess) return fromProcess;
  const fromPlatform = (globalThis as { env?: Record<string, string | undefined> }).env;
  return fromPlatform?.[key]?.trim();
};

/**
 * Server-side-only diagnostic line for Vercel Runtime Logs. Everything passed
 * through sanitizeForLog first; the API key never appears in any argument.
 * The "[geocode]" prefix makes the lines easy to filter in the dashboard.
 */
const logDiagnostic = (level: "info" | "warn" | "error", event: string, detail: string) => {
  const line = `[geocode] ${event}: ${sanitizeForLog(detail)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
};

const fail = (code: GeocodeErrorCode, message: string): GeocodeResult => ({
  ok: false,
  code,
  message,
});

const USER_MESSAGES: Record<Exclude<GeocodeErrorCode, "not-found">, string> = {
  "missing-key":
    "Destination lookup isn't configured on this server (GEOAPIFY_API_KEY is missing). You can still plan the bundled Jaipur demo.",
  "invalid-key":
    "Destination lookup is misconfigured (the server's Geoapify API key was rejected).",
  "rate-limited":
    "Destination lookup is rate-limited right now. Please wait a minute and try again.",
  timeout: "Destination lookup timed out. Please try again.",
  network: "Couldn't reach the destination lookup service. Check your connection and try again.",
  "bad-response": "Destination lookup returned an unexpected response. Please try again.",
};

export const geocodeDestination = createServerFn({ method: "POST" })
  .validator((input: { query: string }) =>
    z.object({ query: z.string().trim().max(120) }).parse(input),
  )
  .handler(async ({ data }): Promise<GeocodeResult> => {
    const query = data.query;
    if (query.length < 2)
      return fail("not-found", "Enter at least two characters to look up a destination.");

    const apiKey = readEnv("GEOAPIFY_API_KEY");
    if (!apiKey) {
      logDiagnostic(
        "warn",
        "missing-key",
        `GEOAPIFY_API_KEY not found in process.env or globalThis.env (runtime: ${
          typeof process !== "undefined" ? "node" : "non-node"
        })`,
      );
      return fail("missing-key", USER_MESSAGES["missing-key"]);
    }

    // Geoapify requires the key as the `apiKey` query parameter; omitting it
    // yields 401 "Invalid apiKey" even when the configured key is valid.
    const url = buildGeoapifyUrl(query, apiKey, MAX_RESULTS);
    logDiagnostic("info", "request", `GET ${redactedUrlForLog(url)}`);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "user-agent": "TravelPilot/1.0 (destination lookup)" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      const timedOut =
        error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      logDiagnostic(
        "error",
        timedOut ? "timeout" : "network-error",
        `name=${error instanceof Error ? error.name : "unknown"} message=${
          error instanceof Error ? error.message : String(error)
        } timeoutMs=${TIMEOUT_MS}`,
      );
      return fail(
        timedOut ? "timeout" : "network",
        timedOut ? USER_MESSAGES.timeout : USER_MESSAGES.network,
      );
    }

    // Read the body as text once so the upstream error detail can be logged
    // server-side (sanitized) without ever reaching the client.
    const readBodyText = async (): Promise<string> => {
      try {
        return await response.text();
      } catch {
        return "<unreadable body>";
      }
    };

    // Geoapify returns 401 for an invalid key (verified live); 403 can also mean rejected credentials.
    if (response.status === 401 || response.status === 403) {
      logDiagnostic(
        "error",
        "upstream-rejected",
        `status=${response.status} retry-after=${response.headers.get("retry-after") ?? "-"} body=${await readBodyText()}`,
      );
      return fail("invalid-key", USER_MESSAGES["invalid-key"]);
    }
    if (response.status === 429) {
      logDiagnostic(
        "warn",
        "upstream-rate-limited",
        `status=429 retry-after=${response.headers.get("retry-after") ?? "-"} body=${await readBodyText()}`,
      );
      return fail("rate-limited", USER_MESSAGES["rate-limited"]);
    }
    if (!response.ok) {
      logDiagnostic(
        "error",
        "upstream-error",
        `status=${response.status} body=${await readBodyText()}`,
      );
      return fail("bad-response", USER_MESSAGES["bad-response"]);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      logDiagnostic(
        "error",
        "invalid-json",
        `status=${response.status} parseError=${error instanceof Error ? error.message : String(error)}`,
      );
      return fail("bad-response", USER_MESSAGES["bad-response"]);
    }

    const candidates = mapGeocodeResults(body);
    logDiagnostic(
      "info",
      "response",
      `status=${response.status} candidates=${candidates.length} query="${query}"`,
    );
    if (!candidates.length) {
      return fail(
        "not-found",
        `We couldn't find a location for "${query}". Try adding a country or region, e.g. "Jaipur, India".`,
      );
    }
    return { ok: true, candidates };
  });
