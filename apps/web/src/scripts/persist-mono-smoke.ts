/**
 * End-to-end smoke for Phase 1 step 2.
 *
 * Validates a Monobank token, persists the resulting connection +
 * accounts into the local Supabase, then queries them back to confirm
 * the round-trip.
 *
 * Idempotent across runs:
 *   - Test user is identified by `phase1-step2-smoke@cicada.local`.
 *     If absent, created via Supabase Auth admin (region=ua).
 *   - Test wallet is identified by `(owner_id, name='Phase 1 Smoke Wallet')`.
 *     If absent, inserted.
 *   - Existing Monobank connections for the test user are deleted before
 *     the new one is inserted (cascade drops orphaned accounts).
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env.local apps/web/src/scripts/persist-mono-smoke.ts
 *
 * Env vars (all required):
 *   - MONOBANK_TOKEN
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Exit codes:
 *   0 — validate + persist + verify all OK
 *   1 — usage error (missing env var)
 *   2 — adapter validation failed (Mono rejected token)
 *   3 — persistence failed (DB insert error)
 *   4 — verify failed (queried back, found mismatch)
 *   5 — uncaught runtime exception
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@cicada/db";
import { MonobankProvider } from "@cicada/domain";
import { Result } from "@cicada/shared";

import { persistMonoConnection } from "../lib/banking/persist-mono-connection";

const TEST_USER_EMAIL = "phase1-step2-smoke@cicada.local";
const TEST_USER_PASSWORD = "phase1-step2-smoke-password"; // local-only; auth.admin requires it
const TEST_WALLET_NAME = "Phase 1 Smoke Wallet";

async function ensureTestUser(db: SupabaseClient<Database>): Promise<string> {
  // List + filter is fine at MVP scale (single test user). Replaces by
  // `getUserByEmail` once that lands in supabase-js.
  const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 200 });
  if (listError) {
    throw new Error(`auth.admin.listUsers failed: ${listError.message}`);
  }
  const existing = list.users.find((user) => user.email === TEST_USER_EMAIL);
  if (existing) {
    return existing.id;
  }

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    email_confirm: true,
    user_metadata: { region: "ua" },
  });
  if (createError || !created.user) {
    throw new Error(`auth.admin.createUser failed: ${createError?.message ?? "no user"}`);
  }
  return created.user.id;
}

async function ensureTestWallet(db: SupabaseClient<Database>, userId: string): Promise<string> {
  const { data: existing, error: selectError } = await db
    .from("wallets")
    .select("id")
    .eq("owner_id", userId)
    .eq("name", TEST_WALLET_NAME)
    .maybeSingle();
  if (selectError) {
    throw new Error(`wallets select failed: ${selectError.message}`);
  }
  if (existing) {
    return existing.id;
  }

  const { data: inserted, error: insertError } = await db
    .from("wallets")
    .insert({
      owner_id: userId,
      name: TEST_WALLET_NAME,
      currency_code: "UAH",
      manual: false,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    throw new Error(`wallets insert failed: ${insertError?.message ?? "no row"}`);
  }
  return inserted.id;
}

async function cleanupOldMonoConnections(
  db: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { error } = await db
    .from("bank_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "monobank");
  if (error) {
    throw new Error(`cleanup old connections failed: ${error.message}`);
  }
}

async function main(): Promise<void> {
  const token = process.env.MONOBANK_TOKEN;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!token || !supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing env. Required: MONOBANK_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
  }

  const db = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Idempotent test fixtures.
  const userId = await ensureTestUser(db);
  const walletId = await ensureTestWallet(db, userId);
  await cleanupOldMonoConnections(db, userId);

  console.log("OK fixtures:", { userId, walletId });

  // 2. Validate Mono token.
  const provider = new MonobankProvider();
  const validateResult = await provider.validateCredentials({ kind: "token", token });
  if (Result.isErr(validateResult)) {
    console.error("FAIL validate:", JSON.stringify(validateResult.error, null, 2));
    process.exit(2);
  }
  const { providerKey, externalUserId, displayName, defaultCurrency, accounts } =
    validateResult.value;
  console.log("OK validate:", {
    providerKey,
    externalUserId,
    displayName,
    defaultCurrency,
    accountsCount: accounts?.length ?? 0,
  });

  // 3. Persist.
  const persistResult = await persistMonoConnection(db, {
    userId,
    walletId,
    clientInfo: validateResult.value,
  });
  if (Result.isErr(persistResult)) {
    console.error("FAIL persist:", persistResult.error.message);
    process.exit(3);
  }
  console.log("OK persist:", {
    connectionId: persistResult.value.connectionId,
    accountsCount: persistResult.value.accountIds.length,
  });

  // 4. Verify by reading back.
  const { data: connection, error: connectionError } = await db
    .from("bank_connections")
    .select("id, provider, status, external_id, institution_id")
    .eq("id", persistResult.value.connectionId)
    .single();

  if (connectionError || !connection) {
    console.error("FAIL verify connection:", connectionError?.message ?? "no row");
    process.exit(4);
  }

  const { data: persistedAccounts, error: accountsError } = await db
    .from("accounts")
    .select("id, currency_code, account_name, balance_amount")
    .eq("connection_id", persistResult.value.connectionId)
    .order("currency_code");

  if (accountsError || !persistedAccounts) {
    console.error("FAIL verify accounts:", accountsError?.message ?? "no rows");
    process.exit(4);
  }
  if (persistedAccounts.length !== persistResult.value.accountIds.length) {
    console.error(
      `FAIL verify count mismatch: persisted ${String(persistResult.value.accountIds.length)}, queried ${String(persistedAccounts.length)}`,
    );
    process.exit(4);
  }

  console.log("OK verify:");
  console.log("  Connection:", {
    id: connection.id,
    provider: connection.provider,
    status: connection.status,
    institution_id: connection.institution_id,
  });
  console.log("  Accounts:");
  for (const account of persistedAccounts) {
    const balance = account.balance_amount === null ? "NULL" : String(account.balance_amount);
    console.log(
      `    [${account.currency_code}] ${account.account_name ?? "(unnamed)"} — balance ${balance}`,
    );
  }

  console.log("\nALL OK");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("FAIL uncaught:", error);
  process.exit(5);
});
