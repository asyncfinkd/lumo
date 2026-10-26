// The line under the amount in the add sheet: how this expense lands before
// it's saved. Pure, so the rules are tested without React.

import type { CategoryId } from '@/db/categories';
import { categorySpent } from '@/domain/budgets';
import type { PayPeriod } from '@/domain/dates';
import type { LeftToSpend, MoneyTransaction, TransactionKind } from '@/domain/leftToSpend';

export type AddMessage =
  | { type: 'income' }
  /** The category has a bill, so it's paid from what's already reserved. */
  | { type: 'covered'; category: CategoryId }
  | { type: 'stillLeft'; category: CategoryId; amountMinor: number }
  | { type: 'over'; category: CategoryId; amountMinor: number }
  /** No budget for the category: measured against Left to spend instead. */
  | { type: 'stillLeftToSpend'; amountMinor: number }
  | { type: 'overMonth'; amountMinor: number };

/** Good news reads green; covered or over reads calm, never red. */
export function messageTone(message: AddMessage): 'good' | 'calm' {
  return message.type === 'covered' || message.type === 'over' || message.type === 'overMonth'
    ? 'calm'
    : 'good';
}

export function addMessage({
  kind,
  category,
  amountMinor,
  budgets,
  bills,
  transactions,
  period,
  left,
}: {
  kind: TransactionKind;
  category: CategoryId;
  amountMinor: number;
  budgets: readonly { categoryId: string; limitMinor: number }[];
  /** Active bills only. */
  bills: readonly { categoryId: string }[];
  transactions: readonly (MoneyTransaction & { categoryId: string | null })[];
  period: PayPeriod;
  left: LeftToSpend;
}): AddMessage {
  if (kind === 'income') return { type: 'income' };
  if (bills.some((b) => b.categoryId === category)) return { type: 'covered', category };

  const budget = budgets.find((b) => b.categoryId === category);
  if (budget) {
    const after = budget.limitMinor - categorySpent(transactions, category, period) - amountMinor;
    return after >= 0
      ? { type: 'stillLeft', category, amountMinor: after }
      : { type: 'over', category, amountMinor: -after };
  }

  const after = left.availableMinor - left.spentMinor - amountMinor;
  return after >= 0
    ? { type: 'stillLeftToSpend', amountMinor: after }
    : { type: 'overMonth', amountMinor: -after };
}
