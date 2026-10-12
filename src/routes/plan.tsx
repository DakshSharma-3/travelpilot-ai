import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTrip } from "@/travel/store";
import { JAIPUR_DESTINATION, JAIPUR_ZONES, jaipurDemoConstraints } from "@/travel/data/jaipur";
import { resolveCatalog, supportedDestinations } from "@/travel/data/catalogRegistry";
import { geocodeDestination } from "@/travel/services/geocodeFn";
import type {
  Category,
  DestinationContext,
  GeocodeCandidate,
  Pace,
  TransportMode,
  TripConstraints,
} from "@/travel/types";
import { tripDates } from "@/travel/time";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Plan a trip — TravelPilot" },
      {
        name: "description",
        content: "Set your dates, budget, pace and interests to generate a day-by-day itinerary.",
      },
      { property: "og:title", content: "Plan a trip — TravelPilot" },
      {
        property: "og:description",
        content: "Set your constraints and generate an itinerary with travel legs and budget.",
      },
    ],
  }),
  component: PlanPage,
});

const CATEGORIES: Category[] = [
  "history",
  "architecture",
  "food",
  "nature",
  "culture",
  "shopping",
  "viewpoint",
];
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

type Busy = "idle" | "resolving" | "generating";

/** Honest message when a real destination has no activity catalog yet. */
const noCatalogMessage = (name: string) =>
  `No trip was generated. We don't have an activity catalog for "${name}" yet — discovering activities for worldwide destinations is coming in a later phase. Currently supported: ${supportedDestinations()}.`;

/** Wrap a geocode candidate as a destination context (zones come from the catalog registry). */
const candidateToDestination = (c: GeocodeCandidate): DestinationContext => ({
  name: c.label,
  lat: c.lat,
  lng: c.lng,
  ...(c.countryCode ? { countryCode: c.countryCode } : {}),
  ...(c.timezone ? { timezone: c.timezone } : {}),
  zones: [{ id: "center", name: `${c.name} center`, lat: c.lat, lng: c.lng }],
  source: "geocoded",
  attribution: c.attribution ?? "Location data © OpenStreetMap contributors (Geoapify)",
});

