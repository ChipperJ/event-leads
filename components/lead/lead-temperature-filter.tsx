import Link from "next/link";
import type { LeadTemperature } from "@/lib/leads/types";

type Props = {
  eventId: string;
  active?: LeadTemperature;
};

const FILTERS: { key: "all" | LeadTemperature; label: string; query: string }[] =
  [
    { key: "all", label: "All", query: "" },
    { key: "hot", label: "Hot", query: "hot" },
    { key: "warm", label: "Warm", query: "warm" },
    { key: "cold", label: "Cold", query: "cold" },
  ];

export function LeadTemperatureFilter({ eventId, active }: Props) {
  const base = `/events/${eventId}/leads`;

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Filter leads by temperature"
    >
      {FILTERS.map(({ key, label, query }) => {
        const href = query ? `${base}?temp=${query}` : base;
        const isActive =
          key === "all" ? active === undefined : active === key;
        return (
          <Link
            key={key}
            href={href}
            scroll={false}
            role="tab"
            aria-selected={isActive}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors ${
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-foreground/20 text-foreground hover:bg-foreground/5"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
