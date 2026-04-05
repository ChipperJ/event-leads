-- Optional retention (not scheduled by the app). Run manually or via Supabase cron / external job.
-- Clears stored voice transcript text for leads older than 30 days. Audio was never persisted.
-- Review GDPR policy before enabling; some orgs may require full row deletion instead.

-- update public.leads
-- set transcript = null
-- where transcript is not null
--   and created_at < now() - interval '30 days';

-- Uncomment the UPDATE above when you are ready to use it.