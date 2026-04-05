import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/validation/is-uuid";
import type { LeadExportRow } from "./types";

/** All lead columns for CSV (Feature 8). Respects RLS. */
export async function getLeadsForCsvExport(
  supabase: SupabaseClient,
  eventId: string
): Promise<LeadExportRow[]> {
  if (!isUuid(eventId)) {
    return [];
  }

  const { data, error } = await supabase
    .from("leads")
    .select(
      `
      id,
      event_id,
      captured_by,
      first_name,
      last_name,
      company,
      job_title,
      email,
      phone,
      source_tag,
      temperature,
      transcript,
      ai_pain_points,
      ai_interests,
      ai_next_steps,
      ai_urgency,
      ai_temperature,
      ai_temperature_reason,
      consent_given,
      consent_timestamp,
      created_at
    `
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as LeadExportRow[];
}