function PlanPage() {
  const { draft, setDraft, generate, hydrated } = useTrip();
  const navigate = useNavigate();
  const [form, setForm] = useState<TripConstraints>(blank);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>("idle");
  const [pending, setPending] = useState<GeocodeCandidate[] | null>(null);
  // True only after "Prefill Jaipur demo": the one path that skips geocoding
  // and uses the bundled Jaipur catalog explicitly.
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (hydrated && draft) setForm(draft);
  }, [hydrated, draft]);

  const set = <K extends keyof TripConstraints>(k: K, v: TripConstraints[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const onDestinationChange = (v: string) => {
    set("destination", v);
    setDemoMode(false); // typing a new destination must go through geocoding
    setPending(null);
  };
  const toggleInterest = (c: Category) =>
    set(
      "interests",
      form.interests.includes(c) ? form.interests.filter((x) => x !== c) : [...form.interests, c],
    );

  const validate = (): string | null => {
    if (!form.destination.trim()) return "Enter a destination.";
    if (!form.startDate || !form.endDate) return "Pick a start and end date.";
    if (form.endDate < form.startDate) return "End date must be after start date.";
    if (tripDates(form.startDate, form.endDate).length > 7)
      return "Demo supports trips up to 7 days.";
    if (form.dayEnd <= form.dayStart) return "Day end must be after day start.";
    if (form.budget < 1000) return "Budget should be at least ₹1,000.";
    if (!form.interests.length) return "Choose at least one interest.";
    return null;
  };

  const finishGenerate = (destination: DestinationContext) => {
    setBusy("generating");
    setDraft(form);
    const t = generate(form, destination);
    setBusy("idle");
    if (!t) {
      setError(noCatalogMessage(destination.name));
      return;
    }
    if (!t.items.length) {
      setError("Couldn't fit any activities in that window. Widen the hours or budget.");
      return;
    }
    navigate({ to: "/dashboard" });
  };

  /** Resolve one candidate and generate if its catalog exists. */
  const selectDestinationCandidate = (c: GeocodeCandidate) => {
    setPending(null);
    const destination = candidateToDestination(c);
    if (!resolveCatalog(destination)) {
      setError(noCatalogMessage(c.label));
      return;
    }
    finishGenerate(destination);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    setError(err);
    if (err) return;
    setPending(null);

    if (demoMode) {
      // Explicit legacy/demo path: bundled Jaipur catalog, no geocoding.
      finishGenerate(JAIPUR_DESTINATION);
      return;
    }

    setBusy("resolving");
    try {
      const res = await geocodeDestination({ data: { query: form.destination.trim() } });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      if (res.candidates.length > 1) {
        setPending(res.candidates); // let the user disambiguate
        return;
      }
      const only = res.candidates[0];
      if (!only) {
        setError(
          `We couldn't find a location for "${form.destination.trim()}". Try adding a country or region.`,
        );
        return;
      }
      selectDestinationCandidate(only);
    } catch {
      setError("Something went wrong looking up your destination. Please try again.");
    } finally {
      setBusy("idle");
    }
  };

  return (
    <main className="surface-gradient min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Step 1 of 2
            </p>
            <h1 className="mt-2 text-4xl font-medium tracking-tight">
              Tell us the shape of your trip.
            </h1>
            <p className="mt-2 text-muted-foreground">
              Constraints become structured state the planning engine reasons over.
            </p>
          </div>
          <Button
            type="button"
            variant="warn"
            onClick={() => {
              setForm(jaipurDemoConstraints());
              setDemoMode(true);
              setPending(null);
              setError(null);
            }}
          >
            <Sparkles className="size-4" /> Prefill Jaipur demo
          </Button>
        </div>

        <form
          onSubmit={submit}
          className="mt-8 space-y-8 rounded-3xl border bg-card p-6 shadow-card sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Destination" className="sm:col-span-2">
              <Input
                value={form.destination}
                onChange={(e) => onDestinationChange(e.target.value)}
                placeholder="e.g. Jaipur, India"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                We look the location up when you submit and ask you to pick if it&apos;s ambiguous.
                Activity catalog: Jaipur (curated); more destinations arrive with activity
                discovery.
              </p>
            </Field>
            <Field label="Start date">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </Field>
            <Field label="End date">
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </Field>
            <Field label="Daily start time">
              <Input
                type="time"
                value={form.dayStart}
                onChange={(e) => set("dayStart", e.target.value)}
              />
            </Field>
            <Field label="Daily end time">
              <Input
                type="time"
                value={form.dayEnd}
                onChange={(e) => set("dayEnd", e.target.value)}
              />
            </Field>
            <Field label="Total budget (INR)">
              <Input
                type="number"
                min={1000}
                step={500}
                value={form.budget}
                onChange={(e) => set("budget", Number(e.target.value))}
              />
            </Field>
            <Field label="Hotel / accommodation area (optional)">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.hotelZoneId}
                onChange={(e) => set("hotelZoneId", e.target.value)}
              >
                {JAIPUR_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
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
                  <label
                    key={t.v}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${form.transport === t.v ? "border-primary bg-primary/5" : ""}`}
                  >
                    <input
                      type="radio"
                      name="transport"
                      checked={form.transport === t.v}
                      onChange={() => set("transport", t.v)}
                    />
                    {t.l}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Pace (optional)">
              <div className="grid gap-2">
                {PACES.map((p) => (
                  <label
                    key={p}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm capitalize ${form.pace === p ? "border-primary bg-primary/5" : ""}`}
                  >
                    <input
                      type="radio"
                      name="pace"
                      checked={form.pace === p}
                      onChange={() => set("pace", p)}
                    />
                    {p}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {p === "relaxed"
                        ? "3 stops/day"
                        : p === "balanced"
                          ? "4 stops/day"
                          : "5 stops/day"}
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          </div>

          {pending && (
            <div className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
              <p className="text-sm font-semibold">Which destination did you mean?</p>
              <ul className="mt-2 space-y-1.5">
                {pending.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => selectDestinationCandidate(c)}
                      className="flex w-full items-baseline justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {c.label}
                        {c.resultType ? ` · ${c.resultType}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Pick the right place and we&apos;ll plan around it.
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
            <Badge variant="info">Destination lookup by Geoapify · Jaipur demo needs no key</Badge>
            <Button type="submit" variant="hero" size="xl" disabled={busy !== "idle" || !!pending}>
              {busy !== "idle" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {busy === "resolving"
                ? "Resolving destination…"
                : busy === "generating"
                  ? "Generating itinerary…"
                  : "Generate itinerary"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block text-sm font-semibold">{label}</Label>
      {children}
    </div>
  );
}
