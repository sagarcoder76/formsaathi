-- FormSaathi Phase 4: insights, catalogue-health automation, PWA and moderation.
-- Adds admin roles, catalogue hiding/triage columns, report resolution and a
-- fourth notification kind (listing-health alerts).

-- ---------- admin role ----------
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- ---------- catalogue moderation + link-health bookkeeping ----------
alter table public.opportunities add column if not exists hidden boolean not null default false;
alter table public.opportunities add column if not exists failed_checks integer not null default 0;

-- The old policy made every row (including hidden ones) publicly readable.
drop policy if exists "opportunities are publicly readable" on public.opportunities;
create policy "public catalogue hides moderated listings"
  on public.opportunities for select
  using (
    hidden = false
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
-- Admins (acting through the app with their own JWT) may hide/restore listings.
-- All other writes stay service-role only via RLS bypass.
create policy "admins moderate the catalogue"
  on public.opportunities for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create index if not exists opportunities_hidden_idx on public.opportunities (hidden, last_checked_at);

-- ---------- report triage ----------
alter table public.listing_reports add column if not exists status text not null default 'open';
alter table public.listing_reports add column if not exists resolved_by uuid references auth.users (id) on delete set null;
alter table public.listing_reports add column if not exists resolved_at timestamptz;

create policy "admins read listing reports"
  on public.listing_reports for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
create policy "admins resolve listing reports"
  on public.listing_reports for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
create index if not exists listing_reports_status_idx on public.listing_reports (status, created_at);

-- ---------- fourth notification kind: listing-health alerts ----------
alter table public.notification_preferences
  add column if not exists health_inapp boolean not null default true,
  add column if not exists health_email boolean not null default false,
  add column if not exists health_push boolean not null default false;
