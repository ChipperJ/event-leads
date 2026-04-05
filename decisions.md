# Decisions Log

> **Handover:** Start with **`DEVELOPER_HANDOFF.md`**, then **`README.md`** (setup, MVP checklist, route map). This file is the build history + detailed programmer handoff (*Handoff Notes for Programmer* below).

> Log every meaningful build decision here as you go.
> Format: date, what you built, why you made key choices.
> Your programmer friend will use this to understand the codebase.

---

## How to Use This File

After each coding session, add an entry:
- What you built
- Any tools/libraries you chose and why
- Any shortcuts or known issues to fix later
- Anything that felt hacky

---

## Session Log

### Session 1 — 3 Apr 2026
**Built:** Supabase-oriented foundation for MVP Feature 1 (auth + company workspace). SQL migration `supabase/migrations/001_initial_schema.sql` with `companies`, `users`, `events`, `leads` and row-level security aligned to @project.md. Browser + server Supabase clients (`lib/supabase/client.ts`, `server.ts`), cookie refresh `middleware.ts` + `lib/supabase/middleware.ts`. Email/password **login** and **signup** (`/auth/login`, `/auth/signup`), **onboarding** form creating company + `public.users` row (`/onboarding`, server action + `useFormState`). **Home** routes signed-in users to dashboard or onboarding. **Dashboard** shell with sign-out (`lib/auth/actions.ts`). Stub routes: `/events/[id]`, `.../leads`, `.../capture`; API stubs `POST /api/transcribe` and `POST /api/structure` (501). Shared **Button** / **ButtonLink** (`components/ui/button.tsx`, 44px min tap targets). `requireProfile()` helper (`lib/auth/profile.ts`).

**Stack decisions:** Kept onboarding on the **anon key** with RLS: any authenticated user may `INSERT` into `companies` (MVP onboarding); `users` insert restricted to `id = auth.uid()`. No service-role server path yet. Next.js **14** App Router + existing `@supabase/ssr` patterns.

**Known issues / TODO:** Run the SQL migration in the Supabase project before testing auth flows. **Permissive `companies` insert** — any signed-in user can create unlimited companies; tighten later (invite-only, admin approval, or service-role-only company creation). **Partial failure:** company row created then `users` insert fails leaves an orphan company. **Email confirmation** in Supabase may block session until confirmed — document project setting for dev. **`/auth/callback`** added in **Session 14** (was missing here). Dashboard event list and real event pages deferred to Session 2+.

---

### Session 2 — 3 Apr 2026
**Built:** MVP **Feature 2 — Event setup (manager)** and shared **event list**. **Dashboard** (`/dashboard`) loads company events (`created_at` desc), empty state copy for manager vs rep, **New event** button (managers only → `/events/new`). **Create event** form with name (required), location, date, briefing; server action `createEvent` + `useFormState`, redirect to event page. **`/events/[id]`** loads real row via `getEventById` + `notFound()` for bad UUID or RLS miss. **Managers** see editable form (`EventManagerForm`, `updateEvent` action, redirect refresh) for name/location/date/briefing — supports mid-event briefing updates. **Reps** see read-only **booth briefing** (title, location, date, briefing body). **`requireManager()`** for `/events/new` and event mutations. Helpers: `lib/validation/is-uuid.ts`, `lib/events/get-event.ts`, `lib/events/format-date.ts`, `lib/events/types.ts`. **Leads** and **capture** child routes now resolve the event name and `notFound` when invalid.

**Stack decisions:** All reads/writes use the **user session** + existing **RLS** (managers insert/update events in their company). No new tables or migrations.

**Known issues / TODO:** No event **delete** UI yet (**Session 14** added it). No optimistic UI on save. CSV / lead list still stubs.

---

