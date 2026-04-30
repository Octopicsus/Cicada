import type { ProviderKey } from "../../types/banking";

/**
 * Provider error taxonomy. Every banking adapter maps its provider's
 * HTTP status codes / error payloads onto this finite set; nothing else
 * crosses the adapter boundary.
 *
 * The six kinds were chosen so the calling layer can route on `kind`
 * without further parsing:
 *   auth_expired         → re-authenticate the connection
 *   rate_limited         → defer (use `retryAfterSec` if known)
 *   institution_down     → retry later, surface "bank not reachable" UI
 *   invalid_credentials  → user pasted wrong token / OAuth code
 *   consent_revoked      → user revoked at the bank, must reconnect
 *   unknown              → log + surface generic error; never retry blindly
 */
export type ProviderError =
  | { kind: "auth_expired"; providerKey: ProviderKey; details?: string }
  | { kind: "rate_limited"; providerKey: ProviderKey; retryAfterSec?: number }
  | { kind: "institution_down"; providerKey: ProviderKey; institutionId?: string; details?: string }
  | { kind: "invalid_credentials"; providerKey: ProviderKey; details?: string }
  | { kind: "consent_revoked"; providerKey: ProviderKey; connectionId?: string }
  | { kind: "unknown"; providerKey: ProviderKey; cause: unknown };

/**
 * Constructors. Use these instead of object literals so the kind tag
 * stays in one place — narrows refactors when the union changes.
 *
 * Implementation note: under `exactOptionalPropertyTypes` we can't set
 * an optional property to `undefined` literally — the constructors
 * therefore omit the optional key when the corresponding argument is
 * `undefined`.
 */
export const ProviderError = {
  authExpired(providerKey: ProviderKey, details?: string): ProviderError {
    return details === undefined
      ? { kind: "auth_expired", providerKey }
      : { kind: "auth_expired", providerKey, details };
  },
  rateLimited(providerKey: ProviderKey, retryAfterSec?: number): ProviderError {
    return retryAfterSec === undefined
      ? { kind: "rate_limited", providerKey }
      : { kind: "rate_limited", providerKey, retryAfterSec };
  },
  institutionDown(
    providerKey: ProviderKey,
    institutionId?: string,
    details?: string,
  ): ProviderError {
    const base: ProviderError = { kind: "institution_down", providerKey };
    return {
      ...base,
      ...(institutionId !== undefined && { institutionId }),
      ...(details !== undefined && { details }),
    };
  },
  invalidCredentials(providerKey: ProviderKey, details?: string): ProviderError {
    return details === undefined
      ? { kind: "invalid_credentials", providerKey }
      : { kind: "invalid_credentials", providerKey, details };
  },
  consentRevoked(providerKey: ProviderKey, connectionId?: string): ProviderError {
    return connectionId === undefined
      ? { kind: "consent_revoked", providerKey }
      : { kind: "consent_revoked", providerKey, connectionId };
  },
  unknown(providerKey: ProviderKey, cause: unknown): ProviderError {
    return { kind: "unknown", providerKey, cause };
  },
};
