"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { completeOnboarding } from "./actions";
import { onboardingFormInitialState } from "./onboarding-form-state";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Continue to dashboard"}
    </Button>
  );
}

export function OnboardingForm() {
  const [state, formAction] = useFormState(
    completeOnboarding,
    onboardingFormInitialState
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your workspace
        </h1>
        <p className="mt-1 text-sm text-foreground/70">
          Your company and profile. You can invite teammates later.
        </p>
      </div>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Company name
          <input
            name="companyName"
            type="text"
            required
            autoComplete="organization"
            className="min-h-[44px] rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Your full name
          <input
            name="fullName"
            type="text"
            required
            autoComplete="name"
            className="min-h-[44px] rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base"
          />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Role</legend>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm">
            <input type="radio" name="role" value="manager" required className="h-4 w-4" />
            Manager — set up events and review leads
          </label>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm">
            <input type="radio" name="role" value="rep" className="h-4 w-4" />
            Rep — capture leads on the floor
          </label>
        </fieldset>
        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}
        <SubmitButton />
      </form>
      <form action={signOut} className="flex justify-center">
        <button
          type="submit"
          className="text-sm text-foreground/70 underline underline-offset-4 min-h-[44px] px-2"
        >
          Sign out and use a different account
        </button>
      </form>
    </div>
  );
}
