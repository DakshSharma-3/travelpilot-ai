import type { Conflict, ItineraryItem, Trip } from "../types";
import { toMin, fmtTime } from "../time";
import { estimateRoute } from "../services/routingService";

export const isActive = (i: ItineraryItem): boolean =>
  i.status !== "removed" && i.status !== "unavailable";

export const activeItems = (trip: Trip): ItineraryItem[] => trip.items.filter(isActive);

export const itemsForDay = (trip: Trip, date: string, includeInactive = false): ItineraryItem[] =>
  trip.items
    .filter((i) => i.date === date && (includeInactive || isActive(i)))
    .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));

export interface DayMetrics {
  date: string;
  activityCost: number;
  transportCost: number;
  total: number;
  travelMinutes: number;
  count: number;
}

export const dayMetrics = (trip: Trip, date: string): DayMetrics => {
  const items = itemsForDay(trip, date);
  const activityCost = items.reduce((s, i) => s + i.estimatedCost, 0);
  const transportCost = items.reduce((s, i) => s + i.estimatedTransportCost, 0);
  const travelMinutes = items.reduce((s, i) => s + i.estimatedTravelMinutes, 0);
  return { date, activityCost, transportCost, total: activityCost + transportCost, travelMinutes, count: items.length };
};

export const tripTotals = (trip: Trip) => {
  const items = activeItems(trip);
  const activityCost = items.reduce((s, i) => s + i.estimatedCost, 0);
  const transportCost = items.reduce((s, i) => s + i.estimatedTransportCost, 0);
  const travelMinutes = items.reduce((s, i) => s + i.estimatedTravelMinutes, 0);
  const total = activityCost + transportCost;
  return {
    activityCost,
    transportCost,
    travelMinutes,
    total,
    remaining: trip.constraints.budget - total,
    pct: trip.constraints.budget ? Math.round((total / trip.constraints.budget) * 100) : 0,
  };
};

/** Deterministic conflict detection: overlap + travel-time feasibility + day window. */
export const detectConflicts = (trip: Trip, date?: string): Conflict[] => {
  const conflicts: Conflict[] = [];
  const dates = date ? [date] : [...new Set(trip.items.map((i) => i.date))];
  const { dayStart, dayEnd, transport } = trip.constraints;
  for (const d of dates) {
    const items = itemsForDay(trip, d);
    items.forEach((item, idx) => {
      if (toMin(item.startTime) < toMin(dayStart) || toMin(item.endTime) > toMin(dayEnd)) {
        conflicts.push({
          itemId: item.id,
          kind: "outside-day",
          message: `${item.title} falls outside your ${fmtTime(dayStart)}–${fmtTime(dayEnd)} window.`,
        });
      }
      if (idx === 0) return;
      const prev = items[idx - 1];
      const travel = estimateRoute(prev.zoneId, item.zoneId, transport).minutes;
      if (toMin(item.startTime) < toMin(prev.endTime)) {
        conflicts.push({
          itemId: item.id,
          withItemId: prev.id,
          kind: "overlap",
          message: `${item.title} overlaps with ${prev.title}.`,
        });
      } else if (toMin(item.startTime) < toMin(prev.endTime) + travel) {
        conflicts.push({
          itemId: item.id,
          withItemId: prev.id,
          kind: "travel",
          message: `Only ${toMin(item.startTime) - toMin(prev.endTime)} min between ${prev.title} and ${item.title}; travel needs ~${travel} min.`,
        });
      }
    });
  }
  return conflicts;
};

/** Free windows in a day (gaps ≥ minMinutes), accounting for the day window. */
export const freeWindows = (
  trip: Trip,
  date: string,
  minMinutes = 30,
): { start: number; end: number; afterItemId?: string; beforeItemId?: string }[] => {
  const items = itemsForDay(trip, date);
  const { dayStart, dayEnd } = trip.constraints;
  const gaps: { start: number; end: number; afterItemId?: string; beforeItemId?: string }[] = [];
  let cursor = toMin(dayStart);
  let prevId: string | undefined;
  for (const it of items) {
    if (toMin(it.startTime) - cursor >= minMinutes) {
      gaps.push({ start: cursor, end: toMin(it.startTime), afterItemId: prevId, beforeItemId: it.id });
    }
    cursor = Math.max(cursor, toMin(it.endTime));
    prevId = it.id;
  }
  if (toMin(dayEnd) - cursor >= minMinutes) gaps.push({ start: cursor, end: toMin(dayEnd), afterItemId: prevId });
  return gaps;
};
