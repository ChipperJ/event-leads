# Event Leads

Mobile-first web app for sales reps to capture event leads with optional voice transcription (Whisper) and GPT-4o structuring. **Next.js 14** (App Router), **Tailwind**, **Supabase** (auth + Postgres + RLS), **OpenAI** (Whisper + GPT-4o via `fetch` — no `openai` npm package).

**MVP implementation status:** Feature set through **Session 14** is complete in this repo (including follow-up sends, rate limits, manager lead/event delete, and **`/auth/callback`**). What remains before **production** is mostly **your Supabase project** (run migrations, RLS review, redirect URLs) and **operational** choices (distributed rate limits, tests) — see **Outstanding** below and **`DEVELOPER_HANDOFF.md`**.

---

## Pick up this project (new developer)

1. Read **`DEVELOPER_HANDOFF.md`** (5-minute checklist).
2. Copy **`.env.example`** → **`.env.local`** and fill variables (see **Environment variables** below).
3. Apply database migrations: use **GitHub Actions** (recommended; see **Database setup → Hosted project**) or run the SQL files manually in the Supabase SQL editor.
4. Run **`npm install`** then **`npm run dev`** → [http://localhost:3000](http://localhost:3000).
5. Use **`README.md`** (this file) for routes/APIs and **`decisions.md`** for how each session was built.

---

## Read first (handover)

| File | Purpose |
|------|---------|
| **`@project.md`** | Product vision, MVP feature list (§1–8), schema, UX flow, env vars, security notes, and what is **out of scope** for v1. |
| **`decisions.md`** | Session-by-session build log, key technical choices, **Known Issues / Tech Debt**, and **Handoff Notes for Programmer**. |
| **`DEVELOPER_HANDOFF.md`** | Short checklist for the next developer (Supabase tasks, hardening, out-of-scope). |

Use **`@project.md`** as the requirements source of truth. Use **`decisions.md`** to see *how* those requirements were implemented and what is still open. Use **`DEVELOPER_HANDOFF.md`** as the shortest path to “what do I do on day one.”

---

## MVP requirements (from `@project.md`) — implementation status

| § | Requirement | Status |
|---|-------------|--------|
| 1 | Auth + company workspace (manager / rep) | Implemented |
| 2 | Event setup; manager can update briefing mid-event; manager can delete event | Implemented |
| 3 | Rep briefing viewer; searchable during capture | Implemented |
| 4 | Manual lead fields + source tag | Implemented |
| 4 | Business card → OCR | **Not implemented** — manual entry only (spec allows manual fallback) |
| 5 | Voice note (≤60s), consent + timestamp, Whisper route | Implemented |
| 6 | GPT-4o structuring; rep can override temperature | Implemented |
| 7 | Lead list per event; temperature badges; filter; AI snippet | Implemented |
| 8 | CSV export; all leads; all fields incl. AI | Implemented |
| — | **Extension (Sessions 8–14):** Follow-up, E.164, rate limits, manager lead/event delete (cascade), `/auth/callback`, optional retention SQL | Implemented |

**Explicitly out of scope for MVP** (per `@project.md`): badge scanning, CRM sync, real-time manager view, offline sync, LinkedIn field, etc.

---

## Outstanding (before treating this as production-ready)

These are called out in `@project.md` **Security Notes** and `decisions.md`:

- [ ] Apply and **review RLS** in Supabase (`supabase/migrations/001_initial_schema.sql`); tighten permissive `companies_insert` if needed.
- [ ] **Outreach DB:** Run **`supabase/migrations/002_outreach_log.sql`** in Supabase so **`outreach_log`** exists (required for successful send logging and lead-card timestamps; see `decisions.md` Sessions 8–10).
- [ ] **Session 9 smoke page:** **`/session-nine-api-test.html`** — not verified in a running dev session by the project owner; optional (`decisions.md` Session 9 QA note).
- [x] **Rate limiting** on all @project API routes plus lead/event **DELETE** (**Sessions 11–14**, in-memory **per server instance** — see `decisions.md`; use Redis/edge for global caps in production).
- [ ] **API input validation** hardening (programmer review).
- [x] **GDPR lead erasure:** **`DELETE /api/leads/[leadId]`** + manager **Delete lead** on the event lead list (`decisions.md` Session 13).
- [x] **Manager event delete:** **`DELETE /api/events/[eventId]`** + **Delete event** on manager event page — removes all leads for that event (`decisions.md` Session 14).
- [x] **`/auth/callback`** for Supabase PKCE / magic-link / OAuth — add URL to Supabase redirect list (`decisions.md` Session 14).
- [x] **Transcript retention (optional):** commented SQL in **`supabase/migrations/003_retention_optional_transcript_null.sql`** — enable/uncomment and schedule in Supabase if your policy allows (app does not run cron).
- [ ] **`SUPABASE_SERVICE_ROLE_KEY`**: listed in env template; **current app code uses the anon key + user session** only — service role reserved for future admin flows.

---

## Prerequisites

- **Node.js** 18+ (project uses Next 14; Node 20 LTS recommended)
- **npm** (or compatible package manager)
- A **Supabase** project (Auth + Postgres)
- An **OpenAI** API key (Whisper + Chat Completions)

---

## Environment variables

Copy `.env.example` → `.env.local` and fill in values. Never commit `.env.local`.

| Variable | Required for | Notes |
|----------|----------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | App | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App | Public anon key (RLS applies) |
| `OPENAI_API_KEY` | Transcribe + structure + generate-followup | Server-side only |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Optional today; not used by current routes |
| `RESEND_API_KEY` | `POST /api/send-email` | Server-side only |
| `FROM_EMAIL` | Verified sender in Resend (e.g. `Name <onboarding@yourdomain.com>`) | Server-side only |
| `TWILIO_ACCOUNT_SID` | `POST /api/send-sms` | Server-side only |
| `TWILIO_AUTH_TOKEN` | `POST /api/send-sms` | Server-side only |
| `TWILIO_PHONE_NUMBER` | Twilio **From** number (E.164) | Server-side only |

---

## Database setup

### Hosted project (Supabase Dashboard)

**Recommended: GitHub Actions (applies migrations from this repo)**

**Fast path (`gh` CLI logged in):** from the repo root run **`npm run setup:hosted`** (not `npx`; script name is **`setup:hosted`**). It prompts for Supabase values, sets the three GitHub Actions secrets, triggers the migration workflow, and writes **`.env.local`**. Uses **Node** (`scripts/configure-hosted-supabase.cjs`) so paths with spaces (e.g. `Coding Projects`) work on Windows.

**Or set secrets manually:** In GitHub: **Settings → Secrets and variables → Actions → New repository secret** and add:

   - **`SUPABASE_ACCESS_TOKEN`** — [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) (create a token with a name like `github-migrations`).
   - **`SUPABASE_PROJECT_ID`** — your **Project ID** / ref from the dashboard URL: `https://supabase.com/dashboard/project/<this-part>`.
   - **`SUPABASE_DB_PASSWORD`** — the **database password** for this project (from when the project was created, or **Project Settings → Database** if you reset it).

Then push to **`main`** or **`master`**, or open **Actions → Deploy Supabase migrations → Run workflow**. The job runs **`supabase link`** and **`supabase db push`** so files under **`supabase/migrations/`** apply in order.

**First-time only:** use an **empty** database (new project, no tables yet). If you already ran the SQL files manually in the SQL Editor, **`db push` can fail** because objects already exist — either use a fresh project, or align history with Supabase’s [migration repair](https://supabase.com/docs/reference/cli/supabase-migration-repair) / support docs.

**Manual alternative (same result as CI):** In the SQL editor, run **`001_initial_schema.sql`** then **`002_outreach_log.sql`** end-to-end; optional **`003_retention_optional_transcript_null.sql`**.

**Auth URLs (hosted)**

- Enable **Email** auth (or your chosen provider) in Supabase Authentication settings.
- Add **`http://localhost:3000`** and **`http://localhost:3000/auth/callback`** to **Redirect URLs** if you use email confirmation, magic links, or OAuth. Add the same paths on your production origin when you deploy.

### Local Supabase (optional)

Requires [Docker Desktop](https://docs.docker.com/desktop). From the repo root: **`npm run supabase:start`** applies migrations and seeds (see **`supabase/seed.sql`**). Run **`npm run supabase:status`** and copy **API URL** and **anon key** into **`.env.local`**. Use **`npm run db:reset`** to reapply migrations. Regenerate TypeScript DB types with **`npm run db:types`** after schema changes.

---

## Scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build + typecheck
npm run start    # after build
npm run lint
```

---

## Main routes (App Router)

| Path | Role | Notes |
|------|------|--------|
| `/` | — | Redirects by auth state |
| `/auth/login`, `/auth/signup` | — | |
| `/auth/callback` | — | Supabase PKCE / magic link / OAuth — add URL in Supabase **Redirect URLs** |
| `/onboarding` | — | Creates company + `public.users` row |
| `/dashboard` | Manager / rep | Event list |
| `/events/new` | Manager | Create event |
| `/events/[id]` | Manager | Edit event + **Delete event** (danger zone); **Rep** | Read-only briefing |
| `/events/[id]/capture` | — | `LeadCaptureForm` + server action |
| `/events/[id]/leads` | — | Cards, temperature filter, CSV download link |

### API routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/transcribe` | Whisper; session required; **429** if rate-limited (~24/min/user per instance) |
| `POST` | `/api/structure` | GPT-4o JSON structuring; session required; **429** if rate-limited |
| `POST` | `/api/generate-followup` | GPT-4o drafts; body `{ lead_id }`; session required; **429** if rate-limited |
| `POST` | `/api/send-email` | Resend; logs `outreach_log`; session required; **429** if rate-limited |
| `POST` | `/api/send-sms` | Twilio to lead phone (**E.164** normalization on server); logs `outreach_log`; body `{ lead_id, message }` (max 160 chars); session required; **429** if rate-limited |
| `GET` | `/api/events/[eventId]/leads-csv` | CSV download; session required; **all** leads for event; **429** plain text if rate-limited |
| `DELETE` | `/api/leads/[leadId]` | **Manager-only** (RLS): remove lead + `outreach_log` cascade; **429** if rate-limited |
| `DELETE` | `/api/events/[eventId]` | **Manager-only** (RLS): remove event + all leads / outreach for that event (cascade); **429** if rate-limited |

**Session 9 quick check (optional):** run `npm run dev`, sign in, then open **`http://localhost:3000/session-nine-api-test.html`**. Paste a `lead_id` and exercise generate / send. *Owner has not run this preview in dev yet — see `decisions.md`.*

**Session 10:** Use **`/events/[id]/leads`** while signed in — each card has **Send email** / **Send SMS** and shows last successful send times when **`outreach_log`** has rows.

---

## Static HTML previews (no server)

Under **`preview/`**: `session-*-preview.html` — UI walkthroughs (sessions 5–7, **10** follow-up cards/modals, etc.). Open in a browser for quick checks; **no server**.

---

## Deployment (e.g. Vercel)

- Set the same env vars in the hosting dashboard (including **Resend** and **Twilio** for follow-up sends).
- Ensure Supabase **Site URL** and **Redirect URLs** include your production origin **and** **`https://<your-domain>/auth/callback`** (required for magic link / OAuth / email confirmation flows).
- Consider **request body limits** and **`maxDuration`** for `/api/transcribe` on serverless hosts.

---

## Learn More (Next.js)

- [Next.js Documentation](https://nextjs.org/docs)
