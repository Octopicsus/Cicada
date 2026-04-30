import type { ISOCountry, ISOCurrency, Money } from "./money";

// Re-export so banking-related callers don't need a second import line for
// the primitives that show up everywhere in this module's signatures.
export type { ISOCountry, ISOCurrency, Money };

/**
 * Banking provider key — only providers whose adapters live in this repo.
 * Whether a given user has access to a provider is a runtime concern
 * (env flags, institution registry), not a type-system concern.
 *
 * Folder names under `banking/providers/` mirror this union 1:1 so a
 * trivial `providers[key]` lookup works without a mapping table.
 */
export type ProviderKey = "monobank" | "gocardless" | "salt_edge";

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

// ---------------------------------------------------------------------------
// Provider-abstraction surface (added 2026-04-30 alongside `banking/core/`).
// These types describe the interface adapters expose; existing types above
// describe what we persist. Adapter mappers translate between the two.
// ---------------------------------------------------------------------------

/**
 * Institution — a bank as exposed by a provider. The `id` is namespaced
 * with the provider key so a registry lookup can route a connection
 * attempt to the right adapter without ambiguity (e.g. "monobank:UA",
 * "gocardless:REVOLUT_REVOLT21").
 */
export interface Institution {
  readonly id: string;
  readonly providerKey: ProviderKey;
  readonly name: string;
  readonly country: ISOCountry;
  readonly logoUrl?: string;
}

/**
 * Narrow taxonomy of bank-account types. The persisted `BankAccount`
 * (above) keeps `accountType` as `string | null` to match the DB column
 * and tolerate provider strings we haven't normalized yet; adapters
 * SHOULD project provider values onto this union when known.
 */
export type AccountType = "current" | "savings" | "card" | "other";

/**
 * Balance snapshot returned by a provider at a point in time. Persisted
 * as `BankAccount.balance: Money | null` + `balanceAt: Date | null` for
 * now; this type is the wire shape between adapter and the rest of the
 * system.
 */
export interface Balance {
  readonly amount: Money;
  readonly asOf: Date;
}

/**
 * Inputs to start a PSD2-style consent flow. `redirectUrl` is where the
 * provider sends the user back after granting consent; `locale` is a
 * BCP-47 hint for the provider's hosted UI.
 */
export interface StartConnectionInput {
  readonly userId: string;
  readonly institutionId: string; // namespaced (`<providerKey>:<bankId>`)
  readonly redirectUrl: string;
  readonly locale?: string;
}

/**
 * In-flight connection attempt — handed to the user-facing redirect.
 * `externalRef` holds the provider's own attempt id (requisition_id
 * for GoCardless, login id for Salt Edge). For token-paste providers
 * like Monobank `redirectUrl` is moot; that adapter signals the
 * limitation by returning `unknown` from `startConnection`.
 */
export interface ConnectionAttempt {
  readonly attemptId: string;
  readonly providerKey: ProviderKey;
  readonly redirectUrl: string;
  readonly externalRef?: string;
  readonly expiresAt?: Date;
}

/**
 * Provider credentials — shape varies by auth model:
 * - `token`   — long-lived API token pasted by the user (Monobank).
 * - `oauth`   — short-lived auth code from a PSD2 callback, optionally
 *               with a PKCE verifier.
 * Adapters that don't accept a given kind return `invalid_credentials`.
 */
export type ProviderCredentials =
  | { readonly kind: "token"; readonly token: string }
  | { readonly kind: "oauth"; readonly code: string; readonly codeVerifier?: string };

/**
 * What `validateCredentials()` returns when the provider acknowledges
 * the credentials. `externalUserId` is provider-namespaced and never
 * leaks across providers; we use it for de-duplicating multiple
 * attempts to connect the same upstream account.
 */
export interface ClientInfo {
  readonly providerKey: ProviderKey;
  readonly externalUserId: string;
  readonly displayName?: string;
  readonly defaultCurrency?: ISOCurrency;
  readonly raw?: unknown;
}
