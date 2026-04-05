import { getLeadByIdForSession } from "@/lib/leads/get-lead-by-id";
import { insertOutreachLog } from "@/lib/leads/insert-outreach-log";
import { followupRateLimitResponse } from "@/lib/rate-limit/followup-routes";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/is-uuid";
import { normalizePhoneToE164 } from "@/lib/validation/phone-e164";
import { NextResponse } from "next/server";
import twilio from "twilio";

export const runtime = "nodejs";

const MAX_SMS_CHARS = 160;

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

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json(
      {
        error:
          "Server missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER",
      },
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
  const message =
    typeof o.message === "string" ? o.message.trim() : "";

  if (!isUuid(leadId)) {
    return NextResponse.json({ error: "lead_id must be a valid UUID" }, { status: 400 });
  }
  if (!message || message.length > MAX_SMS_CHARS) {
    return NextResponse.json(
      {
        error: `message required, max ${MAX_SMS_CHARS} characters`,
      },
      { status: 400 }
    );
  }

  const lead = await getLeadByIdForSession(supabase, leadId);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const rawPhone = lead.phone?.trim();
  if (!rawPhone) {
    return NextResponse.json(
      { error: "Lead has no phone number" },
      { status: 400 }
    );
  }

  const toE164 = normalizePhoneToE164(rawPhone);
  if (!toE164) {
    return NextResponse.json(
      {
        error:
          "Could not normalize phone to E.164. Use 10-digit US numbers or include a country code (e.g. +44).",
      },
      { status: 400 }
    );
  }

  const client = twilio(accountSid, authToken);

  try {
    await client.messages.create({
      body: message,
      from: fromNumber,
      to: toE164,
    });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Twilio rejected the request";
    await insertOutreachLog(supabase, {
      lead_id: leadId,
      sent_by: user.id,
      type: "sms",
      recipient: toE164,
      subject: null,
      message_body: message,
      status: "failed",
    });
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const logResult = await insertOutreachLog(supabase, {
    lead_id: leadId,
    sent_by: user.id,
    type: "sms",
    recipient: toE164,
    subject: null,
    message_body: message,
    status: "sent",
  });

  if (!logResult.ok) {
    return NextResponse.json(
      {
        error: "SMS sent but failed to write outreach log",
        detail: logResult.error,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
