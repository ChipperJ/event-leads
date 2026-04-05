import Link from "next/link";
import { requireProfile } from "@/lib/auth/profile";
import { Button, ButtonLink } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { formatEventDate } from "@/lib/events/format-date";

export default async function DashboardPage() {
  const { supabase, profile } = await requireProfile();

  const { data: row } = await supabase
    .from("users")
    .select("full_name, companies(name)")
    .eq("id", profile.id)
    .single();

  const companyName =
    row &&
    typeof row.companies === "object" &&
    row.companies !== null &&
    "name" in row.companies
      ? String((row.companies as { name: string }).name)
      : "Your company";

  const { data: events } = await supabase
    .from("events")
    .select("id, name, location, date")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  const list = events ?? [];

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-foreground/70">
            {companyName} ·{" "}
            {profile.role === "manager" ? "Manager" : "Rep"}
          </p>
          {row?.full_name ? (
            <p className="text-sm text-foreground/60">{row.full_name}</p>
          ) : null}
        </div>
        <form action={signOut}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </header>

      {profile.role === "manager" ? (
        <div className="mb-6">
          <ButtonLink href="/events/new">New event</ButtonLink>
        </div>
      ) : null}

      {list.length === 0 ? (
        <section className="rounded-xl border border-foreground/15 bg-foreground/[0.02] p-6">
          <p className="text-sm text-foreground/80">
            {profile.role === "manager"
              ? "No events yet. Create one to add a briefing and send reps to capture leads."
              : "No events yet. Your manager will create the first event."}
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((ev) => {
            const when = formatEventDate(ev.date);
            return (
              <li key={ev.id}>
                <Link
                  href={`/events/${ev.id}`}
                  className="block min-h-[44px] rounded-xl border border-foreground/15 bg-foreground/[0.02] px-4 py-3 transition hover:bg-foreground/[0.04]"
                >
                  <span className="font-medium">{ev.name}</span>
                  {ev.location ? (
                    <span className="mt-0.5 block text-sm text-foreground/70">
                      {ev.location}
                    </span>
                  ) : null}
                  {when ? (
                    <span className="mt-0.5 block text-xs text-foreground/60">
                      {when}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
