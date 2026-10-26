import {
  buildSampleTransactions,
  SAMPLE_PAYDAY,
  sampleBills,
  sampleBudgets,
} from '@/db/sampleData';
import { payPeriod } from '@/domain/dates';
import { budgetRows, budgetsSummary, quickAmounts } from '../budgetRows';

const bills = sampleBills.map((b) => ({ id: b.key, categoryId: b.categoryId }));
const rowsOn = (today: string) =>
  budgetRows({
    budgets: sampleBudgets,
    transactions: buildSampleTransactions(today).map((t) => ({
      ...t,
      recurringId: t.recurringKey,
    })),
    bills,
    period: payPeriod(today, SAMPLE_PAYDAY),
  });

describe('budgetRows', () => {
  it('matches docs/sample-data.md on Oct 31, in the design order', () => {
    const rows = rowsOn('2026-10-31');
    expect(rows.map((r) => [r.category, r.spentMinor, r.leftMinor, r.state])).toEqual([
      ['groceries', 81240, 8760, 'low'],
      ['bills', 35000, 0, 'allPaid'],
      ['coffee', 24860, 7140, 'some'],
      ['transport', 28600, 11400, 'some'],
      ['treats', 50330, 9670, 'some'],
      ['home', 80000, 0, 'allPaid'],
    ]);
    expect(budgetsSummary(rows)).toEqual({ leftMinor: 36970, onTrack: 5, total: 6 });
  });

  it("doesn't call a bill category paid before its bills have gone out", () => {
    // Oct 27: Gym (the 30th) hasn't gone out yet, so Bills isn't all paid.
    const bills27 = rowsOn('2026-10-27').find((r) => r.category === 'bills')!;
    expect(bills27.state).not.toBe('allPaid');
  });

  it('never shows less than nothing left', () => {
    const [row] = budgetRows({
      budgets: [{ categoryId: 'coffee', limitMinor: 1000 }],
      transactions: [
        {
          kind: 'expense',
          amountMinor: 1500,
          date: '2026-10-10',
          source: 'manual',
          categoryId: 'coffee',
          recurringId: null,
        },
      ],
      bills: [],
      period: payPeriod('2026-10-31', 5),
    });
    expect(row).toMatchObject({ leftMinor: 0, leftPercent: 0, state: 'low' });
  });
});

describe('quickAmounts', () => {
  it('goes around the limit the sheet opened with, as in the design', () => {
    expect(quickAmounts(90000, 5000)).toEqual([80000, 90000, 100000, 110000]);
  });

  it('never goes under one step or repeats', () => {
    expect(quickAmounts(5000, 5000)).toEqual([5000, 15000, 25000]);
  });
});
