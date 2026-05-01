import type { ISO_CURRENCIES, ISOCurrency } from "../types/money";

/**
 * ISO 4217 minor-unit exponent per supported currency.
 *
 * Source: ISO 4217. Exotic currencies — добавить когда supported set
 * расширится (JPY = 0, BHD/KWD/JOD = 3, UYI = 0, etc.). Защитная логика
 * для unmapped currencies — throw, не silent default.
 *
 * Today's supported set (`ISO_CURRENCIES`) is uniformly 2-decimal, so
 * call sites that hardcode `* 100` / `/ 100` happen to be correct. The
 * point of this module is to make the day we add a non-2-decimal
 * currency a one-file change rather than a repo-wide hunt.
 */
export const MINOR_UNIT_EXPONENTS: Readonly<Record<ISOCurrency, number>> = {
  CZK: 2,
  EUR: 2,
  USD: 2,
  GBP: 2,
  PLN: 2,
  CHF: 2,
  UAH: 2,
};

/**
 * Lookup the minor-unit exponent for `currency`. Throws if the currency
 * is in `ISO_CURRENCIES` but missing from this table — that's a
 * programmer error (typically: extended `ISO_CURRENCIES` without
 * extending the exponent map).
 */
export function getMinorUnitsExponent(currency: ISOCurrency): number {
  const exponent = MINOR_UNIT_EXPONENTS[currency];
  if (exponent === undefined) {
    throw new Error(
      `[currency] No minor-unit exponent registered for "${currency}". ` +
        `Add it to MINOR_UNIT_EXPONENTS in packages/domain/src/currency/exponents.ts.`,
    );
  }
  return exponent;
}

/**
 * Convert a display value (e.g. 12.34 EUR) to minor units (1234n).
 *
 * Rounding: half-even (banker's rounding) — at exactly halfway, rounds
 * toward the nearest even integer. Standard for FED / IFRS finance
 * calculations because it removes the systematic upward bias of
 * half-up rounding when many values are aggregated.
 *
 * Returns `bigint` to avoid the 2^53 ceiling on `number` for very
 * large monetary aggregates (e.g. cumulative annual P&L in minor units).
 */
export function toMinorUnits(displayValue: number, currency: ISOCurrency): bigint {
  if (!Number.isFinite(displayValue)) {
    throw new Error(`[currency] toMinorUnits: non-finite input ${String(displayValue)}`);
  }
  const exponent = getMinorUnitsExponent(currency);
  const scaled = displayValue * Math.pow(10, exponent);
  return BigInt(roundHalfEven(scaled));
}

/**
 * Convert minor units back to a display value. Returns `number` —
 * acceptable for UI rendering, NOT for further arithmetic. Heavy math
 * stays in `bigint` minor units.
 *
 * Precision note: at very large minor counts (> 2^53) the return value
 * loses precision. Cicada's `Money.value` is `bigint`; any code path
 * that round-trips through `number` should be considered display-only.
 */
export function fromMinorUnits(minorValue: bigint, currency: ISOCurrency): number {
  const exponent = getMinorUnitsExponent(currency);
  if (exponent === 0) {
    return Number(minorValue);
  }
  return Number(minorValue) / Math.pow(10, exponent);
}

/**
 * Internal: round-half-to-even of an arbitrary finite number.
 *
 * Algorithm:
 *   - floor(value) gives the lower bound (works correctly for negatives;
 *     Math.floor goes toward -∞).
 *   - At exactly halfway (fractional == 0.5), round to whichever bound is
 *     even.
 *   - Otherwise, standard nearest rounding.
 *
 * Floating-point note: a value like `12.245 * 100` doesn't yield
 * exactly `1224.5` in IEEE 754, so the fractional comparison only
 * triggers on inputs whose ×10^exponent is exactly representable as a
 * binary float. For values that drift, we fall back to nearest-rounding
 * which matches Math.round semantics.
 */
function roundHalfEven(value: number): number {
  const floor = Math.floor(value);
  const fractional = value - floor;
  if (fractional === 0.5) {
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return fractional < 0.5 ? floor : floor + 1;
}

/**
 * Compile-time guard: verifies that every currency in ISO_CURRENCIES is
 * also in MINOR_UNIT_EXPONENTS. Without this, adding to the literal
 * union without adding to the map would silently break getMinorUnitsExponent
 * at runtime only.
 */
const _exhaustivenessCheck: Record<(typeof ISO_CURRENCIES)[number], number> = MINOR_UNIT_EXPONENTS;
void _exhaustivenessCheck;
