import { Result, type Result as ResultT } from "@cicada/shared";

import { ProviderError } from "../../core/errors";

import { monobankCapabilities } from "./capabilities";
import { MonobankClient } from "./client";
import { mapClientInfo } from "./mapper";

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
  StartConnectionInput,
} from "../../../types/banking";
import type { BankingProvider, ProviderCapabilities } from "../../core/provider";

const KEY = "monobank" as const;

/**
 * Monobank adapter — Phase 1 surface.
 *
 * Implemented:
 *   - `validateCredentials({ kind: "token", token })` — calls
 *     `GET /personal/client-info` and maps the response.
 *   - `listInstitutions("UA")` — returns the singleton "Monobank" entry.
 *   - `getCapabilities()`.
 *
 * Everything else returns `unknown` with a clear "Not implemented in
 * Phase 1" message. The intent is for `BankingProvider` to compile
 * against this skeleton without `as unknown as` while we incrementally
 * fill in the rest in later phases.
 */
export class MonobankProvider implements BankingProvider {
  readonly key = KEY;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  getCapabilities(): ProviderCapabilities {
    return monobankCapabilities;
  }

  /**
   * HEAD https://api.monobank.ua/ with a 5s timeout. We don't hit
   * `/personal/client-info` here — that path requires a token and would
   * pollute Mono's auth logs with 401s during normal monitoring. We
   * also avoid `/bank/currency` because it has a hard 1/min rate limit
   * that diagnostics shouldn't burn.
   *
   * Mono's edge accepts HEAD (verified empirically). Even a 405 from a
   * future change would still mean "endpoint reachable" → status `up`;
   * only 5xx maps to `degraded` and only network/timeout to `down`.
   */
  async healthCheck(): Promise<ResultT<HealthStatus, ProviderError>> {
    const startedAt = performance.now();
    try {
      const response = await this.fetchImpl("https://api.monobank.ua/", {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Math.round(performance.now() - startedAt);
      const status: HealthStatus["status"] = response.status >= 500 ? "degraded" : "up";
      return Result.ok({ status, latencyMs, checkedAt: new Date() });
    } catch {
      const latencyMs = Math.round(performance.now() - startedAt);
      return Result.ok({ status: "down", latencyMs, checkedAt: new Date() });
    }
  }

  listInstitutions(country: ISOCountry): Promise<ResultT<readonly Institution[], ProviderError>> {
    if (country !== "UA") {
      return Promise.resolve(Result.ok([]));
    }
    const institution: Institution = {
      id: "monobank:UA",
      providerKey: KEY,
      name: "Monobank",
      country: "UA",
    };
    return Promise.resolve(Result.ok([institution]));
  }

  async validateCredentials(
    credentials: ProviderCredentials,
  ): Promise<ResultT<ClientInfo, ProviderError>> {
    if (credentials.kind !== "token") {
      return Result.err(
        ProviderError.invalidCredentials(
          KEY,
          `Monobank requires kind="token", got "${credentials.kind}"`,
        ),
      );
    }
    const client = new MonobankClient(credentials.token, this.fetchImpl);
    const result = await client.getClientInfo();
    if (!result.ok) {
      return result;
    }
    return Result.ok(mapClientInfo(result.value));
  }

  // -- Phase 2 surface -------------------------------------------------
  // Each method returns `unknown` so the orchestration layer can route
  // on `kind` without crashing; messages are human-readable for logs.

  startConnection(
    _input: StartConnectionInput,
  ): Promise<ResultT<ConnectionAttempt, ProviderError>> {
    return Promise.resolve(
      Result.err(
        ProviderError.unknown(
          KEY,
          new Error(
            "Not implemented in Phase 1: Monobank uses token paste, not an OAuth/PSD2 redirect flow.",
          ),
        ),
      ),
    );
  }

  finalizeConnection(
    _attemptId: string,
    _code: string,
  ): Promise<ResultT<BankConnection, ProviderError>> {
    return Promise.resolve(
      Result.err(ProviderError.unknown(KEY, new Error("Not implemented in Phase 1"))),
    );
  }

  refreshConnection(_connectionId: string): Promise<ResultT<BankConnection, ProviderError>> {
    return Promise.resolve(
      Result.err(ProviderError.unknown(KEY, new Error("Not implemented in Phase 1"))),
    );
  }

  revokeConnection(_connectionId: string): Promise<ResultT<void, ProviderError>> {
    return Promise.resolve(
      Result.err(ProviderError.unknown(KEY, new Error("Not implemented in Phase 1"))),
    );
  }

  listAccounts(_connectionId: string): Promise<ResultT<readonly BankAccount[], ProviderError>> {
    return Promise.resolve(
      Result.err(
        ProviderError.unknown(
          KEY,
          new Error(
            "Not implemented in Phase 1: derive from validateCredentials() response in Phase 2.",
          ),
        ),
      ),
    );
  }

  syncTransactions(
    _accountId: string,
    _since?: Date,
  ): Promise<ResultT<readonly BankTransaction[], ProviderError>> {
    return Promise.resolve(
      Result.err(
        ProviderError.unknown(
          KEY,
          new Error(
            "Not implemented in Phase 1: requires the rate-limited sync workflow (Phase 2 / Inngest).",
          ),
        ),
      ),
    );
  }

  getBalance(_accountId: string): Promise<ResultT<Balance, ProviderError>> {
    return Promise.resolve(
      Result.err(ProviderError.unknown(KEY, new Error("Not implemented in Phase 1"))),
    );
  }
}
