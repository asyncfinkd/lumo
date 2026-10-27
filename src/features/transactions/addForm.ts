// Small rules behind the add sheet's date, note and title. Pure.

import { addDays, type CalendarDate, diffDays, type PayPeriod } from '@/domain/dates';

/** "Oct 31" in the app's language. */
export function shortDate(date: CalendarDate, locale: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

/** The days you can log something on: from payday up to today, not the future. */
export function pickableDays(period: PayPeriod, today: CalendarDate): CalendarDate[] {
  const count = Math.max(0, diffDays(period.start, today)) + 1;
  return Array.from({ length: count }, (_, i) => addDays(period.start, i));
}

/** When it happened: the chosen day at the current time, so lists keep a sensible order. */
export function occurredAt(date: CalendarDate, now: Date): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y!, m! - 1, d!, now.getHours(), now.getMinutes(), now.getSeconds());
}

/** The title shown in lists: the note ("Coffee Lab"), or the category's name without one. */
export function transactionTitle(note: string, categoryName: string): string {
  return note.trim() || categoryName;
}

/**
 * The title after an edit: a note you typed wins; without one, a title that was
 * just the old category's name follows the new category, and any other title
 * (a bill's name, a shop) stays.
 */
export function editedTitle(
  before: { title: string; note: string | null },
  oldCategoryName: string,
  note: string,
  categoryName: string,
): string {
  if (note.trim()) return note.trim();
  if (before.note?.trim() || before.title === oldCategoryName) return categoryName;
  return before.title;
}
