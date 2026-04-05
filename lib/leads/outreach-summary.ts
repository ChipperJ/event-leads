import type { SupabaseClient } from "@supabase/supabase-js";

/** Latest successful send time per channel (ISO string from DB). */
export type LeadOutreachSummary = {
  emailSentAt: string | null;
  smsSentAt: string | null;
};

const empty: LeadOutreachSummary = { emailSentAt: null, smsSentAt: null };

/**
 * For each lead id, returns the most recent `sent_at` among rows with status `sent`.
 */
export async function getOutreachSummariesForLeadIds(
  supabase: SupabaseClient,
  leadIds: string[]
): Promise<Record<string, LeadOutreachSummary>> {
  if (leadIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("outreach_log")
    .select("lead_id, type, sent_at")
    .in("lead_id", leadIds)
    .eq("status", "sent");

  if (error || !data) {
    return Object.fromEntries(leadIds.map((id) => [id, { ...empty }]));
  }

  const byLead: Record<string, LeadOutreachSummary> = Object.fromEntries(
    leadIds.map((id) => [id, { emailSentAt: null, smsSentAt: null }])
  );

  for (const row of data as {
    lead_id: string;
    type: string;
    sent_at: string;
  }[]) {
    const lid = row.lead_id;
    if (!byLead[lid]) continue;
    if (row.type === "email") {
      const cur = byLead[lid].emailSentAt;
      if (!cur || row.sent_at > cur) {
        byLead[lid].emailSentAt = row.sent_at;
      }
    } else if (row.type === "sms") {
      const cur = byLead[lid].smsSentAt;
      if (!cur || row.sent_at > cur) {
        byLead[lid].smsSentAt = row.sent_at;
      }
    }
  }

  return byLead;
}

export function outreachSummaryForLead(
  map: Record<string, LeadOutreachSummary>,
  leadId: string
): LeadOutreachSummary {
  return map[leadId] ?? { ...empty };
}
