import { describe, expect, it } from "vitest";
import {
  GEOCODE_ENDPOINT,
  buildGeoapifyUrl,
  redactedUrlForLog,
  sanitizeForLog,
} from "./geocodeHttp";

describe("buildGeoapifyUrl", () => {
  it("matches the documented Geoapify forward-geocoding endpoint and params", () => {
    const url = buildGeoapifyUrl("Jaipur, India", "test-key-123", 6);
    expect(url.origin + url.pathname).toBe(GEOCODE_ENDPOINT);
    expect(url.searchParams.get("text")).toBe("Jaipur, India");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("limit")).toBe("6");
  });

  // Regression guard for the deployed bug: a valid key was never attached, so
  // Geoapify answered 401 "Invalid apiKey" for every lookup.
  it("always includes the apiKey parameter", () => {
    const url = buildGeoapifyUrl("Paris", "secret-key-abc", 6);
    expect(url.searchParams.get("apiKey")).toBe("secret-key-abc");
  });

  it("percent-encodes queries with spaces and commas", () => {
    const url = buildGeoapifyUrl("Hawa Mahal, Jaipur", "k", 6);
    expect(url.toString()).toContain("text=Hawa+Mahal%2C+Jaipur");
  });
});

describe("redactedUrlForLog", () => {
  it("replaces the apiKey but keeps other params readable", () => {
    const url = buildGeoapifyUrl("Paris", "secret-key-abc", 6);
    const logged = redactedUrlForLog(url);
    expect(logged).not.toContain("secret-key-abc");
    expect(logged).toContain("apiKey=%5Bredacted%5D");
    expect(logged).toContain("text=Paris");
  });
});

describe("sanitizeForLog", () => {
  it("redacts apiKey in URL query form", () => {
    const out = sanitizeForLog("GET /v1/geocode/search?text=X&apiKey=super-secret-999 failed");
    expect(out).not.toContain("super-secret-999");
    expect(out).toContain("apiKey=[redacted]");
  });

  it("redacts apiKey in JSON form", () => {
    const out = sanitizeForLog('{"error":{"apiKey":"super-secret-999","code":401}}');
    expect(out).not.toContain("super-secret-999");
  });

  it("truncates long bodies to keep log lines small", () => {
    const out = sanitizeForLog("x".repeat(1000));
    expect(out.length).toBeLessThanOrEqual(300);
  });

  it("leaves ordinary error text untouched", () => {
    const body = '{"statusCode":401,"error":"Unauthorized","message":"Invalid apiKey"}';
    expect(sanitizeForLog(body)).toBe(body);
  });
});
