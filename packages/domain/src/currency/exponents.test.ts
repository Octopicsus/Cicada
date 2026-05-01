import { describe, expect, it } from "vitest";

import { ISO_CURRENCIES, type ISOCurrency } from "../types/money";

import {
  fromMinorUnits,
  getMinorUnitsExponent,
  MINOR_UNIT_EXPONENTS,
  toMinorUnits,
} from "./exponents";

describe("MINOR_UNIT_EXPONENTS", () => {
  it("registers an exponent for every currency in ISO_CURRENCIES", () => {
    for (const code of ISO_CURRENCIES) {
      expect(MINOR_UNIT_EXPONENTS[code]).toBeDefined();
    }
  });

  it("returns 2 for every currency in the current MVP set", () => {
    for (const code of ISO_CURRENCIES) {
      expect(getMinorUnitsExponent(code)).toBe(2);
    }
  });
});

describe("toMinorUnits / fromMinorUnits — round-trip", () => {
  const cases: { display: number; minor: bigint }[] = [
    { display: 12.34, minor: 1234n },
    { display: 0, minor: 0n },
    { display: -0.01, minor: -1n },
    { display: 1234567.89, minor: 123456789n },
  ];

  for (const { display, minor } of cases) {
    it(`round-trips ${String(display)} EUR`, () => {
      const toMinor = toMinorUnits(display, "EUR");
      expect(toMinor).toBe(minor);
      expect(fromMinorUnits(toMinor, "EUR")).toBe(display);
    });
  }
});

describe("toMinorUnits — rounding", () => {
  it("rounds half-even at exact halfway: 0.005 EUR → 0n (1 minor halved → even)", () => {
    // 0.005 * 100 = 0.5 exact; nearest even → 0
    expect(toMinorUnits(0.005, "EUR")).toBe(0n);
  });

  it("rounds half-even at exact halfway: 0.015 EUR → 2n (1.5 minor → 2 even)", () => {
    // 0.015 * 100 = 1.5 exact; nearest even → 2
    expect(toMinorUnits(0.015, "EUR")).toBe(2n);
  });

  it("rounds half-even on larger halfway: 12.125 EUR → 1212n (1212.5 → 1212 even)", () => {
    // 12.125 is exactly representable; 12.125 * 100 = 1212.5 exact;
    // half-even → 1212 (1212 is even, 1213 is odd).
    expect(toMinorUnits(12.125, "EUR")).toBe(1212n);
  });

  it("rounds half-even on larger halfway: 12.135 EUR → 1214n (1213.5 → 1214 even)", () => {
    // 12.135 is exactly representable; * 100 = 1213.5 exact;
    // half-even → 1214 (1214 is even, 1213 is odd).
    expect(toMinorUnits(12.135, "EUR")).toBe(1214n);
  });

  it("rounds nearest when not halfway: 12.126 EUR → 1213n", () => {
    expect(toMinorUnits(12.126, "EUR")).toBe(1213n);
  });

  it("rounds nearest when not halfway: 12.124 EUR → 1212n", () => {
    expect(toMinorUnits(12.124, "EUR")).toBe(1212n);
  });

  it("handles negative half-even symmetry: -0.005 EUR → 0n", () => {
    // -0.005 * 100 = -0.5; floor(-0.5) = -1, fractional = 0.5, -1 odd → 0
    expect(toMinorUnits(-0.005, "EUR")).toBe(0n);
  });
});

describe("getMinorUnitsExponent — failure modes", () => {
  it("throws with a clear message on a currency missing from the map", () => {
    // Force the failure path: the type-safety guard at compile time normally
    // prevents this, but we simulate a runtime cast (boundary input that
    // bypassed validation).
    const fake = "JPY" as unknown as ISOCurrency;
    expect(() => getMinorUnitsExponent(fake)).toThrow(/No minor-unit exponent registered/i);
  });

  it("throws on non-finite input to toMinorUnits", () => {
    expect(() => toMinorUnits(Number.NaN, "EUR")).toThrow(/non-finite/);
    expect(() => toMinorUnits(Number.POSITIVE_INFINITY, "EUR")).toThrow(/non-finite/);
  });
});
