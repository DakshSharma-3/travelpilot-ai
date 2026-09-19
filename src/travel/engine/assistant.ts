import type { CatalogActivity, ChangeSet, ItineraryItem, Trip } from "../types";
import { JAIPUR_CATALOG, zoneById } from "../data/jaipur";
import { distanceKm, estimateRoute } from "../services/routingService";
import { getForecast } from "../services/weatherService";
import { fmtDate, fmtTime, inr, toMin, tripDates } from "../time";
import { freeWindows, itemsForDay, dayMetrics, tripTotals } from "./metrics";
import { removeItem, runDisruption, tryAddActivity } from "./disruption";

export interface AssistantReply {
  text: string;
  bullets?: string[];
  trip?: Trip; // present when the itinerary state was modified
  changeSet?: ChangeSet;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const describe = (i: ItineraryItem) =>
  `${fmtTime(i.startTime)}–${fmtTime(i.endTime)} ${i.title} · ${i.location} · ${inr(i.estimatedCost)}${
    i.estimatedTravelMinutes ? ` · ${i.estimatedTravelMinutes} min travel` : ""
  }`;

/** Resolve which trip date the user means. Day 1 is treated as "today" for the demo. */
const resolveDate = (q: string, trip: Trip, todayIndex: number): { date: string; label: string } | null => {
  const dates = tripDates(trip.constraints.startDate, trip.constraints.endDate);
  const dayMatch = q.match(/day (\d+)/);
  if (dayMatch) {
    const n = Number(dayMatch[1]);
    if (n >= 1 && n <= dates.length) return { date: dates[n - 1], label: `Day ${n}` };
    return null;
  }
  if (/tomorrow/.test(q)) {
    const d = dates[todayIndex + 1];
    return d ? { date: d, label: "tomorrow" } : null;
  }
  if (/today|tonight|this (morning|afternoon|evening)/.test(q)) return { date: dates[todayIndex], label: "today" };
  if (/last day|final day/.test(q)) return { date: dates[dates.length - 1], label: "your last day" };
  if (/first day/.test(q)) return { date: dates[0], label: "Day 1" };
  return null;
};

const STOP = new Set(["fort", "food", "walk", "stop", "court", "the", "and", "show", "view"]);
const matchScore = (title: string, q: string): number => {
  const words = norm(title).split(" ").filter((w) => w.length >= 3 && !STOP.has(w));
  const hits = words.filter((w) => q.includes(w)).length;
  return hits ? hits + hits / words.length : 0;
};

const findItem = (q: string, trip: Trip): ItineraryItem | undefined => {
  const active = trip.items.filter((i) => i.status !== "removed" && i.status !== "unavailable");
  let best: { item: ItineraryItem; s: number } | undefined;
  for (const i of active) {
    const s = matchScore(i.title, q);
    if (s && (!best || s > best.s)) best = { item: i, s };
  }
  return best?.item;
};

const findCatalog = (q: string): CatalogActivity | undefined => {
  let best: { a: CatalogActivity; s: number } | undefined;
  for (const a of JAIPUR_CATALOG) {
    const s = matchScore(a.title, q);
    if (s && (!best || s > best.s)) best = { a, s };
  }
  return best?.a;
};

export const askAssistant = (raw: string, trip: Trip, todayIndex = 0): AssistantReply => {
  const q = norm(raw);
  const c = trip.constraints;
  const dates = tripDates(c.startDate, c.endDate);

  // --- Modifications ---------------------------------------------------
  if (/^(remove|delete|drop|cancel|skip) /.test(q) && !/what (happens|if)/.test(q)) {
    const item = findItem(q, trip);
    if (!item) return { text: "I couldn't match that to an activity in your itinerary. Try the exact name, e.g. \"remove Albert Hall\"." };
    const r = removeItem(trip, item.id);
    return { text: `Done — removed ${item.title} from ${fmtDate(item.date)}.`, bullets: r.changeSet.summary, trip: r.trip, changeSet: r.changeSet };
  }
  if (!/^(can|could|is there|would|will) /.test(q) && (/^(add|insert|include|put|schedule) /.test(q) || /(add|fit|squeeze) .* (in|into|to) (today|tomorrow|day \d)/.test(q))) {
    const a = findCatalog(q);
    if (!a) return { text: "I couldn't find that in the Jaipur catalog.", bullets: JAIPUR_CATALOG.slice(0, 8).map((x) => x.title) };
    const when = resolveDate(q, trip, todayIndex) ?? { date: dates[todayIndex], label: "today" };
    const r = tryAddActivity(trip, a, when.date);
    if (!r.ok) return { text: `Not safe to add automatically: ${r.reason}`, bullets: [`Tip: try another day, or remove something first.`] };
    return { text: `Added ${a.title} ${when.label} at ${fmtTime(r.item.startTime)}.`, bullets: r.changeSet.summary, trip: r.trip, changeSet: r.changeSet };
  }

  // --- Hypotheticals ---------------------------------------------------
  if (/(what (happens|if)|if .* (cancel|closed|unavailable))/.test(q)) {
    const item = findItem(q, trip);
    if (!item) return { text: "Which activity? Ask e.g. \"What happens if City Palace is cancelled?\"" };
    const sim = runDisruption(trip, item.id);
    return {
      text: `Dry run (nothing applied) — if ${item.title} were cancelled:`,
      bullets: [
        ...sim.changeSet.summary,
        sim.chosen ? `Top alternative would be ${sim.chosen.activity.title} (${sim.chosen.score} pts).` : "No replacement would be available.",
        "Use the \"Activity unavailable\" button on the card to apply this.",
      ],
    };
  }

  // --- Can I fit X? ----------------------------------------------------
  if (/can i (fit|add|do|squeeze)|is there (time|room)/.test(q)) {
    const a = findCatalog(q);
    const when = resolveDate(q, trip, todayIndex) ?? { date: dates[todayIndex], label: "today" };
    if (!a) {
      const gaps = freeWindows(trip, when.date, 45);
      return {
        text: gaps.length ? `Free windows ${when.label} (${fmtDate(when.date)}):` : `No free window of 45+ min ${when.label}.`,
        bullets: gaps.map((g) => `${fmtTime(fromMinStr(g.start))}–${fmtTime(fromMinStr(g.end))} (${g.end - g.start} min)`),
      };
    }
    const r = tryAddActivity(trip, a, when.date);
    if (r.ok) {
      return {
        text: `Yes — ${a.title} fits ${when.label} at ${fmtTime(r.item.startTime)}–${fmtTime(r.item.endTime)} without moving anything else. Say "add ${a.title} ${when.label}" to schedule it.`,
        bullets: [`Cost ${inr(a.cost)} + ${inr(r.item.estimatedTransportCost)} transport; ${r.item.estimatedTravelMinutes} min travel from the previous stop.`],
      };
    }
    return { text: `Not without moving other plans. ${r.reason}` };
  }

  // --- Near hotel ------------------------------------------------------
  if (/(near|close to|around|nearby|walking distance).*(hotel|stay|accommodation)|hotel.*(near|close)/.test(q)) {
    const hz = zoneById(c.hotelZoneId);
    const ranked = trip.items
      .filter((i) => i.status !== "removed" && i.status !== "unavailable")
      .map((i) => ({ i, km: distanceKm(c.hotelZoneId, i.zoneId), r: estimateRoute(c.hotelZoneId, i.zoneId, c.transport) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 5);
    return {
      text: `Closest to your hotel in ${hz.name}:`,
      bullets: ranked.map(({ i, km, r }) => `${i.title} (${fmtDate(i.date)}) — ~${km} km, ${r.minutes} min by ${r.mode}`),
    };
  }

  // --- Budget ----------------------------------------------------------
  if (/budget|spend|cost|expens|money|afford/.test(q)) {
    const t = tripTotals(trip);
    return {
      text: `You're at ${inr(t.total)} of a ${inr(c.budget)} budget (${t.pct}%), ${t.remaining >= 0 ? `${inr(t.remaining)} left` : `${inr(-t.remaining)} over`}.`,
      bullets: [
        `Activities ${inr(t.activityCost)} · Transport ${inr(t.transportCost)}`,
        ...dates.map((d, i) => `Day ${i + 1}: ${inr(dayMetrics(trip, d).total)}`),
      ],
    };
  }

  // --- Weather ---------------------------------------------------------
  if (/weather|rain|hot|temperature|forecast/.test(q)) {
    const f = getForecast(dates);
    return { text: "Demo forecast (not live data):", bullets: f.map((w, i) => `Day ${i + 1} ${fmtDate(w.date)}: ${w.condition.replace("-", " ")}, ${w.lowC}–${w.highC}°C. ${w.advice}`) };
  }

  // --- Travel time -----------------------------------------------------
  if (/travel time|how far|commute|how long .* (get|reach)|distance/.test(q)) {
    const t = tripTotals(trip);
    return {
      text: `Total estimated travel: ${t.travelMinutes} min across the trip (demo routing by ${c.transport}).`,
      bullets: dates.map((d, i) => `Day ${i + 1}: ${dayMetrics(trip, d).travelMinutes} min`),
    };
  }

  // --- Schedule questions ---------------------------------------------
  const when = resolveDate(q, trip, todayIndex);
  const slot = /morning/.test(q) ? "morning" : /afternoon/.test(q) ? "afternoon" : /evening|night|tonight/.test(q) ? "evening" : null;
  if (when || slot || /schedule|plan|itinerary|doing|do next|what s next|whats next/.test(q)) {
    const target = when ?? { date: dates[todayIndex], label: "today" };
    let items = itemsForDay(trip, target.date);
    if (slot) {
      items = items.filter((i) => {
        const m = toMin(i.startTime);
        return slot === "morning" ? m < 12 * 60 : slot === "afternoon" ? m >= 12 * 60 && m < 17 * 60 : m >= 17 * 60;
      });
    }
    if (!items.length) return { text: `Nothing scheduled ${target.label}${slot ? ` ${slot}` : ""} (${fmtDate(target.date)}). Ask "can I fit Jal Mahal ${target.label}?" to fill it.` };
    const m = dayMetrics(trip, target.date);
    return {
      text: `${target.label[0].toUpperCase()}${target.label.slice(1)}${slot ? ` ${slot}` : ""} (${fmtDate(target.date)}):`,
      bullets: [...items.map(describe), `Day total ${inr(m.total)} · ${m.travelMinutes} min travel`],
    };
  }

  // --- Item lookup -----------------------------------------------------
  const item = findItem(q, trip);
  if (item) {
    return { text: `${item.title} is on ${fmtDate(item.date)}.`, bullets: [describe(item), item.notes] };
  }

  return {
    text: "I can answer from your current itinerary. Try:",
    bullets: [
      "What should I do tomorrow morning?",
      "Can I fit Jal Mahal into today's schedule?",
      "Which activities are close to my hotel?",
      "What happens if City Palace is cancelled?",
      "How's my budget?",
      "Add Birla Mandir to day 2",
    ],
  };
};

const fromMinStr = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
