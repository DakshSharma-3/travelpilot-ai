export type Category =
  | "history"
  | "architecture"
  | "food"
  | "nature"
  | "culture"
  | "shopping"
  | "viewpoint";

export type TransportMode = "auto" | "cab" | "walk" | "public";
export type Pace = "relaxed" | "balanced" | "packed";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "any";

export type ItemStatus =
  | "planned"
  | "unavailable"
  | "replacement"
  | "rescheduled"
  | "added"
  | "removed";

export interface Zone {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

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
