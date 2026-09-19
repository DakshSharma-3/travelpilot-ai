import type {
  AgentStep,
  CatalogActivity,
  ChangeSet,
  DisruptionResult,
  ItineraryItem,
  ScoredAlternative,
  Trip,
} from "../types";
import { JAIPUR_CATALOG } from "../data/jaipur";
import { estimateRoute } from "../services/routingService";
import { fmtTime, fromMin, timeOfDay, toMin, uid } from "../time";
import { detectConflicts, itemsForDay, tripTotals } from "./metrics";
import { interestFit } from "./generator";

const BUFFER_MIN = 15;

const clone = (trip: Trip): Trip => JSON.parse(JSON.stringify(trip));

/**
 * Re-time items on `date` in order so that each starts no earlier than
 * previous end + travel. Items that no longer fit before dayEnd are removed.
 * Items whose times or travel legs actually change get `rescheduled`.
 */
export const rippleDay = (trip: Trip, date: string, fromIndex = 0): string[] => {
  const changed: string[] = [];
  const items = itemsForDay(trip, date);
  const { transport, dayEnd, hotelZoneId } = trip.constraints;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const prev = items[i - 1];
    const route = estimateRoute(prev ? prev.zoneId : hotelZoneId, it.zoneId, transport);
    const dur = toMin(it.endTime) - toMin(it.startTime);
    const earliest = prev ? toMin(prev.endTime) + BUFFER_MIN + route.minutes : toMin(it.startTime);
    let start = toMin(it.startTime);
    const travelChanged = route.minutes !== it.estimatedTravelMinutes;
    if (i >= fromIndex && start < earliest) start = earliest;
    const end = start + dur;
    if (i >= fromIndex && end > toMin(dayEnd)) {
      it.status = "removed";
      it.changeNote = `Dropped: no longer fits before ${fmtTime(dayEnd)} after upstream changes.`;
      changed.push(it.id);
      // Removed item no longer anchors the next one.
      items.splice(i, 1);
      i--;
      continue;
    }
    if (start !== toMin(it.startTime) || travelChanged) {
      const oldStart = it.startTime;
      it.startTime = fromMin(start);
      it.endTime = fromMin(end);
      it.estimatedTravelMinutes = route.minutes;
      it.estimatedTransportCost = route.cost;
      if (it.status === "planned" || it.status === "rescheduled") {
        it.status = "rescheduled";
        it.changeNote =
          oldStart !== it.startTime
            ? `Moved from ${fmtTime(oldStart)} to ${fmtTime(it.startTime)} (travel ${route.minutes} min).`
            : `Travel leg recalculated to ${route.minutes} min.`;
      }
      changed.push(it.id);
    }
  }
  return changed;
};

