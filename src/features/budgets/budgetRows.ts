// What the Budgets board shows for each budget, from plain rows (#51). Pure,
// so it's tested without React. All amounts in minor units (ADR 0003).

import type { ExpenseCategoryId } from '@/db/categories';
import { categorySpent } from '@/domain/budgets';
import { isInPeriod, type PayPeriod } from '@/domain/dates';
import type { MoneyTransaction } from '@/domain/leftToSpend';

/**
 * `allPaid`: every bill in the category has gone out this period.
 * `low`: 15% or less left. `some`: up to 30% left. `plenty`: more than that.
 */
export type BudgetState = 'allPaid' | 'low' | 'some' | 'plenty';

export type BudgetRow = {
  category: ExpenseCategoryId;
  limitMinor: number;
  spentMinor: number;
  /** Never negative. */
  leftMinor: number;
  /** Share of the limit still left, 0–100. */
  leftPercent: number;
  state: BudgetState;
};

// The order of the design's Budgets board.
const ORDER: ExpenseCategoryId[] = ['groceries', 'bills', 'coffee', 'transport', 'treats', 'home'];

type Tx = MoneyTransaction & { categoryId: string | null; recurringId: string | null };

export function budgetRows({
  budgets,
  transactions,
  bills,
  period,
}: {
  budgets: readonly { categoryId: string; limitMinor: number }[];
  transactions: readonly Tx[];
  /** Active bills only. */
  bills: readonly { id: string; categoryId: string }[];
  period: PayPeriod;
}): BudgetRow[] {
  const paid = new Set(
    transactions
      .filter((t) => t.source === 'bill' && t.recurringId && isInPeriod(t.date, period))
      .map((t) => t.recurringId),
  );

  return budgets
    .map((b) => {
      const category = b.categoryId as ExpenseCategoryId;
      const spentMinor = categorySpent(transactions, category, period);
      const leftMinor = Math.max(b.limitMinor - spentMinor, 0);
      const leftPercent = b.limitMinor > 0 ? (leftMinor / b.limitMinor) * 100 : 0;
      const categoryBills = bills.filter((bill) => bill.categoryId === category);
      const state: BudgetState =
        categoryBills.length > 0 && categoryBills.every((bill) => paid.has(bill.id))
          ? 'allPaid'
          : leftPercent <= 15
            ? 'low'
            : leftPercent <= 30
              ? 'some'
              : 'plenty';
      return { category, limitMinor: b.limitMinor, spentMinor, leftMinor, leftPercent, state };
    })
    .sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));
}

/** The header: "₾369.70 left across budgets", "5 of 6 on track". */
export function budgetsSummary(rows: readonly BudgetRow[]) {
  return {
    leftMinor: rows.reduce((sum, r) => sum + r.leftMinor, 0),
    onTrack: rows.filter((r) => r.state !== 'low').length,
    total: rows.length,
  };
}

/** The edit sheet's quick amounts, around the limit it opened with: 900 → 800, 900, 1,000, 1,100. */
export function quickAmounts(limitMinor: number, stepMinor: number): number[] {
  const amounts = [-2, 0, 2, 4].map((k) => Math.max(stepMinor, limitMinor + k * stepMinor));
  return [...new Set(amounts)];
}
