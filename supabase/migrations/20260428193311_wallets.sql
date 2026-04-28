-- Cicada — migration 0003: wallets
-- ---------------------------------------------------------------------------
-- Wallet — высокоуровневое понятие для пользователя. Может быть привязан
-- к одному bank_account (через миграцию 0004), может быть manual (наличка
-- или внешний счёт без банковской интеграции).
--
-- Зависит от: 0001 (uuid_v7, update_updated_at), 0002 (users).
-- ---------------------------------------------------------------------------

-- ============ TABLE ============

create table wallets (
  id              uuid primary key default public.uuid_v7(),
  owner_id        uuid not null references users(id) on delete cascade,

  name            text not null,
  emoji           text,                                   -- "💳", "🏦", "💵" — null если есть icon
  color           text,                                   -- hex, для UI

  currency_code   text not null,                          -- primary currency этого wallet'а
  manual          boolean not null default false,         -- true если не привязан к bank_account

  -- Soft archive: финансовая история должна сохраняться, поэтому не delete.
  archived_at     timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint wallets_currency_check check (currency_code ~ '^[A-Z]{3}$')
);

comment on table wallets is
  'High-level money container. Maps 1:1 to bank_account (via 0004) или manual.';
comment on column wallets.manual is
  'TRUE если wallet ведётся вручную (наличка, нерезидент-счёт без интеграции).';

-- ============ INDEXES ============

-- Dashboard load: список активных wallet'ов user'а.
create index idx_wallets_owner_active
  on wallets(owner_id)
  where archived_at is null;

-- ============ ROW LEVEL SECURITY ============

alter table wallets enable row level security;

-- Owner: full access.
create policy "wallet owners manage own"
  on wallets for all
  using (owner_id = auth.uid());

-- TODO(0008_shared_wallets): добавить policy для shared_wallet_members.
-- В MVP shared wallets отключены, поэтому policy откладывается до миграции
-- 0008. Когда она появится, добавить:
--
--   create policy "shared wallet members view"
--     on wallets for select
--     using (
--       exists (
--         select 1 from shared_wallet_members swm
--         where swm.wallet_id = wallets.id
--           and swm.member_id = auth.uid()
--           and swm.accepted_at is not null
--       )
--     );

-- ============ UPDATED_AT TRIGGER ============

create trigger trg_wallets_updated_at
  before update on wallets
  for each row execute function public.update_updated_at();
