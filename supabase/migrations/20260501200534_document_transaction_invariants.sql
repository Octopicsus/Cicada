-- Cicada — migration 0010: document transaction amount / fx_source invariants
-- ---------------------------------------------------------------------------
-- Pure documentation + one defensive CHECK. No data movement, no schema
-- shape changes.
--
-- Invariant being captured:
--   1. `transactions.amount` is ALWAYS in the booked currency, which by
--      definition equals the parent account's `currency_code`. Adapter
--      / persistence layer code that puts amount in any other currency
--      breaks aggregation logic (Cash Flow totals, category sums, etc.).
--   2. `fx_source_amount` / `fx_source_currency` are populated ONLY when
--      the original transaction was in a different currency than the
--      account currency. If they're set, they must differ from
--      `currency_code` — otherwise we'd be recording an FX conversion
--      that didn't happen.
--
-- The previous comment on `transactions.amount` (from migration 0005) is
-- replaced; the sign convention is preserved in the new wording.
-- ---------------------------------------------------------------------------

comment on column transactions.amount is 'Amount in booked currency. MUST match account.currency_code of the parent account. Minor units, signed: negative=debit, positive=credit (the direction enum is a denormalized echo). Use fx_source_* fields if the original transaction was in a different currency.';

comment on column transactions.fx_source_amount is 'Original transaction amount before booking conversion. Nullable. Populated only when the original currency differs from account.currency_code.';

comment on column transactions.fx_source_currency is 'Original currency of the transaction before booking conversion. Nullable. ISO 4217 alpha-3 code. Populated only when the original currency differs from account.currency_code.';

-- Defensive CHECK: if FX info is recorded, the source currency MUST
-- differ from the booked currency. If they match, no FX conversion
-- happened and the columns should be NULL.
alter table transactions add constraint transactions_fx_source_differs_from_booked
  check (fx_source_currency is null or fx_source_currency != currency_code);
