// Category budgets: what has gone out of a category this pay period. Pure
// functions only. All amounts in minor units (ADR 0003).

import { isInPeriod, type PayPeriod } from './dates';
import type { MoneyTransaction } from './leftToSpend';

/**
 * Everything spent in a category this period. Unlike Left to spend, bill
 * transactions count here: rent fills the Home budget (#2). Adjustments never do.
 */
export function categorySpent(
  transactions: readonly (MoneyTransaction & { categoryId: string | null })[],
  categoryId: string,
  period: PayPeriod,
): number {
  let spent = 0;
  for (const t of transactions) {
    if (
      t.kind === 'expense' &&
      t.source !== 'adjustment' &&
      t.categoryId === categoryId &&
      isInPeriod(t.date, period)
    ) {
      spent += t.amountMinor;
    }
  }
  return spent;
}
