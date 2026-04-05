export type StructuredLead = {
  pain_points: string[];
  interests: string[];
  next_steps: string[];
  urgency: "low" | "medium" | "high";
  temperature: "hot" | "warm" | "cold";
  temperature_reason: string;
};

const URGENCY = new Set(["low", "medium", "high"]);
const TEMP = new Set(["hot", "warm", "cold"]);

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") return null;
    const s = item.trim();
    if (s) out.push(s.slice(0, 500));
  }
  return out;
}

export function normalizeStructuredObject(
  parsed: unknown
): StructuredLead | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;

  const pain_points = asStringArray(o.pain_points);
  const interests = asStringArray(o.interests);
  const next_steps = asStringArray(o.next_steps);
  if (!pain_points || !interests || !next_steps) return null;

  const urgency =
    typeof o.urgency === "string" && URGENCY.has(o.urgency)
      ? (o.urgency as StructuredLead["urgency"])
      : null;
  const temperature =
    typeof o.temperature === "string" && TEMP.has(o.temperature)
      ? (o.temperature as StructuredLead["temperature"])
      : null;
  const temperature_reason =
    typeof o.temperature_reason === "string"
      ? o.temperature_reason.trim().slice(0, 2000)
      : "";

  if (!urgency || !temperature || !temperature_reason) return null;

  return {
    pain_points,
    interests,
    next_steps,
    urgency,
    temperature,
    temperature_reason,
  };
}

export function parseStructuredLeadJson(raw: string): StructuredLead | null {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    text = fence[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  return normalizeStructuredObject(parsed);
}

/** Validates JSON string from the capture form hidden field. */
export function parseStructuredLeadFromClient(raw: string): StructuredLead | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    return normalizeStructuredObject(JSON.parse(s));
  } catch {
    return null;
  }
}

export const STRUCTURE_SYSTEM_PROMPT = `You are a sales assistant. Extract from this voice note transcript:
- pain_points (array of strings)
- interests (array of strings)
- next_steps (array of strings)
- urgency (low/medium/high)
- temperature (hot/warm/cold)
- temperature_reason (one sentence)
Return only valid JSON, no explanation.`;
