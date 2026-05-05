import { Result } from "@cicada/shared";

import type { ISOCurrency } from "../types/money";

/**
 * P0 #3 (Tech Debt Backlog § P0 #3, 2026-05-05 helpers-only closure):
 *
 * Looks up FX rate from `exchange_rates` table с automatic weekend/holiday
 * rollback. ECB does not publish rates on Saturdays, Sundays, or TARGET2
 * holidays (New Year, Good Friday, Easter Monday, Labour Day, Christmas,
 * 26 December). Strict-equality lookup для weekend/holiday transactions
 * returns NULL → breaks Money invariants (transactions.fx_rate IS NOT NULL
 * when fx_source_currency != currency_code).
 *
 * Strategy: WHERE date <= asOf ORDER BY date DESC LIMIT 1, bounded by
 * maxLookbackDays (default 14) to surface serious cron fetcher outages
 * instead of silently returning month-old rates. Same-currency case
 * short-circuits без DB hit.
 *
 * Index `idx_exchange_rates_lookup ON exchange_rates(date desc,
 * base_currency, target_currency)` (migration 0006) is purpose-built
 * for this query plan — caller's adapter should produce a query the
 * planner satisfies as a single index scan.
 *
 * Returns Result<RateResult, FxLookupError>:
 *   - RateResult.isStale === true means actual rate date is older than
 *     transaction date (rollback applied) — UI can show "rate from
 *     {rateDate}" hint.
 *   - 'not-found' error: no rate within maxLookbackDays window —
 *     caller decides (manual entry, fail import, warn user).
 *   - 'db-error': underlying client threw.
 *
 * Persistence-side wiring deferred to first FX-needing consumer (Phase 2
 * transaction import / classifier / dashboard aggregation).
 */

const DEFAULT_MAX_LOOKBACK_DAYS = 14;
const MS_PER_DAY = 86_400_000;

export interface RateLookupArgs {
  readonly baseCurrency: ISOCurrency;
  readonly targetCurrency: ISOCurrency;
  readonly asOf: Date;
  readonly maxLookbackDays?: number;
}

export interface RateResult {
  readonly rate: number;
  readonly rateDate: Date;
  readonly isStale: boolean;
  readonly daysStale: number;
  readonly source: string;
}

export type FxLookupError =
  | { readonly kind: "not-found"; readonly asOf: Date; readonly maxLookbackDays: number }
  | { readonly kind: "db-error"; readonly cause: unknown };

export interface RateLookupClient {
  findLatestRateOnOrBefore(args: {
    baseCurrency: string;
    targetCurrency: string;
    onOrBefore: Date;
    earliestDate: Date;
  }): Promise<{ rate: string; date: Date; source: string } | null>;
}

/**
 * Normalize a Date to its UTC-midnight timestamp. Used so that day-diff
 * arithmetic ignores intra-day clock differences and DST shifts —
 * `exchange_rates.date` is a Postgres `date` (no time / no zone) and
 * the caller's adapter must return a Date pinned to UTC midnight.
 */
const toUTCMidnightTs = (d: Date): number =>
  Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

const dayDiff = (later: Date, earlier: Date): number =>
  Math.round((toUTCMidnightTs(later) - toUTCMidnightTs(earlier)) / MS_PER_DAY);

export async function findRateAsOf(
  client: RateLookupClient,
  args: RateLookupArgs,
): Promise<Result<RateResult, FxLookupError>> {
  const maxLookbackDays = args.maxLookbackDays ?? DEFAULT_MAX_LOOKBACK_DAYS;

  if (args.baseCurrency === args.targetCurrency) {
    return Result.ok({
      rate: 1,
      rateDate: args.asOf,
      isStale: false,
      daysStale: 0,
      source: "identity",
    });
  }

  const earliestDate = new Date(toUTCMidnightTs(args.asOf) - maxLookbackDays * MS_PER_DAY);

  let row: { rate: string; date: Date; source: string } | null;
  try {
    row = await client.findLatestRateOnOrBefore({
      baseCurrency: args.baseCurrency,
      targetCurrency: args.targetCurrency,
      onOrBefore: args.asOf,
      earliestDate,
    });
  } catch (cause) {
    return Result.err({ kind: "db-error", cause });
  }

  if (row === null) {
    return Result.err({ kind: "not-found", asOf: args.asOf, maxLookbackDays });
  }

  const daysStale = dayDiff(args.asOf, row.date);

  return Result.ok({
    rate: Number(row.rate),
    rateDate: row.date,
    isStale: daysStale > 0,
    daysStale,
    source: row.source,
  });
}
