import type { ProviderCapabilities } from "../../core/provider";

/**
 * Monobank — direct, single-country (UA), token-paste auth.
 *
 * Rate limit: Monobank's public API enforces 1 request per 60 seconds
 * per `X-Token`. The orchestration layer reads these numbers; do not
 * re-encode them in callers.
 *
 * History: Mono's `/personal/statement/{account}/{from}/{to}` accepts
 * up to ~31 days per call but exposes ~36 months of history.
 */
export const monobankCapabilities: ProviderCapabilities = {
  syncFrequencyPerDay: 24, // upper bound — limited further by rateLimit
  historyMonths: 36,
  supportsWebhooks: false, // Mono does support webhooks; we don't use them at MVP
  supportedCountries: ["UA"],
  authModel: "token",
  rateLimit: {
    requestsPer: 1,
    windowSec: 60,
    scope: "per-token",
  },
};
