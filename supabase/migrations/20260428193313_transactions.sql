-- Cicada — migration 0005: transactions
-- ---------------------------------------------------------------------------
-- Самая горячая таблица. Каждый сценарий запроса учитывается в индексах:
--   * feed по wallet за период
--   * cash flow по category за период
--   * trigram search по merchant
--   * matching engine для awaiting_payments
--   * dedupe lookup при импорте.
--
-- Зависит от: 0001 (uuid_v7, update_updated_at, transaction_*, classification_source),
--             0002 (users), 0003 (wallets), 0004 (bank_accounts).
--
-- Forward references (FK добавляются позже):
--   * category_id → categories(id) — добавляется в migration 0007 (categorization)
--   * awaiting_payment_id → awaiting_payments(id) — добавляется в migration 0009
--
-- Forward references (RLS политики добавляются позже):
--   * shared_wallet_members policies — добавляются в migration 0008
-- ---------------------------------------------------------------------------

-- ============ TABLE ============

create table transactions (
  id                          uuid primary key default public.uuid_v7(),
  wallet_id                   uuid not null references wallets(id) on delete cascade,
  -- nullable: manual transactions без банка.
  account_id                  uuid references bank_accounts(id) on delete set null,

  -- External identity (для dedupe).
  provider                    text,                       -- null если manual
  external_id                 text,                       -- provider's transaction ID
  internal_dedupe_key         text,                       -- наш hash для cross-provider dedupe

  -- Money. Signed: negative=debit, positive=credit. Direction сохраняем явно
  -- enum'ом, чтобы не делать sign-checks в queries.
  amount                      bigint not null,
  currency_code               text not null,
  direction                   transaction_direction not null,
  kind                        transaction_kind not null default 'other',

  -- Time.
  booked_at                   timestamptz not null,
  value_at                    timestamptz not null,

  -- Description (raw из банка + normalized).
  merchant_raw                text,                       -- "Lidl Dekuje Za Nakup"
  merchant_normalized         text,                       -- "Lidl" (после classifier)
  description                 text,                       -- свободное поле, user может редактировать
  notes                       text,                       -- user's личные заметки

  -- Categorization. FK на categories добавляется в migration 0007 (categorization).
  -- Здесь — чистая uuid колонка, без FK constraint.
  category_id                 uuid,
  classification_source       classification_source,
  classification_confidence   real,                       -- 0..1, null если manual
  classified_at               timestamptz,

  -- FX (если транзакция в чужой валюте).
  fx_source_amount            bigint,                     -- amount в исходной валюте
  fx_source_currency          text,
  fx_rate                     numeric(20, 10),

  -- Linking. FK на awaiting_payments добавляется в migration 0009.
  awaiting_payment_id         uuid,

  -- Visibility / soft delete. Финансовая история должна сохраняться, поэтому
  -- archived_at = "deleted but recoverable 30 days", не hard delete.
  hidden                      boolean not null default false,  -- скрыто из feed
  archived_at                 timestamptz,                     -- soft delete

  -- Raw provider response (для debugging, не для логики).
  raw                         jsonb,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  -- Dedupe constraint — один external transaction не может быть импортирован
  -- дважды. NULL-friendly: manual transactions имеют account_id=NULL и
  -- external_id=NULL, что в Postgres не считается дубликатом.
  unique (account_id, provider, external_id)
);

comment on column transactions.amount is
  'Minor units, signed: negative=debit, positive=credit. Direction enum продублирован для query convenience.';
comment on column transactions.internal_dedupe_key is
  'Hash из (amount + booked_at + merchant_normalized + currency). Cross-provider dedupe (например GoCardless + CSV того же счёта).';
comment on column transactions.merchant_raw is
  'TODO(migration 0005 spec): для kind=transfer хранить hash + encrypted blob, для card_payment — plain text. Сейчас всё plain text — privacy review pending.';

-- ============ INDEXES ============

-- Главный feed query — самый горячий.
create index idx_transactions_wallet_period
  on transactions(wallet_id, booked_at desc)
  where archived_at is null;

-- Cash Flow / Categories aggregation.
create index idx_transactions_category_period
  on transactions(category_id, booked_at desc)
  where archived_at is null and category_id is not null;

-- Trigram search для merchant ("найди все Lidl за год").
create index idx_transactions_merchant_trgm
  on transactions using gin (merchant_normalized extensions.gin_trgm_ops);

-- Awaiting Payment matching engine.
create index idx_transactions_unmatched_awaiting
  on transactions(wallet_id, amount, booked_at)
  where awaiting_payment_id is null and archived_at is null;

-- Dedupe lookup при импорте.
create index idx_transactions_dedupe_key
  on transactions(internal_dedupe_key)
  where internal_dedupe_key is not null;

-- ============ ROW LEVEL SECURITY ============

alter table transactions enable row level security;

-- Owner: full access на свои wallet'ы.
create policy "wallet owners manage transactions"
  on transactions for all
  using (
    exists (
      select 1 from wallets w
      where w.id = transactions.wallet_id
        and w.owner_id = auth.uid()
    )
  );

-- TODO(0008_shared_wallets): добавить политики для shared members:
--
--   create policy "shared members view shared wallet transactions"
--     on transactions for select
--     using (
--       exists (
--         select 1 from shared_wallet_members swm
--         where swm.wallet_id = transactions.wallet_id
--           and swm.member_id = auth.uid()
--           and swm.accepted_at is not null
--       )
--     );
--
--   create policy "shared members edit shared wallet transactions"
--     on transactions for update
--     using (
--       exists (
--         select 1 from shared_wallet_members swm
--         where swm.wallet_id = transactions.wallet_id
--           and swm.member_id = auth.uid()
--           and swm.role in ('owner', 'member')
--           and swm.accepted_at is not null
--       )
--     );

-- ============ UPDATED_AT TRIGGER ============

create trigger trg_transactions_updated_at
  before update on transactions
  for each row execute function public.update_updated_at();
