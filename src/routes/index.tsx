import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BrainCircuit,
  CalendarRange,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTrip } from "@/travel/store";
import { jaipurDemoConstraints } from "@/travel/data/jaipur";
import hero from "@/assets/hero-jaipur.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TravelPilot — Intelligent trip planning that handles disruptions" },
      {
        name: "description",
        content:
          "Generate a day-by-day itinerary from your constraints, then let the TravelPilot agent replan around closures and cancellations without losing the rest of your plan.",
      },
      {
        property: "og:title",
        content: "TravelPilot — Intelligent trip planning that handles disruptions",
      },
      {
        property: "og:description",
        content:
          "Plan a trip in seconds and watch the agent replan only what's affected when things go wrong.",
      },
    ],
  }),
  component: Landing,
});

const pillars = [
  {
    icon: CalendarRange,
    title: "Constraint-aware planning",
    body: "Budget, hours, pace, transport and interests shape a schedule with real travel legs between stops.",
  },
  {
    icon: ShieldAlert,
    title: "Disruption agent",
    body: "Mark any activity unavailable and watch the agent analyze, resolve conflicts and swap in a scored alternative.",
  },
  {
    icon: BrainCircuit,
    title: "Surgical replanning",
    body: "Only affected and downstream items change. Everything else stays exactly where you left it.",
  },
  {
    icon: MessageSquareText,
    title: "Grounded assistant",
    body: "Ask about tomorrow morning, budget, or what happens if a fort is closed — answers come from live itinerary state.",
  },
];

function Landing() {
  const { setDraft } = useTrip();
  const navigate = useNavigate();
  const tryDemo = () => {
    setDraft(jaipurDemoConstraints());
    navigate({ to: "/plan" });
  };

  return (
    <main>
      <section className="relative overflow-hidden ink-gradient text-ink-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pb-28 lg:pt-24">
          <div className="animate-rise">
            <Badge variant="saffron" className="mb-6 gap-1.5 rounded-full px-3 py-1">
              <Sparkles className="size-3" /> Hackathon MVP · Jaipur demo included
            </Badge>
            <h1 className="max-w-xl text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Trips that <em className="font-light italic text-saffron">replan themselves</em> when
              the day goes sideways.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-ink-foreground/75">
              TravelPilot turns your constraints into a day-by-day itinerary, then acts as an agent
              when an activity falls through — checking conflicts, scoring alternatives, and
              rewriting only what needs to change.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/plan">
                  Plan my trip <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="xl"
                onClick={tryDemo}
                className="border-ink-foreground/25 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
              >
                Try Jaipur demo
              </Button>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-ink-foreground/15 pt-6 text-sm">
              {[
                ["5-stage", "disruption agent"],
                ["23", "Jaipur activities seeded"],
                ["0", "API keys needed"],
              ].map(([k, v]) => (
                <div key={v}>
                  <dt className="font-display text-2xl">{k}</dt>
                  <dd className="text-ink-foreground/60">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative animate-rise [animation-delay:120ms]">
            <div className="overflow-hidden rounded-3xl shadow-lift ring-1 ring-ink-foreground/10">
              <img
                src={hero}
                alt="Hawa Mahal in Jaipur at golden hour"
                width={1600}
                height={1008}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-5 left-5 right-5 rounded-2xl border border-ink-foreground/10 bg-card/95 p-4 text-card-foreground shadow-lift backdrop-blur sm:left-auto sm:w-80">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="size-2 animate-pulse rounded-full bg-warning" /> Disruption
                detected
              </div>
              <p className="mt-1.5 text-sm">
                <span className="font-semibold">Amber Fort</span> unavailable → swapped for{" "}
                <span className="font-semibold">Jaigarh Fort</span>, 2 stops re-timed, dinner
                preserved.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-gradient">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
              A travel command center, not a chat window.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p) => (
              <div key={p.title} className="rounded-2xl border bg-card p-6 shadow-card">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <p.icon className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-3xl bg-ink p-8 text-ink-foreground sm:flex-row sm:items-center">
            <div>
              <h3 className="text-2xl font-medium">See the agent in action in under a minute.</h3>
              <p className="mt-1 text-ink-foreground/70">
                Prefilled 3-day Jaipur trip. Generate, then break something on purpose.
              </p>
            </div>
            <Button variant="hero" size="xl" onClick={tryDemo}>
              Try Jaipur demo <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>
      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        TravelPilot demo · weather and routing are simulated estimates, clearly labeled in the app.
      </footer>
    </main>
  );
}
