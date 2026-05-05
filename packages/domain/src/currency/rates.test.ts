import { describe, expect, it, vi } from "vitest";

import { Result } from "@cicada/shared";

import { findRateAsOf, type RateLookupClient } from "./rates";

/**
 * Pure unit tests for the FX rate lookup helper. Mocks the
 * `RateLookupClient` boundary — no DB. Smoke integration test against
 * local Supabase deferred until first FX-needing consumer ships its own
 * adapter (avoids leaking @supabase/supabase-js into packages/domain
 * devDependencies, which would expand the dependency-light footprint
 * mandated by ADR-0004).
 */

const utc = (year: number, monthIndex: number, day: number): Date =>
  new Date(Date.UTC(year, monthIndex, day));

const makeClient = (
  impl: RateLookupClient["findLatestRateOnOrBefore"],
): RateLookupClient & {
  findLatestRateOnOrBefore: ReturnType<typeof vi.fn>;
} => ({
  findLatestRateOnOrBefore: vi.fn(impl),
});

describe("findRateAsOf", () => {
  it("short-circuits same-currency without calling the client (identity result)", async () => {
    const client = makeClient(() => Promise.resolve(null));

    const result = await findRateAsOf(client, {
      baseCurrency: "EUR",
      targetCurrency: "EUR",
      asOf: utc(2026, 4, 5),
    });

    expect(client.findLatestRateOnOrBefore).not.toHaveBeenCalled();
    expect(Result.isOk(result)).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      rate: 1,
      rateDate: utc(2026, 4, 5),
      isStale: false,
      daysStale: 0,
      source: "identity",
    });
  });

  it("returns fresh rate with daysStale=0 / isStale=false when client returns same-day match", async () => {
    const asOf = utc(2026, 4, 5); // Tue 5 May 2026 — weekday, ECB publishes
    const client = makeClient(() =>
      Promise.resolve({
        rate: "1.0823456789",
        date: asOf,
        source: "ecb",
      }),
    );

    const result = await findRateAsOf(client, {
      baseCurrency: "EUR",
      targetCurrency: "USD",
      asOf,
    });

    expect(Result.isOk(result)).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      rate: 1.0823456789,
      rateDate: asOf,
      isStale: false,
      daysStale: 0,
      source: "ecb",
    });
  });

  it("rolls back over a weekend — Saturday asOf returns Friday rate (daysStale=1, isStale=true)", async () => {
    const friday = utc(2026, 4, 1); // Fri 1 May 2026
    const saturday = utc(2026, 4, 2); // Sat 2 May 2026 — ECB не публикует
    const client = makeClient(() =>
      Promise.resolve({
        rate: "1.0900000000",
        date: friday,
        source: "ecb",
      }),
    );

    const result = await findRateAsOf(client, {
      baseCurrency: "EUR",
      targetCurrency: "USD",
      asOf: saturday,
    });

    expect(Result.isOk(result)).toBe(true);
    if (!result.ok) return;
    expect(result.value.rate).toBe(1.09);
    expect(result.value.rateDate).toEqual(friday);
    expect(result.value.daysStale).toBe(1);
    expect(result.value.isStale).toBe(true);
    expect(result.value.source).toBe("ecb");
  });

  it("rolls back over a holiday cluster — Easter Monday asOf returns previous Thursday rate (daysStale=4)", async () => {
    // Easter Monday 2026 = Mon 6 April 2026. Prior trading day: Thu 2 April 2026.
    // (Good Friday 3 Apr, Sat 4 Apr, Sun 5 Apr, Easter Mon 6 Apr — all closed.)
    const easterMonday = utc(2026, 3, 6);
    const priorThursday = utc(2026, 3, 2);
    const client = makeClient(() =>
      Promise.resolve({
        rate: "1.0750000000",
        date: priorThursday,
        source: "ecb",
      }),
    );

    const result = await findRateAsOf(client, {
      baseCurrency: "EUR",
      targetCurrency: "USD",
      asOf: easterMonday,
    });

    expect(Result.isOk(result)).toBe(true);
    if (!result.ok) return;
    expect(result.value.daysStale).toBe(4);
    expect(result.value.isStale).toBe(true);
    expect(result.value.rateDate).toEqual(priorThursday);
  });

  it("returns 'not-found' error when client returns null (no rate within lookback window)", async () => {
    const client = makeClient(() => Promise.resolve(null));
    const asOf = utc(2026, 4, 5);

    const result = await findRateAsOf(client, {
      baseCurrency: "EUR",
      targetCurrency: "USD",
      asOf,
    });

    expect(Result.isErr(result)).toBe(true);
    if (result.ok) return;
    expect(result.error).toEqual({
      kind: "not-found",
      asOf,
      maxLookbackDays: 14,
    });
  });

  it("propagates a custom maxLookbackDays into earliestDate passed to the client", async () => {
    const asOf = utc(2026, 4, 5);
    const client = makeClient(() => Promise.resolve(null));

    await findRateAsOf(client, {
      baseCurrency: "EUR",
      targetCurrency: "USD",
      asOf,
      maxLookbackDays: 7,
    });

    expect(client.findLatestRateOnOrBefore).toHaveBeenCalledTimes(1);
    const callArg = client.findLatestRateOnOrBefore.mock.calls[0]![0];
    expect(callArg.onOrBefore).toEqual(asOf);
    expect(callArg.earliestDate).toEqual(utc(2026, 3, 28)); // 5 May - 7 days = 28 Apr
    expect(callArg.baseCurrency).toBe("EUR");
    expect(callArg.targetCurrency).toBe("USD");
  });

  it("uses default maxLookbackDays=14 when not provided", async () => {
    const asOf = utc(2026, 4, 15);
    const client = makeClient(() => Promise.resolve(null));

    const result = await findRateAsOf(client, {
      baseCurrency: "EUR",
      targetCurrency: "USD",
      asOf,
    });

    const callArg = client.findLatestRateOnOrBefore.mock.calls[0]![0];
    expect(callArg.earliestDate).toEqual(utc(2026, 4, 1)); // 15 May - 14 days = 1 May
    expect(Result.isErr(result)).toBe(true);
    if (result.ok) return;
    expect(result.error.kind).toBe("not-found");
    if (result.error.kind !== "not-found") return;
    expect(result.error.maxLookbackDays).toBe(14);
  });

  it("wraps thrown client errors in a 'db-error' Result", async () => {
    const cause = new Error("connection refused");
    const client = makeClient(() => Promise.reject(cause));

    const result = await findRateAsOf(client, {
      baseCurrency: "EUR",
      targetCurrency: "USD",
      asOf: utc(2026, 4, 5),
    });

    expect(Result.isErr(result)).toBe(true);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "db-error", cause });
  });

  it("parses numeric(20,10) string rates into JS number with full precision", async () => {
    // Numeric column round-trips as string out of pg drivers — confirm our
    // Number() coercion preserves precision for typical FX scale (10 d.p.).
    const asOf = utc(2026, 4, 5);
    const client = makeClient(() =>
      Promise.resolve({
        rate: "0.0419283746",
        date: asOf,
        source: "ecb",
      }),
    );

    const result = await findRateAsOf(client, {
      baseCurrency: "CZK",
      targetCurrency: "EUR",
      asOf,
    });

    expect(Result.isOk(result)).toBe(true);
    if (!result.ok) return;
    expect(result.value.rate).toBe(0.0419283746);
  });
});
