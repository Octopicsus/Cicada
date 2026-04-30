/**
 * Money — plain readonly object. Not a class, not a branded primitive.
 *
 * `value` carries signed minor units (cents, grosze, копейки) so the
 * sign matches transaction direction:
 *   debit  → negative
 *   credit → positive
 * The DB stores the same convention; the redundant `direction` enum on
 * transactions exists for query convenience, not as the source of truth.
 *
 * Arithmetic on Money MUST go through a decimal-precision layer at the
 * edge (decimal.js, planned for `packages/domain/currency/`). This file
 * carries no maths — `packages/domain` stays dependency-free per ADR 0004.
 */
export interface Money {
  readonly value: bigint;
  readonly currency: ISOCurrency;
}

/**
 * Authoritative runtime list of currencies supported at MVP. Used both as
 * the source of `ISOCurrency` and for boundary validation.
 *
 * Open: this list grows per market. When we onboard a new region (HUF
 * for Hungary, RON for Romania, etc.) extend this array in the same
 * commit as the regional rollout.
 */
export const ISO_CURRENCIES = [
  "CZK",
  "EUR",
  "USD",
  "GBP",
  "PLN",
  "CHF",
  "UAH", // 2026-04-30: Monobank — primary currency for UA users
] as const;

export type ISOCurrency = (typeof ISO_CURRENCIES)[number];

/**
 * Type guard for boundary input — provider responses, form values, URL
 * parameters. Pure: no I/O, no clock reads.
 */
export function isISOCurrency(code: string): code is ISOCurrency {
  return (ISO_CURRENCIES as readonly string[]).includes(code);
}

/**
 * ISO 3166-1 alpha-2 country codes supported at MVP. Used by banking
 * providers' `supportedCountries` capability and by region-aware
 * business logic (categorization patterns, institution lookup).
 *
 * Open: extend per market. UA + the EU subset where our target users
 * actually bank — extend in the same commit as the regional rollout.
 */
export const ISO_COUNTRIES = ["UA", "CZ", "DE", "PL", "GB", "FR", "CH"] as const;

export type ISOCountry = (typeof ISO_COUNTRIES)[number];

export function isISOCountry(code: string): code is ISOCountry {
  return (ISO_COUNTRIES as readonly string[]).includes(code);
}
