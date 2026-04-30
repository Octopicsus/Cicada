/**
 * Adhoc smoke test: hit Monobank's `/personal/client-info` with a real
 * token and assert the adapter returns a populated `ClientInfo`.
 *
 * Usage:
 *   MONOBANK_TOKEN=xxxxxxxxxx pnpm exec tsx \
 *     packages/domain/src/banking/providers/monobank/__smoke__/validate.ts
 *
 * Token is read from the `MONOBANK_TOKEN` env variable. NEVER hardcode
 * a token in this file. Output redacts the token; only `clientId`,
 * `name`, and `defaultCurrency` are printed.
 *
 * Phase 1 acceptance:
 *   - Real token  → exit 0 with a JSON line containing externalUserId.
 *   - Bad token   → exit 2 with `{ kind: "invalid_credentials", ... }`.
 *   - Rate limit  → exit 2 with `{ kind: "rate_limited", ... }`. Wait
 *                   60 seconds and re-run.
 *   - Mono down   → exit 2 with `{ kind: "institution_down", ... }`.
 */
import { Result } from "@cicada/shared";

import { MonobankProvider } from "../index";

async function main(): Promise<void> {
  const token = process.env.MONOBANK_TOKEN;
  if (!token) {
    console.error(
      "MONOBANK_TOKEN is not set. Add it to your .env.local or pass inline:\n" +
        "  MONOBANK_TOKEN=xxx pnpm exec tsx packages/domain/src/banking/providers/monobank/__smoke__/validate.ts",
    );
    process.exit(1);
  }

  const provider = new MonobankProvider();
  const result = await provider.validateCredentials({ kind: "token", token });

  if (Result.isErr(result)) {
    console.error("FAIL", JSON.stringify(result.error, null, 2));
    process.exit(2);
  }

  // Don't print `raw` — it carries the user's full client-info payload
  // including masked PANs and IBANs. Just confirm the mapped fields.
  const { providerKey, externalUserId, displayName, defaultCurrency } = result.value;
  console.log(
    "OK",
    JSON.stringify({ providerKey, externalUserId, displayName, defaultCurrency }, null, 2),
  );
}

main().catch((error: unknown) => {
  console.error("UNEXPECTED", error);
  process.exit(3);
});
