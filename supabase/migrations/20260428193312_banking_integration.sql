-- Cicada — migration 0004: banking integration
-- ---------------------------------------------------------------------------
-- Provider-agnostic banking: connection (consent), accounts (счета внутри
-- connection), sync_state (history попыток синхронизации).
--
-- Зависит от: 0001 (uuid_v7, update_updated_at, connection_status, sync_status),
--             0002 (users), 0003 (wallets).
-- ---------------------------------------------------------------------------

-- ============ bank_connections ============
-- Один connection = один user → один institution через одного provider'а.
-- Может expose много bank_accounts (Revolut → CZK + EUR + GBP).

create table bank_connections (
  id                 uuid primary key default public.uuid_v7(),
  user_id            uuid not null references users(id) on delete cascade,

  -- Provider abstraction (см. Architecture 4.4).
  provider           text not null,                       -- 'gocardless', 'salt-edge', ...
  external_id        text not null,                       -- requisition_id, consent_id и т.п.

  -- Institution info (denormalized для resilience при изменениях у провайдера).
  institution_id     text not null,                       -- "gocardless:REVOLUT_REVOLT21"
  institution_name   text not null,
  institution_logo   text,

  -- Lifecycle.
  status             connection_status not null default 'pending_consent',
  consent_expires_at timestamptz,                         -- PSD2 — обычно 90 дней
  last_synced_at     timestamptz,
  last_error         text,
  last_error_at      timestamptz,

  -- Encrypted provider-specific tokens (refresh tokens etc.).
  -- pgcrypto: encrypt при write, decrypt только в server context.
  encrypted_credentials  bytea,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  unique (user_id, provider, external_id)
);

comment on column bank_connections.encrypted_credentials is
  'Никогда не возвращаем в client SELECT. Frontend читает через view bank_connections_safe.';

create index idx_bank_connections_user_active
  on bank_connections(user_id)
  where status in ('connected', 'reconnecting');

create index idx_bank_connections_expiring
  on bank_connections(consent_expires_at)
  where status = 'connected' and consent_expires_at is not null;

alter table bank_connections enable row level security;

create policy "users manage own connections"
  on bank_connections for all
  using (user_id = auth.uid());

-- View для frontend без encrypted_credentials. Наследует RLS от
-- базовой таблицы (не FORCE ROW LEVEL SECURITY).
create view bank_connections_safe as
  select
    id,
    user_id,
    provider,
    institution_id,
    institution_name,
    institution_logo,
    status,
    consent_expires_at,
    last_synced_at,
    last_error,
    last_error_at,
    created_at,
    updated_at
  from bank_connections;

create trigger trg_bank_connections_updated_at
  before update on bank_connections
  for each row execute function public.update_updated_at();

-- ============ bank_accounts ============
-- Конкретный счёт внутри connection (Revolut → CZK / EUR / GBP = 3 records).

create table bank_accounts (
  id              uuid primary key default public.uuid_v7(),
  connection_id   uuid not null references bank_connections(id) on delete cascade,
  -- ON DELETE RESTRICT для wallet — чтобы случайно не потерять историю транзакций.
  wallet_id       uuid not null references wallets(id) on delete restrict,

  external_id     text not null,                          -- account ID у провайдера
  iban            text,
  account_name    text,
  account_type    text,                                   -- 'current', 'savings', 'card', etc.
  currency_code   text not null,

  -- Last known balance (cache, обновляется при sync).
  balance_amount  bigint,                                 -- minor units
  balance_at      timestamptz,

  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (connection_id, external_id)
);

create index idx_bank_accounts_wallet on bank_accounts(wallet_id);

alter table bank_accounts enable row level security;

-- Унифицированная policy: full access если connection принадлежит user'у.
-- (Спека определяет также отдельную for-select policy, но for-all её перекрывает.)
create policy "users manage accounts of own connections"
  on bank_accounts for all
  using (
    exists (
      select 1 from bank_connections bc
      where bc.id = bank_accounts.connection_id
        and bc.user_id = auth.uid()
    )
  );

create trigger trg_bank_accounts_updated_at
  before update on bank_accounts
  for each row execute function public.update_updated_at();

-- ============ sync_state ============
-- Отдельная таблица а не колонки в bank_connections потому что:
--   (a) пишется часто (на каждый tick) — отдельные hot pages,
--   (b) хочется history attempts, не только last.

create table sync_state (
  id                 uuid primary key default public.uuid_v7(),
  connection_id      uuid not null references bank_connections(id) on delete cascade,
  -- nullable: NULL = connection-level sync; set = account-specific.
  account_id         uuid references bank_accounts(id) on delete cascade,

  status             sync_status not null,
  started_at         timestamptz not null default now(),
  completed_at       timestamptz,
  transaction_count  int not null default 0,
  error_message      text,
  retryable          boolean,

  created_at         timestamptz not null default now()
);

create index idx_sync_state_connection_recent
  on sync_state(connection_id, started_at desc);

create index idx_sync_state_active
  on sync_state(connection_id)
  where status = 'syncing';

alter table sync_state enable row level security;

-- Read: user видит history своих connections.
-- INSERT/UPDATE: только service role (cron jobs, edge functions) — без RLS policy
-- service role обходит RLS by default.
create policy "users see sync state of own connections"
  on sync_state for select
  using (
    exists (
      select 1 from bank_connections bc
      where bc.id = sync_state.connection_id
        and bc.user_id = auth.uid()
    )
  );