### Session 3 — 3 Apr 2026
**Built:** MVP **Feature 3 — Booth briefing viewer (rep)**. New client component **`BriefingViewer`** (`components/briefing/briefing-viewer.tsx`): read-only body, **search** input (min 44px height), **case-insensitive** substring match with `<mark>` highlight, **match count** + “no matches” via `aria-live`, scrollable body with configurable **`maxBodyHeight`** for small screens. Wired on rep **`/events/[id]`** (replaces static briefing block). Wired on **`/events/[id]/capture`** with shorter max height + copy that reps can search while capturing; placeholder area for Session 4 form. Managers unchanged (still use `EventManagerForm` on event page).

**Stack decisions:** Pure **client-side** search over text already loaded from the server — no extra API, no full-text index (fine for MVP briefing length). Regex query escaped to avoid injection; match counting uses same escaped pattern.

**Known issues / TODO:** No **multi-term** OR search (single phrase only). No **keyboard** jump-to-next-match. Very large briefings may want virtualisation later. Lead capture still stub below briefing on capture page.

---

### Session 4A — 3 Apr 2026
**Built:** First slice of MVP **Feature 4 — Lead capture (manual only)**. **`LeadManualForm`** (`components/lead/lead-manual-form.tsx`): first/last name, company, job title, email, phone (all optional except we require **at least one** identifying field), required **source tag** (`walked_by` / `attended_talk` / `referral` / `other` with human labels in `lib/leads/source-tags.ts`). Server action **`createLeadManual`** (`app/events/[id]/capture/actions.ts`): verifies UUID event, confirms event **`company_id`** matches profile, inserts **`leads`** row with **`captured_by`** = current user, **`consent_given: false`** (voice not in 4A), trims fields and caps length (500). Basic **email** shape check when email present (`lib/validation/email.ts`). Success **`redirect`** to same capture URL with **`?saved=1`**; page shows green **status** banner. **`/events/[id]/capture`** copy updated; **BriefingViewer** unchanged above the form.

**Stack decisions:** All writes through **RLS** (`leads_insert` already enforces company + `captured_by = auth.uid()`). No new migration.

**Known issues / TODO:** After **4B**, remaining: GPT structuring / temperature, OCR, etc. No “save and add another” without redirect. Leads list / CSV still stub.

---

### Session 4B — 3 Apr 2026
**Built:** MVP **Feature 5 (partial)** — **consent + short voice note → Whisper**, wired into the same save as 4A. **`POST /api/transcribe`** (`app/api/transcribe/route.ts`): requires **Supabase session** (401 if not logged in), accepts multipart **`audio`** blob (type `audio/*`, max **8MB**), calls **OpenAI** `audio/transcriptions` with **`whisper-1`** via **`fetch`** (no `openai` npm package). Returns **`{ transcript }`**. **`LeadCaptureForm`** (`components/lead/lead-capture-form.tsx`, replaces **`LeadManualForm`**): **consent checkbox** sets **`consentAt`** ISO hidden field; **Record** disabled until consent; **`MediaRecorder`** (webm/opus preferred), **60s** auto-stop + manual Stop; uploads to **`/api/transcribe`** with cookies; appends transcript to editable **`textarea`** `name="transcript"`. **`createLeadManual`** extended: if **`transcript`** non-empty, requires **`consentGiven`** + valid **`consentAt`**; persists **`transcript`**, **`consent_given`**, **`consent_timestamp`** on **`leads`**. Save disabled while recording/transcribing.

**Stack decisions:** Audio **not** stored — transcribe and discard (per @project). Server-side validation so pasted transcripts still require consent + timestamp.

**Known issues / TODO:** No **rate limiting** on `/api/transcribe` yet (@project). No **GPT structuring** / temperature (Session 5+). Mic permission UX varies by browser; large deployments may need **`maxDuration`** / body limits on Vercel.

---

