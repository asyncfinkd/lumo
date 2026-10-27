import {
  buildSampleTransactions,
  SAMPLE_PAYDAY,
  sampleBills,
  sampleIncomes,
} from '@/db/sampleData';
import { summarizeMonth } from '../money/summary';

describe('summarizeMonth', () => {
  it('matches docs/sample-data.md on Oct 31', () => {
    const summary = summarizeMonth({
      today: '2026-10-31',
      payday: SAMPLE_PAYDAY,
      incomes: sampleIncomes,
      bills: sampleBills,
      transactions: buildSampleTransactions('2026-10-31'),
    });
    expect(summary.period).toEqual({ start: '2026-10-05', end: '2026-11-05', days: 31 });
    expect(summary.daysLeft).toBe(5);
    expect(summary.left.availableMinor).toBe(265000);
    expect(summary.left.leftMinor).toBe(79970);
    expect(summary.left.spentPercent).toBe(70);
    expect(summary.cameInMinor).toBe(380000);
    expect(summary.wentOutMinor).toBe(300030);
    expect(summary.balanceMinor).toBe(1248050);
  });

  it('has no balance and nothing spent on a fresh profile', () => {
    const summary = summarizeMonth({
      today: '2026-10-31',
      payday: 5,
      incomes: [{ amountMinor: 380000 }],
      bills: [{ amountMinor: 115000 }],
      transactions: [],
    });
    expect(summary.balanceMinor).toBeNull();
    expect(summary.left.leftMinor).toBe(265000);
    expect(summary.cameInMinor).toBe(0);
  });

  it('keeps a running total per day for the trend lines', () => {
    const summary = summarizeMonth({
      today: '2026-10-31',
      payday: SAMPLE_PAYDAY,
      incomes: sampleIncomes,
      bills: sampleBills,
      transactions: buildSampleTransactions('2026-10-31'),
    });
    // Oct 5 to Oct 31, ending on the card's totals and never going down.
    expect(summary.cameInByDay).toHaveLength(27);
    expect(summary.cameInByDay.at(-1)).toBe(summary.cameInMinor);
    expect(summary.wentOutByDay.at(-1)).toBe(summary.wentOutMinor);
    for (const series of [summary.cameInByDay, summary.wentOutByDay]) {
      series.forEach((v, i) => expect(v).toBeGreaterThanOrEqual(series[i - 1] ?? 0));
    }
  });

  it('a later-dated row this period counts on today, an adjustment never', () => {
    const tx = (date: string, amountMinor: number, extra = {}) => ({
      id: date,
      kind: 'expense' as const,
      source: 'manual' as const,
      amountMinor,
      date,
      categoryId: null,
      ...extra,
    });
    const summary = summarizeMonth({
      today: '2026-10-07',
      payday: 5,
      incomes: [],
      bills: [],
      transactions: [
        tx('2026-10-05', 100),
        tx('2026-10-20', 50),
        tx('2026-10-06', 999, { source: 'adjustment' }),
        tx('2026-10-04', 7),
      ],
    });
    expect(summary.wentOutByDay).toEqual([100, 100, 150]);
    expect(summary.cameInByDay).toEqual([0, 0, 0]);
  });
});