export const scoreAlternatives = (
  trip: Trip,
  target: ItineraryItem,
  prev: ItineraryItem | undefined,
  next: ItineraryItem | undefined,
): ScoredAlternative[] => {
  const c = trip.constraints;
  const inUse = new Set(
    trip.items.filter((i) => i.status !== "removed" && i.status !== "unavailable").map((i) => i.catalogId),
  );
  const fromZone = prev ? prev.zoneId : c.hotelZoneId;
  const windowStart = prev ? toMin(prev.endTime) + BUFFER_MIN : toMin(c.dayStart);
  const windowEnd = next ? toMin(next.startTime) : toMin(c.dayEnd);
  const totals = tripTotals(trip);
  const freed = target.estimatedCost + target.estimatedTransportCost;
  const budgetLeft = totals.remaining + freed;

  const out: ScoredAlternative[] = [];
  for (const a of JAIPUR_CATALOG) {
    if (inUse.has(a.id) || a.id === target.catalogId) continue;
    const inRoute = estimateRoute(fromZone, a.zoneId, c.transport);
    const outRoute = next ? estimateRoute(a.zoneId, next.zoneId, c.transport) : { minutes: 0, cost: 0 };
    const start = Math.max(windowStart + inRoute.minutes, toMin(a.openTime));
    const end = start + a.durationMinutes;
    if (end > toMin(a.closeTime) || end > toMin(c.dayEnd)) continue;

    const breakdown: ScoredAlternative["breakdown"] = [];
    const fit = interestFit(a, c.interests);
    breakdown.push({ label: "Interest fit", points: Math.min(30, fit * 12), max: 30 });
    breakdown.push({ label: "Same category", points: a.tags.includes(target.category) ? 12 : 0, max: 12 });
    const travelTotal = inRoute.minutes + outRoute.minutes;
    breakdown.push({ label: "Travel time", points: Math.max(0, 25 - Math.round(travelTotal / 3)), max: 25 });
    const overflow = Math.max(0, end + BUFFER_MIN + outRoute.minutes - windowEnd);
    breakdown.push({
      label: "Fits freed window",
      points: overflow === 0 ? 25 : Math.max(0, 25 - Math.round(overflow / 2)),
      max: 25,
    });
    const cost = a.cost + inRoute.cost;
    breakdown.push({
      label: "Budget",
      points: cost <= budgetLeft ? 10 : cost <= budgetLeft + 500 ? 4 : 0,
      max: 10,
    });
    const tod = timeOfDay(fromMin(start));
    breakdown.push({ label: "Time of day", points: a.bestTime === "any" || a.bestTime === tod ? 5 : 0, max: 5 });
    if (c.transport === "walk") {
      breakdown.push({ label: "Walkable", points: inRoute.km <= 2.5 ? 5 : 0, max: 5 });
    }
    if (c.pace === "relaxed") {
      breakdown.push({ label: "Relaxed pace", points: a.durationMinutes <= 90 ? 3 : 0, max: 3 });
    }
    const score = breakdown.reduce((s, b) => s + b.points, 0);
    const reasons: string[] = [];
    if (fit >= 2) reasons.push(`matches ${fit} of your interests`);
    else if (fit === 1) reasons.push("matches one of your interests");
    if (inRoute.minutes <= 20) reasons.push(`only ${inRoute.minutes} min away`);
    if (overflow === 0) reasons.push("fits the freed window");
    if (cost <= budgetLeft) reasons.push("within remaining budget");
    out.push({
      activity: a,
      score,
      breakdown,
      reason: reasons.length ? reasons.join(", ") : "best available fit",
      travelFromPrev: inRoute.minutes,
      travelToNext: outRoute.minutes,
    });
  }
  return out.sort((a, b) => b.score - a.score);
};

export const buildItemFromCatalog = (
  a: CatalogActivity,
  date: string,
  start: number,
  travel: number,
  transportCost: number,
  status: ItineraryItem["status"],
): ItineraryItem => ({
  id: uid("it"),
  catalogId: a.id,
  date,
  startTime: fromMin(start),
  endTime: fromMin(start + a.durationMinutes),
  title: a.title,
  category: a.category,
  location: a.location,
  zoneId: a.zoneId,
  estimatedCost: a.cost,
  estimatedTravelMinutes: travel,
  estimatedTransportCost: transportCost,
  status,
  notes: a.notes,
});

