import type { GeocodeCandidate } from "../types";

/**
 * Pure adapter for the Geoapify Geocoding API `format=json` response.
 * Kept separate from the server function so it can be unit-tested and so the
 * API response shape is validated in exactly one place. Tolerant by design:
 * fields vary by result type (city vs. landmark vs. address), so anything
 * unusable is skipped rather than guessed at.
 */

interface GeoapifyJsonResult {
  lat?: unknown;
  lon?: unknown;
  formatted?: unknown;
  name?: unknown;
  city?: unknown;
  country_code?: unknown;
  result_type?: unknown;
  timezone?: { name?: unknown };
  datasource?: { attribution?: unknown };
}

const asStr = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

const asNum = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

export const mapGeocodeResults = (body: unknown): GeocodeCandidate[] => {
  if (!body || typeof body !== "object") return [];
  const results = (body as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];

  const out: GeocodeCandidate[] = [];
  const seen = new Set<string>();
  for (const raw of results) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as GeoapifyJsonResult;
    const lat = asNum(r.lat);
    const lng = asNum(r.lon);
    const label = asStr(r.formatted);
    if (lat === undefined || lng === undefined || !label) continue;

    // Dedupe identical matches (same address + rounded coordinates).
    const id = `${label}|${lat.toFixed(5)}|${lng.toFixed(5)}`;
    if (seen.has(id)) continue;
    seen.add(id);

    out.push({
      id,
      name: asStr(r.name) ?? asStr(r.city) ?? label.split(",")[0]?.trim() ?? label,
      label,
      lat,
      lng,
      ...(asStr(r.country_code) ? { countryCode: asStr(r.country_code)!.toLowerCase() } : {}),
      ...(r.timezone && typeof r.timezone === "object" && asStr(r.timezone.name)
        ? { timezone: asStr(r.timezone.name)! }
        : {}),
      ...(asStr(r.result_type) ? { resultType: asStr(r.result_type)! } : {}),
      ...(r.datasource && typeof r.datasource === "object" && asStr(r.datasource.attribution)
        ? { attribution: asStr(r.datasource.attribution)! }
        : {}),
    });
  }
  return out;
};
