import type { SupabaseClient } from "@supabase/supabase-js";

export type OutreachLogInsert = {
  lead_id: string;
  sent_by: string;
  type: "email" | "sms";
  recipient: string;
  subject: string | null;
  message_body: string;
  status: "sent" | "failed";
};

export async function insertOutreachLog(
  supabase: SupabaseClient,
  params: OutreachLogInsert
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("outreach_log").insert({
    lead_id: params.lead_id,
    sent_by: params.sent_by,
    type: params.type,
    recipient: params.recipient,
    subject: params.subject,
    message_body: params.message_body,
    status: params.status,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
