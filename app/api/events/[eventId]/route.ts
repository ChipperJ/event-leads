import { eventDeleteRateLimitResponse } from "@/lib/rate-limit/core-routes";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/is-uuid";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Remove an event (cascades leads and outreach_log via FK).
 * RLS: managers in the event company only (see 001 migration).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = eventDeleteRateLimitResponse(user.id);
  if (limited) {
    return limited;
  }

  const eventId = params.eventId;
  if (!isUuid(eventId)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.length) {
    return NextResponse.json(
      { error: "Event not found or you cannot delete it." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}