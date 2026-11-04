// Total balance and balance adjustments (#6). Pure functions only.
// All amounts in minor units (ADR 0003).

import type { MoneyTransaction, TransactionKind } from './leftToSpend';

/**
 * What the total balance is made of: every transaction ever (income +, expense
 * −, adjustments included), whether any of them is an adjustment, and what
 * sits in savings jars. The app gets these from `SUM` queries; `balanceTotals`
 * adds them up from plain rows.
 */
export type BalanceTotals = {
  /** Income minus expenses over every transaction, adjustments included. */
  netMinor: number;
  /** The starting balance is the first adjustment: none yet, no balance. */
  hasAdjustment: boolean;
  /** Everything moved into jars, less what came back out. */
  jarMinor: number;
};

export function balanceTotals(
  transactions: readonly MoneyTransaction[],
  jarEntries: readonly { amountMinor: number }[] = [],
): BalanceTotals {
  return {
    netMinor: transactions.reduce(
      (sum, t) => sum + (t.kind === 'income' ? t.amountMinor : -t.amountMinor),
      0,
    ),
    hasAdjustment: transactions.some((t) => t.source === 'adjustment'),
    jarMinor: jarEntries.reduce((sum, e) => sum + e.amountMinor, 0),
  };
}

/**
 * All the money you have: every transaction ever, income + and expense −,
 * adjustments included, less what sits in savings jars ("Moves from your
 * balance", SavingsAdd). `null` until the user sets a starting balance, which
 * is stored as the first adjustment; the Home card then shows "Add your balance".
 */
export function balanceFromTotals(totals: BalanceTotals): number | null {
  return totals.hasAdjustment ? totals.netMinor - totals.jarMinor : null;
}

/** `balanceFromTotals` over plain rows. */
export function totalBalance(
  transactions: readonly MoneyTransaction[],
  jarEntries: readonly { amountMinor: number }[] = [],
): number | null {
  return balanceFromTotals(balanceTotals(transactions, jarEntries));
}

/**
 * What each account holds (#21): its transactions, less what it put into jars,
 * plus or minus the transfers in and out. Transfers move money between
 * accounts, so the accounts always add up to `totalBalance`. Accounts with no
 * rows yet hold 0. The rows can be sums already (one per account and kind, as
 * the SQL in features/accounts/repo.ts returns them): the result is the same.
 */
export function accountBalances(
  accountIds: readonly string[],
  transactions: readonly { kind: TransactionKind; amountMinor: number; accountId: string }[],
  jarEntries: readonly { amountMinor: number; accountId: string }[] = [],
  transfers: readonly { fromAccountId: string; toAccountId: string; amountMinor: number }[] = [],
): Map<string, number> {
  const balances = new Map(accountIds.map((id) => [id, 0]));
  const add = (id: string, minor: number) => balances.set(id, (balances.get(id) ?? 0) + minor);
  for (const t of transactions)
    add(t.accountId, t.kind === 'income' ? t.amountMinor : -t.amountMinor);
  for (const e of jarEntries) add(e.accountId, -e.amountMinor);
  for (const t of transfers) {
    add(t.fromAccountId, -t.amountMinor);
    add(t.toAccountId, t.amountMinor);
  }
  return balances;
}

/**
 * The adjustment that makes the balance equal what the user typed. Returns
 * `null` when nothing needs to change. A balance that isn't set yet counts as 0,
 * so the starting balance becomes the first adjustment.
 */
export function balanceAdjustment(
  currentMinor: number | null,
  typedMinor: number,
): { kind: TransactionKind; amountMinor: number } | null {
  const delta = typedMinor - (currentMinor ?? 0);
  if (delta === 0 && currentMinor !== null) return null;
  return { kind: delta >= 0 ? 'income' : 'expense', amountMinor: Math.abs(delta) };
}
