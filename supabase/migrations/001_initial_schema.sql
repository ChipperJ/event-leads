-- Event Leads — initial schema and RLS (run in Supabase SQL editor or via CLI)
-- Requires extension for gen_random_uuid()

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables (see @project.md)
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  role text not null check (role in ('manager', 'rep')),
  full_name text not null,
  email text not null
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  location text,
  date date,
  briefing text,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  captured_by uuid not null references public.users (id),
  first_name text,
  last_name text,
  company text,
  job_title text,
  email text,
  phone text,
  source_tag text check (
    source_tag is null
    or source_tag in ('walked_by', 'attended_talk', 'referral', 'other')
  ),
  temperature text check (
    temperature is null or temperature in ('hot', 'warm', 'cold')
  ),
  transcript text,
  ai_pain_points jsonb,
  ai_interests jsonb,
  ai_next_steps jsonb,
  ai_urgency text check (
    ai_urgency is null or ai_urgency in ('low', 'medium', 'high')
  ),
  ai_temperature text,
  ai_temperature_reason text,
  consent_given boolean not null default false,
  consent_timestamp timestamptz,
  created_at timestamptz not null default now()
);

create index events_company_id_idx on public.events (company_id);
create index leads_event_id_idx on public.leads (event_id);
create index users_company_id_idx on public.users (company_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.leads enable row level security;

-- Companies: members can read their org; any signed-in user can create (onboarding — tighten later)
create policy companies_select on public.companies
  for select using (
    id in (select u.company_id from public.users u where u.id = auth.uid())
  );

create policy companies_insert on public.companies
  for insert to authenticated
  with check (true);

create policy companies_update on public.companies
  for update using (
    id in (
      select u.company_id from public.users u
      where u.id = auth.uid() and u.role = 'manager'
    )
  );

-- Users: self + same company
create policy users_select on public.users
  for select using (
    id = auth.uid()
    or company_id in (select u.company_id from public.users u where u.id = auth.uid())
  );

create policy users_insert on public.users
  for insert to authenticated
  with check (id = auth.uid());

-- Events: visible to company; managers manage
create policy events_select on public.events
  for select using (
    company_id in (select company_id from public.users where id = auth.uid())
  );

create policy events_insert on public.events
  for insert to authenticated
  with check (
    company_id in (
      select u.company_id from public.users u
      where u.id = auth.uid() and u.role = 'manager'
    )
  );

create policy events_update on public.events
  for update using (
    company_id in (
      select u.company_id from public.users u
      where u.id = auth.uid() and u.role = 'manager'
    )
  );

create policy events_delete on public.events
  for delete using (
    company_id in (
      select u.company_id from public.users u
      where u.id = auth.uid() and u.role = 'manager'
    )
  );

-- Leads: company-scoped via event; insert as self capturer
create policy leads_select on public.leads
  for select using (
    exists (
      select 1
      from public.events e
      join public.users u on u.company_id = e.company_id
      where e.id = event_id and u.id = auth.uid()
    )
  );

create policy leads_insert on public.leads
  for insert to authenticated
  with check (
    captured_by = auth.uid()
    and exists (
      select 1
      from public.events e
      join public.users u on u.company_id = e.company_id
      where e.id = event_id and u.id = auth.uid()
    )
  );

create policy leads_update on public.leads
  for update using (
    exists (
      select 1
      from public.events e
      join public.users u on u.company_id = e.company_id
      where e.id = event_id and u.id = auth.uid()
    )
  );

create policy leads_delete on public.leads
  for delete using (
    exists (
      select 1
      from public.events e
      join public.users u on u.company_id = e.company_id and u.role = 'manager'
      where e.id = event_id and u.id = auth.uid()
    )
  );
