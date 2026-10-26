// Calendar dates and payday periods. Pure functions only: no React, no database.
//
// Dates are "YYYY-MM-DD" strings in the user's local calendar. The caller turns
// a timestamp into a local date; everything here is plain day arithmetic done in
// UTC, so daylight saving time can never shift a day.

export type CalendarDate = string; // "2026-10-31"

export type PayPeriod = {
  /** First day, inclusive: the payday. */
  start: CalendarDate;
  /** The next payday, exclusive. */
  end: CalendarDate;
  /** Length of the period in days. */
  days: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(date: CalendarDate): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError(`Expected a YYYY-MM-DD date, got "${date}"`);
  const [, y, m, d] = match;
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}

function fromUtc(ms: number): CalendarDate {
  return new Date(ms).toISOString().slice(0, 10);
}

function ymd(year: number, month: number, day: number): CalendarDate {
  return fromUtc(Date.UTC(year, month - 1, day));
}

/** Days in a month; `month` is 1–12. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The date a monthly day (payday, bill due day) lands on in a given month.
 * A day past the end of a short month moves to its last day: 31 → Feb 28.
 */
export function monthlyDate(year: number, month: number, day: number): CalendarDate {
  return ymd(year, month, Math.min(day, daysInMonth(year, month)));
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function diffDays(from: CalendarDate, to: CalendarDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** The local calendar date of a moment, for comparing timestamps with periods. */
export function toCalendarDate(moment: Date): CalendarDate {
  return ymd(moment.getFullYear(), moment.getMonth() + 1, moment.getDate());
}

function shiftMonth(year: number, month: number, by: number): [number, number] {
  const index = year * 12 + (month - 1) + by;
  return [Math.floor(index / 12), (index % 12) + 1];
}

/**
 * The payday-to-payday period that contains `today` (#2). Payday is the day of
 * the month the user gets paid, 1–31.
 */
export function payPeriod(today: CalendarDate, payday: number): PayPeriod {
  if (!Number.isInteger(payday) || payday < 1 || payday > 31) {
    throw new RangeError(`payday must be 1–31, got ${payday}`);
  }
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));

  const thisMonth = monthlyDate(year, month, payday);
  const [startYear, startMonth] =
    diffDays(thisMonth, today) >= 0 ? [year, month] : shiftMonth(year, month, -1);
  const [endYear, endMonth] = shiftMonth(startYear, startMonth, 1);

  const start = monthlyDate(startYear, startMonth, payday);
  const end = monthlyDate(endYear, endMonth, payday);
  return { start, end, days: diffDays(start, end) };
}

export function isInPeriod(date: CalendarDate, period: PayPeriod): boolean {
  return diffDays(period.start, date) >= 0 && diffDays(date, period.end) > 0;
}

/** Days until the next payday, counting today: "5 days left" on Oct 31 with payday the 5th. */
export function daysLeft(today: CalendarDate, period: PayPeriod): number {
  return diffDays(today, period.end);
}

/** Every date in the period on which a monthly `day` falls (usually one). */
export function monthlyDatesInPeriod(day: number, period: PayPeriod): CalendarDate[] {
  const year = Number(period.start.slice(0, 4));
  const month = Number(period.start.slice(5, 7));
  const dates: CalendarDate[] = [];
  for (let i = 0; i <= 1; i++) {
    const [y, m] = shiftMonth(year, month, i);
    const date = monthlyDate(y, m, day);
    if (isInPeriod(date, period)) dates.push(date);
  }
  return dates;
}
