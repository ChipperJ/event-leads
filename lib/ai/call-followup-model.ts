import { leadDisplayName } from "@/lib/leads/lead-display-name";
import type { LeadFollowupRow } from "@/lib/leads/get-lead-by-id";
import type { LeadListRow } from "@/lib/leads/types";
import {
  parseFollowupEmailJson,
  parseFollowupSmsJson,
  stripJsonFence,
} from "./followup-json";

export type FollowupDrafts = {
  email: { subject: string; body: string };
  sms: { message: string };
};

function asListRowForName(lead: LeadFollowupRow): LeadListRow {
  return {
    id: lead.id,
    created_at: "",
    first_name: lead.first_name,
    last_name: lead.last_name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    job_title: null,
    source_tag: null,
    temperature: null,
    ai_pain_points: null,
    ai_interests: null,
    ai_next_steps: null,
    ai_urgency: null,
    ai_temperature: null,
    ai_temperature_reason: null,
  };
}

function formatJsonbStringList(value: unknown, fallback: string): string {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const parts = value
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts.join("; ") : fallback;
}

function firstNextStep(value: unknown, fallback: string): string {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback;
  }
  const first = value[0];
  return typeof first === "string" && first.trim()
    ? first.trim().slice(0, 500)
    : fallback;
}

async function chatJsonCompletion(
  systemPrompt: string,
  userContent: string
): Promise<{ ok: true; raw: string } | { ok: false; error: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { ok: false, error: "Server missing OPENAI_API_KEY" };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return { ok: false, error: `OpenAI error: ${t.slice(0, 200)}` };
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return { ok: false, error: "Empty model response" };
  }

  return { ok: true, raw: stripJsonFence(content) };
}

export async function generateFollowupDrafts(
  lead: LeadFollowupRow
): Promise<
  { ok: true; data: FollowupDrafts } | { ok: false; error: string }
> {
  const name = leadDisplayName(asListRowForName(lead));
  const company = lead.company?.trim() || "their company";
  const painPoints = formatJsonbStringList(
    lead.ai_pain_points,
    "Not specified"
  );
  const nextSteps = formatJsonbStringList(
    lead.ai_next_steps,
    "Not specified"
  );
  const smsRef = firstNextStep(
    lead.ai_next_steps,
    "follow up on our conversation"
  );

  const emailSystem = `You are a sales rep. Write a short follow-up email (max 4 sentences) to ${name} at ${company} based on these notes. Pain points: ${painPoints}. Next steps: ${nextSteps}. Tone: warm, professional, not pushy. Return as JSON with fields: subject (string) and body (string). Return only valid JSON, no explanation.`;

  const smsSystem = `Write a follow-up text message (max 160 characters) to ${name} from a sales rep. Reference: ${smsRef}. Casual, friendly tone. No emojis. Return as JSON with field: message (string). Return only valid JSON, no explanation.`;

  const [emailRes, smsRes] = await Promise.all([
    chatJsonCompletion(emailSystem, "Generate the follow-up email JSON now."),
    chatJsonCompletion(smsSystem, "Generate the follow-up SMS JSON now."),
  ]);

  if (!emailRes.ok) {
    return { ok: false, error: emailRes.error };
  }
  if (!smsRes.ok) {
    return { ok: false, error: smsRes.error };
  }

  const emailParsed = parseFollowupEmailJson(emailRes.raw);
  if (!emailParsed) {
    return { ok: false, error: "Could not parse email draft from model" };
  }

  const smsParsed = parseFollowupSmsJson(smsRes.raw);
  if (!smsParsed) {
    return { ok: false, error: "Could not parse SMS draft from model" };
  }

  const smsMessage =
    smsParsed.message.length > 160
      ? smsParsed.message.slice(0, 160)
      : smsParsed.message;

  return {
    ok: true,
    data: {
      email: { subject: emailParsed.subject, body: emailParsed.body },
      sms: { message: smsMessage },
    },
  };
}
