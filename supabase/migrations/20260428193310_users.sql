-- Cicada — migration 0002: users + user_preferences
-- ---------------------------------------------------------------------------
-- Creates the core user identity tables and wires them to Supabase Auth.
-- All other tables (wallets, transactions, etc.) reference public.users.id.
--
-- Зависит от migration 0001 (extensions, uuid_v7, update_updated_at, period_mode).
-- ---------------------------------------------------------------------------

-- ============ TABLES ============

create table users (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  region        text not null,           -- ISO country code, влияет на business logic
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table users is 'Public user profiles — 1:1 with auth.users.';
comment on column users.region is 'ISO-3166-1 alpha-2 country code. Drives period defaults, currency suggestions, banking provider selection.';

create table user_preferences (
  user_id              uuid primary key references users(id) on delete cascade,

  display_currency     text not null,                      -- ISO 4217 currency code (EUR, CZK, ...)
  period_mode          period_mode not null default 'month',
  week_start           smallint not null default 1
                         check (week_start in (0, 1)),     -- 0 = Sunday, 1 = Monday

  -- Privacy & notifications
  posthog_opt_in       boolean not null default false,
  email_notifications  boolean not null default true,

  -- UI
  theme                text not null default 'system'
                         check (theme in ('light', 'dark', 'system')),

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table user_preferences is 'Per-user display and notification settings.';
comment on column user_preferences.display_currency is 'The currency used for cross-account totals and dashboard amounts.';

-- ============ AUTH HOOK ============
-- Creates a public.users row when a new auth.users row is inserted (signup).

create or replace function on_auth_user_created()
returns trigger as $$
begin
  insert into public.users (id, region)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'region', 'cz')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger create_user_on_signup
  after insert on auth.users
  for each row execute function on_auth_user_created();

-- ============ ROW LEVEL SECURITY ============

alter table users enable row level security;

create policy "users can view own profile"
  on users for select
  using (id = auth.uid());

create policy "users can update own profile"
  on users for update
  using (id = auth.uid());

-- DELETE is intentionally not permitted via RLS.
-- Account deletion goes through the explicit deletion_requests flow.

alter table user_preferences enable row level security;

create policy "users manage own preferences"
  on user_preferences for all
  using (user_id = auth.uid());

-- ============ UPDATED_AT TRIGGERS ============
-- Bumps updated_at on every UPDATE. Function defined in migration 0001.

create trigger trg_users_updated_at
  before update on users
  for each row execute function public.update_updated_at();

create trigger trg_user_preferences_updated_at
  before update on user_preferences
  for each row execute function public.update_updated_at();
