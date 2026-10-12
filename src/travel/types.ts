export type Category =
  "history" | "architecture" | "food" | "nature" | "culture" | "shopping" | "viewpoint";

export type TransportMode = "auto" | "cab" | "walk" | "public";
export type Pace = "relaxed" | "balanced" | "packed";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "any";

export type ItemStatus =
  "planned" | "unavailable" | "replacement" | "rescheduled" | "added" | "removed";

export interface Zone {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/** Where a destination's coordinates/zones came from. "demo" = bundled Jaipur data. */
export type DestinationSource = "demo" | "geocoded";

/**
 * Resolved destination: real coordinates plus the zones the planning engine
 * routes between. Attached to a Trip at generation time so saved trips keep
 * their destination even if the app's default data changes.
 */
export interface DestinationContext {
  /** Display name, e.g. "Jaipur, Rajasthan" or a full geocoded label. */
  name: string;
  lat: number;
  lng: number;
  /** ISO 3166-1 alpha-2 lowercase country code, when known. */
  countryCode?: string;
  /** IANA timezone, e.g. "Asia/Kolkata", when the provider returns one. */
  timezone?: string;
  /** Zones the engine schedules/routes against. Never silently Jaipur's. */
  zones: Zone[];
  source: DestinationSource;
  /** Data-source attribution to display, e.g. "© OpenStreetMap contributors". */
  attribution?: string;
}

/** One geocoding match the user can choose from. */
export interface GeocodeCandidate {
  id: string;
  /** Short display name (place name or first part of the label). */
  name: string;
  /** Full normalized address from the geocoder. */
  label: string;
  lat: number;
  lng: number;
  countryCode?: string;
  timezone?: string;
  /** Geocoder result type, e.g. "city", "administrative". */
  resultType?: string;
  attribution?: string;
}

export type GeocodeErrorCode =
  | "missing-key"
  | "invalid-key"
  | "rate-limited"
  | "timeout"
  | "network"
  | "bad-response"
  | "not-found";

/** Result of a destination lookup. Errors carry a user-facing message. */
export type GeocodeResult =
  | { ok: true; candidates: GeocodeCandidate[] }
  | { ok: false; code: GeocodeErrorCode; message: string };

export interface CatalogActivity {
  id: string;
  title: string;
  category: Category;
  tags: Category[];
  zoneId: string;
  location: string;
  durationMinutes: number;
  cost: number;
  openTime: string;
  closeTime: string;
  bestTime: TimeOfDay;
  notes: string;
  isMeal?: boolean;
}

export interface ItineraryItem {
  id: string;
  catalogId: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  category: Category;
  location: string;
  zoneId: string;
  estimatedCost: number;
  estimatedTravelMinutes: number;
  estimatedTransportCost: number;
  status: ItemStatus;
  notes: string;
  changeNote?: string;
}

export interface TripConstraints {
  destination: string;
  startDate: string;
  endDate: string;
  dayStart: string;
  dayEnd: string;
  budget: number;
  interests: Category[];
  transport: TransportMode;
  hotelZoneId: string;
  pace: Pace;
}

export interface ChangeSet {
  id: string;
  at: string;
  title: string;
  summary: string[];
  changedIds: string[];
  budgetBefore: number;
  budgetAfter: number;
  travelBefore: number;
  travelAfter: number;
}

export interface Trip {
  id: string;
  constraints: TripConstraints;
  items: ItineraryItem[];
  createdAt: string;
  changeLog: ChangeSet[];
  /** Resolved destination context; absent on legacy trips saved before Phase A. */
  destination?: DestinationContext;
}

export interface Conflict {
  itemId: string;
  withItemId?: string;
  kind: "overlap" | "travel" | "outside-day";
  message: string;
}

export interface ScoredAlternative {
  activity: CatalogActivity;
  score: number;
  breakdown: { label: string; points: number; max: number }[];
  reason: string;
  travelFromPrev: number;
  travelToNext: number;
}

export type StepStatus = "pending" | "running" | "done" | "failed";

export interface AgentStep {
  key: string;
  title: string;
  detail: string[];
}

export interface DisruptionResult {
  steps: AgentStep[];
  trip: Trip;
  changeSet: ChangeSet;
  alternatives: ScoredAlternative[];
  chosen?: ScoredAlternative;
}

export interface DayWeather {
  date: string;
  condition: "sunny" | "partly-cloudy" | "hazy" | "hot" | "light-rain";
  highC: number;
  lowC: number;
  advice: string;
}
