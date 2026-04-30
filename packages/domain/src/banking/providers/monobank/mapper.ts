import { currencyFromNumeric, UnsupportedCurrencyError } from "../../shared/currency-codes";

import type { MonoAccount, MonoClientInfoResponse } from "./client";
import type {
  AccountType,
  ClientInfo,
  ISOCurrency,
  MappedAccountFromProvider,
} from "../../../types/banking";
import type { Money } from "../../../types/money";

/**
 * Mono `client-info` → our `ClientInfo`.
 *
 * Default-currency rule: prefer the user's UAH account if any (Mono's
 * canonical primary currency); otherwise the first account's currency
 * if we can map it; otherwise undefined.
 *
 * Accounts: every Mono account is mapped to a `MappedAccountFromProvider`.
 * Accounts whose currency isn't in our `ISO_CURRENCIES` are skipped with
 * a warning — we'd rather drop a JPY card than fail the whole connection.
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

  const accounts: MappedAccountFromProvider[] = [];
  for (const account of raw.accounts) {
    try {
      accounts.push(mapMonoAccount(account));
    } catch (error) {
      if (error instanceof UnsupportedCurrencyError) {
        console.warn(
          `[monobank] skipped account ${account.id}: unsupported currency ${String(error.numeric)}`,
        );
        continue;
      }
      throw error;
    }
  }

  // Build the object without `defaultCurrency` when we couldn't infer
  // one — `exactOptionalPropertyTypes` rejects literal `undefined` on
  // optional properties.
  return {
    providerKey: "monobank",
    externalUserId: raw.clientId,
    displayName: raw.name,
    accounts,
    raw,
    ...(defaultCurrency !== undefined && { defaultCurrency }),
  };
}

/**
 * Map one Mono account row. The persistence layer fills `walletId`,
 * `connectionId`, `id`, and the technical timestamps — all stripped from
 * `MappedAccountFromProvider` so the type system blocks an accidental
 * insert of a half-built record.
 *
 * Balance: Mono's `balance` is already in minor units (signed). Mono
 * also carries `creditLimit` (overdraft); we store ONLY the actual
 * balance — the credit headroom is a UI concern, not a stored money
 * amount.
 */
export function mapMonoAccount(raw: MonoAccount): MappedAccountFromProvider {
  const currency = currencyFromNumeric(raw.currencyCode); // throws UnsupportedCurrencyError

  const namePart = raw.maskedPan?.[0] ?? "";
  const accountName = namePart ? `${raw.type} ${namePart}` : raw.type;

  // Card-shaped Mono types. `madeInUkraine` and `eAid` are program-
  // specific cards (Зроблено в Україні / е-Допомога) but functionally
  // identical to the regular card lineup. Anything outside this list
  // (and non-fop) falls through to "other" — covers genuinely new
  // future Mono types without crashing.
  const accountType: AccountType =
    raw.type === "fop"
      ? "current"
      : ["black", "white", "platinum", "iron", "yellow", "madeInUkraine", "eAid"].includes(raw.type)
        ? "card"
        : "other";

  const balanceAmount: Money = {
    value: BigInt(raw.balance),
    currency,
  };

  return {
    externalId: raw.id,
    iban: raw.iban ?? null,
    accountName,
    accountType,
    currency,
    balance: balanceAmount,
    balanceAt: new Date(),
    archivedAt: null,
  };
}
