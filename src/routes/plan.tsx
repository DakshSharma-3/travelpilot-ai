import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTrip } from "@/travel/store";
import { JAIPUR_DEMO_CONSTRAINTS, JAIPUR_ZONES } from "@/travel/data/jaipur";
import type { Category, Pace, TransportMode, TripConstraints } from "@/travel/types";
import { tripDates } from "@/travel/time";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Plan a trip — TravelPilot" },
      { name: "description", content: "Set your dates, budget, pace and interests to generate a day-by-day itinerary." },
      { property: "og:title", content: "Plan a trip — TravelPilot" },
      { property: "og:description", content: "Set your constraints and generate an itinerary with travel legs and budget." },
    ],
  }),
  component: PlanPage,
});

const CATEGORIES: Category[] = ["history", "architecture", "food", "nature", "culture", "shopping", "viewpoint"];
const TRANSPORT: { v: TransportMode; l: string }[] = [
  { v: "auto", l: "Auto-rickshaw" },
  { v: "cab", l: "Cab" },
  { v: "walk", l: "Walk where possible" },
  { v: "public", l: "Public transport" },
];
const PACES: Pace[] = ["relaxed", "balanced", "packed"];

const blank: TripConstraints = {
  destination: "Jaipur, Rajasthan",
  startDate: "",
  endDate: "",
  dayStart: "09:00",
  dayEnd: "20:00",
  budget: 10000,
  interests: ["history", "food"],
  transport: "auto",
  hotelZoneId: "mi-road",
  pace: "balanced",
};

function PlanPage() {
  const { draft, setDraft, generate, hydrated } = useTrip();
  const navigate = useNavigate();
  const [form, setForm] = useState<TripConstraints>(blank);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hydrated && draft) setForm(draft);
  }, [hydrated, draft]);

  const set = <K extends keyof TripConstraints>(k: K, v: TripConstraints[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleInterest = (c: Category) =>
    set("interests", form.interests.includes(c) ? form.interests.filter((x) => x !== c) : [...form.interests, c]);

  const validate = (): string | null => {
    if (!form.startDate || !form.endDate) return "Pick a start and end date.";
    if (form.endDate < form.startDate) return "End date must be after start date.";
    if (tripDates(form.startDate, form.endDate).length > 7) return "Demo supports trips up to 7 days.";
    if (form.dayEnd <= form.dayStart) return "Day end must be after day start.";
    if (form.budget < 1000) return "Budget should be at least ₹1,000.";
    if (!form.interests.length) return "Choose at least one interest.";
    return null;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    setError(err);
    if (err) return;
    setBusy(true);
    setDraft(form);
    setTimeout(() => {
      const t = generate(form);
      setBusy(false);
      if (!t.items.length) {
        setError("Couldn't fit any activities in that window. Widen the hours or budget.");
        return;
      }
      navigate({ to: "/dashboard" });
    }, 700);
  };

  return (
    <main className="surface-gradient min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Step 1 of 2</p>
            <h1 className="mt-2 text-4xl font-medium tracking-tight">Tell us the shape of your trip.</h1>
            <p className="mt-2 text-muted-foreground">Constraints become structured state the planning engine reasons over.</p>
          </div>
          <Button type="button" variant="warn" onClick={() => setForm(JAIPUR_DEMO_CONSTRAINTS)}>
            <Sparkles className="size-4" /> Prefill Jaipur demo
          </Button>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-8 rounded-3xl border bg-card p-6 shadow-card sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Destination" className="sm:col-span-2">
              <Input value={form.destination} onChange={(e) => set("destination", e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">Demo catalog covers Jaipur; other destinations use the same engine with Jaipur data.</p>
            </Field>
            <Field label="Start date">
              <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
            <Field label="End date">
              <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </Field>
            <Field label="Daily start time">
              <Input type="time" value={form.dayStart} onChange={(e) => set("dayStart", e.target.value)} />
            </Field>
            <Field label="Daily end time">
              <Input type="time" value={form.dayEnd} onChange={(e) => set("dayEnd", e.target.value)} />
            </Field>
            <Field label="Total budget (INR)">
              <Input type="number" min={1000} step={500} value={form.budget} onChange={(e) => set("budget", Number(e.target.value))} />
            </Field>
            <Field label="Hotel / accommodation area (optional)">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.hotelZoneId}
                onChange={(e) => set("hotelZoneId", e.target.value)}
              >
                {JAIPUR_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Interests & preferences">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const on = form.interests.includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleInterest(c)}
                    aria-pressed={on}
                    className={`rounded-full border px-3.5 py-1.5 text-sm capitalize transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Preferred transport">
              <div className="grid gap-2">
                {TRANSPORT.map((t) => (
                  <label key={t.v} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${form.transport === t.v ? "border-primary bg-primary/5" : ""}`}>
                    <input type="radio" name="transport" checked={form.transport === t.v} onChange={() => set("transport", t.v)} />
                    {t.l}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Pace (optional)">
              <div className="grid gap-2">
                {PACES.map((p) => (
                  <label key={p} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm capitalize ${form.pace === p ? "border-primary bg-primary/5" : ""}`}>
                    <input type="radio" name="pace" checked={form.pace === p} onChange={() => set("pace", p)} />
                    {p}
                    <span className="ml-auto text-xs text-muted-foreground">{p === "relaxed" ? "3 stops/day" : p === "balanced" ? "4 stops/day" : "5 stops/day"}</span>
                  </label>
                ))}
              </div>
            </Field>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
            <Badge variant="demo">Runs locally · no API keys</Badge>
            <Button type="submit" variant="hero" size="xl" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              {busy ? "Generating itinerary…" : "Generate itinerary"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-2 block text-sm font-semibold">{label}</Label>
      {children}
    </div>
  );
}
