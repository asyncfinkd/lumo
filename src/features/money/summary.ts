// Everything Home shows about the current pay period. Pure, so it's tested
// without a database or React. The app feeds `summarizePeriod` with the sums
// from ./repo.ts (MoneyProvider); `summarizeMonth` does the same from plain rows.

import { type BalanceTotals, balanceFromTotals, balanceTotals } from '@/domain/balance';
import {
  type CalendarDate,
  daysLeft,
  diffDays,
  isInPeriod,
  type PayPeriod,
  payPeriod,
} from '@/domain/dates';
import { type LeftToSpend, leftToSpend, type MoneyTransaction } from '@/domain/leftToSpend';

export type MonthSummary = {
  period: PayPeriod;
  daysLeft: number;
  left: LeftToSpend;
  /** All income this period, salary included; adjustments excluded. */
  cameInMinor: number;
  /** All expenses this period, bills included; adjustments excluded. */
  wentOutMinor: number;
  /**
   * Came in and Went out so far on each day of the period, from its first day
   * to today: the cards' trend lines (Main).
   */
  cameInByDay: number[];
  wentOutByDay: number[];
  /** `null` until a starting balance is set (#6). */
  balanceMinor: number | null;
};

export function summarizeMonth({
  today,
  payday,
  incomes,
  bills,
  transactions,
  jarEntries = [],
}: {
  today: CalendarDate;
  payday: number;
  incomes: readonly { amountMinor: number }[];
  /** Active bills only. */
  bills: readonly { amountMinor: number }[];
  /** Every transaction: the balance needs all of them. */
  transactions: readonly MoneyTransaction[];
  /** Money moved into savings jars comes off the balance. */
  jarEntries?: readonly { amountMinor: number }[];
}): MonthSummary {
  return summarizePeriod({
    today,
    payday,
    incomes,
    bills,
    periodTransactions: transactions,
    balance: balanceTotals(transactions, jarEntries),
  });
}

/**
 * The summary from this period's transactions and the balance's parts.
 * `periodTransactions` may hold rows from other periods (they're skipped) and
 * may be sums already, one per day, kind and source (`periodFlowQuery`).
 */
export function summarizePeriod({
  today,
  payday,
  incomes,
  bills,
  periodTransactions,
  balance,
}: {
  today: CalendarDate;
  payday: number;
  incomes: readonly { amountMinor: number }[];
  /** Active bills only. */
  bills: readonly { amountMinor: number }[];
  periodTransactions: readonly MoneyTransaction[];
  balance: BalanceTotals;
}): MonthSummary {
  const period = payPeriod(today, payday);
  const sum = (rows: readonly { amountMinor: number }[]) =>
    rows.reduce((total, row) => total + row.amountMinor, 0);

  let cameInMinor = 0;
  let wentOutMinor = 0;
  const days = Math.max(1, diffDays(period.start, today) + 1);
  const cameInByDay = new Array<number>(days).fill(0);
  const wentOutByDay = new Array<number>(days).fill(0);
  for (const t of periodTransactions) {
    if (t.source === 'adjustment' || !isInPeriod(t.date, period)) continue;
    // Something dated later this period (a bill added ahead) counts on today.
    const day = Math.min(days - 1, diffDays(period.start, t.date));
    if (t.kind === 'income') {
      cameInMinor += t.amountMinor;
      cameInByDay[day]! += t.amountMinor;
    } else {
      wentOutMinor += t.amountMinor;
      wentOutByDay[day]! += t.amountMinor;
    }
  }
  for (let i = 1; i < days; i++) {
    cameInByDay[i]! += cameInByDay[i - 1]!;
    wentOutByDay[i]! += wentOutByDay[i - 1]!;
  }

  return {
    period,
    daysLeft: daysLeft(today, period),
    left: leftToSpend({
      plannedIncomeMinor: sum(incomes),
      billsMinor: sum(bills),
      transactions: periodTransactions,
      period,
    }),
    cameInMinor,
    wentOutMinor,
    cameInByDay,
    wentOutByDay,
    balanceMinor: balanceFromTotals(balance),
  };
}