/** Main disruption agent. Pure: returns a new trip plus a step log. */
export const runDisruption = (input: Trip, itemId: string): DisruptionResult => {
  const trip = clone(input);
  const steps: AgentStep[] = [];
  const before = tripTotals(input);
  const target = trip.items.find((i) => i.id === itemId);
  if (!target) throw new Error("Item not found");
  const c = trip.constraints;
  const day = itemsForDay(trip, target.date);
  const idx = day.findIndex((i) => i.id === itemId);
  const prev = day[idx - 1];
  const next = day[idx + 1];
  const downstream = day.slice(idx + 1);

  // 1. Analyze
  steps.push({
    key: "analyze",
    title: "Analyze disruption",
    detail: [
      `${target.title} on ${target.date} marked unavailable (${fmtTime(target.startTime)}–${fmtTime(target.endTime)}).`,
      `Frees ${toMin(target.endTime) - toMin(target.startTime)} min and ₹${target.estimatedCost + target.estimatedTransportCost} (activity + transport).`,
      `Anchors: ${prev ? `after ${prev.title}` : "start of day from hotel"} → ${next ? `before ${next.title}` : "end of day"}.`,
    ],
  });
  target.status = "unavailable";
  target.changeNote = "Reported unavailable.";

  // 2. Check conflicts
  const stale = downstream.length
    ? [`${downstream.length} downstream item${downstream.length > 1 ? "s" : ""} depend on this slot's travel leg: ${downstream.map((d) => d.title).join(", ")}.`]
    : ["No downstream items on this day; nothing else is affected."];
  if (next) {
    const gapRoute = estimateRoute(prev ? prev.zoneId : c.hotelZoneId, next.zoneId, c.transport);
    stale.push(`Without a replacement, ${next.title} would need a new ${gapRoute.minutes} min leg from ${prev ? prev.title : "the hotel"}.`);
  }
  steps.push({ key: "conflicts", title: "Check conflicts", detail: stale });

  // 3. Alternatives
  const alternatives = scoreAlternatives(trip, target, prev, next).slice(0, 4);
  const chosen = alternatives[0];
  steps.push({
    key: "alternatives",
    title: "Find & evaluate alternatives",
    detail: alternatives.length
      ? [
          `${alternatives.length} candidates open in the freed window, scored on interest fit, category, travel, window fit, budget, and time of day.`,
          ...alternatives.map((a, i) => `${i + 1}. ${a.activity.title} — ${a.score} pts (${a.reason})`),
        ]
      : ["No catalog activity fits the freed window. The slot becomes free time."],
  });

  // 4. Recalculate
  const changedIds: string[] = [target.id];
  const summary: string[] = [`${target.title} was marked unavailable.`];
  let replacement: ItineraryItem | undefined;
  if (chosen) {
    const fromZone = prev ? prev.zoneId : c.hotelZoneId;
    const inRoute = estimateRoute(fromZone, chosen.activity.zoneId, c.transport);
    const windowStart = prev ? toMin(prev.endTime) + BUFFER_MIN : toMin(c.dayStart);
    const start = Math.max(windowStart + inRoute.minutes, toMin(chosen.activity.openTime));
    replacement = buildItemFromCatalog(chosen.activity, target.date, start, inRoute.minutes, inRoute.cost, "replacement");
    replacement.changeNote = `Replaces ${target.title} — ${chosen.reason}.`;
    trip.items.push(replacement);
    changedIds.push(replacement.id);
    summary.push(
      `Replaced with ${chosen.activity.title} (${fmtTime(replacement.startTime)}–${fmtTime(replacement.endTime)}), scored ${chosen.score} pts: ${chosen.reason}.`,
    );
  } else {
    summary.push("No suitable replacement found; the slot is now free time.");
  }
  const rippled = rippleDay(trip, target.date, idx);
  changedIds.push(...rippled);
  const moved = trip.items.filter((i) => rippled.includes(i.id));
  const dropped = moved.filter((i) => i.status === "removed");
  const shifted = moved.filter((i) => i.status !== "removed");
  if (shifted.length) summary.push(`Re-timed ${shifted.map((i) => `${i.title} → ${fmtTime(i.startTime)}`).join("; ")}.`);
  if (dropped.length) summary.push(`Dropped ${dropped.map((i) => i.title).join(", ")} — no longer fits before ${fmtTime(c.dayEnd)}.`);
  const untouched = day.filter((i) => !changedIds.includes(i.id)).length;
  const otherDays = trip.items.filter((i) => i.date !== target.date && i.status !== "removed").length;
  summary.push(`${untouched} other item${untouched === 1 ? "" : "s"} on this day and all ${otherDays} items on other days unchanged.`);

  const after = tripTotals(trip);
  const remainingConflicts = detectConflicts(trip, target.date);
  steps.push({
    key: "recalculate",
    title: "Recalculate budget & timing",
    detail: [
      `Trip spend ₹${before.total} → ₹${after.total} (${after.total - before.total >= 0 ? "+" : ""}₹${after.total - before.total}); remaining ₹${after.remaining}.`,
      `Total travel ${before.travelMinutes} → ${after.travelMinutes} min.`,
      remainingConflicts.length ? `⚠ ${remainingConflicts.length} conflict(s) remain.` : "No time conflicts remain on this day.",
    ],
  });
  summary.push(
    `Spend ${after.total - before.total >= 0 ? "up" : "down"} ₹${Math.abs(after.total - before.total)}; travel ${after.travelMinutes - before.travelMinutes >= 0 ? "up" : "down"} ${Math.abs(after.travelMinutes - before.travelMinutes)} min.`,
  );

  // 5. Apply
  const changeSet: ChangeSet = {
    id: uid("chg"),
    at: new Date().toISOString(),
    title: `${target.title} unavailable`,
    summary,
    changedIds,
    budgetBefore: before.total,
    budgetAfter: after.total,
    travelBefore: before.travelMinutes,
    travelAfter: after.travelMinutes,
  };
  trip.changeLog = [changeSet, ...trip.changeLog];
  steps.push({
    key: "apply",
    title: "Apply revised itinerary",
    detail: [`${changedIds.length} item${changedIds.length === 1 ? "" : "s"} updated. Unaffected items preserved.`],
  });

  return { steps, trip, changeSet, alternatives, chosen };
};

