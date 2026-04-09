import { anthropicTextCompletion } from "@/lib/ai/anthropic-messages";
import {
  isAnthropicConfigured,
  isOpenAIConfigured,
  isTextAiConfigured,
  TEXT_AI_SETUP_MESSAGE,
} from "@/lib/ai/llm-env";
import {
  parseStructuredLeadJson,
  STRUCTURE_SYSTEM_PROMPT,
  type StructuredLead,
} from "./structured-lead";

async function structureWithAnthropic(
  trimmed: string
): Promise<{ ok: true; data: StructuredLead } | { ok: false; error: string }> {
  const res = await anthropicTextCompletion({
    system: STRUCTURE_SYSTEM_PROMPT,
    user: `Transcript:\n\n${trimmed.slice(0, 28000)}`,
    maxTokens: 4096,
  });
  if (!res.ok) {
    return res;
  }
  const data = parseStructuredLeadJson(res.text);
  if (!data) {
    return { ok: false, error: "Could not parse structured lead from model" };
  }
  return { ok: true, data };
}

async function structureWithOpenAI(
  trimmed: string
): Promise<{ ok: true; data: StructuredLead } | { ok: false; error: string }> {
  const key = process.env.OPENAI_API_KEY!.trim();

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
        { role: "system", content: STRUCTURE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Transcript:\n\n${trimmed.slice(0, 28000)}`,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return {
      ok: false,
      error: `OpenAI error: ${t.slice(0, 200)}`,
    };
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return { ok: false, error: "Empty model response" };
  }

  const data = parseStructuredLeadJson(content);
  if (!data) {
    return { ok: false, error: "Could not parse structured lead from model" };
  }

  return { ok: true, data };
}

export async function structureLeadFromTranscript(
  transcript: string
): Promise<{ ok: true; data: StructuredLead } | { ok: false; error: string }> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return { ok: false, error: "Transcript is empty" };
  }

  if (!isTextAiConfigured()) {
    return { ok: false, error: TEXT_AI_SETUP_MESSAGE };
  }

  if (isAnthropicConfigured()) {
    return structureWithAnthropic(trimmed);
  }

  if (isOpenAIConfigured()) {
    return structureWithOpenAI(trimmed);
  }

  return { ok: false, error: TEXT_AI_SETUP_MESSAGE };
}
