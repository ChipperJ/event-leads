import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/validation/is-uuid";

/** Columns for follow-up generation and send routes (RLS-scoped). */
export type LeadFollowupRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  ai_pain_points: unknown;
  ai_next_steps: unknown;
};

export async function getLeadByIdForSession(
  supabase: SupabaseClient,
  leadId: string
): Promise<LeadFollowupRow | null> {
  if (!isUuid(leadId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, first_name, last_name, company, email, phone, ai_pain_points, ai_next_steps"
    )
    .eq("id", leadId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as LeadFollowupRow;
}
