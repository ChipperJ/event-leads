import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadCard } from "@/components/lead/lead-card";
import { LeadTemperatureFilter } from "@/components/lead/lead-temperature-filter";
import { requireProfile } from "@/lib/auth/profile";
import { getEventById } from "@/lib/events/get-event";
import { getLeadsForEvent } from "@/lib/leads/get-leads-for-event";
import {
  getOutreachSummariesForLeadIds,
  outreachSummaryForLead,
} from "@/lib/leads/outreach-summary";
import type { LeadTemperature } from "@/lib/leads/types";

type Props = {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
};

function parseTemperatureFilter(
  raw: string | string[] | undefined
): LeadTemperature | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "hot" || v === "warm" || v === "cold") {
    return v;
  }
  return undefined;
}

export default async function EventLeadsPage({ params, searchParams }: Props) {
  const { supabase, profile } = await requireProfile();
  const event = await getEventById(supabase, params.id);

  if (!event) {
    notFound();
  }

  const tempFilter = parseTemperatureFilter(searchParams.temp);
  const leads = await getLeadsForEvent(supabase, event.id, tempFilter);
  const outreachByLead = await getOutreachSummariesForLeadIds(
    supabase,
    leads.map((l) => l.id)
  );

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <Link
        href={`/events/${event.id}`}
        className="mb-6 inline-flex min-h-[44px] items-center text-sm text-foreground/70 underline underline-offset-4"
      >
        ← {event.name}
      </Link>

      <p className="text-sm text-foreground/60">Leads for this event</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Lead list</h1>
      <p className="mt-2 text-sm text-foreground/75">
        Newest first. Filter by saved temperature; cards show an AI summary when
        available. Managers can delete a lead (GDPR erasure) from each card.
      </p>

      <p className="mt-4">
        <a
          href={`/api/events/${event.id}/leads-csv`}
          className="inline-flex min-h-[44px] items-center rounded-lg border border-foreground/20 bg-background px-3 text-sm font-medium text-foreground hover:bg-foreground/5"
        >
          Download CSV (all leads)
        </a>
      </p>
      <p className="mt-1 text-xs text-foreground/50">
        Includes transcript, AI fields, consent flags, and capture metadata —
        not affected by the temperature filter above.
      </p>

      <div className="mt-6">
        <LeadTemperatureFilter eventId={event.id} active={tempFilter} />
      </div>

      <p className="mt-3 text-sm text-foreground/55" aria-live="polite">
        {leads.length === 0
          ? tempFilter
            ? `No ${tempFilter} leads yet.`
            : "No leads captured yet."
          : `${leads.length} lead${leads.length === 1 ? "" : "s"}`}
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {leads.map((lead) => (
          <li key={lead.id}>
            <LeadCard
              lead={lead}
              outreach={outreachSummaryForLead(outreachByLead, lead.id)}
              canDeleteLead={profile.role === "manager"}
            />
          </li>
        ))}
      </ul>

      <Link
        href={`/events/${event.id}/capture`}
        className="mt-10 inline-flex min-h-[44px] items-center font-medium underline underline-offset-4"
      >
        Capture lead →
      </Link>
    </div>
  );
}
