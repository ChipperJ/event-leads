import {
  isOpenAIConfigured,
  isTextAiConfigured,
} from "@/lib/ai/llm-env";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Lets the lead capture UI show setup help when Whisper / text AI are unavailable.
 * Does not expose keys or secrets.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    textAiConfigured: isTextAiConfigured(),
    whisperConfigured: isOpenAIConfigured(),
  });
}