import { Result, type Result as ResultT } from "@cicada/shared";

import { ProviderError } from "../../core/errors";

import { mapMonobankHttpError } from "./errors";

const BASE_URL = "https://api.monobank.ua";
const KEY = "monobank" as const;

/**
 * Shape of `GET /personal/client-info` as documented at
 * https://api.monobank.ua/docs/. We declare it readonly and keep
 * everything optional that the docs don't promise — Mono has been known
 * to add fields without notice.
 */
export interface MonoClientInfoResponse {
  readonly clientId: string;
  readonly name: string;
  readonly webHookUrl?: string;
  readonly permissions?: string;
  readonly accounts: readonly MonoAccount[];
  readonly jars?: readonly unknown[]; // Phase 1: opaque
}

export interface MonoAccount {
  readonly id: string;
  readonly sendId?: string;
  readonly currencyCode: number; // ISO 4217 numeric
  readonly cashbackType?: "None" | "UAH" | "Miles";
  readonly balance: number; // minor units
  readonly creditLimit: number;
  readonly maskedPan?: readonly string[];
  readonly type: "black" | "white" | "platinum" | "iron" | "fop" | "yellow" | "eAid";
  readonly iban?: string;
}

/**
 * Minimal HTTP client for Mono. No retries, no caching, no throttling
 * — those concerns belong to the orchestration layer (Inngest workflow,
 * Phase 2). The client only knows how to send a request, distinguish a
 * provider error from a network error, and surface the JSON body.
 *
 * `fetchImpl` is injectable so tests can stub the network without
 * patching globals.
 */
export class MonobankClient {
  constructor(
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async getClientInfo(): Promise<ResultT<MonoClientInfoResponse, ProviderError>> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${BASE_URL}/personal/client-info`, {
        method: "GET",
        headers: { "X-Token": this.token },
      });
    } catch (cause) {
      return Result.err(ProviderError.institutionDown(KEY, undefined, String(cause)));
    }

    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = await response.text().catch(() => undefined);
      }
      return Result.err(mapMonobankHttpError({ status: response.status, body }));
    }

    const body = (await response.json()) as MonoClientInfoResponse;
    return Result.ok(body);
  }

  // TODO Phase 2: getStatement(account, from, to?) — rate-limited sync
  // workflow lives in Inngest, not here. The client stays primitive.
}
