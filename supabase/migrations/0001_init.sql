-- FormSaathi Phase 2: accounts, cloud sync, persistent listings, notifications.
-- RLS keeps every student's private data scoped to auth.uid().

-- ---------- profiles (one row per student) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  skills text[] not null default '{}',
  batch text,
  degree text,
  locations text[] not null default '{}',
  modes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles are readable and writable only by their owner"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------- opportunities (researched listings, shared catalogue) ----------
create table if not exists public.opportunities (
  id text primary key,
  title text not null,
  category text not null,
  role text,
  organizer text,
  description text,
  skills text[] not null default '{}',
  eligibility text[] not null default '{}',
  location text,
  mode text,
  deadline date,
  deadline_text text,
  deadline_status text,
  compensation text,
  compensation_min integer,
  compensation_max integer,
  compensation_kind text,
  fraud_flags text[] not null default '{}',
  official_url text,
  application_url text,
  source_url text not null,
  source_type text,
  source_domain text,
  last_checked_at timestamptz not null default now(),
  verification_status text,
  also_found_on text[] not null default '{}',
  link_health text not null default 'unknown', -- unknown | ok | broken
  created_at timestamptz not null default now()
);
alter table public.opportunities enable row level security;
-- Readable by everyone (incl. logged-out students); writes only via service role (RLS bypass), never the anon key.
create policy "opportunities are publicly readable"
  on public.opportunities for select
  using (true);
create index if not exists opportunities_category_idx on public.opportunities (category);
create index if not exists opportunities_organizer_idx on public.opportunities (organizer);
create index if not exists opportunities_deadline_idx on public.opportunities (deadline);

-- ---------- saved listings + application pipeline ----------
create table if not exists public.saved_listings (
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id text not null references public.opportunities (id) on delete cascade,
  stage text not null default 'saved' check (stage in ('saved','applied','interview','offer','rejected')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);
alter table public.saved_listings enable row level security;
create policy "saved listings are owner-only"
  on public.saved_listings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create index if not exists saved_listings_user_idx on public.saved_listings (user_id);

-- ---------- saved searches ----------
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  category text,
  role text,
  skill text,
  location text,
  mode text,
  deadline text,
  comp_band text,
  created_at timestamptz not null default now()
);
alter table public.saved_searches enable row level security;
create policy "saved searches are owner-only"
  on public.saved_searches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- in-app notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications are owner-only"
  on public.notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create index if not exists notifications_user_idx on public.notifications (user_id, read);

-- ---------- listing reports ----------
create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  opportunity_id text,
  reason text not null,
  source_url text,
  created_at timestamptz not null default now()
);
alter table public.listing_reports enable row level security;
-- Students insert their own reports; no read/update policy so reports stay private to the service layer.
create policy "students file their own reports"
  on public.listing_reports for insert
  with check (auth.uid() = user_id or user_id is null);

-- ---------- trigger: auto-create a profile on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- trigger: keep updated_at fresh ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists saved_listings_touch on public.saved_listings;
create trigger saved_listings_touch before update on public.saved_listings
  for each row execute function public.touch_updated_at();
