import { describe, expect, it } from "vitest";
import { mapGeocodeResults } from "./geocodeAdapter";

const cityResult = {
  lat: 26.9124,
  lon: 75.7873,
  formatted: "Jaipur, Rajasthan, India",
  city: "Jaipur",
  country_code: "IN",
  result_type: "city",
  timezone: { name: "Asia/Kolkata" },
  datasource: { attribution: "© OpenStreetMap contributors" },
};

describe("mapGeocodeResults", () => {
  it("maps a valid Geoapify json response to candidates", () => {
    const out = mapGeocodeResults({ results: [cityResult] });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      name: "Jaipur",
      label: "Jaipur, Rajasthan, India",
      lat: 26.9124,
      lng: 75.7873,
      countryCode: "in",
      timezone: "Asia/Kolkata",
      resultType: "city",
      attribution: "© OpenStreetMap contributors",
    });
  });

  it("falls back to the first label segment when name/city are missing", () => {
    const out = mapGeocodeResults({
      results: [{ lat: 1, lon: 2, formatted: "Somewhere Nice, Region, Country" }],
    });
    expect(out[0]?.name).toBe("Somewhere Nice");
  });

  it("skips entries without coordinates or a formatted label", () => {
    const out = mapGeocodeResults({
      results: [
        { formatted: "No coords" },
        { lat: 1, lon: 2 },
        { lat: 3, lon: 4, formatted: "Valid" },
        "junk",
        null,
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.label).toBe("Valid");
  });

  it("dedupes identical matches", () => {
    const out = mapGeocodeResults({ results: [cityResult, { ...cityResult }] });
    expect(out).toHaveLength(1);
  });

  it("returns an empty list for malformed payloads", () => {
    expect(mapGeocodeResults(undefined)).toEqual([]);
    expect(mapGeocodeResults(null)).toEqual([]);
    expect(mapGeocodeResults({})).toEqual([]);
    expect(mapGeocodeResults({ results: "nope" })).toEqual([]);
  });
});
