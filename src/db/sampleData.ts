// docs/sample-data.md as rows, for the development seed. Pure: no database here.
//
// Dates are placed inside the pay period that contains `today` and never after
// it, so on any day the app shows the same numbers as the design:
// ₾799.70 left of ₾2,650, 70% spent, total balance ₾12,480.50.

import { addDays, type CalendarDate, diffDays, payPeriod } from '@/domain/dates';
import type { CategoryId } from './categories';

type Kind = 'income' | 'expense';
type Source = 'manual' | 'bill' | 'recurring_income' | 'adjustment';

export type SampleTransaction = {
  key: string;
  kind: Kind;
  amountMinor: number;
  categoryId: CategoryId | null;
  title: string;
  date: CalendarDate;
  /** Local time of day, "HH:MM". */
  time: string;
  source: Source;
  recurringKey: string | null;
};

export const SAMPLE_PAYDAY = 5;
export const SAMPLE_BALANCE_MINOR = 1248050;

export const sampleProfile = { name: 'Nika', currency: 'GEL' as const, payday: SAMPLE_PAYDAY };

export const sampleIncomes = [{ key: 'salary', name: 'Salary', amountMinor: 380000, day: 5 }];

export const sampleBills: {
  key: string;
  name: string;
  amountMinor: number;
  day: number;
  categoryId: CategoryId;
}[] = [
  { key: 'rent', name: 'Rent', amountMinor: 80000, day: 10, categoryId: 'home' },
  { key: 'utilities', name: 'Utilities', amountMinor: 18000, day: 15, categoryId: 'bills' },
  { key: 'internet', name: 'Internet', amountMinor: 5000, day: 20, categoryId: 'bills' },
  { key: 'phone', name: 'Phone', amountMinor: 3000, day: 20, categoryId: 'bills' },
  { key: 'spotify', name: 'Spotify', amountMinor: 2000, day: 12, categoryId: 'bills' },
  { key: 'gym', name: 'Gym', amountMinor: 7000, day: 30, categoryId: 'bills' },
];

export const sampleBudgets: { categoryId: CategoryId; limitMinor: number }[] = [
  { categoryId: 'home', limitMinor: 80000 },
  { categoryId: 'bills', limitMinor: 35000 },
  { categoryId: 'groceries', limitMinor: 90000 },
  { categoryId: 'coffee', limitMinor: 32000 },
  { categoryId: 'transport', limitMinor: 40000 },
  { categoryId: 'treats', limitMinor: 60000 },
];

// Manual spending: ₾1,850.30 in total. `day` is days after the period starts,
// or 'today' for the rows the design shows under "Today".
const spending: {
  key: string;
  title: string;
  categoryId: CategoryId;
  amountMinor: number;
  day: number | 'today';
  time: string;
}[] = [
  {
    key: 'coffee-lab',
    title: 'Coffee Lab',
    categoryId: 'coffee',
    amountMinor: 1150,
    day: 'today',
    time: '08:40',
  },
  {
    key: 'fresh-market',
    title: 'Fresh Market',
    categoryId: 'groceries',
    amountMinor: 6420,
    day: 'today',
    time: '13:15',
  },
  {
    key: 'bolt',
    title: 'Bolt',
    categoryId: 'transport',
    amountMinor: 1240,
    day: 'today',
    time: '18:20',
  },
  {
    key: 'groceries-1',
    title: 'Carrefour',
    categoryId: 'groceries',
    amountMinor: 38410,
    day: 2,
    time: '11:05',
  },
  {
    key: 'groceries-2',
    title: 'Fresh Market',
    categoryId: 'groceries',
    amountMinor: 36410,
    day: 14,
    time: '19:30',
  },
  {
    key: 'coffee-1',
    title: 'Coffee Lab',
    categoryId: 'coffee',
    amountMinor: 23710,
    day: 9,
    time: '09:10',
  },
  {
    key: 'transport-1',
    title: 'Bolt',
    categoryId: 'transport',
    amountMinor: 27360,
    day: 11,
    time: '22:45',
  },
  {
    key: 'treats-1',
    title: 'Cinema',
    categoryId: 'treats',
    amountMinor: 26330,
    day: 7,
    time: '20:00',
  },
  {
    key: 'treats-2',
    title: 'Bakery',
    categoryId: 'treats',
    amountMinor: 24000,
    day: 16,
    time: '16:20',
  },
];

/** All sample transactions for the period that contains `today`. */
export function buildSampleTransactions(today: CalendarDate): SampleTransaction[] {
  const period = payPeriod(today, SAMPLE_PAYDAY);
  const elapsed = diffDays(period.start, today);
  // Never after today, never before the period.
  const at = (day: number | 'today') =>
    addDays(period.start, day === 'today' ? elapsed : Math.min(day, elapsed));

  const rows: SampleTransaction[] = spending.map((s) => ({
    key: s.key,
    kind: 'expense',
    amountMinor: s.amountMinor,
    categoryId: s.categoryId,
    title: s.title,
    date: at(s.day),
    time: s.time,
    source: 'manual',
    recurringKey: null,
  }));

  rows.push({
    key: 'salary',
    kind: 'income',
    amountMinor: sampleIncomes[0]!.amountMinor,
    categoryId: 'salary',
    title: 'Salary',
    date: period.start,
    time: '10:00',
    source: 'recurring_income',
    recurringKey: 'salary',
  });

  // Bills that are already due by today went out as bill transactions (#4).
  for (const bill of sampleBills) {
    const offset = bill.day - SAMPLE_PAYDAY;
    if (offset <= elapsed) {
      rows.push({
        key: `bill-${bill.key}`,
        kind: 'expense',
        amountMinor: bill.amountMinor,
        categoryId: bill.categoryId,
        title: bill.name,
        date: addDays(period.start, offset),
        time: '09:00',
        source: 'bill',
        recurringKey: bill.key,
      });
    }
  }

  // The starting balance is the first adjustment (#6), picked so the total
  // comes out at ₾12,480.50.
  const net = rows.reduce(
    (sum, r) => sum + (r.kind === 'income' ? r.amountMinor : -r.amountMinor),
    0,
  );
  const start = SAMPLE_BALANCE_MINOR - net;
  rows.unshift({
    key: 'starting-balance',
    kind: start >= 0 ? 'income' : 'expense',
    amountMinor: Math.abs(start),
    categoryId: null,
    title: 'Starting balance',
    date: addDays(period.start, -1),
    time: '09:00',
    source: 'adjustment',
    recurringKey: null,
  });

  return rows;
}