### Session 5 — 3 Apr 2026
**Built:** MVP **Feature 6 (partial)** — **GPT-4o lead structuring** after transcript. **`lib/ai/structured-lead.ts`**: `StructuredLead` shape, `normalizeStructuredObject` / `parseStructuredLeadJson` / `parseStructuredLeadFromClient`, shared system prompt. **`lib/ai/call-structure-model.ts`**: `structureLeadFromTranscript` via **`fetch`** to OpenAI **`gpt-4o`** with **`response_format: { type: "json_object" }`**. **`POST /api/structure`** (`app/api/structure/route.ts`): session required, JSON `{ transcript }`, cap **32k** chars, returns structured JSON or error. **`LeadCaptureForm`**: **Extract insights** calls the route, shows pain points / interests / next steps / urgency / AI temperature + reason; **hidden `structuredJson`**; **rep temperature** `<select>` (`""` = use AI); clearing transcript clears insights. **`createLeadManual`**: validates optional `structuredJson`, writes **`ai_*`** columns + **`temperature`** (override or AI).

**Stack decisions:** No **`openai`** npm package — same pattern as Whisper. Client re-validates successful responses with **`parseStructuredLeadFromClient`** so UI and server action stay aligned.

**Known issues / TODO:** No **rate limiting** on **`/api/structure`** yet (@project). Static **`preview/session-five-preview.html`** for manual UI checks.

---

### Session 6 — 3 Apr 2026
**Built:** MVP **Feature 7 — Lead dashboard** (per @project.md §7). **`getLeadsForEvent`** (`lib/leads/get-leads-for-event.ts`) loads company-scoped leads for an event (**`created_at` desc**), optional **temperature** `eq` filter. **`LeadCard`**: display name fallback chain, company / title / email, **temperature badge** (hot=red, warm=amber, cold=sky) or “No temperature”, **AI summary snippet** (`leadAiSummarySnippet`: first pain + interest, else `ai_temperature_reason`), source tag label + captured time. **`LeadTemperatureFilter`**: **All / Hot / Warm / Cold** as **`Link`** tabs with **`?temp=`** (server-rendered, no client JS). **`/events/[id]/leads`** wired; event page links **“Leads & CSV →”** (CSV implemented in Session 7). Helpers: **`lib/leads/types.ts`**, **`lead-display-name.ts`**, **`lead-ai-snippet.ts`**, **`labelSourceTag`** on **`source-tags.ts`**.

**Stack decisions:** Filter via **search params** so URLs are shareable and the page stays a **Server Component**.

**Known issues / TODO:** No **pagination** (fine until high volume). Leads with **`temperature` null** only appear under **All**, not under Hot/Warm/Cold — intentional. Static **`preview/session-six-preview.html`** for filter/badge UI checks.

---

### Session 7 — 3 Apr 2026
**Built:** MVP **Feature 8 — CSV export** (per @project.md §8). **`GET /api/events/[eventId]/leads-csv`** (`app/api/events/[eventId]/leads-csv/route.ts`): requires **Supabase session** (401), validates UUID, **`getEventById`** (404), loads **all** leads for the event via **`getLeadsForCsvExport`** (every column: identity, **`transcript`**, **`ai_*` JSON**, **`consent_*`**, **`captured_by`**, **`created_at`**, etc.). **`leadsToCsv`** (`lib/leads/leads-to-csv.ts`): RFC-style quoting, **`JSON.stringify`** for **`jsonb`** arrays, UTF-8 **BOM** for Excel. **`csvFilenameBase`** sanitizes event name for **`Content-Disposition`**. **`/events/[id]/leads`**: **Download CSV** button + copy that export ignores list filter; event home link **“Leads & CSV →”**.

**Stack decisions:** **Route handler** + plain **`<a href>`** so the browser handles attachment download; no extra client bundle.

**Known issues / TODO:** No **rate limiting** on export route (@project pattern). Very large events = single large response (pagination/streaming deferred). Static **`preview/session-seven-preview.html`** for offline CSV column / escaping checks.

---

