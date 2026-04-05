import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import { BriefingViewer } from "@/components/briefing/briefing-viewer";
import { LeadCaptureForm } from "@/components/lead/lead-capture-form";
import { getEventById } from "@/lib/events/get-event";

type Props = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function CaptureLeadPage({ params, searchParams }: Props) {
  const { supabase } = await requireProfile();
  const event = await getEventById(supabase, params.id);

  if (!event) {
    notFound();
  }

  const saved =
    searchParams?.saved === "1" ||
    (Array.isArray(searchParams?.saved) && searchParams.saved[0] === "1");

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <Link
        href={`/events/${params.id}`}
        className="mb-6 inline-flex min-h-[44px] items-center text-sm text-foreground/70 underline underline-offset-4"
      >
        ← Event home
      </Link>
      <p className="text-sm text-foreground/60">{event.name}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Capture lead
      </h1>
      <p className="mt-2 text-sm text-foreground/70">
        Search the briefing while you talk. Optional voice note (Whisper) with
        consent — AI structuring in a later session.
      </p>

      {saved ? (
        <p
          className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-900 dark:text-emerald-100"
          role="status"
        >
          Lead saved. You can add another below.
        </p>
      ) : null}

      <div className="mt-6">
        <BriefingViewer
          briefing={event.briefing}
          heading="Booth briefing"
          maxBodyHeight="min(40vh, 22rem)"
        />
      </div>

      <section className="mt-8 rounded-xl border border-foreground/15 bg-foreground/[0.02] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Lead details
        </h2>
        <p className="mt-1 text-sm text-foreground/65">
          At least one of name, company, email, or phone. Source tag required.
          Any transcript requires the consent checkbox.
        </p>
        <div className="mt-6">
          <LeadCaptureForm eventId={event.id} />
        </div>
      </section>
    </div>
  );
}
