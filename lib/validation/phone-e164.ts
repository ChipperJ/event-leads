/**
 * Best-effort E.164 for Twilio. US: 10 digits -> +1. Already + with 8-15 digits: keep.
 * Returns null if the string cannot be interpreted safely.
 */
export function normalizePhoneToE164(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const digits = s.replace(/\D/g, "");
  if (!digits) return null;

  if (s.startsWith("+")) {
    const rest = s.slice(1).replace(/\D/g, "");
    if (rest.length >= 8 && rest.length <= 15) {
      return `+${rest}`;
    }
    return null;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}
