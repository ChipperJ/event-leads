import { leadDeleteRateLimitResponse } from "@/lib/rate-limit/core-routes";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/is-uuid";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GDPR / data subject erasure: remove a lead row (cascades outreach_log).
 * RLS: only managers in the lead event company may delete (see 001 migration).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { leadId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = leadDeleteRateLimitResponse(user.id);
  if (limited) {
    return limited;
  }

  const leadId = params.leadId;
  if (!isUuid(leadId)) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.length) {
    return NextResponse.json(
      { error: "Lead not found or you cannot delete it." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}