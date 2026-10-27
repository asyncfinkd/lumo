// What Home shows besides the month summary: the greeting and the Today /
// Yesterday lists. Pure, so it's tested without React.

import { addDays, type CalendarDate } from '@/domain/dates';
import { totalBalance } from '@/domain/balance';
import type { MoneyTransaction, TransactionSource } from '@/domain/leftToSpend';

export type GreetingKey = 'morning' | 'afternoon' | 'evening';

/** Morning from 5:00, afternoon from 12:00, evening from 18:00 until 5:00. */
export function greetingKey(hour: number): GreetingKey {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

/** Local time on a 24-hour clock without a leading zero: "8:40", "18:20". */
export function clockTime(iso: string): string {
  const at = new Date(iso);
  return `${at.getHours()}:${String(at.getMinutes()).padStart(2, '0')}`;
}

type Listed = { date: CalendarDate; createdAt: string; source: TransactionSource };

/**
 * Today's and yesterday's transactions, the one you added last on top.
 * Balance adjustments stay out: they aren't money coming in or going out (#6).
 */
export function recentDays<T extends Listed>(
  transactions: readonly T[],
  today: CalendarDate,
): { today: T[]; yesterday: T[] } {
  const yesterday = addDays(today, -1);
  const newestFirst = (a: T, b: T) => b.createdAt.localeCompare(a.createdAt);
  const shown = transactions.filter((t) => t.source !== 'adjustment');
  return {
    today: shown.filter((t) => t.date === today).sort(newestFirst),
    yesterday: shown.filter((t) => t.date === yesterday).sort(newestFirst),
  };
}

/**
 * How the balance moved since the 1st of this month ("₾800 more than on Oct
 * 1", Main). `null` when there was no balance before the 1st to compare with.
 */
export function monthChange(
  transactions: readonly (MoneyTransaction & { date: CalendarDate })[],
  today: CalendarDate,
): { since: CalendarDate; deltaMinor: number } | null {
  const since = `${today.slice(0, 7)}-01`;
  const start = totalBalance(transactions.filter((t) => t.date < since));
  const now = totalBalance(transactions);
  if (start === null || now === null) return null;
  return { since, deltaMinor: now - start };
}
