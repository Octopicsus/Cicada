import { describe, expect, it } from "vitest";

import { computeInternalDedupeKey, type DedupeKeyInputs } from "./dedupe";

/**
 * Round-trip + invariant tests for the dedup hash. Pure function over
 * primitives — no DB or async setup required.
 */

const baseBank = (overrides: Partial<DedupeKeyInputs> = {}): DedupeKeyInputs => ({
  walletId: "wallet-1",
  amount: 1000n,
  currencyCode: "EUR",
  bookedAt: new Date("2026-05-04T12:00:00.000Z"),
  merchantNormalized: "Lidl",
  accountId: "acct-1",
  provider: "monobank",
  externalId: "ext-1",
  ...overrides,
});

describe("computeInternalDedupeKey", () => {
  it("returns null when accountId / provider / externalId are all null (manual entry)", () => {
    const result = computeInternalDedupeKey(
      baseBank({ accountId: null, provider: null, externalId: null }),
    );
    expect(result).toBeNull();
  });

  it("returns null when all three manual markers are undefined", () => {
    const result = computeInternalDedupeKey(
      baseBank({ accountId: undefined, provider: undefined, externalId: undefined }),
    );
    expect(result).toBeNull();
  });

  it("returns null with mixed null and undefined manual markers", () => {
    const result = computeInternalDedupeKey(
      baseBank({ accountId: null, provider: undefined, externalId: null }),
    );
    expect(result).toBeNull();
  });

  it("returns a 64-char lowercase hex digest for a bank-imported transaction", () => {
    const result = computeInternalDedupeKey(baseBank());
    expect(result).not.toBeNull();
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic — same inputs produce the same hash", () => {
    const a = computeInternalDedupeKey(baseBank());
    const b = computeInternalDedupeKey(baseBank());
    expect(a).toBe(b);
  });

  it("includes walletId — different walletId yields different hash (cross-household isolation)", () => {
    const a = computeInternalDedupeKey(baseBank({ walletId: "wallet-1" }));
    const b = computeInternalDedupeKey(baseBank({ walletId: "wallet-2" }));
    expect(a).not.toBe(b);
  });

  it("distinguishes a true null merchant from a literal `<null>` merchant string (NUL-byte sentinel)", () => {
    const nullMerchant = computeInternalDedupeKey(baseBank({ merchantNormalized: null }));
    const literalNull = computeInternalDedupeKey(baseBank({ merchantNormalized: "<null>" }));
    expect(nullMerchant).not.toBe(literalNull);
    expect(nullMerchant).toMatch(/^[a-f0-9]{64}$/);
    expect(literalNull).toMatch(/^[a-f0-9]{64}$/);
  });

  it("normalizes Date and ISO-8601 string inputs to identical hashes", () => {
    const iso = "2026-05-04T12:00:00.000Z";
    const fromDate = computeInternalDedupeKey(baseBank({ bookedAt: new Date(iso) }));
    const fromString = computeInternalDedupeKey(baseBank({ bookedAt: iso }));
    expect(fromDate).toBe(fromString);
  });

  it("treats partial null inputs (accountId set, others null) as non-manual", () => {
    const result = computeInternalDedupeKey(
      baseBank({ accountId: "acct-1", provider: null, externalId: null }),
    );
    expect(result).not.toBeNull();
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });
});