/** Insert a catalog activity into a day if it fits a free window safely. */
export const tryAddActivity = (
  input: Trip,
  a: CatalogActivity,
  date: string,
): { ok: true; trip: Trip; item: ItineraryItem; changeSet: ChangeSet } | { ok: false; reason: string } => {
  if (input.items.some((i) => i.catalogId === a.id && i.status !== "removed" && i.status !== "unavailable")) {
    return { ok: false, reason: `${a.title} is already in your itinerary.` };
  }
  const trip = clone(input);
  const c = trip.constraints;
  const day = itemsForDay(trip, date);
  const before = tripTotals(trip);
  // Candidate slots: after each item, or start of day.
  const anchors: (ItineraryItem | undefined)[] = [undefined, ...day];
  for (let k = anchors.length - 1; k >= 0; k--) {
    const prev = anchors[k];
    const next = prev ? day[day.indexOf(prev) + 1] : day[0];
    const fromZone = prev ? prev.zoneId : c.hotelZoneId;
    const inRoute = estimateRoute(fromZone, a.zoneId, c.transport);
    const windowStart = prev ? toMin(prev.endTime) + BUFFER_MIN : toMin(c.dayStart);
    const start = Math.max(windowStart + inRoute.minutes, toMin(a.openTime));
    const end = start + a.durationMinutes;
    if (end > toMin(a.closeTime) || end > toMin(c.dayEnd)) continue;
    if (next) {
      const outRoute = estimateRoute(a.zoneId, next.zoneId, c.transport);
      if (end + BUFFER_MIN + outRoute.minutes > toMin(next.startTime)) continue; // would push others: not "safe"
    }
    const item = buildItemFromCatalog(a, date, start, inRoute.minutes, inRoute.cost, "added");
    item.changeNote = "Added via assistant.";
    trip.items.push(item);
    const changed = rippleDay(trip, date, 0);
    const after = tripTotals(trip);
    const changeSet: ChangeSet = {
      id: uid("chg"),
      at: new Date().toISOString(),
      title: `Added ${a.title}`,
      summary: [
        `Added ${a.title} on ${date} at ${fmtTime(item.startTime)}–${fmtTime(item.endTime)}.`,
        `Spend ₹${before.total} → ₹${after.total}${after.remaining < 0 ? " (over budget)" : ""}.`,
        changed.length ? `Travel legs recalculated for ${changed.length} neighbour(s).` : "No other items affected.",
      ],
      changedIds: [item.id, ...changed],
      budgetBefore: before.total,
      budgetAfter: after.total,
      travelBefore: before.travelMinutes,
      travelAfter: after.travelMinutes,
    };
    trip.changeLog = [changeSet, ...trip.changeLog];
    return { ok: true, trip, item, changeSet };
  }
  return { ok: false, reason: `${a.title} (${a.durationMinutes} min, open ${fmtTime(a.openTime)}–${fmtTime(a.closeTime)}) doesn't fit any free window on that day without moving other plans.` };
};

/** Remove an item and recompute downstream travel legs. */
export const removeItem = (input: Trip, itemId: string): { trip: Trip; changeSet: ChangeSet } => {
  const trip = clone(input);
  const before = tripTotals(trip);
  const it = trip.items.find((i) => i.id === itemId)!;
  it.status = "removed";
  it.changeNote = "Removed via assistant.";
  const changed = rippleDay(trip, it.date, 0);
  const after = tripTotals(trip);
  const changeSet: ChangeSet = {
    id: uid("chg"),
    at: new Date().toISOString(),
    title: `Removed ${it.title}`,
    summary: [
      `Removed ${it.title} from ${it.date}.`,
      `Spend ₹${before.total} → ₹${after.total}.`,
      changed.length ? "Travel legs recalculated for following items; their start times were kept." : "No other items affected.",
    ],
    changedIds: [it.id, ...changed],
    budgetBefore: before.total,
    budgetAfter: after.total,
    travelBefore: before.travelMinutes,
    travelAfter: after.travelMinutes,
  };
  trip.changeLog = [changeSet, ...trip.changeLog];
  return { trip, changeSet };
};
