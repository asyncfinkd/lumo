// Which account a new expense or income starts on (#21): the one used last
// for that kind, per the board note "Default account = last used, per type".
// Pure, so it's tested without React.

import type { TransactionKind, TransactionSource } from '@/domain/leftToSpend';

/**
 * The account of the last expense (or income) you added yourself, if that
 * account is still there; otherwise the first account.
 */
export function lastUsedAccount(
  transactions: readonly {
    kind: TransactionKind;
    source: TransactionSource;
    accountId: string;
    createdAt: string;
  }[],
  kind: TransactionKind,
  accountIds: readonly string[],
): string | undefined {
  let last: { accountId: string; createdAt: string } | undefined;
  for (const t of transactions) {
    if (t.kind !== kind || t.source !== 'manual' || !accountIds.includes(t.accountId)) continue;
    if (!last || t.createdAt > last.createdAt) last = t;
  }
  return last?.accountId ?? accountIds[0];
}
