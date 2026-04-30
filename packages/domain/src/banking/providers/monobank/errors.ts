import { ProviderError } from "../../core/errors";

const KEY = "monobank" as const;

export interface MonoHttpFailure {
  readonly status: number;
  readonly body: unknown;
}

/**
 * Mono HTTP status → `ProviderError` mapper.
 *
 * The 401/403 → invalid vs expired distinction is contextual: on the
 * very first call (during onboarding) a 401 means "the token you just
 * pasted is wrong"; on a subsequent sync of a previously-working
 * connection it means "Mono revoked the token". Caller passes
 * `hadValidTokenBefore` to disambiguate.
 */
export function mapMonobankHttpError(
  failure: MonoHttpFailure,
  context: { hadValidTokenBefore?: boolean } = {},
): ProviderError {
  const { status } = failure;

  if (status === 401 || status === 403) {
    return context.hadValidTokenBefore
      ? ProviderError.authExpired(KEY, `Mono returned ${String(status)}`)
      : ProviderError.invalidCredentials(KEY, `Mono returned ${String(status)}`);
  }
  if (status === 429) {
    // Spec: 1 request per 60 seconds per token.
    return ProviderError.rateLimited(KEY, 60);
  }
  if (status >= 500 && status < 600) {
    return ProviderError.institutionDown(KEY, undefined, `Mono returned ${String(status)}`);
  }
  return ProviderError.unknown(KEY, failure);
}
