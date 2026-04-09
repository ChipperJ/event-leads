"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { updateEvent } from "../actions";
import { eventFormInitialState } from "../event-form-state";
import type { EventRow } from "@/lib/events/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

type Props = { event: EventRow };

export function EventManagerForm({ event }: Props) {
  const [state, formAction] = useFormState(updateEvent, eventFormInitialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={event.id} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Event name
        <input
          name="name"
          type="text"
          required
          defaultValue={event.name}
          className="min-h-[44px] rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Location
        <input
          name="location"
          type="text"
          defaultValue={event.location ?? ""}
          className="min-h-[44px] rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Date
        <input
          name="date"
          type="date"
          defaultValue={event.date ?? ""}
          className="min-h-[44px] rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Briefing
        <textarea
          name="briefing"
          rows={10}
          placeholder="Talking points, ICP, objections…"
          defaultValue={event.briefing ?? ""}
          className="min-h-[160px] rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base"
        />
      </label>
      {state?.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
