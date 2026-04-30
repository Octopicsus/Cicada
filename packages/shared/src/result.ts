/**
 * Result<T, E> — explicit success/error union for non-throwing call sites.
 * Used at every boundary where we want the caller to handle failure as a
 * value (banking adapters, classifier passes, anything that crosses an
 * adapter line). Reserve `throw` for genuinely exceptional cases —
 * programmer errors, invariant violations.
 *
 * Both `Result` (the type) and `Result` (the value) are exported under the
 * same name on purpose: TypeScript disambiguates by usage site.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const Result = {
  ok<T, E = never>(value: T): Result<T, E> {
    return { ok: true, value };
  },
  err<E, T = never>(error: E): Result<T, E> {
    return { ok: false, error };
  },
  isOk<T, E>(r: Result<T, E>): r is { ok: true; value: T } {
    return r.ok;
  },
  isErr<T, E>(r: Result<T, E>): r is { ok: false; error: E } {
    return !r.ok;
  },
  map<T, U, E>(r: Result<T, E>, f: (v: T) => U): Result<U, E> {
    return r.ok ? { ok: true, value: f(r.value) } : r;
  },
};
