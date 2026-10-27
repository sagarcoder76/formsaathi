-- Offline-first sync: clients may save/track a listing before the backend has
-- persisted it, so drop the hard FK and keep a denormalized snapshot instead.
alter table public.saved_listings
  drop constraint if exists saved_listings_opportunity_id_fkey;

alter table public.saved_listings
  add column if not exists title text,
  add column if not exists snapshot jsonb;