### Session 8 — 3 Apr 2026
**Built:** Foundation for **email/SMS follow-up** (Sessions 9–12). New migration **`supabase/migrations/002_outreach_log.sql`**: table **`outreach_log`** (`lead_id`, `sent_by`, `type` email|sms, `recipient`, optional `subject`, `message_body`, `sent_at`, `status` sent|failed) with indexes and **RLS** (company-scoped read; insert only as `auth.uid()` for leads in the same company). **npm:** **`resend`** and **`twilio`** added to **`package.json`** / lockfile for upcoming API routes.

**Stack decisions:** `subject` nullable for SMS rows; **`lead_id`** uses **`ON DELETE CASCADE`** so logs disappear with the lead (MVP); matches existing FK style on **`sent_by`** → **`users`**.

**Known issues / TODO:** **Apply `002_outreach_log.sql`** in Supabase when you have DB access — without it, **`outreach_log` inserts fail** (send routes still attempt Resend/Twilio first, then logging errors). **`001`** must already be applied.

---

### Session 9 — 3 Apr 2026
**Built:** **Follow-up API routes** (Sessions 9–12). **`POST /api/generate-followup`**: body `{ lead_id }`, loads lead (RLS), parallel **GPT-4o** calls with the Session 8 email + SMS system prompts from `@project.md` follow-up spec; returns **`{ email: { subject, body }, sms: { message } }`** (SMS capped at 160 chars). **`POST /api/send-email`**: `{ lead_id, subject, body }` — **Resend** from **`FROM_EMAIL`**, **`replyTo`** = signed-in user’s **`public.users.email`**, recipient = lead email; writes **`outreach_log`** (`sent` / `failed`). **`POST /api/send-sms`**: `{ lead_id, message }` (max 160 chars) — **Twilio** from **`TWILIO_PHONE_NUMBER`** to lead phone; logs same table. Helpers: **`lib/leads/get-lead-by-id.ts`**, **`insert-outreach-log.ts`**, **`lib/ai/followup-json.ts`**, **`lib/ai/call-followup-model.ts`**.

**Stack decisions:** User session + **anon Supabase client** for reads/inserts (RLS). No new npm packages beyond Session 8. Plain **`fetch`** to OpenAI (same as structure route).

**Known issues / TODO:** **Rate limiting** not added for these three routes (@project pattern). **Twilio** expects reachable **`to`** (E.164); messy stored phones may fail — validate/normalise later if needed.

**QA note:** The optional smoke page **`public/session-nine-api-test.html`** was **not run in a live dev session** by the owner (Session 10 proceeds anyway). When someone can, hit it at **`/session-nine-api-test.html`** after `npm run dev` + login.

---

### Session 10 — 3 Apr 2026
**Built:** **Lead list follow-up UI** on **`/events/[id]/leads`**. **`LeadCard`** is a **client component** with **Send email** / **Send SMS** (44px targets); buttons disabled when lead lacks email or phone. **`<dialog>`** modals: opening loads AI drafts via **`POST /api/generate-followup`** (cached per card until navigation); editable fields; **Send** calls **`/api/send-email`** or **`/api/send-sms`**, then **`router.refresh()`**. **Outreach status:** latest successful **`outreach_log`** row per channel shows **📧 Email sent** / **💬 SMS sent** with formatted **`sent_at`** (**`lib/leads/outreach-summary.ts`**, batch load on the leads page). **`LeadListRow`** + **`getLeadsForEvent`** now include **`phone`** for display and SMS gating.

**Stack decisions:** Native **`<dialog>`** + Tailwind (no new UI library). Failed draft fetch shows inline error; user can retry by closing and reopening the modal.

**Known issues / TODO:** Superseded by Session 11 (draft reset, retry, flash, E.164).

**Static preview:** **`preview/session-ten-preview.html`** — offline mock of lead cards + modals for design review (no backend).

---

