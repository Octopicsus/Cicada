import type { TransactionDirection } from "./banking";

/**
 * Category group — UX bucket grouping related categories ("Food",
 * "Transport"). `userId === null` denotes a built-in group visible to
 * everyone; user-owned groups override / extend them.
 */
export interface CategoryGroup {
  readonly id: string;
  readonly userId: string | null; // null = built-in

  readonly name: string;
  readonly emoji: string | null;
  readonly color: string | null;
  readonly displayOrder: number;

  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Category — concrete labelling target ("Groceries", "Salary"). Built-in
 * categories share the same shape as user-owned ones; the only
 * distinguishing fact is `userId === null`.
 */
export interface Category {
  readonly id: string;
  readonly userId: string | null; // null = built-in
  readonly groupId: string | null;

  readonly name: string;
  readonly emoji: string | null;
  readonly color: string | null;
  readonly displayOrder: number;

  /**
   * If set, the category applies only to transactions of this direction.
   * `null` means the category works in both directions (e.g. "Refunds").
   */
  readonly direction: TransactionDirection | null;

  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
