/**
 * Period — abstracts "the time window the user is looking at". Driven by
 * `user.preferences.periodMode`. Every aggregation widget (Dashboard,
 * Cash Flow, Categories, Activities) reads the same period via a single
 * `getCurrentPeriod(user, asOf)` function (lives in
 * `packages/domain/periods/`, arrives in a follow-up iteration). This
 * file fixes the contract that function will satisfy.
 *
 * Mirrors the DB `period_mode` enum verbatim.
 */
export type PeriodMode = "week" | "month" | "quarter" | "year" | "custom";

export interface DateRange {
  readonly from: Date;
  readonly to: Date;
}

export type Period =
  | {
      readonly mode: "week" | "month" | "quarter" | "year";
      readonly range: DateRange;
    }
  | { readonly mode: "custom"; readonly range: DateRange };
