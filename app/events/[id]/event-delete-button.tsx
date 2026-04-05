"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EventDeleteButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteEvent = async () => {
    if (
      !window.confirm(
        "Delete this event and all its leads and outreach history? This cannot be undone."
      )
    ) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setDeleteError(
          typeof body.error === "string" ? body.error : "Delete failed."
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setDeleteError("Network error while deleting.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-10 border-t border-foreground/15 pt-6">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
        Danger zone
      </p>
      <p className="mt-1 text-sm text-foreground/65">
        Permanently removes the event and every lead captured for it (database
        cascade).
      </p>
      <button
        type="button"
        className="mt-3 min-h-[44px] text-left text-sm font-medium text-red-600 underline underline-offset-4 disabled:opacity-50 dark:text-red-400"
        disabled={deleting}
        onClick={() => void deleteEvent()}
      >
        {deleting ? "Deleting…" : "Delete event"}
      </button>
      {deleteError ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {deleteError}
        </p>
      ) : null}
    </div>
  );
}