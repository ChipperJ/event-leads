import { leadsCsvRateLimitResponse } from "@/lib/rate-limit/core-routes";
import { createClient } from "@/lib/supabase/server";
import { getEventById } from "@/lib/events/get-event";
import { getLeadsForCsvExport } from "@/lib/leads/get-leads-for-csv";
import { csvFilenameBase, leadsToCsv } from "@/lib/leads/leads-to-csv";
import { isUuid } from "@/lib/validation/is-uuid";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { eventId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const limited = leadsCsvRateLimitResponse(user.id);
  if (limited) {
    return limited;
  }

  const eventId = params.eventId;
  if (!isUuid(eventId)) {
    return new NextResponse("Invalid event id", { status: 400 });
  }

  const event = await getEventById(supabase, eventId);
  if (!event) {
    return new NextResponse("Not found", { status: 404 });
  }

  const leads = await getLeadsForCsvExport(supabase, eventId);
  const csv = leadsToCsv(leads);
  const base = csvFilenameBase(event.name, event.id);
  const filename = `${base}.csv`;

  return new NextResponse("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
