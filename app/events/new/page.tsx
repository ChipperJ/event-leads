import Link from "next/link";
import { requireManager } from "@/lib/auth/profile";
import { NewEventForm } from "./new-event-form";

export default async function NewEventPage() {
  await requireManager();

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex min-h-[44px] items-center text-sm text-foreground/70 underline underline-offset-4"
      >
        ← Events
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">New event</h1>
      <p className="mt-1 text-sm text-foreground/70">
        Name, location, date, and booth briefing. You can edit everything later.
      </p>
      <div className="mt-8">
        <NewEventForm />
      </div>
    </div>
  );
}
