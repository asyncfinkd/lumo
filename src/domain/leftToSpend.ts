// "Left to spend" (#2) and the transactions that bills and salary create (#4).
// Pure functions only: no React, no database. All amounts in minor units (ADR 0003).

import {
  type CalendarDate,
  diffDays,
  isInPeriod,
  monthlyDatesInPeriod,
  type PayPeriod,
} from './dates';
import { percent } from './money';

export type TransactionKind = 'income' | 'expense';

/**
 * Where a transaction came from. Only `manual` ones count as spending or extra
 * income: bills and salary are already in the plan, adjustments only fix the
 * balance (#6).
 */
export type TransactionSource = 'manual' | 'bill' | 'recurring_income' | 'adjustment';

export type MoneyTransaction = {
  kind: TransactionKind;
  amountMinor: number;
  date: CalendarDate;
  source: TransactionSource;
};

export type LeftToSpend = {
  /** Planned income + extra income − bills: the "of ₾X" on Home. */
  availableMinor: number;
  /** Manual expenses this period. */
  spentMinor: number;
  /** Never negative: the hero number shows ₾0 when overspent. */
  leftMinor: number;
  /** How far past `available` spending went; 0 when not overspent. */
  overMinor: number;
  /** Manual income this period (gifts, freelance, refunds). */
  extraIncomeMinor: number;
  /** Rounded to the nearest whole percent; can pass 100 when overspent. */
  spentPercent: number;
};

export function leftToSpend({
  plannedIncomeMinor,
  billsMinor,
  transactions,
  period,
}: {
  /** Sum of recurring incomes, counted in full on day 1 of the period. */
  plannedIncomeMinor: number;
  /** Sum of active recurring bills, reserved in full on day 1. */
  billsMinor: number;
  transactions: readonly MoneyTransaction[];
  period: PayPeriod;
}): LeftToSpend {
  let extraIncomeMinor = 0;
  let spentMinor = 0;
  for (const t of transactions) {
    if (t.source !== 'manual' || !isInPeriod(t.date, period)) continue;
    if (t.kind === 'income') extraIncomeMinor += t.amountMinor;
    else spentMinor += t.amountMinor;
  }

  const availableMinor = plannedIncomeMinor + extraIncomeMinor - billsMinor;
  return {
    availableMinor,
    spentMinor,
    leftMinor: Math.max(availableMinor - spentMinor, 0),
    overMinor: Math.max(spentMinor - availableMinor, 0),
    extraIncomeMinor,
    spentPercent:
      availableMinor > 0 ? percent(spentMinor, availableMinor) : spentMinor > 0 ? 100 : 0,
  };
}

export type Recurring = {
  id: string;
  amountMinor: number;
  /** Day of the month it lands on, 1–31; clamped to the month's last day. */
  day: number;
};

export type DueTransaction = {
  recurringId: string;
  kind: TransactionKind;
  source: 'bill' | 'recurring_income';
  amountMinor: number;
  date: CalendarDate;
};

/**
 * Bill and salary transactions that should exist by `today` in this period
 * (#4). Days before `trackingSince` (the onboarding day) are treated as paid or
 * received outside the app, so nothing is created for them. Anything already
 * in `existing` (same recurring id and date) is skipped, so calling this again
 * never duplicates.
 */
export function dueTransactions({
  bills,
  incomes,
  period,
  today,
  trackingSince,
  existing,
}: {
  bills: readonly Recurring[];
  incomes: readonly Recurring[];
  period: PayPeriod;
  today: CalendarDate;
  trackingSince: CalendarDate;
  existing: readonly { recurringId: string; date: CalendarDate }[];
}): DueTransaction[] {
  const done = new Set(existing.map((e) => `${e.recurringId}@${e.date}`));
  const due: DueTransaction[] = [];

  const add = (item: Recurring, kind: TransactionKind, source: DueTransaction['source']) => {
    for (const date of monthlyDatesInPeriod(item.day, period)) {
      const reached = diffDays(date, today) >= 0;
      const tracked = diffDays(trackingSince, date) >= 0;
      if (reached && tracked && !done.has(`${item.id}@${date}`)) {
        due.push({ recurringId: item.id, kind, source, amountMinor: item.amountMinor, date });
      }
    }
  };

  for (const bill of bills) add(bill, 'expense', 'bill');
  for (const income of incomes) add(income, 'income', 'recurring_income');
  return due.sort((a, b) => diffDays(b.date, a.date));
}
