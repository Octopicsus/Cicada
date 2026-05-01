import type { Result } from "@cicada/shared";

import type { ProviderError } from "./errors";
import type {
  Balance,
  BankAccount,
  BankConnection,
  BankTransaction,
  ClientInfo,
  ConnectionAttempt,
  HealthStatus,
  Institution,
  ISOCountry,
  ProviderCredentials,
  ProviderKey,
  StartConnectionInput,
} from "../../types/banking";

/**
 * Capabilities exposed by an adapter. Read by the orchestration layer
 * (sync scheduler, rate-limit decorators, onboarding UI) so caller code
 * never branches on `provider.key === "monobank" ? ... : ...`.
 *
 * If you find yourself wanting to ask "is this an aggregator or a direct
 * provider?", the answer lives here as a capability flag — not as a
 * folder hierarchy and not as a runtime instanceof check.
 */
export interface ProviderCapabilities {
  /** Hard cap on how often the scheduler may refresh; per-token / per-app. */
  readonly syncFrequencyPerDay: number;
  /** How far back the provider exposes transaction history, in months. */
  readonly historyMonths: number;
  /** Whether the provider can push updates instead of being polled. */
  readonly supportsWebhooks: boolean;
  /** Country whitelist for `listInstitutions`. */
  readonly supportedCountries: readonly ISOCountry[];
  /** Auth model determines what `ProviderCredentials.kind` is accepted. */
  readonly authModel: "token" | "oauth-psd2";
  /** Optional rate-limit hint for the throttling decorator. */
  readonly rateLimit?: {
    readonly requestsPer: number;
    readonly windowSec: number;
    readonly scope: "per-token" | "per-app";
  };
}

/**
 * The contract every banking adapter implements. Every method returns a
 * `Result<…, ProviderError>` — adapters do not throw across this
 * boundary. Throws are reserved for programmer errors (e.g. unknown
 * provider key in the registry).
 */
export interface BankingProvider {
  readonly key: ProviderKey;

  // -- Discovery --------------------------------------------------------
  listInstitutions(country: ISOCountry): Promise<Result<readonly Institution[], ProviderError>>;

  // -- Credential validation -------------------------------------------
  /**
   * Smoke-test the credentials a user just supplied. Required for every
   * adapter (not optional) — gives onboarding a reliable "your token
   * works" check before we persist anything.
   */
  validateCredentials(credentials: ProviderCredentials): Promise<Result<ClientInfo, ProviderError>>;

  // -- Connection lifecycle --------------------------------------------
  startConnection(input: StartConnectionInput): Promise<Result<ConnectionAttempt, ProviderError>>;
  finalizeConnection(
    attemptId: string,
    code: string,
  ): Promise<Result<BankConnection, ProviderError>>;
  refreshConnection(connectionId: string): Promise<Result<BankConnection, ProviderError>>;
  revokeConnection(connectionId: string): Promise<Result<void, ProviderError>>;

  // -- Data access ------------------------------------------------------
  listAccounts(connectionId: string): Promise<Result<readonly BankAccount[], ProviderError>>;
  syncTransactions(
    accountId: string,
    since?: Date,
  ): Promise<Result<readonly BankTransaction[], ProviderError>>;
  getBalance(accountId: string): Promise<Result<Balance, ProviderError>>;

  // -- Self-description ------------------------------------------------
  getCapabilities(): ProviderCapabilities;

  // -- Reachability ----------------------------------------------------
  /**
   * Lightweight reachability check for the provider's public API. Does
   * not require credentials; meant for monitoring, operational tooling,
   * and retry-strategy decisions ("the upstream is down — defer this
   * sync"). Never persists — see `HealthStatus`.
   *
   * Implementations SHOULD use a cheap endpoint (HEAD on the API root)
   * and a short timeout (~5s). They MUST NOT hit credential-protected
   * paths (would pollute auth logs with 401s) or rate-limited resource
   * paths (would burn the user's quota for diagnostics).
   *
   * Returns a `Result.ok(HealthStatus)` for every observable outcome —
   * reachable (`up`), responding-with-5xx (`degraded`), and network /
   * timeout failures (`down`). The `status` field carries the nuance.
   * `Result.err` is reserved for adapters whose health-check endpoint
   * has its own auth or quota model and can fail in a structured way
   * that doesn't fit the three-state status enum.
   */
  healthCheck(): Promise<Result<HealthStatus, ProviderError>>;
}
