import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrip } from "@/travel/store";

export function SiteHeader() {
  const { trip, hydrated } = useTrip();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-ink text-ink-foreground">
            <Compass className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">TravelPilot</span>
        </Link>
        <nav className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm">
            <Link to="/plan">Plan a trip</Link>
          </Button>
          {hydrated && trip && (
            <Button asChild variant="ink" size="sm">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
