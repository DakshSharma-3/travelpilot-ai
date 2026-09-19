import { useRef, useState } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { askAssistant } from "@/travel/engine/assistant";
import type { ChangeSet, Trip } from "@/travel/types";

interface Msg {
  role: "user" | "agent";
  text: string;
  bullets?: string[];
  changed?: boolean;
}

const SUGGESTIONS = [
  "What should I do tomorrow morning?",
  "Which activities are close to my hotel?",
  "How am I doing against my budget?",
  "What happens if Amber Fort is cancelled?",
];

export function AssistantPanel({
  trip,
  onTripChange,
}: {
  trip: Trip;
  onTripChange: (t: Trip, c: ChangeSet) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "agent",
      text: "I'm grounded in your current itinerary state. Ask about your schedule, budget, travel times, or ask me to change something.",
    },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const send = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setInput("");
    const reply = askAssistant(q, trip);
    setMessages((m) => [
      ...m,
      { role: "user", text: q },
      { role: "agent", text: reply.text, bullets: reply.bullets, changed: !!reply.trip },
    ]);
    if (reply.trip && reply.changeSet) onTripChange(reply.trip, reply.changeSet);
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  return (
    <section className="flex h-full flex-col rounded-2xl border bg-card shadow-card">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-primary" />
          <h3 className="font-display text-lg font-semibold tracking-tight">Trip assistant</h3>
        </div>
        <Badge variant="demo">Grounded in itinerary state</Badge>
      </div>

      <div className="max-h-[420px] min-h-[240px] flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={`inline-block max-w-[92%] rounded-2xl px-3.5 py-2.5 text-left text-sm ${
                m.role === "user" ? "bg-ink text-ink-foreground" : "border bg-background"
              }`}
            >
              <p className="whitespace-pre-line">{m.text}</p>
              {m.bullets && m.bullets.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {m.bullets.map((b, k) => (
                    <li key={k}>• {b}</li>
                  ))}
                </ul>
              )}
              {m.changed && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success">
                  <Sparkles className="size-3.5" /> Itinerary updated
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t px-5 py-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your itinerary…"
            aria-label="Ask the trip assistant"
          />
          <Button type="submit" variant="ink" size="icon" aria-label="Send">
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </section>
  );
}
