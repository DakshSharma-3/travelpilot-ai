import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { TimeOfDay } from "./types";

export const toMin = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

export const fromMin = (m: number): string => {
  const mm = Math.max(0, Math.round(m));
  return `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
};

export const fmtTime = (t: string): string => {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
};

export const fmtDate = (d: string, pattern = "EEE, d MMM"): string => format(parseISO(d), pattern);

export const tripDates = (start: string, end: string): string[] => {
  const s = parseISO(start);
  const n = Math.max(0, differenceInCalendarDays(parseISO(end), s));
  return Array.from({ length: n + 1 }, (_, i) => format(addDays(s, i), "yyyy-MM-dd"));
};

export const timeOfDay = (t: string): TimeOfDay => {
  const m = toMin(t);
  if (m < 12 * 60) return "morning";
  if (m < 17 * 60) return "afternoon";
  return "evening";
};

export const roundTo5 = (m: number): number => Math.ceil(m / 5) * 5;

export const inr = (n: number): string => `₹${Math.round(n).toLocaleString("en-IN")}`;

export const uid = (prefix = "id"): string =>
  `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
