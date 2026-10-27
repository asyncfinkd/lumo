// Total balance and balance adjustments (#6). Pure functions only.
// All amounts in minor units (ADR 0003).

import type { MoneyTransaction, TransactionKind } from './leftToSpend';

/**
 * All the money you have: every transaction ever, income + and expense −,
 * adjustments included, less what sits in savings jars ("Moves from your
 * balance", SavingsAdd). `null` until the user sets a starting balance, which
 * is stored as the first adjustment; the Home card then shows "Add your balance".
 */
export function totalBalance(
  transactions: readonly MoneyTransaction[],
  jarEntries: readonly { amountMinor: number }[] = [],
): number | null {
  if (!transactions.some((t) => t.source === 'adjustment')) return null;
  const free = transactions.reduce(
    (sum, t) => sum + (t.kind === 'income' ? t.amountMinor : -t.amountMinor),
    0,
  );
  return jarEntries.reduce((sum, e) => sum - e.amountMinor, free);
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
