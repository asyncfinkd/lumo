// Which account a new expense or income starts on (#21): the one used last
// for that kind, per the board note "Default account = last used, per type".
// Pure, so it's tested without React.

import type { TransactionKind, TransactionSource } from '@/domain/leftToSpend';

/**
 * The account of the expense (or income) you added or changed last, if that
 * account is still there; otherwise the first account. `updatedAt`, so moving
 * one to another account counts as using it.
 */
export function lastUsedAccount(
  transactions: readonly {
    kind: TransactionKind;
    source: TransactionSource;
    accountId: string;
    updatedAt: string;
  }[],
  kind: TransactionKind,
  accountIds: readonly string[],
): string | undefined {
  const ids = new Set(accountIds);
  let last: { accountId: string; updatedAt: string } | undefined;
  for (const t of transactions) {
    if (t.kind !== kind || t.source !== 'manual' || !ids.has(t.accountId)) continue;
    if (!last || t.updatedAt > last.updatedAt) last = t;
  }
  return last?.accountId ?? accountIds[0];
}

/**
 * Which account money for a jar comes from (or goes back to): the one used
 * last for this jar in the same direction, if it's still there. Taking out for
 * the first time goes back to where the money last came from, like closing the
 * jar does. Otherwise the first account (SavingsAdd-Accounts).
 */
export function lastJarAccount(
  entries: readonly {
    jarId: string;
    amountMinor: number;
    accountId: string;
    createdAt: string;
  }[],
  jarId: string,
  out: boolean,
  accountIds: readonly string[],
): string | undefined {
  let same: { accountId: string; createdAt: string } | undefined;
  let any: { accountId: string; createdAt: string } | undefined;
  for (const e of entries) {
    if (e.jarId !== jarId || !accountIds.includes(e.accountId)) continue;
    if (!any || e.createdAt > any.createdAt) any = e;
    if (e.amountMinor < 0 === out && (!same || e.createdAt > same.createdAt)) same = e;
  }
  return (same ?? (out ? any : undefined))?.accountId ?? accountIds[0];
}
