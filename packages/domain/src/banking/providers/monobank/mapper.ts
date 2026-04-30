import { currencyFromNumeric } from "../../shared/currency-codes";

import type { MonoClientInfoResponse } from "./client";
import type { ClientInfo, ISOCurrency } from "../../../types/banking";

/**
 * Mono `client-info` → our `ClientInfo`.
 *
 * Default-currency rule: prefer the user's UAH account if any (Mono's
 * canonical primary currency); otherwise the first account's currency
 * if we can map it; otherwise undefined.
 *
 * `raw` is preserved opaque so debugging tools can inspect the original
 * payload, but no domain code is allowed to read into it.
 */
export function mapClientInfo(raw: MonoClientInfoResponse): ClientInfo {
  let defaultCurrency: ISOCurrency | undefined;

  const uahAccount = raw.accounts.find((account) => account.currencyCode === 980);
  if (uahAccount) {
    defaultCurrency = currencyFromNumeric(uahAccount.currencyCode);
  } else if (raw.accounts.length > 0) {
    const first = raw.accounts[0];
    if (first) {
      try {
        defaultCurrency = currencyFromNumeric(first.currencyCode);
      } catch {
        // Provider returned a currency we don't yet support; leave
        // defaultCurrency undefined and let the caller pick one at
        // onboarding.
        defaultCurrency = undefined;
      }
    }
  }

  // Build the object without `defaultCurrency` when we couldn't infer
  // one — `exactOptionalPropertyTypes` rejects literal `undefined` on
  // optional properties.
  return {
    providerKey: "monobank",
    externalUserId: raw.clientId,
    displayName: raw.name,
    raw,
    ...(defaultCurrency !== undefined && { defaultCurrency }),
  };
}

// TODO Phase 2: mapStatementItem(MonoStatementItem) → BankTransaction.
//   The persisted BankTransaction shape (packages/domain/src/types/banking.ts)
//   has nullable fields for manual entries; for Mono-sourced rows the
//   adapter will fill all of:
//     externalId       = item.id
//     providerKey      = "monobank"
//     accountId        = our internal UUID for the bank_accounts row
//     amount           = { value: BigInt(item.amount), currency: <from currencyCode> }
//     bookedAt         = new Date(item.time * 1000)
//     valueAt          = same (Mono doesn't separate value-date)
//     merchantRaw      = item.description
//     merchantNormalized / categoryId — populated by classifier later
//     kind             = derived from MCC + sign convention
//     direction        = item.amount < 0 ? "debit" : "credit"
//     exchange         = present iff item.currencyCode != account.currencyCode
//     raw              = the full item payload
