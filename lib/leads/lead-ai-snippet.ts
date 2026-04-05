import type { LeadListRow } from "./types";

function firstStringFromJsonArray(v: unknown): string | null {
  if (!Array.isArray(v)) return null;
  for (const item of v) {
    if (typeof item === "string") {
      const s = item.trim();
      if (s) return s;
    }
  }
  return null;
}

/** One-line preview for dashboard cards (pain → interest → AI reason). */
export function leadAiSummarySnippet(lead: LeadListRow): string | null {
  const pain = firstStringFromJsonArray(lead.ai_pain_points);
  const interest = firstStringFromJsonArray(lead.ai_interests);
  const parts: string[] = [];
  if (pain) parts.push(pain);
  if (interest && interest !== pain) parts.push(interest);
  if (parts.length) {
    return parts.join(" · ").slice(0, 180);
  }
  const reason = lead.ai_temperature_reason?.trim();
  if (reason) return reason.slice(0, 180);
  return null;
}
