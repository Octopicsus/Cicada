import type { BankingProvider } from "./provider";
import type { ProviderKey } from "../../types/banking";

/**
 * Provider registry. The key in this map matches `ProviderKey` 1:1 and
 * also matches the folder name under `banking/providers/`, so there's
 * no mapping table to maintain.
 *
 * Entries are added as adapters land — a missing entry surfaces as a
 * thrown programmer error, not a silent fallback.
 */
const REGISTRY: Partial<Record<ProviderKey, BankingProvider>> = {
  // monobank:   wired in the next commit (Phase 1 — first real adapter)
  // gocardless: TBD — adapter scaffold lives in providers/gocardless/.gitkeep
  // salt_edge:  TBD — pending Salt Edge Partner Program access
};

export function getProvider(key: ProviderKey): BankingProvider {
  const provider = REGISTRY[key];
  if (!provider) {
    throw new Error(`Unknown banking provider: ${key}`);
  }
  return provider;
}

/**
 * Resolve the adapter for a namespaced institution id like
 * `"monobank:UA"` or `"gocardless:REVOLUT_REVOLT21"`. Throws if the
 * prefix isn't a known `ProviderKey`.
 */
export function getProviderForInstitution(institutionId: string): BankingProvider {
  const [providerKey] = institutionId.split(":");
  if (!providerKey) {
    throw new Error(`Malformed institution id (missing provider prefix): ${institutionId}`);
  }
  return getProvider(providerKey as ProviderKey);
}
