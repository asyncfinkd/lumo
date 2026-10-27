import {
  MAX_SCHEDULED,
  newlyLow,
  outsideQuietHours,
  planReminders,
  type ReminderWords,
} from '../plan';

const words: ReminderWords = {
  billTitle: (name) => `${name} is due tomorrow`,
  billBody: (amount, auto, day) =>
    auto ? `${amount} · added on the ${day}` : `${amount} · add it`,
  paydayTitle: () => 'Payday',
  paydayBody: (name, amount) => `${name} ${amount}`,
  eveningTitle: () => 'Evening',
  eveningBody: () => 'Anything to add?',
};
const on = { reminders: true, remindBills: true, remindPayday: true, remindEvening: false };
const money = (minor: number) => `₾${(minor / 100).toFixed(2)}`;
// Oct 27, 2026, 12:00 local.
const now = new Date(2026, 9, 27, 12, 0);
const telasi = { id: 't', name: 'Telasi', amountMinor: 9215, day: 24, active: true, remind: true };

const plan = (o: Partial<Parameters<typeof planReminders>[0]> = {}) =>
  planReminders({
    now,
    switches: on,
    bills: [telasi],
    incomes: [{ id: 's', name: 'Salary', amountMinor: 380000, day: 26 }],
    addedDates: new Set(),
    money,
    words,
    ...o,
  });

const local = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${d.getHours()}:00`;

describe('planReminders', () => {
  it('reminds the day before a bill at 10:00, and on payday', () => {
    const rows = plan();
    expect(rows.map((r) => [r.id, local(r.at), r.title, r.body])).toEqual([
      [
        'bill-t-2026-11-24',
        '2026-11-23 10:00',
        'Telasi is due tomorrow',
        '₾92.15 · added on the 24',
      ],
      ['payday-s-2026-11-26', '2026-11-26 10:00', 'Payday', 'Salary ₾3800.00'],
    ]);
  });

  it('says "add it" for a reminder-only bill, and skips bills with reminders off', () => {
    expect(plan({ bills: [{ ...telasi, active: false }] })[0]!.body).toBe('₾92.15 · add it');
    expect(plan({ bills: [{ ...telasi, remind: false }] }).map((r) => r.id)).toEqual([
      'payday-s-2026-11-26',
    ]);
  });

  it('a bill due on the 31st follows short months', () => {
    const rows = plan({
      now: new Date(2027, 1, 1, 12),
      bills: [{ ...telasi, day: 31 }],
      incomes: [],
    });
    // Within the next five weeks: February's falls on the 28th.
    expect(rows.map((r) => [r.id, local(r.at)])).toEqual([
      ['bill-t-2027-02-28', '2027-02-27 10:00'],
    ]);
  });

  it('checks in at 21:00 only on days with nothing added', () => {
    const rows = plan({
      switches: { ...on, remindBills: false, remindPayday: false, remindEvening: true },
      addedDates: new Set(['2026-10-28']),
    });
    expect(rows.map((r) => local(r.at))).toEqual([
      '2026-10-27 21:00',
      '2026-10-29 21:00',
      '2026-10-30 21:00',
      '2026-10-31 21:00',
      '2026-11-01 21:00',
      '2026-11-02 21:00',
    ]);
  });

  it('plans nothing with the main switch off, nothing in the past, and stays under the iOS limit', () => {
    expect(plan({ switches: { ...on, reminders: false } })).toEqual([]);
    expect(plan({ now: new Date(2026, 10, 23, 11) }).map((r) => r.id)).not.toContain(
      'bill-t-2026-11-24',
    );
    const many = Array.from({ length: 80 }, (_, i) => ({ ...telasi, id: `b${i}` }));
    expect(plan({ bills: many }).length).toBe(MAX_SCHEDULED);
  });
});

describe('quiet hours', () => {
  it('waits for 8:00 between 22:00 and 8:00', () => {
    expect(outsideQuietHours(new Date(2026, 9, 27, 14))).toBeNull();
    expect(local(outsideQuietHours(new Date(2026, 9, 27, 23))!)).toBe('2026-10-28 8:00');
    expect(local(outsideQuietHours(new Date(2026, 9, 28, 6))!)).toBe('2026-10-28 8:00');
  });
});

describe('newlyLow', () => {
  it('only reports a budget the moment it drops to 15% or less', () => {
    const before = new Map([
      ['groceries', 20],
      ['coffee', 10],
    ]);
    const after = new Map([
      ['groceries', 12],
      ['coffee', 5],
      ['treats', 50],
    ]);
    expect(newlyLow(before, after)).toEqual(['groceries']);
    // On start there's nothing to compare with, so nothing is sent.
    expect(newlyLow(null, after)).toEqual([]);
  });
});
