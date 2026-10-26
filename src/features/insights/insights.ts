// What Insights shows: spending by category for this week or this pay period,
// and the one sentence about it. Pure, so it's tested without React.

import type { CategoryId } from '@/db/categories';
import { addDays, type CalendarDate, diffDays, type PayPeriod, payPeriod } from '@/domain/dates';
import type { MoneyTransaction } from '@/domain/leftToSpend';

export type CategoryTotal = { category: CategoryId; minor: number };

type Spent = MoneyTransaction & { categoryId: string | null };

/** Monday of this week up to and including today. */
export function weekRange(today: CalendarDate): { start: CalendarDate; end: CalendarDate } {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const sinceMonday = (weekday + 6) % 7;
  return { start: addDays(today, -sinceMonday), end: addDays(today, 1) };
}

/**
 * Expenses per category with `start <= date < end`, largest first. Bills and
 * rent count here (#2); adjustments never do.
 */
export function spendingByCategory(
  transactions: readonly Spent[],
  start: CalendarDate,
  end: CalendarDate,
): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind !== 'expense' || t.source === 'adjustment' || !t.categoryId) continue;
    if (diffDays(start, t.date) < 0 || diffDays(t.date, end) <= 0) continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amountMinor);
  }
  return [...totals.entries()]
    .map(([category, minor]) => ({ category: category, minor }))
    .sort((a, b) => b.minor - a.minor);
}

/**
 * The same stretch of the previous pay period: on day 27 of this one, its first
 * 27 days. Comparing a period that's still running with a whole one would make
 * every category look smaller.
 */
export function previousWindow(
  today: CalendarDate,
  payday: number,
): { start: CalendarDate; end: CalendarDate } {
  const current = payPeriod(today, payday);
  const previous: PayPeriod = payPeriod(addDays(current.start, -1), payday);
  const elapsed = diffDays(current.start, today) + 1;
  return { start: previous.start, end: addDays(previous.start, Math.min(elapsed, previous.days)) };
}

export type Insight =
  /** Week: "Groceries led this week. …" */
  | { type: 'led'; category: CategoryId }
  /** Month: "You spent 18% less on coffee than in September. Nice!" */
  | { type: 'less'; category: CategoryId; percent: number; previousStart: CalendarDate };

/** The category that went down the most against the previous period, if any did. */
export function biggestDrop(
  current: readonly CategoryTotal[],
  previous: readonly CategoryTotal[],
  previousStart: CalendarDate,
): Insight | null {
  let best: Insight | null = null;
  for (const before of previous) {
    if (before.minor <= 0) continue;
    const now = current.find((c) => c.category === before.category)?.minor ?? 0;
    const drop = Math.round(((before.minor - now) * 100) / before.minor);
    if (drop > 0 && (!best || (best.type === 'less' && drop > best.percent))) {
      best = { type: 'less', category: before.category, percent: drop, previousStart };
    }
  }
  return best;
}
