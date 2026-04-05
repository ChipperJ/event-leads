"use client";

import { useId, useMemo, useState } from "react";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatches(text: string, query: string) {
  const q = query.trim();
  if (!q) {
    return text;
  }

  const re = new RegExp(`(${escapeRegExp(q)})`, "gi");
  const parts = text.split(re);

  return parts.map((part, i) => {
    if (part.toLowerCase() === q.toLowerCase()) {
      return (
        <mark
          key={i}
          className="rounded-sm bg-yellow-200/90 px-0.5 text-inherit dark:bg-yellow-500/35"
        >
          {part}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

type BriefingViewerProps = {
  briefing: string | null;
  /** Screen-reader label + visible heading text */
  heading?: string;
  /** Scroll the briefing body (useful on capture page) */
  maxBodyHeight?: string;
};

export function BriefingViewer({
  briefing,
  heading = "Briefing",
  maxBodyHeight = "min(55vh, 28rem)",
}: BriefingViewerProps) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const matchCount = useMemo(() => {
    const q = query.trim();
    if (!briefing || !q) return 0;
    const matches = briefing.match(new RegExp(escapeRegExp(q), "gi"));
    return matches ? matches.length : 0;
  }, [briefing, query]);

  const highlighted = useMemo(() => {
    if (!briefing?.trim()) return null;
    return highlightMatches(briefing, query);
  }, [briefing, query]);

  if (!briefing?.trim()) {
    return (
      <section
        className="rounded-xl border border-foreground/15 bg-foreground/[0.02] p-4"
        aria-labelledby={`${inputId}-heading`}
      >
        <h2
          id={`${inputId}-heading`}
          className="text-sm font-semibold uppercase tracking-wide text-foreground/60"
        >
          {heading}
        </h2>
        <p className="mt-3 text-sm text-foreground/60">
          No briefing yet. Ask your manager to add talking points here.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border border-foreground/15 bg-foreground/[0.02] p-4"
      aria-labelledby={`${inputId}-heading`}
    >
      <h2
        id={`${inputId}-heading`}
        className="text-sm font-semibold uppercase tracking-wide text-foreground/60"
      >
        {heading}
      </h2>
      <label htmlFor={inputId} className="mt-4 block text-sm font-medium">
        Search briefing
        <input
          id={inputId}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="e.g. pricing, ICP, objection…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-1 min-h-[44px] w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base text-foreground"
        />
      </label>
      {query.trim() ? (
        <p className="mt-2 text-xs text-foreground/55" aria-live="polite">
          {matchCount === 0
            ? "No matches in briefing."
            : `${matchCount} match${matchCount === 1 ? "" : "es"}`}
        </p>
      ) : null}
      <div
        className="mt-3 overflow-y-auto text-sm leading-relaxed text-foreground/90"
        style={{ maxHeight: maxBodyHeight }}
      >
        <div className="whitespace-pre-wrap">{highlighted}</div>
      </div>
    </section>
  );
}
