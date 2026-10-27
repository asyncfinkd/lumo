// Everything Home and Budgets show about the current pay period, from plain
// rows. Pure, so it's tested without a database or React.

import { totalBalance } from '@/domain/balance';
import { type CalendarDate, daysLeft, isInPeriod, type PayPeriod, payPeriod } from '@/domain/dates';
import { type LeftToSpend, leftToSpend, type MoneyTransaction } from '@/domain/leftToSpend';

export type MonthSummary = {
  period: PayPeriod;
  daysLeft: number;
  left: LeftToSpend;
  /** All income this period, salary included; adjustments excluded. */
  cameInMinor: number;
  /** All expenses this period, bills included; adjustments excluded. */
  wentOutMinor: number;
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
  const period = payPeriod(today, payday);
  const sum = (rows: readonly { amountMinor: number }[]) =>
    rows.reduce((total, row) => total + row.amountMinor, 0);

  let cameInMinor = 0;
  let wentOutMinor = 0;
  for (const t of transactions) {
    if (t.source === 'adjustment' || !isInPeriod(t.date, period)) continue;
    if (t.kind === 'income') cameInMinor += t.amountMinor;
    else wentOutMinor += t.amountMinor;
  }

  return {
    period,
    daysLeft: daysLeft(today, period),
    left: leftToSpend({
      plannedIncomeMinor: sum(incomes),
      billsMinor: sum(bills),
      transactions,
      period,
    }),
    cameInMinor,
    wentOutMinor,
    balanceMinor: totalBalance(transactions, jarEntries),
  };
}
