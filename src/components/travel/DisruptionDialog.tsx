import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Sparkles, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { runDisruption } from "@/travel/engine/disruption";
import { fmtTime, inr } from "@/travel/time";
import type { DisruptionResult, ItineraryItem, Trip } from "@/travel/types";

interface Props {
  trip: Trip;
  item: ItineraryItem | null;
  onClose: () => void;
  onApply: (result: DisruptionResult) => void;
}

const STEP_MS = 850;

export function DisruptionDialog({ trip, item, onClose, onApply }: Props) {
  const result = useMemo<DisruptionResult | null>(() => {
    if (!item) return null;
    try {
      return runDisruption(trip, item.id);
    } catch {
      return null;
    }
  }, [trip, item]);

  const [visible, setVisible] = useState(0);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!result) return;
    setVisible(0);
    setApplied(false);
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      setVisible(n);
      if (n >= result.steps.length) clearInterval(timer);
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [result]);

  const done = !!result && visible >= result.steps.length;

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Disruption agent</DialogTitle>
          <DialogDescription>
            {item ? `${item.title} reported unavailable — replanning only the affected part of your day.` : ""}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <p className="text-sm text-destructive">Couldn't analyse this activity. Close and try again.</p>
        ) : (
          <div className="space-y-5">
            <Progress value={(visible / result.steps.length) * 100} />
            <ol className="space-y-3">
              {result.steps.map((step, i) => {
                const state = i < visible ? "done" : i === visible ? "running" : "pending";
                return (
                  <li
                    key={step.key}
                    className={`rounded-xl border p-3 transition-opacity ${state === "pending" ? "opacity-40" : ""} ${
                      state === "running" ? "border-primary/50 bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full border bg-background">
                        {state === "done" ? (
                          <Check className="size-3.5 text-success" />
                        ) : state === "running" ? (
                          <Loader2 className="size-3.5 animate-spin text-primary" />
                        ) : (
                          <span className="text-[11px] font-semibold text-muted-foreground">{i + 1}</span>
                        )}
                      </span>
                      <span className="text-sm font-semibold">{step.title}</span>
                    </div>
                    {state === "done" && (
                      <ul className="mt-2 space-y-1 pl-8 text-xs text-muted-foreground">
                        {step.detail.map((d, k) => (
                          <li key={k}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>

            {done && (
              <div className="space-y-4 rounded-2xl border bg-muted/40 p-4">
                {result.chosen ? (
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                      <Trophy className="size-3.5" /> Selected alternative
                    </p>
                    <h4 className="mt-1 text-lg font-semibold tracking-tight">{result.chosen.activity.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {result.chosen.activity.location} · {inr(result.chosen.activity.cost)} ·{" "}
                      {result.chosen.travelFromPrev} min away · {result.chosen.reason}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {result.chosen.breakdown.map((b) => (
                        <Badge key={b.label} variant="secondary">
                          {b.label} {Math.round(b.points)}/{b.max}
                        </Badge>
                      ))}
                      <Badge variant="success">Score {Math.round(result.chosen.score)}</Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">No catalog activity fits the freed window — the slot becomes free time.</p>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">What changed</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {result.changeSet.summary.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-saffron" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <span className="rounded-lg bg-background px-3 py-2">
                    Spend {inr(result.changeSet.budgetBefore)} → <strong>{inr(result.changeSet.budgetAfter)}</strong>
                  </span>
                  <span className="rounded-lg bg-background px-3 py-2">
                    Travel {result.changeSet.travelBefore} → <strong>{result.changeSet.travelAfter} min</strong>
                  </span>
                </div>

                {result.chosen && (
                  <p className="text-xs text-muted-foreground">
                    Replacement slot: {fmtTime(
                      result.trip.items.find((i) => i.status === "replacement" && i.catalogId === result.chosen!.activity.id)
                        ?.startTime ?? "00:00",
                    )}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="hero"
                disabled={!done || applied}
                onClick={() => {
                  setApplied(true);
                  onApply(result);
                }}
              >
                {done ? "Apply revised itinerary" : "Agent working…"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
