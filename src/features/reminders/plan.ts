// Which reminders to schedule (ProfileReminders, #15). Pure: given the time,
// the switches and the bills, it returns every notification for the next
// weeks; ./RemindersSync.tsx hands them to the phone.
//
// Times are 10:00 for bills and payday and 21:00 for the evening check-in, so
// nothing lands in quiet hours (22:00–8:00).

import { addDays, type CalendarDate, monthlyDate, toCalendarDate } from '@/domain/dates';

export const QUIET_FROM = 22;
export const QUIET_UNTIL = 8;
const MORNING = 10;
const EVENING = 21;
/** How far ahead to schedule; it's redone whenever anything changes. */
const HORIZON_DAYS = 35;
/** iOS keeps at most 64 pending notifications per app. */
export const MAX_SCHEDULED = 60;

export type ReminderSwitches = {
  reminders: boolean;
  remindBills: boolean;
  remindPayday: boolean;
  remindEvening: boolean;
};

export type Reminder = { id: string; at: Date; title: string; body: string };

export type ReminderWords = {
  billTitle: (name: string) => string;
  /** `auto`: Lumo adds it on its day; otherwise you add it when you pay. */
  billBody: (amount: string, auto: boolean, day: number) => string;
  paydayTitle: () => string;
  paydayBody: (name: string, amount: string) => string;
  eveningTitle: () => string;
  eveningBody: () => string;
};

type Bill = {
  id: string;
  name: string;
  amountMinor: number;
  day: number;
  active: boolean;
  remind: boolean;
};
type Income = { id: string; name: string; amountMinor: number; day: number };

const at = (date: CalendarDate, hour: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y!, m! - 1, d!, hour, 0, 0, 0);
};

/** Every date a monthly `day` falls on from `from` for `days` days. */
function monthlyDates(day: number, from: CalendarDate, days: number): CalendarDate[] {
  const end = addDays(from, days);
  const [y, m] = from.split('-').map(Number) as [number, number];
  const out: CalendarDate[] = [];
  for (let i = -1; i <= 2; i++) {
    const date = monthlyDate(y + Math.floor((m - 1 + i) / 12), ((m - 1 + i + 12) % 12) + 1, day);
    if (date >= from && date < end) out.push(date);
  }
  return out;
}

export function planReminders({
  now,
  switches,
  bills,
  incomes,
  addedDates,
  money,
  words,
}: {
  now: Date;
  switches: ReminderSwitches;
  bills: readonly Bill[];
  incomes: readonly Income[];
  /** Days that already have something you added: no check-in those evenings. */
  addedDates: ReadonlySet<CalendarDate>;
  money: (minor: number) => string;
  words: ReminderWords;
}): Reminder[] {
  if (!switches.reminders) return [];
  const today = toCalendarDate(now);
  const out: Reminder[] = [];

  if (switches.remindBills) {
    for (const bill of bills.filter((b) => b.remind)) {
      // The reminder is the day before, so look one day further ahead.
      for (const due of monthlyDates(bill.day, today, HORIZON_DAYS + 1)) {
        out.push({
          id: `bill-${bill.id}-${due}`,
          at: at(addDays(due, -1), MORNING),
          title: words.billTitle(bill.name),
          body: words.billBody(money(bill.amountMinor), bill.active, bill.day),
        });
      }
    }
  }

  if (switches.remindPayday) {
    for (const income of incomes) {
      for (const day of monthlyDates(income.day, today, HORIZON_DAYS)) {
        out.push({
          id: `payday-${income.id}-${day}`,
          at: at(day, MORNING),
          title: words.paydayTitle(),
          body: words.paydayBody(income.name, money(income.amountMinor)),
        });
      }
    }
  }

  if (switches.remindEvening) {
    for (let i = 0; i < 7; i++) {
      const day = addDays(today, i);
      if (addedDates.has(day)) continue;
      out.push({
        id: `evening-${day}`,
        at: at(day, EVENING),
        title: words.eveningTitle(),
        body: words.eveningBody(),
      });
    }
  }

  return out
    .filter((r) => r.at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_SCHEDULED);
}

/** A "budget running low" note that happens now waits for 8:00 in quiet hours. */
export function outsideQuietHours(now: Date): Date | null {
  const hour = now.getHours();
  if (hour >= QUIET_UNTIL && hour < QUIET_FROM) return null;
  const morning = new Date(now);
  if (hour >= QUIET_FROM) morning.setDate(morning.getDate() + 1);
  morning.setHours(QUIET_UNTIL, 0, 0, 0);
  return morning;
}

/** Categories that just went from more than 15% left to 15% or less. */
export function newlyLow(
  before: ReadonlyMap<string, number> | null,
  after: ReadonlyMap<string, number>,
): string[] {
  if (!before) return [];
  return [...after.entries()]
    .filter(([id, left]) => left <= 15 && (before.get(id) ?? 100) > 15)
    .map(([id]) => id);
}
