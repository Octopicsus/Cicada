import { createHash } from "node:crypto";

/**
 * P0 #4 (Tech Debt Backlog § P0 #4, option a, 2026-05-04 helpers-only closure):
 *
 * Computes a deterministic dedup hash for a transaction. Used by future sync
 * workflows (GoCardless, CSV import, Salt Edge, etc.) to detect cross-provider
 * duplicates within a single wallet — e.g. the same Lidl charge imported once
 * via GoCardless and once via a CSV statement.
 *
 * Manual entries (accountId, provider, externalId all null/undefined) skip
 * dedup entirely and return null — heuristic dedup would false-positive on
 * legitimate identical concurrent manual entries (e.g. two spouses on a
 * shared wallet adding €3 coffee at the same time). Bank-imported dedup
 * uses the separate UNIQUE constraint
 * `transactions_account_id_provider_external_id_key`, not this hash.
 *
 * Subtle limitation: if the classifier modifies `merchant_normalized` AFTER
 * import (which is the current architecture), re-importing the same
 * underlying transaction via a different provider will produce a different
 * hash. Acceptable for current MVP scope; revisit if cross-provider
 * re-import becomes a real flow.
 */

export interface DedupeKeyInputs {
  readonly walletId: string;
  /** Minor units (per the Money exponent abstraction). bigint preferred; number accepted for ergonomics. */
  readonly amount: bigint | number;
  /** ISO 4217 alpha-3 currency code. */
  readonly currencyCode: string;
  /** Date or ISO-8601 string. Normalized to canonical UTC ISO before hashing. */
  readonly bookedAt: Date | string;
  readonly merchantNormalized: string | null;
  /** All three null/undefined ⇒ manual entry, dedup is skipped. */
  readonly accountId: string | null | undefined;
  readonly provider: string | null | undefined;
  readonly externalId: string | null | undefined;
}

const isNullish = (value: unknown): boolean => value === null || value === undefined;

const isManualEntry = (inputs: DedupeKeyInputs): boolean =>
  isNullish(inputs.accountId) && isNullish(inputs.provider) && isNullish(inputs.externalId);

/**
 * Returns a 64-char lowercase hex SHA-256 digest, or `null` for manual entries.
 *
 * Hash payload (pipe-separated, fixed order):
 *   walletId | amount | currencyCode | bookedAtISO | merchantPart
 *
 * `merchantPart` disambiguation: a literal `null` merchant becomes the
 * 6-char placeholder `<null>`; a non-null merchant string is prefixed
 * with a NUL byte (`\x00`). Postgres text columns reject NUL bytes
 * outright, so the sentinel can never collide with real merchant data
 * round-tripped through the DB. This means a user-supplied literal
 * string `"<null>"` (no NUL prefix) hashes to a different value than
 * a true null — required by P0 #4 spec.
 */
export function computeInternalDedupeKey(inputs: DedupeKeyInputs): string | null {
  if (isManualEntry(inputs)) {
    return null;
  }

  const bookedAtISO = (
    inputs.bookedAt instanceof Date ? inputs.bookedAt : new Date(inputs.bookedAt)
  ).toISOString();

  const merchantPart =
    inputs.merchantNormalized === null ? "<null>" : `\x00${inputs.merchantNormalized}`;

  const payload = [
    inputs.walletId,
    String(inputs.amount),
    inputs.currencyCode,
    bookedAtISO,
    merchantPart,
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}
