import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type BankTransaction,
  type Category,
  type CategoryGroup,
  ISO_CURRENCIES,
  type ISOCurrency,
  type Money,
  type Period,
  type SyncState,
  type Wallet,
  isISOCurrency,
} from "../../";

describe("domain types — smoke", () => {
  it("Money is a readonly { value: bigint, currency: ISOCurrency }", () => {
    expectTypeOf<Money>().toEqualTypeOf<{
      readonly value: bigint;
      readonly currency: ISOCurrency;
    }>();
  });

  it("ISO_CURRENCIES contains base MVP currencies", () => {
    expect(ISO_CURRENCIES).toContain("CZK");
    expect(ISO_CURRENCIES).toContain("EUR");
    expect(ISO_CURRENCIES).toContain("USD");
    expect(ISO_CURRENCIES).toContain("GBP");
    expect(ISO_CURRENCIES).toContain("PLN");
    expect(ISO_CURRENCIES).toContain("CHF");
  });

  it("isISOCurrency narrows the input type", () => {
    // Mimics a boundary input — typed as `string`, not narrowed yet.
    const fromInput = (raw: string) => {
      if (isISOCurrency(raw)) {
        expectTypeOf(raw).toEqualTypeOf<ISOCurrency>();
        return raw;
      }
      return null;
    };

    expect(fromInput("CZK")).toBe("CZK");
    expect(fromInput("XYZ")).toBeNull();
  });

  it("compiles — instantiates one of each main type", () => {
    const now = new Date();

    const money: Money = { value: 0n, currency: "EUR" };
    expect(money.currency).toBe("EUR");

    const wallet: Wallet = {
      id: "w-1",
      ownerId: "u-1",
      name: "Cash",
      emoji: "💵",
      color: null,
      currency: "CZK",
      manual: true,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    expect(wallet.manual).toBe(true);

    const group: CategoryGroup = {
      id: "g-1",
      userId: null,
      name: "Food",
      emoji: "🍔",
      color: null,
      displayOrder: 0,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const category: Category = {
      id: "c-1",
      userId: null,
      groupId: group.id,
      name: "Groceries",
      emoji: null,
      color: null,
      displayOrder: 0,
      direction: "debit",
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    expect(category.name).toBe("Groceries");

    const tx: BankTransaction = {
      id: "t-1",
      externalId: "ext-1",
      providerKey: "gocardless",
      accountId: "a-1",
      walletId: wallet.id,
      amount: { value: -12500n, currency: "CZK" },
      bookedAt: now,
      valueAt: now,
      merchantRaw: "Lidl Dekuje Za Nakup",
      merchantNormalized: "Lidl",
      description: null,
      notes: null,
      categoryId: category.id,
      classificationSource: "global_pattern",
      classificationConfidence: 0.92,
      classifiedAt: now,
      kind: "card_payment",
      direction: "debit",
      exchange: null,
      awaitingPaymentId: null,
      hidden: false,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      raw: { provider: "opaque", note: "never read in domain" },
    };
    expect(tx.kind).toBe("card_payment");

    const period: Period = { mode: "month", range: { from: now, to: now } };
    expect(period.mode).toBe("month");

    const sync: SyncState = {
      kind: "synced",
      completedAt: now,
      transactionCount: 42,
    };
    expect(sync.kind).toBe("synced");
  });
});
