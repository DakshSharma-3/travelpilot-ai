/**
 * routingService — DEMO routing.
 * Distances come from a small zone coordinate graph (haversine × road factor),
 * not a live maps API. Swap `estimateRoute` for a real provider later; the
 * rest of the engine only depends on the RouteEstimate shape.
 */
import { zoneById } from "../data/jaipur";
import type { TransportMode } from "../types";
import { roundTo5 } from "../time";

export const ROUTING_LABEL = "Demo routing";

export interface RouteEstimate {
  km: number;
  minutes: number;
  cost: number;
  mode: TransportMode;
}

const ROAD_FACTOR = 1.35;

const MODE_PROFILE: Record<TransportMode, { kmh: number; base: number; perKm: number; overhead: number }> = {
  walk: { kmh: 4.5, base: 0, perKm: 0, overhead: 0 },
  auto: { kmh: 18, base: 40, perKm: 14, overhead: 5 },
  cab: { kmh: 22, base: 80, perKm: 18, overhead: 5 },
  public: { kmh: 14, base: 15, perKm: 3, overhead: 10 },
};

const haversineKm = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

export const distanceKm = (fromZoneId: string, toZoneId: string): number => {
  if (fromZoneId === toZoneId) return 0.8; // intra-zone hop
  const a = zoneById(fromZoneId);
  const b = zoneById(toZoneId);
  return +(haversineKm(a.lat, a.lng, b.lat, b.lng) * ROAD_FACTOR).toFixed(1);
};

export const estimateRoute = (
  fromZoneId: string,
  toZoneId: string,
  preferred: TransportMode,
): RouteEstimate => {
  const km = distanceKm(fromZoneId, toZoneId);
  // Walking is only sensible for short hops; fall back to auto for longer legs.
  const mode: TransportMode = preferred === "walk" && km > 2.5 ? "auto" : preferred;
  const p = MODE_PROFILE[mode];
  const minutes = roundTo5((km / p.kmh) * 60 + p.overhead);
  const cost = mode === "walk" ? 0 : Math.round(p.base + p.perKm * km);
  return { km, minutes: Math.max(mode === "walk" ? 5 : 10, minutes), cost, mode };
};
