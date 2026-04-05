import type { LeadTemperature } from "@/lib/leads/types";

const STYLES: Record<
  LeadTemperature,
  string
> = {
  hot: "bg-red-500/15 text-red-800 ring-1 ring-red-500/25 dark:text-red-300 dark:ring-red-400/30",
  warm:
    "bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/25 dark:text-amber-200 dark:ring-amber-400/30",
  cold: "bg-sky-500/15 text-sky-900 ring-1 ring-sky-500/25 dark:text-sky-200 dark:ring-sky-400/30",
};

const LABELS: Record<LeadTemperature, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

export function TemperatureBadge({ value }: { value: LeadTemperature }) {
  return (
    <span
      className={`inline-flex min-h-[28px] items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[value]}`}
    >
      {LABELS[value]}
    </span>
  );
}
