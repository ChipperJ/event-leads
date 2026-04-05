"use server";

import { parseStructuredLeadFromClient } from "@/lib/ai/structured-lead";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/profile";
import { isSourceTagValue } from "@/lib/leads/source-tags";
import { isUuid } from "@/lib/validation/is-uuid";
import { isValidEmail } from "@/lib/validation/email";
import { normalizePhoneToE164 } from "@/lib/validation/phone-e164";
import { redirect } from "next/navigation";

export type LeadManualFormState = { error: string | null };

export const leadManualFormInitialState: LeadManualFormState = {
  error: null,
};

const MAX_LEN = 500;
const MAX_TRANSCRIPT = 32_000;

function trimOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, MAX_LEN) : null;
}

export async function createLeadManual(
  _prev: LeadManualFormState,
  formData: FormData
): Promise<LeadManualFormState> {
  const supabase = createClient();
  const { profile } = await requireProfile();

  const eventId = formData.get("eventId")?.toString() ?? "";
  if (!isUuid(eventId)) {
    return { error: "Invalid event." };
  }

  const { data: eventRow, error: eventErr } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (eventErr || !eventRow) {
    return { error: "Event not found in your workspace." };
  }

  const firstName = trimOrNull(formData.get("firstName"));
  const lastName = trimOrNull(formData.get("lastName"));
  const company = trimOrNull(formData.get("company"));
  const jobTitle = trimOrNull(formData.get("jobTitle"));
  const emailRaw = trimOrNull(formData.get("email"));
  const phoneRaw = trimOrNull(formData.get("phone"));
  let phone: string | null = phoneRaw;
  if (phoneRaw) {
    const e164 = normalizePhoneToE164(phoneRaw);
    if (!e164) {
      return {
        error:
          "Phone could not be normalized for SMS. Use 10 US digits or +country code.",
      };
    }
    phone = e164;
  }
  const sourceTagRaw = formData.get("sourceTag")?.toString() ?? "";

  if (!isSourceTagValue(sourceTagRaw)) {
    return { error: "Choose how they found you." };
  }

  if (emailRaw && !isValidEmail(emailRaw)) {
    return { error: "That email doesn’t look valid." };
  }

  const hasIdentity = Boolean(
    firstName || lastName || company || emailRaw || phone
  );
  if (!hasIdentity) {
    return {
      error: "Enter at least a name, company, email, or phone.",
    };
  }

  const transcriptRaw = formData.get("transcript")?.toString().trim() ?? "";
  const transcript = transcriptRaw
    ? transcriptRaw.slice(0, MAX_TRANSCRIPT)
    : null;
  const consentGiven = formData.get("consentGiven") === "true";
  const consentAtRaw = formData.get("consentAt")?.toString().trim() ?? "";
  const structuredRaw = formData.get("structuredJson")?.toString().trim() ?? "";
  const leadTempRaw = formData.get("leadTemperature")?.toString().trim() ?? "";

  if (transcript) {
    if (!consentGiven) {
      return {
        error: "A transcript requires the recording consent checkbox.",
      };
    }
    if (!consentAtRaw) {
      return {
        error: "Re-check consent before saving a transcript.",
      };
    }
    const parsed = Date.parse(consentAtRaw);
    if (Number.isNaN(parsed)) {
      return { error: "Invalid consent timestamp." };
    }
  }

  const structured = structuredRaw
    ? parseStructuredLeadFromClient(structuredRaw)
    : null;
  if (structuredRaw && !structured) {
    return {
      error:
        'AI insights look invalid. Tap "Extract insights" again or clear the transcript and retry.',
    };
  }
  if (structured && !transcript) {
    return {
      error: "Remove AI insights or add a transcript before saving.",
    };
  }

  const tempOverride =
    leadTempRaw === "hot" || leadTempRaw === "warm" || leadTempRaw === "cold"
      ? leadTempRaw
      : null;
  const temperature =
    tempOverride ?? structured?.temperature ?? null;

  const { error: insertErr } = await supabase.from("leads").insert({
    event_id: eventId,
    captured_by: profile.id,
    first_name: firstName,
    last_name: lastName,
    company,
    job_title: jobTitle,
    email: emailRaw,
    phone,
    source_tag: sourceTagRaw,
    transcript,
    consent_given: Boolean(transcript),
    consent_timestamp: transcript ? consentAtRaw : null,
    ai_pain_points: structured?.pain_points ?? null,
    ai_interests: structured?.interests ?? null,
    ai_next_steps: structured?.next_steps ?? null,
    ai_urgency: structured?.urgency ?? null,
    ai_temperature: structured?.temperature ?? null,
    ai_temperature_reason: structured?.temperature_reason ?? null,
    temperature,
  });

  if (insertErr) {
    return { error: insertErr.message };
  }

  redirect(`/events/${eventId}/capture?saved=1`);
}
