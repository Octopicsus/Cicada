// NOTE: server-only — relies on a service-role Supabase client and reads
// BANK_CREDENTIALS_KEY from the server-side environment. Never import
// from a client component.
//
// Wraps the SQL helpers `public.encrypt_bank_credentials` /
// `public.decrypt_bank_credentials` (migration 0011) so the rest of the
// app talks plain `string` and never touches the symmetric key directly.

import type { Database } from "@cicada/db";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reads `BANK_CREDENTIALS_KEY` and asserts it exists. The value is a
 * 32-byte base64 string; pgcrypto / pgp_sym_encrypt accepts arbitrary
 * text and derives an internal symmetric key, so length validation
 * here is a sanity check, not a cryptographic constraint.
 *
 * The key NEVER appears in DB rows, postgres config, or pg_settings —
 * only in this process's env (Vercel/Supabase secret) and in
 * parameterized RPC calls (parameters are placeholdered in
 * pg_stat_statements).
 */
export function getBankCredentialsKey(): string {
  const key = process.env.BANK_CREDENTIALS_KEY;
  if (!key) {
    throw new Error(
      "[credentials] Missing environment variable: BANK_CREDENTIALS_KEY. " +
        "Generate one via `openssl rand -base64 32` and add it to .env.local " +
        "(server-side scope, never NEXT_PUBLIC_).",
    );
  }
  if (key.length < 16) {
    // Cheap heuristic — a real 32-byte base64 string is 44 chars. We
    // refuse anything obviously short rather than silently encrypting
    // with weak material.
    throw new Error("[credentials] BANK_CREDENTIALS_KEY is suspiciously short (< 16 chars).");
  }
  return key;
}

/**
 * Encrypts `plaintext` (e.g. a Mono X-Token, a GoCardless refresh
 * token) and returns the bytea ciphertext as a PostgREST-encoded hex
 * string (`"\\x..."`) suitable for direct insertion into a `bytea`
 * column via supabase-js.
 *
 * One round-trip per call. For high-volume encryption (batch
 * re-encryption during key rotation), call directly via SQL — but
 * that's an admin script, not a hot path.
 */
export async function encryptBankCredentials(
  db: SupabaseClient<Database>,
  plaintext: string,
): Promise<string> {
  const key = getBankCredentialsKey();
  const { data, error } = await db.rpc("encrypt_bank_credentials", { plaintext, key });
  if (error || !data) {
    throw new Error(`[credentials] encrypt RPC failed: ${error?.message ?? "no data"}`);
  }
  return data;
}

/**
 * Decrypts a bytea ciphertext (as returned from the DB — a PostgREST
 * hex string `"\\x..."`) back to plaintext. Throws if the key is
 * wrong (pgcrypto raises `Wrong key or corrupt data`) — caller is
 * responsible for surfacing that as a user-friendly error and never
 * logging the result.
 */
export async function decryptBankCredentials(
  db: SupabaseClient<Database>,
  ciphertext: string,
): Promise<string> {
  const key = getBankCredentialsKey();
  const { data, error } = await db.rpc("decrypt_bank_credentials", {
    ciphertext,
    key,
  });
  if (error || data === null || data === undefined) {
    throw new Error(`[credentials] decrypt RPC failed: ${error?.message ?? "no data"}`);
  }
  return data;
}
