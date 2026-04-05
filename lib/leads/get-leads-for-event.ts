import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/validation/is-uuid";
import type { LeadListRow, LeadTemperature } from "./types";

export async function getLeadsForEvent(
  supabase: SupabaseClient,
  eventId: string,
  temperatureFilter?: LeadTemperature
): Promise<LeadListRow[]> {
  if (!isUuid(eventId)) {
    return [];
  }

  let q = supabase
    .from("leads")
    .select(
      `
      id,
      created_at,
      first_name,
      last_name,
      company,
      email,
      phone,
      job_title,
      source_tag,
      temperature,
      ai_pain_points,
      ai_interests,
      ai_next_steps,
      ai_urgency,
      ai_temperature,
      ai_temperature_reason
    `
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (temperatureFilter) {
    q = q.eq("temperature", temperatureFilter);
  }

  const { data, error } = await q;

  if (error || !data) {
    return [];
  }

  return data as LeadListRow[];
}
