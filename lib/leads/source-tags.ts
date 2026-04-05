export const SOURCE_TAG_OPTIONS = [
  { value: "walked_by", label: "Walked by booth" },
  { value: "attended_talk", label: "Attended talk" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
] as const;

export type SourceTagValue = (typeof SOURCE_TAG_OPTIONS)[number]["value"];

export function isSourceTagValue(v: string): v is SourceTagValue {
  return SOURCE_TAG_OPTIONS.some((o) => o.value === v);
}

export function labelSourceTag(value: string | null): string | null {
  if (!value) return null;
  const o = SOURCE_TAG_OPTIONS.find((x) => x.value === value);
  return o?.label ?? null;
}
