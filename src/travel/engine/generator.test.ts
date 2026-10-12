import { describe, expect, it } from "vitest";
import type { DestinationContext } from "../types";
import { JAIPUR_DESTINATION, JAIPUR_ZONES, jaipurDemoConstraints } from "../data/jaipur";
import { generateItinerary } from "./generator";

const parisContext: DestinationContext = {
  name: "Paris, France",
  lat: 48.8566,
  lng: 2.3522,
  zones: [{ id: "center", name: "Paris center", lat: 48.8566, lng: 2.3522 }],
  source: "geocoded",
};

describe("generateItinerary", () => {
  it("generates a Jaipur itinerary for the demo destination and attaches its context", () => {
    const trip = generateItinerary(jaipurDemoConstraints(), JAIPUR_DESTINATION);
    expect(trip.items.length).toBeGreaterThan(0);
    expect(trip.destination?.name).toBe("Jaipur, Rajasthan");
    expect(trip.destination?.zones).toBe(JAIPUR_ZONES);
    // Every item comes from the curated Jaipur catalog.
    expect(trip.items.every((i) => i.zoneId !== "center")).toBe(true);
  });

  it("never plans Jaipur activities for an unregistered destination", () => {
    const trip = generateItinerary(jaipurDemoConstraints(), parisContext);
    expect(trip.items).toHaveLength(0);
    expect(trip.destination?.name).toBe("Paris, France");
    expect(trip.destination?.zones).not.toBe(JAIPUR_ZONES);
  });

  it("keeps legacy behavior (bundled Jaipur catalog) when no destination context is passed", () => {
    const trip = generateItinerary(jaipurDemoConstraints());
    expect(trip.items.length).toBeGreaterThan(0);
    expect(trip.destination).toBeUndefined();
  });
});

describe("jaipurDemoConstraints", () => {
  it("produces future dates instead of the old hardcoded ones", () => {
    const c = jaipurDemoConstraints();
    const today = new Date().toISOString().slice(0, 10);
    expect(c.startDate > today).toBe(true);
    expect(c.endDate >= c.startDate).toBe(true);
  });
});
