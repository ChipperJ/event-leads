import { generateFollowupDrafts } from "@/lib/ai/call-followup-model";
import { getLeadByIdForSession } from "@/lib/leads/get-lead-by-id";
import { followupRateLimitResponse } from "@/lib/rate-limit/followup-routes";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/is-uuid";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = followupRateLimitResponse(user.id, "generate");
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

  const leadId =
    typeof (body as { lead_id?: unknown }).lead_id === "string"
      ? (body as { lead_id: string }).lead_id
      : "";

  if (!isUuid(leadId)) {
    return NextResponse.json({ error: "lead_id must be a valid UUID" }, { status: 400 });
  }

  const lead = await getLeadByIdForSession(supabase, leadId);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const result = await generateFollowupDrafts(lead);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json(result.data);
}