### Session 11 — 3 Apr 2026
**Built:** **Polish + hardening** after follow-up MVP. **E.164** helper **`lib/validation/phone-e164.ts`**; **`POST /api/send-sms`** normalizes lead phone before Twilio and logs the normalized **`recipient`**. **In-memory sliding-window rate limits** (**`lib/rate-limit/memory-sliding-window.ts`**, **`followup-routes.ts`**) on **`/api/generate-followup`** (20/min/user) and **`/api/send-email`** + **`/api/send-sms`** (40/min/user shared “send” bucket) — **per server instance only**; document upgrade path (Redis/Upstash) for multi-instance prod. **`LeadCard`:** closing a modal **clears draft state**; each open **re-fetches** GPT drafts; **Retry draft** on AI errors; **success flash** (“Email sent.” / “SMS sent.”) via **`sessionStorage`** + **`router.refresh()`**; short **E.164 hint** under phone.

**Stack decisions:** No new npm packages. Rate limit returns **429** with plain JSON error.

**Known issues / TODO:** **Session 12** added limits on transcribe / structure / CSV. **Global** limits in production still need a shared store (Redis/Upstash).

---

### Session 12 — 3 Apr 2026
**Built:** **Rate limiting** for the remaining @project.md API routes (**`lib/rate-limit/core-routes.ts`**): **`POST /api/transcribe`** (24 req/min/user), **`POST /api/structure`** (40/min), **`GET /api/events/[eventId]/leads-csv`** (30/min). Same **in-memory sliding window** as Session 11 (**per Node instance**); **429** responses (JSON for JSON routes, plain text for CSV). Closes the “no rate limits on transcribe/structure/CSV” gap from Known Issues.

**Stack decisions:** Reuse **`isRateLimited`**; separate keys per route. No new dependencies.

**Known issues / TODO:** **Distributed** rate limiting for multi-instance deploys; **RLS review** still on you in Supabase.

---

### Session 13 — 3 Apr 2026
**Built:** **GDPR lead erasure:** **`DELETE /api/leads/[leadId]`** with **20/min** user cap (**`leadDeleteRateLimitResponse`** in **`core-routes.ts`**); **RLS** keeps **manager-only** deletes. **Lead list:** managers get **Delete lead** (confirm, then refresh). **Capture:** **`createLeadManual`** stores **E.164-normalized** phone when provided. **Transcribe / structure UI:** safer JSON parse + **429** messaging. **Retention:** optional **`003_retention_optional_transcript_null.sql`** (commented `UPDATE` to null transcripts older than 30 days — run/schedule manually).

**Stack decisions:** Still **no service role** in app routes.

---

### Session 14 — 3 Apr 2026
**Built:** **Manager event delete:** **`DELETE /api/events/[eventId]`** with **`eventDeleteRateLimitResponse`** (**10/min** per user, **`core-routes.ts`**). **`EventDeleteButton`** on manager **`/events/[id]`** (danger zone; confirm; redirect to dashboard). **`GET /auth/callback`** — **`exchangeCodeForSession`** for PKCE / magic link / OAuth; safe **`next`** query (path-only); failure → **`/auth/login?error=auth_callback`** with **`AuthCallbackNotice`** on login. **`DEVELOPER_HANDOFF.md`** for the next owner.

**Stack decisions:** Same session + RLS pattern as lead delete; cascade handled by existing FKs.

---

## Key Decisions Made

| Decision | Option Chosen | Why | Date |
|----------|--------------|-----|------|
| Auth provider | Supabase | Built-in auth + DB + RLS, saves weeks | |
| Voice API | OpenAI Whisper | Simple, accurate, no extra account needed | |
| AI structuring | GPT-4o via API route | Fast, cheap, returns clean JSON | |
| Styling | Tailwind CSS | Mobile-first responsive without writing CSS | |
| Deployment | Vercel | Zero config for Next.js | |

---

## Known Issues / Tech Debt

> Move items here when you spot something that needs fixing but aren't fixing now.

**Security / production**

