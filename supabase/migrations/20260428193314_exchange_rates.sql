-- Cicada — migration 0006: exchange_rates
-- ---------------------------------------------------------------------------
-- Daily ECB rates. Lookup всегда по дате транзакции, не по сегодняшней —
-- ключевой принцип multi-currency: stable historic conversion.
--
-- ECB даёт EUR-base rates. Конверсия CZK → USD делается через EUR как pivot:
-- CZK→EUR, EUR→USD. Это уже логика packages/domain/currency/, не БД.
--
-- Зависит от: 0001 (только базовые типы; нет FK в этой таблице).
-- ---------------------------------------------------------------------------

-- ============ TABLE ============
-- Composite PK (date, base_currency, target_currency). Никаких updated_at —
-- rates неизменны после публикации ECB. fetched_at — debug-метка.

create table exchange_rates (
  date            date not null,
  base_currency   text not null,                          -- 'EUR' (ECB base)
  target_currency text not null,
  rate            numeric(20, 10) not null,

  source          text not null default 'ecb',            -- 'ecb' | 'manual' (для backfill)
  fetched_at      timestamptz not null default now(),

  primary key (date, base_currency, target_currency)
);

create index idx_exchange_rates_lookup
  on exchange_rates(date desc, base_currency, target_currency);

-- ============ ROW LEVEL SECURITY ============
-- Rates не приватные — read для всех authenticated user'ов.
-- INSERT/UPDATE — только service role (cron job через Edge Function).

alter table exchange_rates enable row level security;

create policy "anyone authenticated reads rates"
  on exchange_rates for select
  to authenticated
  using (true);
