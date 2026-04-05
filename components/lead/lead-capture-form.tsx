"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createLeadManual,
  leadManualFormInitialState,
} from "@/app/events/[id]/capture/actions";
import {
  parseStructuredLeadFromClient,
  type StructuredLead,
} from "@/lib/ai/structured-lead";
import { SOURCE_TAG_OPTIONS } from "@/lib/leads/source-tags";

const MAX_RECORD_MS = 60_000;
const inputClass =
  "min-h-[44px] w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base";

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="w-full sm:w-auto"
    >
      {pending ? "Saving…" : "Save lead"}
    </Button>
  );
}

type Props = { eventId: string };

export function LeadCaptureForm({ eventId }: Props) {
  const [state, formAction] = useFormState(
    createLeadManual,
    leadManualFormInitialState
  );

  const [consentChecked, setConsentChecked] = useState(false);
  const [consentAt, setConsentAt] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [structured, setStructured] = useState<StructuredLead | null>(null);
  const [structuring, setStructuring] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [leadTemperature, setLeadTemperature] = useState<
    "" | "hot" | "warm" | "cold"
  >("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordStartRef = useRef<number>(0);

  const stopStreams = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      mediaRecorderRef.current?.stop();
      stopStreams();
    };
  }, [stopStreams]);

  const onConsentChange = (checked: boolean) => {
    setConsentChecked(checked);
    setVoiceError(null);
    if (checked) {
      setConsentAt(new Date().toISOString());
    } else {
      setConsentAt("");
    }
  };

  const stopRecording = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "recording") {
      rec.stop();
    }
    setRecording(false);
    setRecordMs(0);
  }, []);

  const startRecording = async () => {
    setVoiceError(null);
    if (!consentChecked) {
      setVoiceError("Confirm consent before recording.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Microphone not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];
      const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m));

      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onerror = () => {
        setVoiceError("Recording error.");
        stopRecording();
        stopStreams();
      };

      rec.onstop = async () => {
        stopStreams();
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        if (blob.size < 100) {
          setVoiceError("Recording was too short.");
          return;
        }
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "note.webm");
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: fd,
            credentials: "include",
          });
          let body: { transcript?: string; error?: string } = {};
          try {
            body = (await res.json()) as {
              transcript?: string;
              error?: string;
            };
          } catch {
            setVoiceError(
              res.status === 429
                ? "Too many transcription requests. Wait a minute."
                : "Transcription failed."
            );
            return;
          }
          if (!res.ok) {
            setVoiceError(body.error ?? "Transcription failed.");
            return;
          }
          const t = (body.transcript ?? "").trim();
          if (t) {
            setTranscript((prev) => (prev ? `${prev}\n\n${t}` : t));
          }
        } catch {
          setVoiceError("Network error during transcription.");
        } finally {
          setTranscribing(false);
        }
      };

      recordStartRef.current = Date.now();
      setRecordMs(0);
      rec.start(250);
      setRecording(true);

      timerRef.current = setInterval(() => {
        setRecordMs(Date.now() - recordStartRef.current);
      }, 200);

      stopTimerRef.current = setTimeout(() => {
        stopRecording();
      }, MAX_RECORD_MS);
    } catch {
      setVoiceError("Could not access microphone.");
      stopStreams();
    }
  };

  const fmtSec = (ms: number) => {
    const s = Math.min(Math.floor(ms / 1000), 60);
    return `${s}s / 60s`;
  };

  const extractInsights = async () => {
    setStructureError(null);
    const t = transcript.trim();
    if (!t) {
      setStructureError("Add or record a transcript first.");
      return;
    }
    setStructuring(true);
    try {
      const res = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: t }),
        credentials: "include",
      });
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        setStructureError(
          res.status === 429
            ? "Too many structure requests. Wait a minute."
            : "Could not read response."
        );
        return;
      }
      if (!res.ok) {
        const err =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Could not extract insights.";
        setStructureError(err);
        return;
      }
      const next = parseStructuredLeadFromClient(JSON.stringify(body));
      if (!next) {
        setStructureError("Model returned incomplete data. Try again.");
        return;
      }
      setStructured(next);
      setLeadTemperature("");
    } catch {
      setStructureError("Network error while extracting insights.");
    } finally {
      setStructuring(false);
    }
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="consentAt" value={consentAt} />
      <input
        type="hidden"
        name="structuredJson"
        value={structured ? JSON.stringify(structured) : ""}
        readOnly
      />

      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="text-base font-semibold text-foreground">
          Contact
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            First name
            <input
              name="firstName"
              type="text"
              autoComplete="given-name"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Last name
            <input
              name="lastName"
              type="text"
              autoComplete="family-name"
              className={inputClass}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Company
          <input
            name="company"
            type="text"
            autoComplete="organization"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Job title
          <input
            name="jobTitle"
            type="text"
            autoComplete="organization-title"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Phone
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className={inputClass}
          />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-foreground/15 p-4">
        <legend className="px-1 text-base font-semibold text-foreground">
          Voice note (optional)
        </legend>
        <p className="text-sm text-foreground/70">
          Max 60 seconds. Audio is sent to OpenAI Whisper, transcribed, and not
          stored as a file.
        </p>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="consentGiven"
            value="true"
            checked={consentChecked}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0"
          />
          <span>
            I have permission to record a short voice note about this
            conversation.
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {!recording ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!consentChecked || transcribing}
              onClick={() => void startRecording()}
            >
              {transcribing ? "Transcribing…" : "Record"}
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={stopRecording}>
              Stop ({fmtSec(recordMs)})
            </Button>
          )}
        </div>
        {voiceError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {voiceError}
          </p>
        ) : null}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Transcript
          <textarea
            name="transcript"
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              setStructured(null);
              setStructureError(null);
              setLeadTemperature("");
            }}
            rows={5}
            placeholder="Appears after recording, or paste/edit here."
            className={`${inputClass} min-h-[120px] py-2`}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={
              !transcript.trim() || transcribing || structuring || recording
            }
            onClick={() => void extractInsights()}
          >
            {structuring ? "Extracting…" : "Extract insights"}
          </Button>
        </div>
        {structureError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {structureError}
          </p>
        ) : null}
      </fieldset>

      {structured ? (
        <fieldset className="flex flex-col gap-3 rounded-xl border border-foreground/15 p-4">
          <legend className="px-1 text-base font-semibold text-foreground">
            AI insights (optional)
          </legend>
          <p className="text-sm text-foreground/70">
            Review before save. You can override temperature; everything else
            is saved as suggested.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-foreground">Pain points</p>
              <ul className="mt-1 list-inside list-disc text-sm text-foreground/85">
                {structured.pain_points.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Interests</p>
              <ul className="mt-1 list-inside list-disc text-sm text-foreground/85">
                {structured.interests.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Next steps</p>
            <ul className="mt-1 list-inside list-disc text-sm text-foreground/85">
              {structured.next_steps.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-foreground/85">
            <span className="font-medium text-foreground">Urgency:</span>{" "}
            {structured.urgency}
          </p>
          <p className="text-sm text-foreground/85">
            <span className="font-medium text-foreground">AI temperature:</span>{" "}
            {structured.temperature} — {structured.temperature_reason}
          </p>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Temperature on this lead
            <select
              name="leadTemperature"
              value={leadTemperature}
              onChange={(e) =>
                setLeadTemperature(
                  e.target.value as "" | "hot" | "warm" | "cold"
                )
              }
              className={`${inputClass} py-2`}
            >
              <option value="">
                Use AI suggestion ({structured.temperature})
              </option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </label>
        </fieldset>
      ) : null}

      <label className="flex flex-col gap-1 text-sm font-medium">
        How they found you
        <select
          name="sourceTag"
          required
          defaultValue=""
          className={`${inputClass} py-2`}
        >
          <option value="" disabled>
            Select…
          </option>
          {SOURCE_TAG_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton disabled={recording || transcribing || structuring} />
    </form>
  );
}
