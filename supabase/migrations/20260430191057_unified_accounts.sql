-- Cicada — migration 0008: unify accounts table
-- ---------------------------------------------------------------------------
-- Phase 1 step 2 prep: rename `bank_accounts` → `accounts` and relax NOT NULL
-- on `connection_id` / `external_id` so manual accounts (cash, foreign banks
-- without integrations) can live in the same table as provider-sourced ones.
--
-- Manual accounts will be added in Phase 2 onboarding flow; the table change
-- happens NOW because we have zero users — doing it later means data
-- migration on a live system.
--
-- Zero-row migration: only DDL, no data movement. Existing constraint name
-- and the single RLS policy from migration 0004 are explicitly handled.
-- ---------------------------------------------------------------------------

-- 1. Rename the table itself.
alter table bank_accounts rename to accounts;

-- 2. Drop NOT NULL on the two columns that are absent for manual accounts.
alter table accounts alter column connection_id drop not null;
alter table accounts alter column external_id drop not null;

-- 3. Replace the unique (connection_id, external_id) constraint with a
--    partial index that only applies to provider-sourced rows. Two manual
--    accounts on the same wallet must remain insertable even though both
--    have NULL on these columns.
alter table accounts drop constraint if exists bank_accounts_connection_id_external_id_key;

create unique index accounts_connected_unique
  on accounts (connection_id, external_id)
  where connection_id is not null and external_id is not null;

-- 4. Rename the wallet index to follow the new table name.
alter index if exists idx_bank_accounts_wallet rename to idx_accounts_wallet;

-- 5. Replace the RLS policy. Postgres keeps the policy attached when a
--    table is renamed but the policy body is also rewritten here to:
--      (a) allow manual accounts (connection_id IS NULL) for the wallet
--          owner — they're fully owned via wallets.owner_id,
--      (b) keep the connection-mediated check for provider accounts.
--
--    The pre-existing single FOR ALL policy is dropped and split into
--    SELECT and ALL paths so manual accounts on shared wallets remain
--    readable by members in a future migration without re-running this.
drop policy if exists "users manage accounts of own connections" on accounts;
drop policy if exists "users see accounts of own connections" on accounts;

create policy "users see accounts of own connections"
  on accounts for select
  using (
    exists (select 1 from wallets w
            where w.id = accounts.wallet_id and w.owner_id = auth.uid())
    or exists (select 1 from bank_connections bc
               where bc.id = accounts.connection_id and bc.user_id = auth.uid())
  );

create policy "users manage accounts of own connections"
  on accounts for all
  using (
    exists (select 1 from wallets w
            where w.id = accounts.wallet_id and w.owner_id = auth.uid())
    and (
      connection_id is null
      or exists (select 1 from bank_connections bc
                 where bc.id = accounts.connection_id and bc.user_id = auth.uid())
    )
  );
