import { NextResponse } from "next/server";
import { isRateLimited } from "./memory-sliding-window";

const WINDOW_MS = 60_000;

const TRANSCRIBE_MAX = 24;
const STRUCTURE_MAX = 40;
const LEADS_CSV_MAX = 30;
const LEAD_DELETE_MAX = 20;
const EVENT_DELETE_MAX = 10;

export function transcribeRateLimitResponse(userId: string): NextResponse | null {
  const key = `api:transcribe:${userId}`;
  if (isRateLimited(key, TRANSCRIBE_MAX, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many transcription requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }
  return null;
}

export function structureRateLimitResponse(userId: string): NextResponse | null {
  const key = `api:structure:${userId}`;
  if (isRateLimited(key, STRUCTURE_MAX, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many structure requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }
  return null;
}

export function leadsCsvRateLimitResponse(userId: string): NextResponse | null {
  const key = `api:leads-csv:${userId}`;
  if (isRateLimited(key, LEADS_CSV_MAX, WINDOW_MS)) {
    return new NextResponse(
      "Too many export requests. Please wait a minute and try again.",
      { status: 429, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
  return null;
}

export function leadDeleteRateLimitResponse(userId: string): NextResponse | null {
  const key = `api:lead-delete:${userId}`;
  if (isRateLimited(key, LEAD_DELETE_MAX, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many delete requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }
  return null;
}

export function eventDeleteRateLimitResponse(userId: string): NextResponse | null {
  const key = `api:event-delete:${userId}`;
  if (isRateLimited(key, EVENT_DELETE_MAX, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many event delete requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }
  return null;
}