- [ ] **RLS:** Migrations are in-repo (`001_initial_schema.sql`, `002_outreach_log.sql`) but must be **applied** in Supabase and **reviewed** (especially permissive `companies_insert` for onboarding — Session 1). **Session 8:** if `002` is not run yet, follow-up logging APIs/UI will break — see Session Log.
- [x] **Rate limiting:** **Sessions 11–14** — in-memory sliding window on transcribe, structure, CSV, follow-up routes (**`followup-routes.ts`**), lead **DELETE**, event **DELETE** (**`core-routes.ts`**); **per server instance**. For strict production abuse prevention across many instances, add **Redis/Upstash** (or similar).
- [ ] **API hardening:** Ongoing programmer review (rate limits + phone normalization + delete path help, but not exhaustive).
- [x] **GDPR (lead erasure):** **`DELETE /api/leads/[leadId]`** + manager **Delete lead** on event lead list (**Session 13**). Subject-access / other GDPR flows still out of scope.
- [x] **Retention (optional):** App does not run a scheduler; **`003_retention_optional_transcript_null.sql`** documents a manual/cron **`UPDATE`** to null old **`transcript`** values — uncomment and run in Supabase if policy allows.

**Product gaps vs @project.md wording**

- [ ] **OCR / business card photo** (Feature 4) — **not built**; manual capture only (acceptable as “fallback to manual”).
- [x] **Event delete** UI + API (**Session 14**); destructive — managers only via RLS.

**UX / reliability**

- [ ] **Network / offline** UX during capture could still be richer (@project.md); **Session 13** improved non-JSON and **429** handling for transcribe/structure responses.
- [ ] **Lead list pagination** deferred (Session 6).
- [ ] No **automated test suite**; use `npm run build` + manual QA. Static previews under **`preview/`** (sessions 5–7 + earlier). **`public/session-nine-api-test.html`** — owner did **not** smoke-test in dev (Session 9 log); optional check.

**Dependencies**

- [ ] **`SUPABASE_SERVICE_ROLE_KEY`:** In `.env.example` for future use; **current code paths use anon key + user session** only.

---

## Handoff Notes for Programmer

> **Start here:** Read **`README.md`** and **`DEVELOPER_HANDOFF.md`** (setup, MVP checklist, routes, env). Then **`@project.md`** (full requirements). This section summarizes repo state as of **Session 14** (event delete + auth callback + handoff doc).

### What is implemented (MVP Features 1–8, except OCR)

- **Auth + multi-tenant workspace:** Supabase email/password, `public.users` with `company_id` and `manager` / `rep` roles; onboarding creates company + user row.
- **Events:** Managers create/update/delete events (name, location, date, briefing); delete removes all leads for the event (cascade); reps read briefing on `/events/[id]`.
- **Briefing viewer:** Searchable (`BriefingViewer`) on rep event page and capture page.
- **Lead capture:** `LeadCaptureForm` — manual fields, required source tag, consent + **MediaRecorder** → **`POST /api/transcribe`** (Whisper), optional **Extract insights** → **`POST /api/structure`** (GPT-4o JSON), rep temperature override; **`createLeadManual`** server action persists to **`leads`** including **`ai_*`** and **`temperature`**.
- **Lead dashboard:** `/events/[id]/leads` — cards, temperature filter (`?temp=`), badges, AI snippet, **email/SMS follow-up modals**, **outreach sent timestamps**; **managers:** **Delete lead** (GDPR erasure); export via **`GET /api/events/[eventId]/leads-csv`** (all columns, UTF-8 BOM, JSON cells for `ai_*`).
- **Infra:** Next.js 14 App Router, Tailwind, `@supabase/ssr`, middleware cookie refresh; **no** `openai` npm package (raw `fetch` to OpenAI).
- **Follow-up APIs (Session 9):** `POST /api/generate-followup`, `POST /api/send-email`, `POST /api/send-sms` — see **Session Log** and **README** API table. Requires **`.env.local`** Resend + Twilio vars and applied **`002_outreach_log.sql`** for successful logging.

