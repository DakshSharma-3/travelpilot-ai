/**
 * weatherService — DEMO forecast.
 * Deterministic pseudo-forecast seeded from the date and Jaipur's monthly
 * climate normals. Replace `getForecast` with a real provider later; the UI
 * only depends on the DayWeather shape and always labels this as a demo.
 */
import { parseISO } from "date-fns";
import type { DayWeather } from "../types";

export const WEATHER_LABEL = "Demo forecast";

const MONTH_NORMALS: { high: number; low: number }[] = [
  { high: 22, low: 8 }, { high: 25, low: 11 }, { high: 31, low: 16 }, { high: 37, low: 22 },
  { high: 40, low: 26 }, { high: 39, low: 27 }, { high: 34, low: 26 }, { high: 32, low: 25 },
  { high: 33, low: 23 }, { high: 33, low: 18 }, { high: 29, low: 13 }, { high: 24, low: 9 },
];

const seed = (s: string): number => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000;
};

export const getForecast = (dates: string[]): DayWeather[] =>
  dates.map((date) => {
    const month = parseISO(date).getMonth();
    const n = MONTH_NORMALS[month];
    const r = seed(date);
    const highC = Math.round(n.high + (r - 0.5) * 4);
    const lowC = Math.round(n.low + (r - 0.5) * 3);
    const monsoon = month >= 6 && month <= 8;
    let condition: DayWeather["condition"] = "sunny";
    if (monsoon && r > 0.55) condition = "light-rain";
    else if (highC >= 38) condition = "hot";
    else if (r > 0.7) condition = "partly-cloudy";
    else if (r < 0.2 && month >= 10) condition = "hazy";
    const advice =
      condition === "light-rain"
        ? "Carry a light rain layer; forts get slippery."
        : condition === "hot"
          ? "Front-load outdoor forts before 11am; museums after lunch."
          : condition === "hazy"
            ? "Morning haze may soften viewpoint photos."
            : "Comfortable for walking between Pink City sights.";
    return { date, condition, highC, lowC, advice };
  });
