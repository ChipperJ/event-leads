/** Per Node process; not shared across serverless instances. */
const buckets = new Map<string, number[]>();

export function isRateLimited(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const prev = buckets.get(key) ?? [];
  const pruned = prev.filter((t) => now - t < windowMs);
  if (pruned.length >= max) {
    buckets.set(key, pruned);
    return true;
  }
  pruned.push(now);
  buckets.set(key, pruned);
  return false;
}