### What is not implemented (by design or deferred)

- **OCR** and **badge scanning** (v2 / not MVP per @project.md).
- **CRM sync, real-time manager view, offline sync** (v2).
- **Automated transcript purge** — optional SQL only (**`003_...`**); not scheduled in-app. (**Per-instance** rate limits — upgrade for multi-region abuse protection.)

### Configuration you must enable (not automatic)

- **`/auth/callback`** exists in the app (**Session 14**). Add **`http://localhost:3000/auth/callback`** and your production **`https://<domain>/auth/callback`** to Supabase **Redirect URLs** when using magic links, OAuth, or email confirmation flows.

### Key files for your friend

| Area | Path |
|------|------|
| Schema + RLS | `001_initial_schema.sql`, `002_outreach_log.sql`, optional **`003_retention_optional_transcript_null.sql`** |
| Capture + AI persistence | `app/events/[id]/capture/actions.ts`, `components/lead/lead-capture-form.tsx` |
| Whisper / GPT routes | `app/api/transcribe/route.ts`, `app/api/structure/route.ts`; rate limits in **`lib/rate-limit/core-routes.ts`** |
| Follow-up + GDPR + event delete | `app/api/generate-followup/route.ts`, `send-email`, `send-sms`, **`app/api/leads/[leadId]/route.ts`** (DELETE), **`app/api/events/[eventId]/route.ts`** (DELETE); `lib/ai/call-followup-model.ts`; **`lib/rate-limit/`**, **`lib/validation/phone-e164.ts`** |
| CSV export | `app/api/events/[eventId]/leads-csv/route.ts` (+ **`leadsCsvRateLimitResponse`**), `lib/leads/leads-to-csv.ts`, `lib/leads/get-leads-for-csv.ts` |
| Lead list + follow-up UI | `app/events/[id]/leads/page.tsx`, `components/lead/lead-card.tsx`, `lib/leads/outreach-summary.ts`, `lead-temperature-filter.tsx` |
| AI parsing | `lib/ai/structured-lead.ts`, `lib/ai/call-structure-model.ts` |
| Auth callback (PKCE / magic link) | `app/auth/callback/route.ts` |
| Manager event delete UI | `app/events/[id]/event-delete-button.tsx` (wired on `app/events/[id]/page.tsx`) |
| Follow-up rate limits | `lib/rate-limit/followup-routes.ts` |

### What needs security review (summary)

- RLS policies in production Supabase project
- API route validation; **rate limiting** is **in-process** on all API routes that expose abuse surface (transcribe, structure, follow-up sends, CSV, lead delete, event delete) — confirm caps for prod and add **distributed** limits if needed
- Audio: **not stored**; only transient multipart in memory for Whisper
- Env audit: secrets only server-side; `OPENAI_API_KEY` never exposed to client; **Resend / Twilio** keys server-only

### Where shortcuts were taken

- Onboarding allows **any** authenticated user to create a **company** (RLS); tighten for production if needed.
- **No tests** beyond `next build` / lint.
- **Service role key** unused in application code today.

### Final handoff checklist (for your friend)

- **Supabase:** Apply **`001`**, **`002`**; optionally review **`003`** for transcript retention.
- **Supabase Auth:** Register **`/auth/callback`** on local + production origins (see **`README.md`** Database setup).
- **Production rate limits:** **Per-instance** in **`lib/rate-limit/`** — add **Redis/Upstash** if you need global caps.
- **Optional next:** OCR, distributed rate limits, deeper GDPR (export, self-service), automated tests.

### Open questions for the next owner

- Email confirmation / magic link: confirm Supabase Auth settings for dev vs prod.
- Vercel (or other) **body size** and **function timeout** for `/api/transcribe`.
- Whether **OCR** or other v2 features are the next product priority after hardening.

