import type { ISOCurrency } from "./money";

/**
 * Wallet — high-level money container. Either backed by a `BankAccount`
 * (when `manual === false`) or user-managed (cash, foreign accounts
 * without a banking integration).
 *
 * Soft-archived rather than deleted: financial history must survive even
 * after a user "deletes" the wallet, so `archivedAt` is the only
 * supported tombstone.
 */
export interface Wallet {
  readonly id: string;
  readonly ownerId: string;

  readonly name: string;
  readonly emoji: string | null;
  readonly color: string | null;

  readonly currency: ISOCurrency;
  readonly manual: boolean;

  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
