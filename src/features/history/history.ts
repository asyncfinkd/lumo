// What History shows (#50): days newest first, each with its total, plus the
// search. Pure, so it's tested without React.

import { addDays, type CalendarDate } from '@/domain/dates';
import type { TransactionKind, TransactionSource } from '@/domain/leftToSpend';

type Listed = {
  id: string;
  kind: TransactionKind;
  amountMinor: number;
  date: CalendarDate;
  occurredAt: string;
  createdAt: string;
  source: TransactionSource;
};

export type DayGroup<T> = {
  date: CalendarDate;
  /** Came in minus went out that day; adjustments don't count. */
  totalMinor: number;
  /** The one added last first, as on Home. */
  rows: T[];
};

/** Bills and salary that Lumo added on their day. */
export function isAutomatic(t: { source: TransactionSource }): boolean {
  return t.source === 'bill' || t.source === 'recurring_income';
}

/** Every transaction by day, newest day first. */
export function dayGroups<T extends Listed>(transactions: readonly T[]): DayGroup<T>[] {
  const byDate = new Map<CalendarDate, T[]>();
  for (const t of transactions) {
    const rows = byDate.get(t.date);
    if (rows) rows.push(t);
    else byDate.set(t.date, [t]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, rows]) => ({
      date,
      totalMinor: rows.reduce(
        (sum, t) =>
          t.source === 'adjustment' ? sum : sum + (t.kind === 'income' ? 1 : -1) * t.amountMinor,
        0,
      ),
      rows: rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }));
}

/** "today", "yesterday", or the date to show as "Sat, Oct 24". */
export function dayName(date: CalendarDate, today: CalendarDate): 'today' | 'yesterday' | null {
  if (date === today) return 'today';
  if (date === addDays(today, -1)) return 'yesterday';
  return null;
}

/** Spent in today's calendar month ("October · ₾2,846.30 spent"); adjustments don't count. */
export function monthSpent(transactions: readonly Listed[], today: CalendarDate): number {
  const month = today.slice(0, 7);
  return transactions
    .filter((t) => t.kind === 'expense' && t.source !== 'adjustment' && t.date.startsWith(month))
    .reduce((sum, t) => sum + t.amountMinor, 0);
}

export type HistoryFilter = 'all' | 'spending' | 'income' | 'auto';

/**
 * HistorySearch: matches the name, the category or the amount ("coffee",
 * "Fresh", "64.2"), then the chip. Adjustments only show under All.
 */
export function searchTransactions<T extends Listed & { title: string }>(
  transactions: readonly T[],
  query: string,
  filter: HistoryFilter,
  describe: (t: T) => { category: string; amount: string },
): T[] {
  const q = query.trim().toLowerCase();
  return transactions.filter((t) => {
    if (filter === 'spending' && (t.kind !== 'expense' || t.source === 'adjustment')) return false;
    if (filter === 'income' && (t.kind !== 'income' || t.source === 'adjustment')) return false;
    if (filter === 'auto' && !isAutomatic(t)) return false;
    if (!q) return true;
    const { category, amount } = describe(t);
    return `${t.title} ${category} ${amount}`.toLowerCase().includes(q);
  });
}
