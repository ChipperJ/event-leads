import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/validation/is-uuid";
import type { EventRow } from "./types";

export async function getEventById(
  supabase: SupabaseClient,
  eventId: string
): Promise<EventRow | null> {
  if (!isUuid(eventId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("events")
    .select("id, company_id, name, location, date, briefing, created_at")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as EventRow;
}
