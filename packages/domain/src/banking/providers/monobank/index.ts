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
