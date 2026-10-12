import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { mapGeocodeResults } from "@/travel/services/geocodeAdapter";
import type { GeocodeErrorCode, GeocodeResult } from "@/travel/types";

/**
 * Server-side destination geocoding via the Geoapify Geocoding API.
 *
 * The GEOAPIFY_API_KEY is read from the server environment only; this module's
 * handler body is compiled out of the client bundle by TanStack Start, and the
 * key is never part of the request payload or the response. Responses are
 * reduced to the small GeocodeCandidate shape the UI needs.
 */

const GEOCODE_ENDPOINT = "https://api.geoapify.com/v1/geocode/search";
const TIMEOUT_MS = 8000;
const MAX_RESULTS = 6;

/** Vercel/Node expose process.env; Cloudflare-style runtimes expose global env bindings. */
const readEnv = (key: string): string | undefined => {
  const fromProcess = typeof process !== "undefined" ? process.env?.[key] : undefined;
  if (fromProcess) return fromProcess;
  const fromPlatform = (globalThis as { env?: Record<string, string | undefined> }).env;
  return fromPlatform?.[key];
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
    if (!apiKey) return fail("missing-key", USER_MESSAGES["missing-key"]);

    const url = new URL(GEOCODE_ENDPOINT);
    url.searchParams.set("text", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", String(MAX_RESULTS));

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "user-agent": "TravelPilot/1.0 (destination lookup)" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      const timedOut =
        error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      return fail(
        timedOut ? "timeout" : "network",
        timedOut ? USER_MESSAGES.timeout : USER_MESSAGES.network,
      );
    }

    // Geoapify returns 401 for an invalid key (verified live); 403 can also mean rejected credentials.
    if (response.status === 401 || response.status === 403)
      return fail("invalid-key", USER_MESSAGES["invalid-key"]);
    if (response.status === 429) return fail("rate-limited", USER_MESSAGES["rate-limited"]);
    if (!response.ok) return fail("bad-response", USER_MESSAGES["bad-response"]);

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return fail("bad-response", USER_MESSAGES["bad-response"]);
    }

    const candidates = mapGeocodeResults(body);
    if (!candidates.length) {
      return fail(
        "not-found",
        `We couldn't find a location for "${query}". Try adding a country or region, e.g. "Jaipur, India".`,
      );
    }
    return { ok: true, candidates };
  });
