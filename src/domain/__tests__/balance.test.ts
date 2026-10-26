import { balanceAdjustment, totalBalance } from '../balance';
import { payPeriod } from '../dates';
import { leftToSpend, type MoneyTransaction } from '../leftToSpend';

const start: MoneyTransaction = {
  kind: 'income',
  amountMinor: 1248050,
  date: '2026-10-01',
  source: 'adjustment',
};

describe('totalBalance', () => {
  it('is not set until there is a starting balance', () => {
    expect(totalBalance([])).toBeNull();
    expect(
      totalBalance([{ kind: 'expense', amountMinor: 1150, date: '2026-10-31', source: 'manual' }]),
    ).toBeNull();
  });

  it('adds income and subtracts expenses on top of the starting balance', () => {
    expect(
      totalBalance([
        start,
        { kind: 'income', amountMinor: 380000, date: '2026-10-05', source: 'recurring_income' },
        { kind: 'expense', amountMinor: 80000, date: '2026-10-10', source: 'bill' },
        { kind: 'expense', amountMinor: 1150, date: '2026-10-31', source: 'manual' },
      ]),
    ).toBe(1248050 + 380000 - 80000 - 1150);
  });

  it('counts every adjustment, also ones that lower the balance', () => {
    expect(
      totalBalance([
        start,
        { kind: 'expense', amountMinor: 2050, date: '2026-10-20', source: 'adjustment' },
      ]),
    ).toBe(1246000);
  });

  it('changes when an old transaction is deleted', () => {
    const coffee: MoneyTransaction = {
      kind: 'expense',
      amountMinor: 1150,
      date: '2026-10-02',
      source: 'manual',
    };
    expect(totalBalance([start, coffee])).toBe(1246900);
    expect(totalBalance([start])).toBe(1248050);
  });
});

describe('balanceAdjustment', () => {
  it('turns the starting balance into the first adjustment', () => {
    expect(balanceAdjustment(null, 1248050)).toEqual({ kind: 'income', amountMinor: 1248050 });
    // Even ₾0 counts: the balance is then set.
    expect(balanceAdjustment(null, 0)).toEqual({ kind: 'income', amountMinor: 0 });
  });

  it('stores only the difference', () => {
    expect(balanceAdjustment(1248050, 1250000)).toEqual({ kind: 'income', amountMinor: 1950 });
    expect(balanceAdjustment(1248050, 1240000)).toEqual({ kind: 'expense', amountMinor: 8050 });
  });

  it('does nothing when the balance is already right', () => {
    expect(balanceAdjustment(1248050, 1248050)).toBeNull();
  });

  it('never changes Left to spend', () => {
    const period = payPeriod('2026-10-31', 5);
    const before = leftToSpend({
      plannedIncomeMinor: 380000,
      billsMinor: 115000,
      period,
      transactions: [],
    });
    const fix = balanceAdjustment(1248050, 1240000);
    const after = leftToSpend({
      plannedIncomeMinor: 380000,
      billsMinor: 115000,
      period,
      transactions: [{ ...fix!, date: '2026-10-31', source: 'adjustment' }],
    });
    expect(after).toEqual(before);
  });
});
