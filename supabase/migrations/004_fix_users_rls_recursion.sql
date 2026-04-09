-- Fix: infinite recursion detected in policy for relation "users"
-- Cause: RLS policies on public.users (and others) subquery public.users, which re-triggers the same policies.
-- Fix: SECURITY DEFINER helpers read public.users once without RLS, then policies use those values.

create or replace function public.current_user_company_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select company_id from public.users where id = auth.uid() limit 1;
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.users where id = auth.uid() limit 1;
$$;

revoke all on function public.current_user_company_id() from public;
grant execute on function public.current_user_company_id() to anon, authenticated, service_role;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to anon, authenticated, service_role;

-- Helpers for onboarding: read company row after insert, before public.users row exists (bypasses RLS)
create or replace function public.auth_has_no_public_users_row()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (select 1 from public.users u where u.id = auth.uid());
$$;

create or replace function public.company_has_no_members(p_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (select 1 from public.users u where u.company_id = p_company_id);
$$;

revoke all on function public.auth_has_no_public_users_row() from public;
grant execute on function public.auth_has_no_public_users_row() to anon, authenticated, service_role;

revoke all on function public.company_has_no_members(uuid) from public;
grant execute on function public.company_has_no_members(uuid) to anon, authenticated, service_role;

-- Companies
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select using (
    id = public.current_user_company_id()
    or (
      public.auth_has_no_public_users_row()
      and public.company_has_no_members(id)
    )
  );

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update using (
    id = public.current_user_company_id()
    and public.current_user_role() = 'manager'
  );

-- Users
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select using (
    id = auth.uid()
    or (
      public.current_user_company_id() is not null
      and company_id = public.current_user_company_id()
    )
  );

-- Events
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select using (company_id = public.current_user_company_id());

drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert to authenticated
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_role() = 'manager'
  );

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update using (
    company_id = public.current_user_company_id()
    and public.current_user_role() = 'manager'
  );

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete using (
    company_id = public.current_user_company_id()
    and public.current_user_role() = 'manager'
  );

-- Leads: scope by event.company_id = caller's company (no join on public.users)
drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads
  for select using (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.company_id = public.current_user_company_id()
    )
  );

drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads
  for insert to authenticated
  with check (
    captured_by = auth.uid()
    and exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.company_id = public.current_user_company_id()
    )
  );

drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads
  for update using (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.company_id = public.current_user_company_id()
    )
  );

drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads
  for delete using (
    public.current_user_role() = 'manager'
    and exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.company_id = public.current_user_company_id()
    )
  );

-- Outreach log (002): policies joined users -- same recursion risk
drop policy if exists outreach_log_select on public.outreach_log;
create policy outreach_log_select on public.outreach_log
  for select using (
    exists (
      select 1
      from public.leads l
      join public.events e on e.id = l.event_id
      where l.id = lead_id
        and e.company_id = public.current_user_company_id()
    )
  );

drop policy if exists outreach_log_insert on public.outreach_log;
create policy outreach_log_insert on public.outreach_log
  for insert to authenticated
  with check (
    sent_by = auth.uid()
    and exists (
      select 1
      from public.leads l
      join public.events e on e.id = l.event_id
      where l.id = lead_id
        and e.company_id = public.current_user_company_id()
    )
  );