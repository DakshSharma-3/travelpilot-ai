import type { CatalogActivity, DestinationContext, Zone } from "../types";
import { JAIPUR_CATALOG, JAIPUR_ZONES } from "./jaipur";

/**
 * Registry of destinations that have an activity catalog.
 *
 * Phase A ships only the curated Jaipur catalog. Destinations that resolve to
 * real coordinates but have no catalog here are refused honestly at generation
 * time — the engine must never silently plan a Jaipur itinerary for them.
 * Phase B (place discovery) will fill this registry dynamically.
 */
export interface DestinationCatalog {
  label: string;
  zones: Zone[];
  activities: CatalogActivity[];
}

interface RegistryEntry extends DestinationCatalog {
  match: (ctx: DestinationContext) => boolean;
}

const ENTRIES: RegistryEntry[] = [
  {
    label: "Jaipur, India",
    match: (ctx) => ctx.source === "demo" || /jaipur/i.test(ctx.name),
    zones: JAIPUR_ZONES,
    activities: JAIPUR_CATALOG,
  },
];

/** Look up the curated catalog for a resolved destination, or null if none. */
export const resolveCatalog = (ctx: DestinationContext): DestinationCatalog | null => {
  const entry = ENTRIES.find((e) => e.match(ctx));
  return entry ? { label: entry.label, zones: entry.zones, activities: entry.activities } : null;
};

/** Human-readable list for honest "not supported yet" messages. */
export const supportedDestinations = (): string => ENTRIES.map((e) => e.label).join(", ");

/** Zones for a trip: the trip's own destination zones, else legacy Jaipur zones. */
export const zonesForTrip = (destination?: DestinationContext): Zone[] =>
  destination?.zones ?? JAIPUR_ZONES;
