-- Cicada — migration 0011: bank_credentials encryption helpers (P0 #1)
-- ---------------------------------------------------------------------------
-- Closes the P0 security gap on `bank_connections.encrypted_credentials`.
-- Until now the column was bytea NULL on every row (persistMonoConnection
-- explicitly set it to NULL and documented the gap). Banking tokens were
-- effectively un-stored — re-connect = re-paste. Production launch
-- requires real encryption.
--
-- Pre-existing facts the migration relies on:
--   * pgcrypto is enabled in the `extensions` schema (migration 0001).
--   * `bank_connections.encrypted_credentials` is already `bytea NULL`
--     (migration 0004) — no column-type change required.
--   * Zero rows currently carry a non-NULL value, so no data backfill.
--
-- Key-management decision (app-side parameterized RPC):
--   * The encryption key (32-byte base64 in env var BANK_CREDENTIALS_KEY)
--     is passed to each encrypt / decrypt call from the server-side
--     Supabase client. Never persisted in DB, postgres config, or
--     pg_settings.
--   * Parameterized RPC means the key value never appears in
--     pg_stat_statements (parameters are normalized to placeholders).
--   * Rotation: re-encrypt all rows via service role using a one-shot
--     script — old key + new key both available during the swap. No
--     schema changes required.
--   * Migration path to Supabase Vault (when on Pro tier): replace the
--     function bodies to read from `vault.decrypted_secrets`, drop the
--     `key text` parameter. Column shape unchanged.
--
-- Why two helpers instead of one stored-procedure that inserts directly:
--   * The connection-insert flow has rollback semantics (delete the
--     connection if accounts insert fails) that already live in the
--     persistMonoConnection app function. Bundling encryption +
--     insert into one PL/pgSQL would force that rollback into SQL.
--     Decoupling lets the app keep one orchestration layer.

-- pgp_sym_encrypt is NOT deterministic — it generates a random IV per
-- call, so the wrapper must be VOLATILE (default for SQL functions
-- without an annotation, but stated explicitly here for clarity).
create or replace function public.encrypt_bank_credentials(
  plaintext text,
  key text
) returns bytea
language sql
volatile
security invoker
as $$
  select extensions.pgp_sym_encrypt(plaintext, key);
$$;

comment on function public.encrypt_bank_credentials(text, text) is
  'Encrypts a banking credential (Mono X-Token, GoCardless refresh token, etc.) with the supplied symmetric key. Returns bytea suitable for storing in bank_connections.encrypted_credentials. Volatile (random IV per call). Caller MUST pass the value of BANK_CREDENTIALS_KEY env var; never log the key or the plaintext.';

-- pgp_sym_decrypt IS deterministic given fixed (ciphertext, key) — STABLE
-- is the correct volatility class. Wrong key raises an exception (caller
-- must catch and surface as auth_expired / consent_revoked depending on
-- context, never expose raw error to end users).
create or replace function public.decrypt_bank_credentials(
  ciphertext bytea,
  key text
) returns text
language sql
stable
security invoker
as $$
  select extensions.pgp_sym_decrypt(ciphertext, key);
$$;

comment on function public.decrypt_bank_credentials(bytea, text) is
  'Decrypts a bank_connections.encrypted_credentials value. Stable. Wrong key throws (pgcrypto raises). Caller MUST never log the result.';

-- Lock execute privileges. PostgREST exposes any function in the public
-- schema by default; we want only service_role (cron jobs, edge
-- functions, server-side route handlers) to call these. authenticated /
-- anon must never see the encryption surface.
revoke execute on function public.encrypt_bank_credentials(text, text) from public;
revoke execute on function public.encrypt_bank_credentials(text, text) from anon;
revoke execute on function public.encrypt_bank_credentials(text, text) from authenticated;
grant execute on function public.encrypt_bank_credentials(text, text) to service_role;

revoke execute on function public.decrypt_bank_credentials(bytea, text) from public;
revoke execute on function public.decrypt_bank_credentials(bytea, text) from anon;
revoke execute on function public.decrypt_bank_credentials(bytea, text) from authenticated;
grant execute on function public.decrypt_bank_credentials(bytea, text) to service_role;
