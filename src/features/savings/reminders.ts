// Jar reminders: "New bike 🫙 Drop ₾5 in the jar today?" at the time picked on
// the jar's sheet, every day for a daily jar and once a month for a monthly
// one. Pure; ./JarRemindersSync.tsx hands them to the phone.

import type { Cadence } from './savings';

/** Every jar reminder's id starts with this, so other reminders leave them alone. */
export const JAR_REMINDER_PREFIX = 'jar-';

type Jar = {
  id: string;
  name: string;
  planMinor: number;
  cadence: Cadence;
  startDate: string;
  remindAt: string | null;
  closedAt: string | null;
};

export type JarReminder = {
  id: string;
  jarId: string;
  hour: number;
  minute: number;
  /** Monthly jars: the day of the month, from the day the jar was made. */
  day: number | null;
  title: string;
  body: string;
};

export type JarReminderWords = {
  title: (name: string) => string;
  body: (amount: string, cadence: Cadence) => string;
};

/** "22:00" → 22, 0; anything else → null. */
export function parseTime(time: string | null): { hour: number; minute: number } | null {
  const match = time ? /^(\d{1,2}):(\d{2})$/.exec(time) : null;
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** "22:00" for a Date picked on the time wheel. */
export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * One repeating reminder per open jar with a time. The time is the person's
 * own choice, so unlike the other reminders it may fall in quiet hours (22:00).
 * A monthly jar reminds on the day it was made, at most the 28th so every
 * month has it. Nothing while Reminders is off in Profile.
 */
export function planJarReminders(
  jars: readonly Jar[],
  remindersOn: boolean,
  money: (minor: number) => string,
  words: JarReminderWords,
): JarReminder[] {
  if (!remindersOn) return [];
  const out: JarReminder[] = [];
  for (const jar of jars) {
    const time = parseTime(jar.remindAt);
    if (!time || jar.closedAt) continue;
    out.push({
      id: JAR_REMINDER_PREFIX + jar.id,
      jarId: jar.id,
      ...time,
      day: jar.cadence === 'month' ? Math.min(Number(jar.startDate.slice(8, 10)), 28) : null,
      title: words.title(jar.name),
      body: words.body(money(jar.planMinor), jar.cadence),
    });
  }
  return out;
}
