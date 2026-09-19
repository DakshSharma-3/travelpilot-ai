import { Badge } from "@/components/ui/badge";
import type { ItemStatus } from "@/travel/types";

const MAP: Record<ItemStatus, { label: string; variant: "secondary" | "danger" | "success" | "info" | "warning" }> = {
  planned: { label: "Planned", variant: "secondary" },
  unavailable: { label: "Unavailable", variant: "danger" },
  replacement: { label: "Replacement", variant: "success" },
  rescheduled: { label: "Re-timed", variant: "warning" },
  added: { label: "Added", variant: "info" },
  removed: { label: "Dropped", variant: "danger" },
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  const s = MAP[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
