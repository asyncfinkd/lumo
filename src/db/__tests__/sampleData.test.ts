import { totalBalance } from '@/domain/balance';
import { payPeriod } from '@/domain/dates';
import { leftToSpend } from '@/domain/leftToSpend';
import {
  buildSampleTransactions,
  SAMPLE_BALANCE_MINOR,
  SAMPLE_PAYDAY,
  sampleBills,
  sampleBudgets,
  sampleIncomes,
} from '../sampleData';

const sum = (xs: { amountMinor: number }[]) => xs.reduce((s, x) => s + x.amountMinor, 0);

// Any day of a period, including the first and the last, shows the design's numbers.
describe.each(['2026-10-31', '2026-10-05', '2026-10-20', '2027-02-28', '2027-03-04'])(
  'sample data on %s',
  (today) => {
    const rows = buildSampleTransactions(today);
    const period = payPeriod(today, SAMPLE_PAYDAY);

    it('matches docs/sample-data.md: ₾799.70 left of ₾2,650, 70% spent', () => {
      const result = leftToSpend({
        plannedIncomeMinor: sum(sampleIncomes),
        billsMinor: sum(sampleBills),
        transactions: rows,
        period,
      });
      expect(result.availableMinor).toBe(265000);
      expect(result.leftMinor).toBe(79970);
      expect(result.spentPercent).toBe(70);
    });

    it('has a total balance of ₾12,480.50', () => {
      expect(totalBalance(rows)).toBe(SAMPLE_BALANCE_MINOR);
    });

    it('never dates anything after today or before the period', () => {
      for (const row of rows.filter((r) => r.source !== 'adjustment')) {
        expect(row.date >= period.start && row.date <= today).toBe(true);
      }
    });
  },
);

it('has the budget limits from docs/sample-data.md', () => {
  expect(sum(sampleBudgets.map((b) => ({ amountMinor: b.limitMinor })))).toBe(337000);
  expect(sum(sampleBills)).toBe(115000);
});
