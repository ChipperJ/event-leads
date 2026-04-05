"use client";

import { Button } from "@/components/ui/button";
import { leadAiSummarySnippet } from "@/lib/leads/lead-ai-snippet";
import { leadDisplayName } from "@/lib/leads/lead-display-name";
import type { LeadOutreachSummary } from "@/lib/leads/outreach-summary";
import { labelSourceTag } from "@/lib/leads/source-tags";
import type { LeadListRow } from "@/lib/leads/types";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { TemperatureBadge } from "./temperature-badge";

function isLeadTemperature(
  v: string | null
): v is NonNullable<LeadListRow["temperature"]> {
  return v === "hot" || v === "warm" || v === "cold";
}

function formatOutreachTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type Drafts = {
  email: { subject: string; body: string };
  sms: { message: string };
};

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`;
}

export function LeadCard({
  lead,
  outreach,
  canDeleteLead = false,
}: {
  lead: LeadListRow;
  outreach: LeadOutreachSummary;
  canDeleteLead?: boolean;
}) {
  const router = useRouter();
  const title = leadDisplayName(lead);
  const snippet = leadAiSummarySnippet(lead);
  const sourceLabel = labelSourceTag(lead.source_tag);
  const created = new Date(lead.created_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const hasEmail = Boolean(lead.email?.trim());
  const hasPhone = Boolean(lead.phone?.trim());

  const emailDialogRef = useRef<HTMLDialogElement>(null);
  const smsDialogRef = useRef<HTMLDialogElement>(null);

  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [smsMessage, setSmsMessage] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);

  const [flash, setFlash] = useState<string | null>(null);

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    try {
      const k = sessionStorage.getItem(`followup-flash:${lead.id}`);
      if (k === "email" || k === "sms") {
        sessionStorage.removeItem(`followup-flash:${lead.id}`);
        setFlash(k === "email" ? "Email sent." : "SMS sent.");
        const t = window.setTimeout(() => setFlash(null), 4000);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* private mode */
    }
    return undefined;
  }, [lead.id]);

  const resetFollowupDraftState = useCallback(() => {
    setDraftError(null);
    setDraftLoading(false);
  }, []);

  const loadDrafts = useCallback(async (): Promise<Drafts | null> => {
    setDraftError(null);
    setDraftLoading(true);
    try {
      const res = await fetch("/api/generate-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ lead_id: lead.id }),
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }
      const data = (await res.json()) as Drafts;
      if (!data?.email || !data?.sms) {
        throw new Error("Unexpected response from generate-followup");
      }
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not generate drafts";
      setDraftError(msg);
      return null;
    } finally {
      setDraftLoading(false);
    }
  }, [lead.id]);

  const retryDraftsForOpenModal = () => {
    void loadDrafts().then((d) => {
      if (!d) return;
      if (emailDialogRef.current?.open) {
        setEmailSubject(d.email.subject);
        setEmailBody(d.email.body);
      }
      if (smsDialogRef.current?.open) {
        setSmsMessage(d.sms.message.slice(0, 160));
      }
    });
  };

  const openEmailModal = async () => {
    setEmailError(null);
    emailDialogRef.current?.showModal();
    const d = await loadDrafts();
    if (d) {
      setEmailSubject(d.email.subject);
      setEmailBody(d.email.body);
    } else {
      setEmailSubject("");
      setEmailBody("");
    }
  };

  const openSmsModal = async () => {
    setSmsError(null);
    smsDialogRef.current?.showModal();
    const d = await loadDrafts();
    if (d) {
      setSmsMessage(d.sms.message.slice(0, 160));
    } else {
      setSmsMessage("");
    }
  };

  const closeEmailModal = () => {
    emailDialogRef.current?.close();
    setEmailError(null);
    resetFollowupDraftState();
  };

  const closeSmsModal = () => {
    smsDialogRef.current?.close();
    setSmsError(null);
    resetFollowupDraftState();
  };

  const sendEmail = async (e: FormEvent) => {
    e.preventDefault();
    const subject = emailSubject.trim();
    const body = emailBody.trim();
    if (!subject || !body) {
      setEmailError("Subject and body are required.");
      return;
    }
    setEmailSending(true);
    setEmailError(null);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          lead_id: lead.id,
          subject,
          body,
        }),
      });
      if (!res.ok) {
        setEmailError(await readErrorMessage(res));
        return;
      }
      try {
        sessionStorage.setItem(`followup-flash:${lead.id}`, "email");
      } catch {
        /* private mode */
      }
      closeEmailModal();
      router.refresh();
    } finally {
      setEmailSending(false);
    }
  };

  const sendSms = async (e: FormEvent) => {
    e.preventDefault();
    const message = smsMessage.trim();
    if (!message) {
      setSmsError("Message is required.");
      return;
    }
    if (message.length > 160) {
      setSmsError("Message must be 160 characters or fewer.");
      return;
    }
    setSmsSending(true);
    setSmsError(null);
    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ lead_id: lead.id, message }),
      });
      if (!res.ok) {
        setSmsError(await readErrorMessage(res));
        return;
      }
      try {
        sessionStorage.setItem(`followup-flash:${lead.id}`, "sms");
      } catch {
        /* private mode */
      }
      closeSmsModal();
      router.refresh();
    } finally {
      setSmsSending(false);
    }
  };

  const deleteLead = async () => {
    if (!canDeleteLead) return;
    if (
      !window.confirm(
        "Permanently delete this lead and all outreach history? This cannot be undone."
      )
    ) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
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
      router.refresh();
    } catch {
      setDeleteError("Network error while deleting.");
    } finally {
      setDeleting(false);
    }
  };

  const dialogClass =
    "w-[calc(100vw-2rem)] max-w-md rounded-xl border border-foreground/20 bg-background p-4 text-foreground shadow-lg backdrop:bg-black/40";

  const inputClass =
    "mt-1 w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground";

  return (
    <article className="rounded-xl border border-foreground/15 bg-background p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {isLeadTemperature(lead.temperature) ? (
          <TemperatureBadge value={lead.temperature} />
        ) : (
          <span className="text-xs font-medium text-foreground/45">
            No temperature
          </span>
        )}
      </div>
      {lead.company?.trim() ? (
        <p className="mt-1 text-sm text-foreground/80">{lead.company.trim()}</p>
      ) : null}
      {lead.job_title?.trim() ? (
        <p className="mt-0.5 text-sm text-foreground/60">{lead.job_title.trim()}</p>
      ) : null}
      {lead.email?.trim() ? (
        <p className="mt-1 text-sm text-foreground/70">{lead.email.trim()}</p>
      ) : null}
      {lead.phone?.trim() ? (
        <>
          <p className="mt-0.5 text-sm text-foreground/70">{lead.phone.trim()}</p>
          <p className="mt-0.5 text-xs text-foreground/45">
            SMS uses E.164. US: 10 digits. International: include + and country
            code.
          </p>
        </>
      ) : null}
      {snippet ? (
        <p className="mt-3 line-clamp-2 text-sm italic text-foreground/75">
          {snippet}
        </p>
      ) : (
        <p className="mt-3 text-sm text-foreground/45">No AI summary yet.</p>
      )}

      {flash ? (
        <p
          className="mt-3 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100"
          role="status"
        >
          {flash}
        </p>
      ) : null}

      {(outreach.emailSentAt || outreach.smsSentAt) && (
        <div className="mt-3 space-y-0.5 text-xs text-foreground/65">
          {outreach.emailSentAt ? (
            <p>
              📧 Email sent {formatOutreachTime(outreach.emailSentAt)}
            </p>
          ) : null}
          {outreach.smsSentAt ? (
            <p>
              💬 SMS sent {formatOutreachTime(outreach.smsSentAt)}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          className="text-sm"
          disabled={!hasEmail}
          title={!hasEmail ? "Add an email on this lead to send" : undefined}
          onClick={() => void openEmailModal()}
        >
          Send email
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="text-sm"
          disabled={!hasPhone}
          title={!hasPhone ? "Add a phone number on this lead to send SMS" : undefined}
          onClick={() => void openSmsModal()}
        >
          Send SMS
        </Button>
      </div>

      <p className="mt-3 text-xs text-foreground/50">
        {[sourceLabel, created].filter(Boolean).join(" · ")}
      </p>

      {canDeleteLead ? (
        <div className="mt-3 border-t border-foreground/10 pt-3">
          <button
            type="button"
            className="min-h-[44px] text-left text-sm font-medium text-red-600 underline underline-offset-4 disabled:opacity-50 dark:text-red-400"
            disabled={deleting}
            title="Removes this lead and related outreach log (managers only)."
            onClick={() => void deleteLead()}
          >
            {deleting ? "Deleting…" : "Delete lead"}
          </button>
          {deleteError ? (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {deleteError}
            </p>
          ) : null}
        </div>
      ) : null}

      <dialog ref={emailDialogRef} className={dialogClass} onCancel={closeEmailModal}>
        <h3 className="text-base font-semibold">Send email</h3>
        <p className="mt-1 text-xs text-foreground/60">
          Draft from AI — edit before sending. Replies go to your account email.
        </p>
        {draftLoading ? (
          <p className="mt-3 text-sm text-foreground/70">Drafting…</p>
        ) : null}
        {draftError && !draftLoading ? (
          <div
            className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
            role="alert"
          >
            <p className="text-sm text-red-600 dark:text-red-400">{draftError}</p>
            <Button
              type="button"
              variant="secondary"
              className="min-h-[40px] w-full text-sm sm:w-auto"
              onClick={() => retryDraftsForOpenModal()}
            >
              Retry draft
            </Button>
          </div>
        ) : null}
        <form className="mt-3 space-y-3" onSubmit={(e) => void sendEmail(e)}>
          <div>
            <label htmlFor={`email-subj-${lead.id}`} className="text-xs font-medium">
              Subject
            </label>
            <input
              id={`email-subj-${lead.id}`}
              className={inputClass}
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              maxLength={500}
              disabled={emailSending}
            />
          </div>
          <div>
            <label htmlFor={`email-body-${lead.id}`} className="text-xs font-medium">
              Body
            </label>
            <textarea
              id={`email-body-${lead.id}`}
              className={`${inputClass} min-h-[140px] resize-y`}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              disabled={emailSending}
            />
          </div>
          {emailError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {emailError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" disabled={emailSending || draftLoading}>
              {emailSending ? "Sending…" : "Send"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={closeEmailModal}
              disabled={emailSending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </dialog>

      <dialog ref={smsDialogRef} className={dialogClass} onCancel={closeSmsModal}>
        <h3 className="text-base font-semibold">Send SMS</h3>
        <p className="mt-1 text-xs text-foreground/60">
          Draft from AI — max 160 characters.
        </p>
        {draftLoading ? (
          <p className="mt-3 text-sm text-foreground/70">Drafting…</p>
        ) : null}
        {draftError && !draftLoading ? (
          <div
            className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
            role="alert"
          >
            <p className="text-sm text-red-600 dark:text-red-400">{draftError}</p>
            <Button
              type="button"
              variant="secondary"
              className="min-h-[40px] w-full text-sm sm:w-auto"
              onClick={() => retryDraftsForOpenModal()}
            >
              Retry draft
            </Button>
          </div>
        ) : null}
        <form className="mt-3 space-y-3" onSubmit={(e) => void sendSms(e)}>
          <div>
            <label htmlFor={`sms-msg-${lead.id}`} className="text-xs font-medium">
              Message
            </label>
            <textarea
              id={`sms-msg-${lead.id}`}
              className={`${inputClass} min-h-[88px] resize-y`}
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value.slice(0, 160))}
              maxLength={160}
              disabled={smsSending}
            />
            <p className="mt-1 text-xs text-foreground/50">
              {smsMessage.length} / 160
            </p>
          </div>
          {smsError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {smsError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" disabled={smsSending || draftLoading}>
              {smsSending ? "Sending…" : "Send"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={closeSmsModal}
              disabled={smsSending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </dialog>
    </article>
  );
}
