import { isISOCurrency, type ISOCurrency } from "../../types/money";

/**
 * ISO 4217 numeric → alpha-3 conversion.
 *
 * Some providers (Monobank, a few Salt Edge endpoints) hand us numeric
 * codes; the rest of the system speaks alpha-3. This is the single
 * source of truth for that translation.
 *
 * Extending: add an entry below AND make sure the alpha-3 is in
 * `ISO_CURRENCIES` (`packages/domain/src/types/money.ts`). The runtime
 * guard at the bottom of `currencyFromNumeric` enforces that.
 */
const NUMERIC_TO_ALPHA: Readonly<Record<number, string>> = {
  203: "CZK",
  348: "HUF",
  484: "MXN",
  826: "GBP",
  840: "USD",
  978: "EUR",
  980: "UAH",
  985: "PLN",
  756: "CHF",
};

const ALPHA_TO_NUMERIC: Readonly<Record<string, number>> = Object.fromEntries(
  Object.entries(NUMERIC_TO_ALPHA).map(([numeric, alpha]) => [alpha, Number(numeric)]),
);

export function currencyFromNumeric(numeric: number): ISOCurrency {
  const alpha = NUMERIC_TO_ALPHA[numeric];
  if (!alpha) {
    throw new Error(`Unknown ISO 4217 numeric currency code: ${String(numeric)}`);
  }
  if (!isISOCurrency(alpha)) {
    throw new Error(
      `Currency ${alpha} (numeric ${String(numeric)}) is not in ISO_CURRENCIES — extend the union before mapping it.`,
    );
  }
  return alpha;
}

export function numericFromCurrency(currency: ISOCurrency): number {
  const numeric = ALPHA_TO_NUMERIC[currency];
  if (numeric === undefined) {
    throw new Error(`Currency ${currency} is in ISO_CURRENCIES but missing from numeric map.`);
  }
  return numeric;
}
