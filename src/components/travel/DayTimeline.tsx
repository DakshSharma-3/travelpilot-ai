import { AlertTriangle, ArrowDownRight, Clock, IndianRupee, MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { dayMetrics, detectConflicts, itemsForDay } from "@/travel/engine/metrics";
import { scoreAlternatives } from "@/travel/engine/disruption";
import { fmtDate, fmtTime, inr } from "@/travel/time";
import type { ItineraryItem, Trip } from "@/travel/types";

interface Props {
  trip: Trip;
  date: string;
  dayIndex: number;
  highlightIds: Set<string>;
  onDisrupt: (item: ItineraryItem) => void;
}

export function DayTimeline({ trip, date, dayIndex, highlightIds, onDisrupt }: Props) {
  const items = itemsForDay(trip, date, true);
  const metrics = dayMetrics(trip, date);
  const conflicts = detectConflicts(trip, date);

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Day {dayIndex + 1}</p>
          <h3 className="font-display text-xl font-semibold tracking-tight">{fmtDate(date, "EEEE, d MMMM")}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">{metrics.count} stops</Badge>
          <Badge variant="secondary">{metrics.travelMinutes} min travel</Badge>
          <Badge variant="info">{inr(metrics.total)} spend</Badge>
        </div>
      </div>

      {conflicts.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-xl border border-warning/50 bg-warning/10 p-3 text-xs">
          {conflicts.map((c, i) => (
            <li key={i} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {c.message}
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No activities planned for this day yet.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.map((item) => (
            <TimelineItem
              key={item.id}
              trip={trip}
              item={item}
              highlighted={highlightIds.has(item.id)}
              onDisrupt={onDisrupt}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function TimelineItem({
  trip,
  item,
  highlighted,
  onDisrupt,
}: {
  trip: Trip;
  item: ItineraryItem;
  highlighted: boolean;
  onDisrupt: (i: ItineraryItem) => void;
}) {
  const inactive = item.status === "removed" || item.status === "unavailable";
  const backup = !inactive ? backupFor(trip, item) : null;

  return (
    <li
      className={[
        "relative rounded-xl border p-4 transition-colors",
        highlighted ? "border-primary/60 bg-primary/5 ring-1 ring-primary/30" : "bg-background/60",
        inactive ? "opacity-60" : "",
      ].join(" ")}
    >
      {item.estimatedTravelMinutes > 0 && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowDownRight className="size-3.5" />
          {item.estimatedTravelMinutes} min travel · {inr(item.estimatedTransportCost)} (demo routing)
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-primary">
              {fmtTime(item.startTime)} – {fmtTime(item.endTime)}
            </span>
            <StatusBadge status={item.status} />
            <Badge variant="outline" className="capitalize">{item.category}</Badge>
          </div>
          <h4 className={`mt-1 text-lg font-semibold tracking-tight ${inactive ? "line-through" : ""}`}>{item.title}</h4>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" /> {item.location}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>
          {item.changeNote && (
            <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium">
              <Sparkles className="size-3.5" /> {item.changeNote}
            </p>
          )}
          {backup && (
            <p className="mt-2 text-xs text-muted-foreground">
              Backup if unavailable: <span className="font-medium text-foreground">{backup.activity.title}</span> ·{" "}
              {backup.reason}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="flex items-center gap-1 text-sm font-semibold">
            <IndianRupee className="size-3.5" />
            {Math.round(item.estimatedCost).toLocaleString("en-IN")}
          </span>
          {!inactive && (
            <Button variant="warn" size="sm" onClick={() => onDisrupt(item)}>
              <AlertTriangle className="size-4" /> Activity unavailable
            </Button>
          )}
          {inactive && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> not counted in spend
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function backupFor(trip: Trip, item: ItineraryItem) {
  const day = itemsForDay(trip, item.date);
  const idx = day.findIndex((i) => i.id === item.id);
  const alts = scoreAlternatives(trip, item, day[idx - 1], day[idx + 1]);
  return alts[0] ?? null;
}
