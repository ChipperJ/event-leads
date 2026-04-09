import {
  isOpenAIConfigured,
  OPENAI_WHISPER_SETUP_MESSAGE,
} from "@/lib/ai/llm-env";
import { transcribeRateLimitResponse } from "@/lib/rate-limit/core-routes";
import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = transcribeRateLimitResponse(user.id);
  if (limited) {
    return limited;
  }

  if (!isOpenAIConfigured()) {
    if (process.env.NODE_ENV === "development") {
      const envLocal = path.join(process.cwd(), ".env.local");
      console.warn(
        "[api/transcribe] OPENAI_API_KEY is not set on the server.",
        "cwd:",
        process.cwd(),
        ".env.local exists:",
        fs.existsSync(envLocal)
      );
    }
    return NextResponse.json({ error: OPENAI_WHISPER_SETUP_MESSAGE }, { status: 503 });
  }
  const key = process.env.OPENAI_API_KEY!.trim();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("audio");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Audio too large" }, { status: 400 });
  }

  const type = file.type || "";
  if (!type.startsWith("audio/")) {
    return NextResponse.json({ error: "Expected an audio file" }, { status: 400 });
  }

  const openaiForm = new FormData();
  openaiForm.append("file", file, "note.webm");
  openaiForm.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
    },
    body: openaiForm,
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json(
      { error: "Transcription failed", detail: errText.slice(0, 200) },
      { status: 502 }
    );
  }

  const data = (await res.json()) as { text?: string };
  const text = typeof data.text === "string" ? data.text.trim() : "";

  return NextResponse.json({ transcript: text });
}
