/** Format Postgres `date` (YYYY-MM-DD) for display without UTC shift. */
export function formatEventDate(value: string | null): string | null {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
