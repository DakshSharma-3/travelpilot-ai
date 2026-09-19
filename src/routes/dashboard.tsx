import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { History, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TripSummary } from "@/components/travel/TripSummary";
import { DayTimeline } from "@/components/travel/DayTimeline";
import { DisruptionDialog } from "@/components/travel/DisruptionDialog";
import { AssistantPanel } from "@/components/travel/AssistantPanel";
import { useTrip } from "@/travel/store";
import { tripDates, inr } from "@/travel/time";
import type { DisruptionResult, ItineraryItem } from "@/travel/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Trip command center — TravelPilot" },
      {
        name: "description",
        content: "Day-by-day itinerary, live budget, demo forecast, disruption agent and a grounded trip assistant.",
      },
      { property: "og:title", content: "Trip command center — TravelPilot" },
      { property: "og:description", content: "Manage disruptions and replan only the affected part of your day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { trip, hydrated, applyTrip, reset, lastChange, highlightIds } = useTrip();
  const navigate = useNavigate();
  const [target, setTarget] = useState<ItineraryItem | null>(null);

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="h-40 animate-pulse rounded-2xl border bg-muted/50" />
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="surface-gradient min-h-[calc(100vh-3.5rem)]">
        <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight">No trip yet</h1>
          <p className="mt-3 text-muted-foreground">
            Generate an itinerary first and your command center will appear here.
          </p>
          <Button asChild variant="hero" size="xl" className="mt-6">
            <Link to="/plan">Plan my trip</Link>
          </Button>
        </div>
      </main>
    );
  }

  const dates = tripDates(trip.constraints.startDate, trip.constraints.endDate);

  const handleApply = (result: DisruptionResult) => {
    applyTrip(result.trip, result.changeSet);
    setTarget(null);
    toast.success("Revised itinerary applied", {
      description: result.chosen ? `Replaced with ${result.chosen.activity.title}.` : "Slot is now free time.",
    });
  };

  return (
    <main className="surface-gradient min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Command center</p>
            <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              Your {dates.length}-day plan
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/plan">Edit constraints</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
                navigate({ to: "/plan" });
              }}
            >
              <RotateCcw className="size-4" /> Start over
            </Button>
          </div>
        </div>

        <TripSummary trip={trip} />

        {lastChange && (
          <section className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
                <Sparkles className="size-4 text-primary" /> What changed — {lastChange.title}
              </h2>
              <Badge variant="info">{lastChange.changedIds.length} items touched</Badge>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {lastChange.summary.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Spend {inr(lastChange.budgetBefore)} → {inr(lastChange.budgetAfter)} · travel {lastChange.travelBefore} →{" "}
              {lastChange.travelAfter} min
            </p>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            {dates.map((date, i) => (
              <DayTimeline
                key={date}
                trip={trip}
                date={date}
                dayIndex={i}
                highlightIds={highlightIds}
                onDisrupt={setTarget}
              />
            ))}
          </div>

          <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            <AssistantPanel
              trip={trip}
              onTripChange={(t, c) => {
                applyTrip(t, c);
                toast.success(c.title);
              }}
            />
            {trip.changeLog.length > 0 && (
              <section className="rounded-2xl border bg-card p-5 shadow-card">
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
                  <History className="size-4 text-primary" /> Change log
                </h3>
                <ol className="mt-3 space-y-2 text-sm">
                  {trip.changeLog.map((c) => (
                    <li key={c.id} className="rounded-xl border bg-background/60 p-3">
                      <p className="font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.at).toLocaleTimeString()} · {c.changedIds.length} items ·{" "}
                        {inr(c.budgetBefore)} → {inr(c.budgetAfter)}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </div>
      </div>

      <DisruptionDialog trip={trip} item={target} onClose={() => setTarget(null)} onApply={handleApply} />
    </main>
  );
}
