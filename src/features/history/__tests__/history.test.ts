import type { TransactionKind, TransactionSource } from '@/domain/leftToSpend';
import { dayGroups, dayName, monthSpent, searchTransactions } from '../history';

type Row = {
  id: string;
  title: string;
  kind: TransactionKind;
  amountMinor: number;
  date: string;
  occurredAt: string;
  createdAt: string;
  source: TransactionSource;
  category: string;
};

const row = (o: Partial<Row> & { id: string }): Row => ({
  title: o.id,
  kind: 'expense',
  amountMinor: 1000,
  date: '2026-10-27',
  occurredAt: '2026-10-27T10:00:00.000Z',
  createdAt: '2026-10-27T10:00:00.000Z',
  source: 'manual',
  category: 'Getting around',
  ...o,
});

const rows: Row[] = [
  row({
    id: 'bolt',
    title: 'Bolt',
    amountMinor: 1240,
    occurredAt: '2026-10-27T18:20:00.000Z',
    createdAt: '2026-10-27T18:21:00.000Z',
  }),
  row({
    id: 'coffee',
    title: 'Coffee Lab',
    amountMinor: 1150,
    occurredAt: '2026-10-27T08:40:00.000Z',
    // Added after Bolt, for earlier in the day.
    createdAt: '2026-10-27T19:00:00.000Z',
    category: 'Coffee',
  }),
  row({
    id: 'salary',
    title: 'Salary',
    kind: 'income',
    amountMinor: 380000,
    date: '2026-10-26',
    source: 'recurring_income',
    category: 'Salary',
  }),
  row({ id: 'spotify', title: 'Spotify', amountMinor: 2000, date: '2026-10-26', source: 'bill' }),
  row({
    id: 'adjust',
    title: 'Balance adjusted',
    kind: 'income',
    amountMinor: 1230,
    date: '2026-10-24',
    source: 'adjustment',
  }),
  row({ id: 'pharmacy', title: 'Pharmacy', amountMinor: 1860, date: '2026-10-24' }),
  row({
    id: 'september',
    title: 'Bakery',
    amountMinor: 640,
    date: '2026-09-30',
    category: 'Coffee',
  }),
];

describe('dayGroups', () => {
  const groups = dayGroups(rows);

  it('puts the newest day first and, in each day, the one added last first', () => {
    expect(groups.map((g) => g.date)).toEqual([
      '2026-10-27',
      '2026-10-26',
      '2026-10-24',
      '2026-09-30',
    ]);
    expect(groups[0]!.rows.map((r) => r.id)).toEqual(['coffee', 'bolt']);
  });

  it('totals each day as came in minus went out, leaving adjustments out', () => {
    expect(groups.map((g) => g.totalMinor)).toEqual([-2390, 378000, -1860, -640]);
  });

  it('is empty with no transactions', () => {
    expect(dayGroups([])).toEqual([]);
  });
});

describe('dayName', () => {
  it('names today and yesterday, and nothing else', () => {
    expect(dayName('2026-10-27', '2026-10-27')).toBe('today');
    expect(dayName('2026-10-26', '2026-10-27')).toBe('yesterday');
    expect(dayName('2026-10-24', '2026-10-27')).toBeNull();
  });
});

describe('monthSpent', () => {
  it("adds this calendar month's spending, bills included", () => {
    expect(monthSpent(rows, '2026-10-27')).toBe(1240 + 1150 + 2000 + 1860);
  });
});

describe('searchTransactions', () => {
  const describeRow = (r: Row) => ({
    category: r.category,
    amount: (r.amountMinor / 100).toFixed(2),
  });
  const ids = (q: string, f: Parameters<typeof searchTransactions>[2] = 'all') =>
    searchTransactions(rows, q, f, describeRow).map((r) => r.id);

  it('finds by name, category or amount, ignoring case', () => {
    expect(ids('bolt')).toEqual(['bolt']);
    expect(ids('COFFEE')).toEqual(['coffee', 'september']);
    expect(ids('11.5')).toEqual(['coffee']);
  });

  it('narrows by the chips; adjustments only show under All', () => {
    expect(ids('', 'income')).toEqual(['salary']);
    expect(ids('', 'auto')).toEqual(['salary', 'spotify']);
    expect(ids('', 'spending')).not.toContain('adjust');
    expect(ids('')).toContain('adjust');
  });
});
