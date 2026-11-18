-- FormSaathi Scheme Workflow: cloud-synced citizen scheme profiles, wishlist & application tracker.
-- Optional: localStorage works with zero login; when signed in, RLS keeps all rows owner-only.

create table if not exists public.scheme_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.scheme_profiles enable row level security;

drop policy if exists "scheme profiles are owner-only" on public.scheme_profiles;
create policy "scheme profiles are owner-only"
  on public.scheme_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.scheme_applications (
  user_id uuid not null references auth.users (id) on delete cascade,
  scheme_id text not null,
  stage text not null default 'wishlist'
    check (stage in ('wishlist', 'docs_ready', 'applied', 'under_review', 'approved', 'rejected')),
  application_ref text not null default '',
  notes text not null default '',
  snapshot jsonb not null default '{}'::jsonb,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, scheme_id)
);

alter table public.scheme_applications enable row level security;

drop policy if exists "scheme applications are owner-only" on public.scheme_applications;
create policy "scheme applications are owner-only"
  on public.scheme_applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists scheme_applications_user_idx
  on public.scheme_applications (user_id, updated_at desc);
