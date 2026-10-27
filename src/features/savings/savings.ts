// What the Savings boards say about a jar: how full it is, the pace line, the
// quick amounts and how long it took. Pure, so it's tested without React.

import { addDays, type CalendarDate, diffDays } from '@/domain/dates';

/** The four jar colors (SavingsNew): Honey, Sky, Blush, Sage. */
export const JAR_TONES = ['gold', 'sky', 'blush', 'sage'] as const;
export type JarTone = (typeof JAR_TONES)[number];

type Entry = { jarId: string; amountMinor: number };
/** How often the plan's amount goes in: "Each day" or "Each month". */
export type Cadence = 'day' | 'month';
type JarPlan = {
  goalMinor: number;
  planMinor: number;
  cadence: Cadence;
  startDate: CalendarDate;
};

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

/** Days or months of saving `planMinor` until `leftMinor` is in: at least 1. */
export function stepsToGo(leftMinor: number, planMinor: number): number {
  return Math.max(1, Math.ceil(leftMinor / planMinor));
}

/** The month the jar will be full when `leftMinor` still has to go in. */
export function fullBy(
  today: CalendarDate,
  leftMinor: number,
  plan: { planMinor: number; cadence: Cadence },
): { year: number; month: number } {
  const steps = stepsToGo(leftMinor, plan.planMinor);
  if (plan.cadence === 'month') return monthAfter(today, steps);
  const [year, month] = parts(addDays(today, steps));
  return { year, month };
}

export type Pace =
  /** "✨ A month ahead of plan" (SavingsAdded); a week for a daily jar. */
  | { type: 'ahead'; by: 'week' | 'month' }
  /** "₾300 a month · ready by February" (Savings). */
  | { type: 'readyBy'; year: number; month: number }
  | { type: 'full' };

/**
 * The plan is the jar's amount for every whole month (or day) since it was
 * made. A monthly jar a month's amount past that is ahead, a daily one a
 * week's; otherwise the pace shows when it will be full at the plan's amount.
 */
export function jarPace(jar: JarPlan, savedMinor: number, today: CalendarDate): Pace {
  const leftMinor = jar.goalMinor - savedMinor;
  if (leftMinor <= 0) return { type: 'full' };
  const daily = jar.cadence === 'day';
  const elapsed = daily
    ? Math.max(0, diffDays(jar.startDate, today))
    : monthsBetween(jar.startDate, today);
  const lead = jar.planMinor * (daily ? 7 : 1);
  if (savedMinor >= jar.planMinor * elapsed + lead) {
    return { type: 'ahead', by: daily ? 'week' : 'month' };
  }
  return { type: 'readyBy', ...fullBy(today, leftMinor, jar) };
}

/**
 * The add sheet's chips, the plan's amount among them ("USUAL"): ₾50, ₾100,
 * ₾200 for a monthly jar, ₾10, ₾20, ₾50 for a daily one.
 */
export function quickAmounts(
  planMinor: number,
  cadence: Cadence = 'month',
): { minor: number; usual: boolean }[] {
  const base = cadence === 'day' ? [1000, 2000, 5000] : [5000, 10000, 20000];
  const amounts = base.filter((minor) => minor !== planMinor);
  return [...amounts, planMinor]
    .sort((a, b) => a - b)
    .map((minor) => ({ minor, usual: minor === planMinor }));
}

/**
 * Chips for taking money out: the same amounts, but never more than is in the
 * jar; a jar with less than the smallest one offers all of it.
 */
export function takeOutAmounts(
  planMinor: number,
  savedMinor: number,
  cadence: Cadence = 'month',
): { minor: number; usual: boolean; all: boolean }[] {
  const chips = quickAmounts(planMinor, cadence)
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

export type MonthPutAway = { year: number; month: number; minor: number };

/**
 * What went into jars in each of the last `count` calendar months, oldest
 * first, this month last (InsightsSavings' bars). Only money put in counts:
 * taking some out or closing a jar doesn't make a month smaller.
 */
export function monthlyPutAway(
  entries: readonly { amountMinor: number; date: CalendarDate }[],
  today: CalendarDate,
  count = 6,
): MonthPutAway[] {
  const months = Array.from({ length: count }, (_, i) => ({
    ...monthAfter(today, i - count + 1),
    minor: 0,
  }));
  for (const e of entries) {
    if (e.amountMinor <= 0) continue;
    const [y, m] = parts(e.date);
    const slot = months.find((x) => x.year === y && x.month === m);
    if (slot) slot.minor += e.amountMinor;
  }
  return months;
}

/**
 * Months in a row, ending with this one, at the best amount of the stretch
 * ("Two months in a row at your best pace"). 0 when this month isn't it.
 */
export function bestPaceStreak(months: readonly MonthPutAway[]): number {
  const best = Math.max(0, ...months.map((m) => m.minor));
  if (best === 0) return 0;
  let streak = 0;
  for (let i = months.length - 1; i >= 0 && months[i]!.minor === best; i--) streak++;
  return streak;
}
