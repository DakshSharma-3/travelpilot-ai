import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ChangeSet, Trip, TripConstraints } from "./types";
import { generateItinerary } from "./engine/generator";

const KEY = "travelpilot.trip.v1";
const DRAFT_KEY = "travelpilot.draft.v1";

interface Store {
  trip: Trip | null;
  hydrated: boolean;
  draft: TripConstraints | null;
  setDraft: (d: TripConstraints | null) => void;
  generate: (c: TripConstraints) => Trip;
  applyTrip: (t: Trip, change?: ChangeSet) => void;
  reset: () => void;
  lastChange: ChangeSet | null;
  highlightIds: Set<string>;
  clearHighlights: () => void;
}

const Ctx = createContext<Store | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [draft, setDraftState] = useState<TripConstraints | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [lastChange, setLastChange] = useState<ChangeSet | null>(null);
  const [highlightIds, setHighlight] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const t = JSON.parse(raw) as Trip;
        setTrip(t);
        setLastChange(t.changeLog[0] ?? null);
      }
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) setDraftState(JSON.parse(d));
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  const persist = (t: Trip | null) => {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  };

  const setDraft = useCallback((d: TripConstraints | null) => {
    setDraftState(d);
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  }, []);

  const generate = useCallback((c: TripConstraints) => {
    const t = generateItinerary(c);
    setTrip(t);
    setLastChange(null);
    setHighlight(new Set());
    persist(t);
    return t;
  }, []);

  const applyTrip = useCallback((t: Trip, change?: ChangeSet) => {
    setTrip(t);
    persist(t);
    if (change) {
      setLastChange(change);
      setHighlight(new Set(change.changedIds));
    }
  }, []);

  const reset = useCallback(() => {
    setTrip(null);
    setLastChange(null);
    setHighlight(new Set());
    persist(null);
  }, []);

  const clearHighlights = useCallback(() => setHighlight(new Set()), []);

  const value = useMemo(
    () => ({ trip, hydrated, draft, setDraft, generate, applyTrip, reset, lastChange, highlightIds, clearHighlights }),
    [trip, hydrated, draft, setDraft, generate, applyTrip, reset, lastChange, highlightIds, clearHighlights],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTrip = (): Store => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useTrip must be used within TripProvider");
  return s;
};
