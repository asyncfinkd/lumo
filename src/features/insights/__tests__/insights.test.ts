import { buildSampleTransactions, SAMPLE_PAYDAY } from '@/db/sampleData';
import { payPeriod } from '@/domain/dates';
import { percent } from '@/domain/money';
import { biggestDrop, previousWindow, spendingByCategory, weekRange } from '../insights';

const today = '2026-10-31';

describe('spendingByCategory', () => {
  it('matches docs/sample-data.md for the month: ₾3,000.30, Groceries 27% (#52)', () => {
    const { start, end } = payPeriod(today, SAMPLE_PAYDAY);
    const items = spendingByCategory(buildSampleTransactions(today), start, end);
    const total = items.reduce((sum, i) => sum + i.minor, 0);
    expect(total).toBe(300030);
    expect(items.map((i) => i.category)).toEqual([
      'groceries',
      'home',
      'treats',
      'bills',
      'transport',
      'coffee',
    ]);
    expect(percent(items[0]!.minor, total)).toBe(27);
  });

  it('leaves out income, adjustments and days outside the range', () => {
    const rows = [
      {
        kind: 'expense' as const,
        amountMinor: 100,
        date: '2026-10-30',
        source: 'manual' as const,
        categoryId: 'coffee',
      },
      {
        kind: 'expense' as const,
        amountMinor: 999,
        date: '2026-10-30',
        source: 'adjustment' as const,
        categoryId: null,
      },
      {
        kind: 'income' as const,
        amountMinor: 999,
        date: '2026-10-30',
        source: 'manual' as const,
        categoryId: 'gift',
      },
      {
        kind: 'expense' as const,
        amountMinor: 999,
        date: '2026-11-01',
        source: 'manual' as const,
        categoryId: 'coffee',
      },
    ];
    expect(spendingByCategory(rows, '2026-10-26', '2026-11-01')).toEqual([
      { category: 'coffee', minor: 100 },
    ]);
  });
});

describe('weekRange', () => {
  it('starts on Monday and ends after today', () => {
    expect(weekRange('2026-10-31')).toEqual({ start: '2026-10-26', end: '2026-11-01' }); // Saturday
    expect(weekRange('2026-10-26')).toEqual({ start: '2026-10-26', end: '2026-10-27' }); // Monday
    expect(weekRange('2026-11-01')).toEqual({ start: '2026-10-26', end: '2026-11-02' }); // Sunday
  });
});

describe('previousWindow', () => {
  it('takes the same number of days from the previous pay period', () => {
    // Day 27 of Oct 5 → Nov 5: Sep 5 up to Oct 2.
    expect(previousWindow('2026-10-31', 5)).toEqual({ start: '2026-09-05', end: '2026-10-02' });
  });

  it('never runs past the previous period', () => {
    // Day 31 of a 31-day period after a 30-day one.
    expect(previousWindow('2026-11-04', 5)).toEqual({ start: '2026-09-05', end: '2026-10-05' });
  });
});

describe('biggestDrop', () => {
  it('picks the category that went down the most', () => {
    const insight = biggestDrop(
      [
        { category: 'coffee', minor: 24860 },
        { category: 'groceries', minor: 90000 },
      ],
      [
        { category: 'coffee', minor: 30317 },
        { category: 'groceries', minor: 80000 },
      ],
      '2026-09-05',
    );
    expect(insight).toEqual({
      type: 'less',
      category: 'coffee',
      percent: 18,
      previousStart: '2026-09-05',
    });
  });

  it('says nothing when nothing went down', () => {
    expect(
      biggestDrop(
        [{ category: 'coffee', minor: 500 }],
        [{ category: 'coffee', minor: 400 }],
        '2026-09-05',
      ),
    ).toBeNull();
    expect(biggestDrop([{ category: 'coffee', minor: 500 }], [], '2026-09-05')).toBeNull();
  });
});
