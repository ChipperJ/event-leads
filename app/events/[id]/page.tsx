import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import { getEventById } from "@/lib/events/get-event";
import { formatEventDate } from "@/lib/events/format-date";
import { BriefingViewer } from "@/components/briefing/briefing-viewer";
import { EventDeleteButton } from "./event-delete-button";
import { EventManagerForm } from "./event-manager-form";

type Props = { params: { id: string } };

export default async function EventDetailPage({ params }: Props) {
  const { supabase, profile } = await requireProfile();
  const event = await getEventById(supabase, params.id);

  if (!event) {
    notFound();
  }

  const formattedDate = formatEventDate(event.date);

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex min-h-[44px] items-center text-sm text-foreground/70 underline underline-offset-4"
      >
        ← Events
      </Link>

      {profile.role === "manager" ? (
        <>
          <p className="text-sm text-foreground/60">Manager · event setup</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {event.name}
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            Update briefing, location, or date — reps always see the latest
            version.
          </p>
          <div className="mt-8">
            <EventManagerForm event={event} />
          </div>
          <EventDeleteButton eventId={event.id} />
        </>
      ) : (
        <>
          <p className="text-sm text-foreground/60">Booth briefing</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {event.name}
          </h1>
          {event.location ? (
            <p className="mt-2 text-sm text-foreground/80">{event.location}</p>
          ) : null}
          {formattedDate ? (
            <p className="mt-1 text-sm text-foreground/70">{formattedDate}</p>
          ) : null}
          <div className="mt-8">
            <BriefingViewer briefing={event.briefing} />
          </div>
        </>
      )}

      <ul className="mt-10 flex flex-col gap-1 text-sm font-medium">
        <li>
          <Link
            href={`/events/${event.id}/leads`}
            className="inline-flex min-h-[44px] items-center underline underline-offset-4"
          >
            Leads & CSV →
          </Link>
        </li>
        <li>
          <Link
            href={`/events/${event.id}/capture`}
            className="inline-flex min-h-[44px] items-center underline underline-offset-4"
          >
            Capture lead →
          </Link>
        </li>
      </ul>
    </div>
  );
}
