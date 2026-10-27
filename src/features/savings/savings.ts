// What the Savings boards say about a jar: how full it is, the pace line, the
// quick amounts and how long it took. Pure, so it's tested without React.

import type { CalendarDate } from '@/domain/dates';

/** The four jar colors (SavingsNew): Honey, Sky, Blush, Sage. */
export const JAR_TONES = ['gold', 'sky', 'blush', 'sage'] as const;
export type JarTone = (typeof JAR_TONES)[number];

type Entry = { jarId: string; amountMinor: number };
type JarPlan = { goalMinor: number; monthlyMinor: number; startDate: CalendarDate };

/** What's in each jar, by jar id. */
export function savedByJar(entries: readonly Entry[]): Map<string, number> {
  const saved = new Map<string, number>();
  for (const e of entries) saved.set(e.jarId, (saved.get(e.jarId) ?? 0) + e.amountMinor);
  return saved;
}

/** 0–100, as the jar and "₾640 · 32%" show it. */
export function jarPercent(savedMinor: number, goalMinor: number): number {
  if (goalMinor <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((savedMinor * 100) / goalMinor)));
}

function parts(date: CalendarDate): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y!, m!, d!];
}

/** Whole months from `from` to `to`: Oct 27 → Nov 26 is 0, → Nov 27 is 1. */
export function monthsBetween(from: CalendarDate, to: CalendarDate): number {
  const [y1, m1, d1] = parts(from);
  const [y2, m2, d2] = parts(to);
  return Math.max(0, (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0));
}

/** The month `months` after `today`'s, as a year and month 1–12. */
export function monthAfter(today: CalendarDate, months: number): { year: number; month: number } {
  const [y, m] = parts(today);
  const index = y * 12 + (m - 1) + months;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Months of saving `monthlyMinor` until `leftMinor` is in: at least 1. */
export function monthsToGo(leftMinor: number, monthlyMinor: number): number {
  return Math.max(1, Math.ceil(leftMinor / monthlyMinor));
}

export type Pace =
  /** "✨ A month ahead of plan" (SavingsAdded). */
  | { type: 'ahead' }
  /** "₾300 a month · ready by February" (Savings). */
  | { type: 'readyBy'; year: number; month: number }
  | { type: 'full' };

/**
 * The plan is the monthly amount for every whole month since the jar was made.
 * A jar a full month's amount past that is ahead; otherwise it shows when it
 * will be full at the monthly amount.
 */
export function jarPace(jar: JarPlan, savedMinor: number, today: CalendarDate): Pace {
  const leftMinor = jar.goalMinor - savedMinor;
  if (leftMinor <= 0) return { type: 'full' };
  const planned = jar.monthlyMinor * monthsBetween(jar.startDate, today);
  if (savedMinor >= planned + jar.monthlyMinor) return { type: 'ahead' };
  return { type: 'readyBy', ...monthAfter(today, monthsToGo(leftMinor, jar.monthlyMinor)) };
}

/** The add sheet's chips: ₾50, ₾100, ₾200 and the jar's monthly amount ("USUAL"). */
export function quickAmounts(monthlyMinor: number): { minor: number; usual: boolean }[] {
  const amounts = [5000, 10000, 20000].filter((minor) => minor !== monthlyMinor);
  return [...amounts, monthlyMinor]
    .sort((a, b) => a - b)
    .map((minor) => ({ minor, usual: minor === monthlyMinor }));
}

/**
 * Chips for taking money out: the same amounts, but never more than is in the
 * jar; a jar with less than the smallest one offers all of it.
 */
export function takeOutAmounts(
  monthlyMinor: number,
  savedMinor: number,
): { minor: number; usual: boolean; all: boolean }[] {
  const chips = quickAmounts(monthlyMinor)
    .filter((c) => c.minor < savedMinor)
    .map((c) => ({ ...c, all: false }));
  if (savedMinor <= 0) return [];
  // Three amounts and "All", like the add sheet's four.
  return [...chips.slice(0, 3), { minor: savedMinor, usual: false, all: true }];
}

/** "Took you 9 months" (SavingsDone): at least one. */
export function monthsTaken(startDate: CalendarDate, today: CalendarDate): number {
  return Math.max(1, monthsBetween(startDate, today));
}
