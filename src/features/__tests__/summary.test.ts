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
});
