import { getLeadByIdForSession } from "@/lib/leads/get-lead-by-id";
import { insertOutreachLog } from "@/lib/leads/insert-outreach-log";
import { followupRateLimitResponse } from "@/lib/rate-limit/followup-routes";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/is-uuid";
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const MAX_SUBJECT = 500;
const MAX_BODY = 50_000;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = followupRateLimitResponse(user.id, "send");
  if (limited) {
    return limited;
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL?.trim();
  if (!resendKey || !fromEmail) {
    return NextResponse.json(
      { error: "Server missing RESEND_API_KEY or FROM_EMAIL" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const leadId = typeof o.lead_id === "string" ? o.lead_id : "";
  const subject = typeof o.subject === "string" ? o.subject.trim() : "";
  const textBody = typeof o.body === "string" ? o.body.trim() : "";

  if (!isUuid(leadId)) {
    return NextResponse.json({ error: "lead_id must be a valid UUID" }, { status: 400 });
  }
  if (!subject || subject.length > MAX_SUBJECT) {
    return NextResponse.json(
      { error: `subject required, max ${MAX_SUBJECT} characters` },
      { status: 400 }
    );
  }
  if (!textBody || textBody.length > MAX_BODY) {
    return NextResponse.json(
      { error: `body required, max ${MAX_BODY} characters` },
      { status: 400 }
    );
  }

  const lead = await getLeadByIdForSession(supabase, leadId);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const toEmail = lead.email?.trim();
  if (!toEmail) {
    return NextResponse.json(
      { error: "Lead has no email address" },
      { status: 400 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.email?.trim()) {
    return NextResponse.json(
      { error: "Could not load your profile email for Reply-To" },
      { status: 500 }
    );
  }

  const replyTo = profile.email.trim();

  const resend = new Resend(resendKey);
  const sendResult = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    replyTo,
    subject,
    text: textBody,
  });

  if (sendResult.error) {
    const msg =
      sendResult.error.message || "Email provider rejected the request";
    await insertOutreachLog(supabase, {
      lead_id: leadId,
      sent_by: user.id,
      type: "email",
      recipient: toEmail,
      subject,
      message_body: textBody,
      status: "failed",
    });
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const logResult = await insertOutreachLog(supabase, {
    lead_id: leadId,
    sent_by: user.id,
    type: "email",
    recipient: toEmail,
    subject,
    message_body: textBody,
    status: "sent",
  });

  if (!logResult.ok) {
    return NextResponse.json(
      {
        error: "Email sent but failed to write outreach log",
        detail: logResult.error,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
