import type { ISOCurrency, Money } from "./money";

/**
 * Banking provider key — only providers whose adapters live in this repo.
 * Whether a given user has access to a provider is a runtime concern
 * (env flags, institution registry), not a type-system concern.
 */
export type ProviderKey = "gocardless" | "salt_edge";

/**
 * Transaction direction. `debit` = money out (expense), `credit` = money in.
 * Mirrors the DB `transaction_direction` enum verbatim.
 */
export type TransactionDirection = "debit" | "credit";

/**
 * Normalized taxonomy of provider transaction codes. Adapters map the
 * provider's vocabulary onto this finite set; if a code doesn't fit, it
 * lands in `'other'` and we log it for taxonomy review.
 */
export type TransactionKind =
  | "card_payment"
  | "transfer"
  | "exchange"
  | "fee"
  | "cash_withdrawal"
  | "standing_order"
  | "direct_debit"
  | "other";

/**
 * Provider-agnostic state machine of a connection (consent). Concrete
 * provider semantics — `requisition` for GoCardless, `link` for Salt Edge —
 * live inside the adapter and never reach this layer.
 */
export type ConnectionStatus =
  | "pending_consent"
  | "connected"
  | "expired"
  | "reconnecting"
  | "revoked"
  | "error";

/**
 * Where a transaction's category came from. Used for confidence weighting
 * and audit trails. Mirrors DB `classification_source` enum.
 */
export type ClassificationSource =
  | "user_rule" // Tier 1: user's own rule
  | "global_pattern" // Tier 2: shared knowledge base
  | "ai" // Tier 3: LLM fallback
  | "manual" // user explicitly chose
  | "inherited"; // copied from a similar transaction

/**
 * FX info attached to transactions where the booked amount currency
 * differs from the underlying account currency.
 *
 * `rate` is stored as a string to avoid binary-float precision loss
 * (Postgres `numeric(20, 10)`). Arithmetic goes through decimal.js in
 * the edge layer; the domain layer carries no math deps (ADR 0004).
 */
export interface ExchangeInfo {
  readonly sourceAmount: bigint;
  readonly sourceCurrency: ISOCurrency;
  readonly rate: string;
}

/**
 * Internal canonical transaction shape — NOT a provider-shaped record.
 * Adapters map provider responses onto this; if a field can't be sourced,
 * either we don't support that aspect of the provider or our type needs
 * a new column.
 *
 * IDs are plain `string` today. If we later catch a bug class of
 * "passed a walletId where an accountId was expected", branded types are
 * a 1-day refactor; the cost outweighs the benefit at this stage.
 */
export interface BankTransaction {
  // Identity
  readonly id: string;
  readonly externalId: string | null; // null for manual entries
  readonly providerKey: ProviderKey | null; // null for manual entries

  // Relations
  readonly accountId: string | null; // null for manual entries
  readonly walletId: string;

  // Money. Adapter: { value: row.amount, currency: row.currency_code }.
  // DB stores those as separate columns + redundant `direction` enum for
  // query convenience; the sign of `value` is authoritative (negative=debit,
  // positive=credit), `direction` is a denormalized echo for indexes.
  readonly amount: Money;
  readonly bookedAt: Date;
  readonly valueAt: Date;

  // Description
  readonly merchantRaw: string | null;
  readonly merchantNormalized: string | null;
  readonly description: string | null;
  readonly notes: string | null;

  // Categorization
  readonly categoryId: string | null;
  readonly classificationSource: ClassificationSource | null;
  readonly classificationConfidence: number | null; // 0..1
  readonly classifiedAt: Date | null;

  // Type
  readonly kind: TransactionKind;
  readonly direction: TransactionDirection;

  // FX
  readonly exchange: ExchangeInfo | null;

  // Linking
  readonly awaitingPaymentId: string | null;

  // Visibility / soft delete
  readonly hidden: boolean;
  readonly archivedAt: Date | null;

  // Technical
  readonly createdAt: Date;
  readonly updatedAt: Date;

  /**
   * Original provider response (JSONB column). Domain code MUST treat
   * this as opaque — never `JSON.parse`, never field-pick, never branch
   * on it. Adapters and debug tooling only.
   */
  readonly raw: unknown;
}

/**
 * Bank connection — one user × one institution × one provider, holds
 * the consent / OAuth credentials. The encrypted credentials column is
 * intentionally absent from this domain shape: it never leaves the
 * server boundary decrypted. Server code reads it via service role only.
 */
export interface BankConnection {
  readonly id: string;
  readonly userId: string;

  readonly providerKey: ProviderKey;
  readonly externalId: string; // provider's requisition / consent id

  readonly institutionId: string; // namespaced: "gocardless:REVOLUT_REVOLT21"
  readonly institutionName: string;
  readonly institutionLogo: string | null;

  readonly status: ConnectionStatus;
  readonly consentExpiresAt: Date | null;
  readonly lastSyncedAt: Date | null;
  readonly lastError: string | null;
  readonly lastErrorAt: Date | null;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Bank account — concrete account inside a connection (Revolut →
 * CZK + EUR + GBP yields three records). `balance` is a snapshot from
 * the last sync, not authoritative for in-flight queries.
 */
export interface BankAccount {
  readonly id: string;
  readonly connectionId: string;
  readonly walletId: string;

  readonly externalId: string;
  readonly iban: string | null;
  readonly accountName: string | null;
  readonly accountType: string | null;
  readonly currency: ISOCurrency;

  readonly balance: Money | null;
  readonly balanceAt: Date | null;

  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Sync state — last-known status of a connection (or per-account when
 * the account-specific row exists). Discriminated union mirrors the DB
 * `sync_status` enum but lifts the fields that are only meaningful in
 * some states (no `completedAt` on a `syncing` row).
 */
export type SyncState =
  | { readonly kind: "never_synced" }
  | { readonly kind: "syncing"; readonly startedAt: Date }
  | {
      readonly kind: "synced";
      readonly completedAt: Date;
      readonly transactionCount: number;
    }
  | {
      readonly kind: "error";
      readonly errorAt: Date;
      readonly message: string;
      readonly retryable: boolean;
    };
