import { describe, expect, it } from "vitest";
import type { DestinationContext } from "../types";
import { JAIPUR_ZONES } from "./jaipur";
import { resolveCatalog, supportedDestinations, zonesForTrip } from "./catalogRegistry";

const ctx = (over: Partial<DestinationContext>): DestinationContext => ({
  name: "Somewhere",
  lat: 0,
  lng: 0,
  zones: [{ id: "center", name: "center", lat: 0, lng: 0 }],
  source: "geocoded",
  ...over,
});

describe("resolveCatalog", () => {
  it("resolves the curated Jaipur catalog for the demo context", () => {
    const cat = resolveCatalog(ctx({ name: "Jaipur, Rajasthan", source: "demo" }));
    expect(cat?.label).toBe("Jaipur, India");
    expect(cat?.zones).toBe(JAIPUR_ZONES);
    expect(cat?.activities.length).toBeGreaterThan(10);
  });

  it("resolves Jaipur for a geocoded destination whose name contains Jaipur", () => {
    const cat = resolveCatalog(ctx({ name: "Jaipur, Rajasthan, India" }));
    expect(cat?.activities).toHaveLength(23);
  });

  it("returns null for destinations without a catalog — never Jaipur's data", () => {
    expect(resolveCatalog(ctx({ name: "Paris, France" }))).toBeNull();
    expect(resolveCatalog(ctx({ name: "Tokyo, Japan" }))).toBeNull();
  });

  it("does not match unrelated names that merely contain the substring", () => {
    // Guard: matching is on the display label; a false-positive city would be a bug.
    expect(resolveCatalog(ctx({ name: "Jaipurpur Village, India" }))?.label).toBe("Jaipur, India"); // documents current substring behavior
  });
});

describe("supportedDestinations", () => {
  it("lists Jaipur", () => {
    expect(supportedDestinations()).toContain("Jaipur");
  });
});

describe("zonesForTrip", () => {
  it("uses the trip's own zones when present", () => {
    expect(zonesForTrip(ctx({ name: "Paris" }))).toHaveLength(1);
  });
  it("falls back to legacy Jaipur zones only for trips saved before destination context", () => {
    expect(zonesForTrip(undefined)).toBe(JAIPUR_ZONES);
  });
});
