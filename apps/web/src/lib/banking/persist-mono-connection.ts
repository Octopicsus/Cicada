// NOTE: this module is server-only — it expects a Supabase client with
// service-role or request-scoped privileges. No `server-only` import yet
// because the package isn't installed; if/when we need that protection,
// add `pnpm add server-only -F @cicada/web` and a top-line `import "server-only"`.

import type { Database } from "@cicada/db";
import type { ClientInfo } from "@cicada/domain";
import { Result, type Result as ResultT } from "@cicada/shared";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Persist a freshly-validated Monobank connection plus its inline accounts.
 *
 * Inputs are produced by `MonobankProvider.validateCredentials()` — that
 * call is the source of `clientInfo.accounts`. Callers MUST pass a
 * Supabase client with sufficient privileges to insert into both
 * `bank_connections` and `accounts`; in practice this means a service-role
 * client (cron / edge function) or a request-scoped client whose RLS
 * matches `userId`.
 *
 * On error the connection row is rolled back (cascade-deleted) so the
 * function is safe to retry. The function is NOT idempotent across runs:
 * each call inserts a new connection. De-duplication by
 * `(user_id, provider, external_id)` is enforced by the table's unique
 * constraint — a duplicate insert returns the underlying Postgres error.
 */
export interface PersistMonoInput {
  readonly userId: string;
  readonly walletId: string;
  readonly clientInfo: ClientInfo;
}

export interface PersistMonoOutput {
  readonly connectionId: string;
  readonly accountIds: readonly string[];
}

export async function persistMonoConnection(
  db: SupabaseClient<Database>,
  input: PersistMonoInput,
): Promise<ResultT<PersistMonoOutput, Error>> {
  const { userId, walletId, clientInfo } = input;

  if (clientInfo.providerKey !== "monobank") {
    return Result.err(
      new Error(
        `persistMonoConnection: expected providerKey="monobank", got "${clientInfo.providerKey}"`,
      ),
    );
  }
  if (!clientInfo.accounts || clientInfo.accounts.length === 0) {
    return Result.err(new Error("persistMonoConnection: ClientInfo carries no accounts"));
  }

  // 1. Insert the connection row first; the accounts FK references it.
  const { data: connection, error: connectionError } = await db
    .from("bank_connections")
    .insert({
      user_id: userId,
      provider: "monobank",
      external_id: clientInfo.externalUserId,
      institution_id: "monobank:UA",
      institution_name: "Monobank",
      status: "connected",
      // encrypted_credentials: NULL — encryption deferred. Re-paste on reconnect.
    })
    .select("id")
    .single();

  if (connectionError || !connection) {
    return Result.err(
      new Error(
        `persistMonoConnection: failed to insert bank_connection: ${
          connectionError?.message ?? "no row returned"
        }`,
      ),
    );
  }

  // 2. Insert account rows. Mono `balance` fits in JS number for any
  //    realistic UAH amount (< 2^53 minor units = ~9e13 копійок). Domain
  //    keeps `bigint` for ledger-grade math; the DB column is `bigint`
  //    but supabase-js generates the type as `number` — we widen via
  //    `Number(...)` here and accept the precision risk for snapshot
  //    balances (it would matter for cumulative ledgers, not for a
  //    last-known-balance cache).
  const accountsToInsert = clientInfo.accounts.map((account) => ({
    connection_id: connection.id,
    wallet_id: walletId,
    external_id: account.externalId,
    iban: account.iban,
    account_name: account.accountName,
    account_type: account.accountType,
    currency_code: account.currency,
    balance_amount: account.balance ? Number(account.balance.value) : null,
    balance_at: account.balanceAt ? account.balanceAt.toISOString() : null,
  }));

  const { data: insertedAccounts, error: accountsError } = await db
    .from("accounts")
    .insert(accountsToInsert)
    .select("id");

  if (accountsError || !insertedAccounts) {
    // Rollback: cascade on bank_connections drops orphaned accounts too.
    await db.from("bank_connections").delete().eq("id", connection.id);
    return Result.err(
      new Error(
        `persistMonoConnection: failed to insert accounts: ${
          accountsError?.message ?? "no rows returned"
        }`,
      ),
    );
  }

  return Result.ok({
    connectionId: connection.id,
    accountIds: insertedAccounts.map((a) => a.id),
  });
}
