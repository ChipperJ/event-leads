import { structureLeadFromTranscript } from "@/lib/ai/call-structure-model";
import { structureRateLimitResponse } from "@/lib/rate-limit/core-routes";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_TRANSCRIPT = 32_000;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = structureRateLimitResponse(user.id);
  if (limited) {
    return limited;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const transcript =
    typeof (body as { transcript?: unknown }).transcript === "string"
      ? (body as { transcript: string }).transcript
      : "";

  if (!transcript.trim()) {
    return NextResponse.json({ error: "transcript required" }, { status: 400 });
  }

  if (transcript.length > MAX_TRANSCRIPT) {
    return NextResponse.json({ error: "Transcript too long" }, { status: 400 });
  }

  const result = await structureLeadFromTranscript(transcript);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json(result.data);
}
