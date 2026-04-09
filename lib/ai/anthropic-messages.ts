import { isAnthropicConfigured } from "@/lib/ai/llm-env";

const ANTHROPIC_VERSION = "2023-06-01";

/** Default model; override with ANTHROPIC_MODEL in env. */
export const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022";

export async function anthropicTextCompletion(input: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!isAnthropicConfigured()) {
    return { ok: false, error: "Anthropic API key not configured" };
  }
  const key = process.env.ANTHROPIC_API_KEY!.trim();
  const model =
    process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "anthropic-version": ANTHROPIC_VERSION,
      "x-api-key": key,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: input.maxTokens ?? 4096,
      system: input.system,
      messages: [{ role: "user", content: input.user }],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return { ok: false, error: `Anthropic error: ${t.slice(0, 200)}` };
  }

  const body = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const block = body.content?.find((c) => c.type === "text");
  const text = block?.text;
  if (typeof text !== "string") {
    return { ok: false, error: "Empty Anthropic response" };
  }
  return { ok: true, text };
}