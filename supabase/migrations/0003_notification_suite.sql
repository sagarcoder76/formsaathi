-- FormSaathi Phase 3 (part 1): full notification suite.
-- Per-user channel preferences, Web Push subscriptions and a dedup ledger so
-- cron-driven reminders are never sent twice for the same target.

-- ---------- notification preferences (one row per student) ----------
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  deadline_inapp boolean not null default true,
  deadline_email boolean not null default false,
  deadline_push  boolean not null default false,
  matches_inapp  boolean not null default true,
  matches_email  boolean not null default false,
  matches_push   boolean not null default false,
  followup_inapp boolean not null default true,
  followup_email boolean not null default false,
  followup_push  boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
create policy "preferences are readable and writable only by their owner"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists preferences_touch on public.notification_preferences;
create trigger preferences_touch before update on public.notification_preferences
  for each row execute function public.touch_updated_at();

-- ---------- Web Push subscriptions (client-managed, service-role read) ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "push subscriptions are owner-only"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------- dedup ledger: prevents duplicate cron alerts ----------
-- No RLS policy on purpose: only the service role (cron) writes/reads it.
create table if not exists public.notification_events (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  dedup_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, dedup_key)
);
alter table public.notification_events enable row level security;
create index if not exists notification_events_user_idx on public.notification_events (user_id, kind);
