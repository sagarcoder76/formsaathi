-- FormSaathi Profile Types: explicit citizen profile_type & full_name columns on scheme_profiles.

alter table public.scheme_profiles
  add column if not exists profile_type text not null default 'unset'
    check (profile_type in ('school_student', 'college_student', 'entrepreneur', 'all_rounder', 'unset')),
  add column if not exists full_name text not null default '';

create index if not exists scheme_profiles_type_idx
  on public.scheme_profiles (profile_type);
