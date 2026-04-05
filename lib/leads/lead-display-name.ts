import type { LeadListRow } from "./types";

export function leadDisplayName(lead: LeadListRow): string {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (lead.company?.trim()) return lead.company.trim();
  if (lead.email?.trim()) return lead.email.trim();
  return "Unnamed lead";
}
