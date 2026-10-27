import type { TransactionKind, TransactionSource } from '@/domain/leftToSpend';
import {
  dayGroups,
  dayName,
  jarMoves,
  monthSpent,
  searchTransactions,
  withJarMoves,
} from '../history';

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

describe('jar moves (HistoryJars)', () => {
  const jars = [
    {
      id: 'trip',
      name: 'Summer trip',
      tone: 'blush' as const,
      currency: 'GEL' as const,
      closedAt: null,
    },
    {
      id: 'concert',
      name: 'Concert',
      tone: 'sage' as const,
      currency: 'GEL' as const,
      closedAt: '2026-09-24T11:00:00.000Z',
    },
  ];
  const entry = (id: string, jarId: string, amountMinor: number, date: string, at: string) => ({
    id,
    jarId,
    amountMinor,
    date,
    createdAt: `${date}T${at}:00.000Z`,
  });
  const entries = [
    entry('t1', 'trip', 10000, '2026-10-27', '12:30'),
    entry('t2', 'trip', -5000, '2026-10-26', '19:10'),
    entry('c1', 'concert', 18000, '2026-09-01', '09:00'),
    entry('c2', 'concert', -3000, '2026-09-10', '09:00'),
    entry('c3', 'concert', -15000, '2026-09-24', '11:00'),
  ];

  it('names each move: put in, taken out, and the closing one as done', () => {
    const moves = jarMoves(entries, jars);
    expect(Object.fromEntries(moves.map((m) => [m.id, m.move]))).toEqual({
      t1: 'in',
      t2: 'out',
      c1: 'in',
      c2: 'out',
      c3: 'done',
    });
    expect(moves.find((m) => m.id === 't1')).toMatchObject({ name: 'Summer trip', tone: 'blush' });
  });

  it('a taken-out move on an open jar is never done', () => {
    const moves = jarMoves([entry('x', 'trip', -100, '2026-10-27', '10:00')], jars);
    expect(moves[0]!.move).toBe('out');
  });

  it('puts them among the days without changing the totals', () => {
    const groups = withJarMoves(dayGroups(rows), jarMoves(entries, jars));
    const today = groups.find((g) => g.date === '2026-10-27')!;
    expect(today.totalMinor).toBe(dayGroups(rows).find((g) => g.date === '2026-10-27')!.totalMinor);
    expect(today.rows.map((r) => r.id)).toContain('t1');
    // A day with only a jar move still shows, at zero.
    const closed = groups.find((g) => g.date === '2026-09-24')!;
    expect(closed).toMatchObject({ totalMinor: 0 });
    expect(closed.rows.map((r) => r.id)).toEqual(['c3']);
    // Newest day first, newest row first.
    expect(groups.map((g) => g.date)).toEqual([...groups.map((g) => g.date)].sort().reverse());
  });
});
