import type { ParkStatus } from "@eneredge/api";
import { cn } from "cn";
import { hu } from "@/i18n/hu";

// Colour means attention: a park that is fine stays neutral, a production
// problem is orange, a lost connection is violet — as on the marketing site.
const toneOf: Record<ParkStatus, { badge: string; dot: string }> = {
  draft: { badge: "border border-dashed border-ink/35 text-ink-soft", dot: "bg-faint" },
  connecting: { badge: "bg-ink/8 text-ink-soft", dot: "bg-ink/40" },
  online: { badge: "bg-ink/8 text-ink", dot: "bg-ink" },
  degraded: { badge: "bg-deviation-soft text-deviation-ink", dot: "bg-deviation" },
  offline: { badge: "bg-datalink-soft text-datalink-ink", dot: "bg-datalink" },
};

/** Where a park stands, as a small pill. */
export function StatusBadge({ status, className }: { status: ParkStatus; className?: string }) {
  const tone = toneOf[status];
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-2 rounded-full px-3 font-medium text-[0.8125rem]",
        tone.badge,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-2 rounded-full", tone.dot)} />
      {hu.status[status]}
    </span>
  );
}
