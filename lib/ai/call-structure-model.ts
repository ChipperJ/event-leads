import {
  parseStructuredLeadJson,
  STRUCTURE_SYSTEM_PROMPT,
  type StructuredLead,
} from "./structured-lead";

export async function structureLeadFromTranscript(
  transcript: string
): Promise<{ ok: true; data: StructuredLead } | { ok: false; error: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { ok: false, error: "Server missing OPENAI_API_KEY" };
  }

  const trimmed = transcript.trim();
  if (!trimmed) {
    return { ok: false, error: "Transcript is empty" };
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
