import type { CatalogActivity, ItineraryItem, Pace, Trip, TripConstraints } from "../types";
import { JAIPUR_CATALOG } from "../data/jaipur";
import { estimateRoute } from "../services/routingService";
import { fromMin, timeOfDay, toMin, tripDates, uid } from "../time";

const PACE_SLOTS: Record<Pace, number> = { relaxed: 3, balanced: 4, packed: 5 };
const BUFFER_MIN = 15;

interface Placement {
  activity: CatalogActivity;
  start: number;
  end: number;
  travel: number;
  transportCost: number;
}

/** Try to place an activity after `cursor` starting from `fromZone`. */
export const tryPlace = (
  a: CatalogActivity,
  cursor: number,
  fromZone: string,
  c: TripConstraints,
  hardEnd = toMin(c.dayEnd),
): Placement | null => {
  const route = estimateRoute(fromZone, a.zoneId, c.transport);
  const start = Math.max(cursor + route.minutes, toMin(a.openTime));
  const end = start + a.durationMinutes;
  if (end > Math.min(toMin(a.closeTime), hardEnd)) return null;
  // Don't leave people idle more than 90 min waiting for opening time.
  if (start - (cursor + route.minutes) > 90) return null;
  return { activity: a, start, end, travel: route.minutes, transportCost: route.cost };
};

export const interestFit = (a: CatalogActivity, interests: string[]): number =>
  a.tags.filter((t) => interests.includes(t)).length;

const scorePlacement = (p: Placement, c: TripConstraints, remainingBudget: number, wantMeal: boolean): number => {
  const a = p.activity;
  if (!!a.isMeal !== wantMeal) return -Infinity;
  let s = 0;
  s += interestFit(a, c.interests) * 4;
  if (a.category === c.interests[0]) s += 2;
  const tod = timeOfDay(fromMin(p.start));
  if (a.bestTime === "any" || a.bestTime === tod) s += 3;
  else if (a.bestTime === "evening" && tod === "morning") s -= 4;
  s -= p.travel / 10;
  if (c.transport === "walk") s -= p.travel / 10;
  const cost = a.cost + p.transportCost;
  if (cost > remainingBudget) s -= 12;
  else s += Math.min(3, (remainingBudget - cost) / 2000);
  if (c.pace === "relaxed" && a.durationMinutes > 120) s -= 2;
  if (c.pace === "packed" && a.durationMinutes <= 60) s += 1;
  return s;
};

export const generateItinerary = (constraints: TripConstraints): Trip => {
  const dates = tripDates(constraints.startDate, constraints.endDate);
  const items: ItineraryItem[] = [];
  const used = new Set<string>();
  let remaining = constraints.budget;
  const perDay = constraints.budget / dates.length;

  for (const date of dates) {
    let cursor = toMin(constraints.dayStart);
    let zone = constraints.hotelZoneId;
    let count = 0;
    let dayCost = 0;
    let hadLunch = false;
    let hadDinner = false;
    const dayEnd = toMin(constraints.dayEnd);
    let guard = 0;

    while (cursor < dayEnd - 30 && guard++ < 20) {
      const wantLunch = !hadLunch && cursor >= toMin("12:00") && cursor <= toMin("15:00");
      const wantDinner = !hadDinner && cursor >= toMin("18:30") && dayEnd - cursor >= 60;
      const wantMeal = wantLunch || wantDinner;
      const slotsLeft = PACE_SLOTS[constraints.pace] - count;
      if (!wantMeal && slotsLeft <= 0) {
        // Push cursor to dinner time if there's room, else end day.
        if (!hadDinner && dayEnd - toMin("18:30") >= 60 && cursor < toMin("18:30")) {
          cursor = toMin("18:30");
          continue;
        }
        break;
      }
      const dayBudgetLeft = Math.max(perDay - dayCost, remaining * 0.6);
      let best: { p: Placement; s: number } | null = null;
      for (const a of JAIPUR_CATALOG) {
        if (used.has(a.id)) continue;
        const p = tryPlace(a, cursor, zone, constraints);
        if (!p) continue;
        const s = scorePlacement(p, constraints, dayBudgetLeft, wantMeal);
        if (s === -Infinity) continue;
        if (!best || s > best.s) best = { p, s };
      }
      if (!best) {
        if (wantMeal) {
          if (wantLunch) hadLunch = true;
          else hadDinner = true;
          continue;
        }
        break;
      }
      const { p } = best;
      const a = p.activity;
      used.add(a.id);
      items.push({
        id: uid("it"),
        catalogId: a.id,
        date,
        startTime: fromMin(p.start),
        endTime: fromMin(p.end),
        title: a.title,
        category: a.category,
        location: a.location,
        zoneId: a.zoneId,
        estimatedCost: a.cost,
        estimatedTravelMinutes: p.travel,
        estimatedTransportCost: p.transportCost,
        status: "planned",
        notes: a.notes,
      });
      const cost = a.cost + p.transportCost;
      dayCost += cost;
      remaining -= cost;
      cursor = p.end + BUFFER_MIN;
      zone = a.zoneId;
      if (a.isMeal) {
        if (wantLunch) hadLunch = true;
        else hadDinner = true;
      } else count++;
    }
  }

  return {
    id: uid("trip"),
    constraints,
    items,
    createdAt: new Date().toISOString(),
    changeLog: [],
  };
};
