"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button, ButtonLink } from "@/components/ui/button";
import { createEvent } from "../actions";
import { eventFormInitialState } from "../event-form-state";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create event"}
    </Button>
  );
}

export function NewEventForm() {
  const [state, formAction] = useFormState(createEvent, eventFormInitialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Event name
        <input
          name="name"
          type="text"
          required
          className="min-h-[44px] rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Location
        <input
          name="location"
          type="text"
          className="min-h-[44px] rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Date
        <input
          name="date"
          type="date"
          className="min-h-[44px] rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Briefing
        <textarea
          name="briefing"
          rows={8}
          placeholder="Talking points, ICP, objections…"
          className="min-h-[120px] rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton />
        <ButtonLink href="/dashboard" variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
