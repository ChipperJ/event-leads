import type { LeadExportRow } from "./types";

export const LEAD_CSV_HEADERS = [
  "id",
  "event_id",
  "captured_by",
  "first_name",
  "last_name",
  "company",
  "job_title",
  "email",
  "phone",
  "source_tag",
  "temperature",
  "transcript",
  "ai_pain_points",
  "ai_interests",
  "ai_next_steps",
  "ai_urgency",
  "ai_temperature",
  "ai_temperature_reason",
  "consent_given",
  "consent_timestamp",
  "created_at",
] as const satisfies ReadonlyArray<keyof LeadExportRow>;

function escapeCsvField(raw: string): string {
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) {
    return escapeCsvField("");
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "object") {
    return escapeCsvField(JSON.stringify(value));
  }
  return escapeCsvField(String(value));
}

export function leadsToCsv(leads: LeadExportRow[]): string {
  const headerLine = LEAD_CSV_HEADERS.map((h) => escapeCsvField(h)).join(",");
  const body = leads.map((row) =>
    LEAD_CSV_HEADERS.map((key) => cell(row[key])).join(",")
  );
  return [headerLine, ...body].join("\r\n");
}

/** Safe ASCII-ish filename segment for Content-Disposition. */
export function csvFilenameBase(eventName: string, eventId: string): string {
  const base = eventName.trim() || eventId;
  const cleaned = base
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return cleaned || "leads";
}
