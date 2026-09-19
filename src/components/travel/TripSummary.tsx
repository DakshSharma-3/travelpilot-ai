import { CalendarDays, IndianRupee, MapPin, Route, Timer, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { zoneById } from "@/travel/data/jaipur";
import { tripTotals, activeItems } from "@/travel/engine/metrics";
import { WEATHER_LABEL, getForecast } from "@/travel/services/weatherService";
import { ROUTING_LABEL } from "@/travel/services/routingService";
import { fmtDate, fmtTime, inr, tripDates } from "@/travel/time";
import type { Trip } from "@/travel/types";

const ICONS: Record<string, string> = {
  sunny: "☀️",
  "partly-cloudy": "⛅",
  hazy: "🌫️",
  hot: "🔥",
  "light-rain": "🌧️",
};

export function TripSummary({ trip }: { trip: Trip }) {
  const totals = tripTotals(trip);
  const dates = tripDates(trip.constraints.startDate, trip.constraints.endDate);
  const forecast = getForecast(dates);
  const over = totals.remaining < 0;

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border bg-card p-5 shadow-card lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Trip summary</p>
            <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight">{trip.constraints.destination}</h2>
          </div>
          <Badge variant="saffron" className="capitalize">{trip.constraints.pace} pace</Badge>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={<CalendarDays className="size-4" />} label="Dates">
            {fmtDate(dates[0])} – {fmtDate(dates[dates.length - 1])} · {dates.length} days
          </Stat>
          <Stat icon={<Timer className="size-4" />} label="Daily window">
            {fmtTime(trip.constraints.dayStart)} – {fmtTime(trip.constraints.dayEnd)}
          </Stat>
          <Stat icon={<MapPin className="size-4" />} label="Base">
            {zoneById(trip.constraints.hotelZoneId).name}
          </Stat>
          <Stat icon={<Route className="size-4" />} label="Transport">
            <span className="capitalize">{trip.constraints.transport}</span> · {totals.travelMinutes} min total travel
          </Stat>
          <Stat icon={<IndianRupee className="size-4" />} label="Activities / transport">
            {inr(totals.activityCost)} + {inr(totals.transportCost)}
          </Stat>
          <Stat icon={<Wallet className="size-4" />} label="Stops planned">
            {activeItems(trip).length} activities
          </Stat>
        </dl>
        <div className="mt-5 rounded-xl border bg-muted/40 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Budget</p>
              <p className="text-2xl font-semibold tracking-tight">
                {inr(totals.total)} <span className="text-sm font-normal text-muted-foreground">of {inr(trip.constraints.budget)}</span>
              </p>
            </div>
            <Badge variant={over ? "danger" : "success"}>
              {over ? `${inr(Math.abs(totals.remaining))} over` : `${inr(totals.remaining)} left`}
            </Badge>
          </div>
          <Progress value={Math.min(100, totals.pct)} className="mt-3" />
          <p className="mt-2 text-xs text-muted-foreground">
            Derived live from itinerary items · {ROUTING_LABEL} for transport estimates.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Forecast</p>
          <Badge variant="demo">{WEATHER_LABEL}</Badge>
        </div>
        <ul className="mt-3 space-y-2">
          {forecast.map((w) => (
            <li key={w.date} className="rounded-xl border bg-background/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{fmtDate(w.date)}</span>
                <span className="text-sm">
                  {ICONS[w.condition]} {w.highC}° / {w.lowC}°
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{w.advice}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Simulated from Jaipur climate normals — no live weather API is called.
        </p>
      </div>
    </section>
  );
}

function Stat({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{children}</dd>
    </div>
  );
}
