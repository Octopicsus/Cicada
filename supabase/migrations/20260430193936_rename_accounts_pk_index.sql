-- Cosmetic: rename PK constraint/index from `bank_accounts_pkey` to
-- `accounts_pkey` to follow the table rename in migration
-- 20260430191057_unified_accounts.sql.
--
-- Postgres keeps the original index name when a table is renamed; this
-- ALTER fixes the leftover so dump/restore output and pg_dump diffs
-- read consistently with the new table name. Pure rename — no data,
-- no behavior change.

alter index bank_accounts_pkey rename to accounts_pkey;
