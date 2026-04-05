export function stripJsonFence(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    text = fence[1].trim();
  }
  return text;
}

export function parseFollowupEmailJson(
  raw: string
): { subject: string; body: string } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const subject =
    typeof o.subject === "string" ? o.subject.trim().slice(0, 500) : "";
  const body = typeof o.body === "string" ? o.body.trim().slice(0, 50_000) : "";
  if (!subject || !body) return null;
  return { subject, body };
}

export function parseFollowupSmsJson(
  raw: string
): { message: string } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const message =
    typeof o.message === "string" ? o.message.trim().slice(0, 500) : "";
  if (!message) return null;
  return { message };
}
