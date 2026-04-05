import { NextResponse } from "next/server";
import { isRateLimited } from "./memory-sliding-window";

const WINDOW_MS = 60_000;

const GENERATE_MAX = 20;
const SEND_MAX = 40;

export function followupRateLimitResponse(
  userId: string,
  kind: "generate" | "send"
): NextResponse | null {
  const max = kind === "generate" ? GENERATE_MAX : SEND_MAX;
  const key = `followup:${kind}:${userId}`;
  if (isRateLimited(key, max, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }
  return null;
}
