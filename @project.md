# AI Event Lead Management Tool — Master Project Context

> Paste this file at the start of every Cursor/Claude session.

**Repository handover (read in this order):** **`DEVELOPER_HANDOFF.md`** (quick checklist: Supabase, env, what is done vs your tasks) → **`README.md`** (setup, scripts, routes, API table, outstanding production items) → **`decisions.md`** (session log and *Handoff Notes for Programmer*). This file (**`@project.md`**) remains the product and security requirements source of truth.

---

## Vision

Build a mobile-first web app that helps sales reps at events capture leads quickly using AI.

**Core value prop:**
> "Turn every event conversation into a qualified, CRM-ready lead in under 30 seconds — without breaking eye contact."

**Goal metric:** Create a high-quality lead in under 30 seconds.

---

## Target Users

- **Sales reps** at events — capturing leads on the floor, stressed, bad WiFi, 10 people waiting
- **Sales managers** — setting up events, reviewing leads, exporting to CRM

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 14 (App Router) | Mobile-first, easy API routes |
| Styling | Tailwind CSS | Fast, responsive |
| Auth + DB | Supabase | Auth, Postgres, real-time, row-level security out of the box |
| Voice | OpenAI Whisper API | Transcription of short voice notes |
| AI | GPT-4o | Structuring leads from transcripts, cheap and fast |
| Hosting | Vercel | Zero-config Next.js deployment |

---

## Database Schema (Supabase)

### `companies`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | Company/org name |
| created_at | timestamp | |

### `users`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK (Supabase Auth) |
| company_id | uuid | FK → companies |
| role | text | 'manager' or 'rep' |
| full_name | text | |
| email | text | |

### `events`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| name | text | Event name |
| location | text | |
| date | date | |
| briefing | text | Rich text — talking points, ICP, objections |
| created_at | timestamp | |

### `leads`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| event_id | uuid | FK → events |
| captured_by | uuid | FK → users |
| first_name | text | |
| last_name | text | |
| company | text | |
| job_title | text | |
| email | text | |
| phone | text | |
| source_tag | text | 'walked_by' / 'attended_talk' / 'referral' / 'other' |
| temperature | text | 'hot' / 'warm' / 'cold' |
| transcript | text | Raw Whisper output |
| ai_pain_points | jsonb | Array of strings |
| ai_interests | jsonb | Array of strings |
| ai_next_steps | jsonb | Array of strings |
| ai_urgency | text | 'low' / 'medium' / 'high' |
| ai_temperature | text | AI-suggested temperature |
| ai_temperature_reason | text | One-sentence reason |
| consent_given | boolean | Was consent confirmed before recording? |
| consent_timestamp | timestamp | When consent was confirmed |
| created_at | timestamp | |

---

## Core Features (MVP)

### 1. Auth + Company Workspace
- Supabase email/password auth
- Users belong to a company (multi-tenant)
- Roles: manager / rep

### 2. Event Setup (Manager)
- Create event: name, date, location
- Write briefing: talking points, ICP, common objections
- Push briefing updates mid-event

### 3. Booth Briefing Viewer (Rep)
- Read-only, mobile-optimised briefing view
- Searchable during lead capture

### 4. Lead Capture
- Manual entry: name, company, title, email, phone
- Source tag: walked by booth / attended talk / referral / other
- Business card photo → OCR (v1 fallback to manual)
- Badge scanning (v2)

### 5. Voice Note → Transcription
- Max 60 seconds
- Browser MediaRecorder API
- **Consent toggle must be ticked before recording starts**
- Consent timestamp logged to DB
- Sent to Whisper API via Next.js API route

### 6. AI Structuring (GPT-4o)
- Input: Whisper transcript
- Output: pain points, interests, next steps, urgency, temperature + reason
- Rep can override temperature

**System prompt for AI structuring:**
```
You are a sales assistant. Extract from this voice note transcript:
- pain_points (array of strings)
- interests (array of strings)
- next_steps (array of strings)
- urgency (low/medium/high)
- temperature (hot/warm/cold)
- temperature_reason (one sentence)
Return only valid JSON, no explanation.
```

### 7. Lead Dashboard
- Card list per event
- Temperature badge (colour coded: red/orange/blue)
- Filter by temperature
- AI summary snippet on card

### 8. CSV Export
- All leads for an event
- All fields including AI summary fields

---

## UX Flow

```
Login
  ↓
Select Event
  ↓
View Briefing (optional)
  ↓
Tap "Capture Lead"
  ↓
Enter contact details + source tag
  ↓
Tick consent → Record voice note (max 60s)
  ↓
AI generates: summary / pain points / next steps / temperature
  ↓
Rep reviews + overrides if needed
  ↓
Save lead
  ↓
Back to capture or view dashboard
```

---

## Constraints

- **No continuous recording** — only short voice notes, manually triggered
- **Mobile-first** — all tap targets min 44px, thumb-reachable actions
- **Privacy-compliant** — consent toggle + timestamp before every recording
- **Offline-aware** — graceful error handling when signal is poor (full offline mode is v2)
- **Multi-tenant** — company accounts with multiple users, data isolated by company

---

## What We Are NOT Building in MVP

- Badge scanning (too complex for v1)
- CRM sync / webhooks (v2)
- Real-time manager view (v2)
- Offline mode with background sync (v2)
- LinkedIn field (v2)
- Follow-up email generation (v2)
- Competitor mention detection (v2)

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

Never hardcode these. Always use `.env.local`.

---

## Security Notes (for programmer review)

- Row-level security must be enabled on all Supabase tables
- API routes must validate all inputs
- Rate limiting required on `/api/transcribe`, `/api/structure`, and CSV export (`GET /api/events/[eventId]/leads-csv`)
- Audio blobs must not be stored permanently — transcribe and discard
- Voice notes auto-delete after 30 days (configurable)
- GDPR: data deletion endpoint required for lead subjects

---

## File Structure (Target)

```
/app
  /auth         → login, signup
  /dashboard    → event list
  /events
    /[id]       → event detail + briefing
    /[id]/leads → lead list + CSV download link
    /[id]/capture → lead capture flow
  /api
    /transcribe → Whisper API route
    /structure  → GPT-4o API route
    /events/[eventId]/leads-csv → CSV export (all columns)
/components
  /ui           → buttons, cards, badges
  /lead         → lead card, capture form, temperature filter
  /briefing     → briefing viewer
/lib
  /supabase     → client + server clients
  /ai           → GPT structuring helpers
  /leads        → CSV + list helpers, source tags
```

---

*Last updated: handover — routes and security notes aligned with repo (Apr 2026).*
