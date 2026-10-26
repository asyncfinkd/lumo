import { payPeriod } from '../dates';
import { dueTransactions, leftToSpend, type MoneyTransaction } from '../leftToSpend';

const period = payPeriod('2026-10-31', 5); // Oct 5 → Nov 5

const spend = (amountMinor: number, date = '2026-10-20'): MoneyTransaction => ({
  kind: 'expense',
  amountMinor,
  date,
  source: 'manual',
});

describe('leftToSpend', () => {
  it('matches the example in #2', () => {
    // Income ₾5,200, bills ₾1,150, a ₾150 gift, ₾1,320.50 spent.
    const result = leftToSpend({
      plannedIncomeMinor: 520000,
      billsMinor: 115000,
      period,
      transactions: [
        { kind: 'income', amountMinor: 15000, date: '2026-10-12', source: 'manual' },
        spend(132050),
      ],
    });
    expect(result.availableMinor).toBe(420000);
    expect(result.leftMinor).toBe(287950);
    expect(result.extraIncomeMinor).toBe(15000);
  });

  it('matches docs/sample-data.md: ₾799.70 left, 70% spent', () => {
    const result = leftToSpend({
      plannedIncomeMinor: 380000,
      billsMinor: 115000,
      period,
      transactions: [
        // The salary and the bills already went through as transactions.
        { kind: 'income', amountMinor: 380000, date: '2026-10-05', source: 'recurring_income' },
        { kind: 'expense', amountMinor: 80000, date: '2026-10-10', source: 'bill' },
        { kind: 'expense', amountMinor: 18000, date: '2026-10-15', source: 'bill' },
        { kind: 'expense', amountMinor: 5000, date: '2026-10-20', source: 'bill' },
        { kind: 'expense', amountMinor: 3000, date: '2026-10-20', source: 'bill' },
        { kind: 'expense', amountMinor: 2000, date: '2026-10-12', source: 'bill' },
        { kind: 'expense', amountMinor: 7000, date: '2026-10-30', source: 'bill' },
        // Groceries, coffee, getting around, treats.
        spend(81240),
        spend(24860),
        spend(28600),
        spend(50330),
      ],
    });
    expect(result).toEqual({
      availableMinor: 265000,
      spentMinor: 185030,
      leftMinor: 79970,
      overMinor: 0,
      extraIncomeMinor: 0,
      spentPercent: 70,
    });
  });

  it('does not count bills twice: they are reserved, not spent', () => {
    const withoutBillTransaction = leftToSpend({
      plannedIncomeMinor: 380000,
      billsMinor: 80000,
      period,
      transactions: [spend(10000)],
    });
    const withBillTransaction = leftToSpend({
      plannedIncomeMinor: 380000,
      billsMinor: 80000,
      period,
      transactions: [
        spend(10000),
        { kind: 'expense', amountMinor: 80000, date: '2026-10-10', source: 'bill' },
      ],
    });
    expect(withBillTransaction).toEqual(withoutBillTransaction);
    expect(withBillTransaction.leftMinor).toBe(290000);
  });

  it('does not count the salary as extra income', () => {
    const result = leftToSpend({
      plannedIncomeMinor: 380000,
      billsMinor: 0,
      period,
      transactions: [
        { kind: 'income', amountMinor: 380000, date: '2026-10-05', source: 'recurring_income' },
      ],
    });
    expect(result.extraIncomeMinor).toBe(0);
    expect(result.availableMinor).toBe(380000);
  });

  it('ignores balance adjustments', () => {
    const result = leftToSpend({
      plannedIncomeMinor: 380000,
      billsMinor: 0,
      period,
      transactions: [
        { kind: 'income', amountMinor: 1248050, date: '2026-10-06', source: 'adjustment' },
        { kind: 'expense', amountMinor: 5000, date: '2026-10-07', source: 'adjustment' },
      ],
    });
    expect(result.leftMinor).toBe(380000);
    expect(result.spentMinor).toBe(0);
  });

  it('only counts this period', () => {
    const result = leftToSpend({
      plannedIncomeMinor: 100000,
      billsMinor: 0,
      period,
      transactions: [
        spend(1000, '2026-10-04'),
        spend(2000, '2026-10-05'),
        spend(4000, '2026-11-05'),
      ],
    });
    expect(result.spentMinor).toBe(2000);
  });

  it('shows ₾0 and the amount over when overspent', () => {
    const result = leftToSpend({
      plannedIncomeMinor: 100000,
      billsMinor: 20000,
      period,
      transactions: [spend(95000)],
    });
    expect(result.leftMinor).toBe(0);
    expect(result.overMinor).toBe(15000);
    expect(result.spentPercent).toBe(119);
  });

  it('handles nothing available', () => {
    expect(
      leftToSpend({ plannedIncomeMinor: 0, billsMinor: 0, period, transactions: [] }).spentPercent,
    ).toBe(0);
    expect(
      leftToSpend({ plannedIncomeMinor: 0, billsMinor: 0, period, transactions: [spend(500)] })
        .spentPercent,
    ).toBe(100);
  });
});

describe('dueTransactions', () => {
  const bills = [
    { id: 'rent', amountMinor: 80000, day: 10 },
    { id: 'gym', amountMinor: 7000, day: 30 },
    { id: 'internet', amountMinor: 5000, day: 1 },
  ];
  const incomes = [{ id: 'salary', amountMinor: 380000, day: 5 }];

  it('creates bill and salary transactions on or before today', () => {
    const due = dueTransactions({
      bills,
      incomes,
      period,
      today: '2026-10-31',
      trackingSince: '2026-09-01',
      existing: [],
    });
    expect(due).toEqual([
      {
        recurringId: 'salary',
        kind: 'income',
        source: 'recurring_income',
        amountMinor: 380000,
        date: '2026-10-05',
      },
      {
        recurringId: 'rent',
        kind: 'expense',
        source: 'bill',
        amountMinor: 80000,
        date: '2026-10-10',
      },
      {
        recurringId: 'gym',
        kind: 'expense',
        source: 'bill',
        amountMinor: 7000,
        date: '2026-10-30',
      },
    ]);
    // Internet is due Nov 1: inside the period, but not yet.
  });

  it('never creates the same one twice', () => {
    const due = dueTransactions({
      bills,
      incomes,
      period,
      today: '2026-10-31',
      trackingSince: '2026-09-01',
      existing: [
        { recurringId: 'salary', date: '2026-10-05' },
        { recurringId: 'rent', date: '2026-10-10' },
      ],
    });
    expect(due.map((d) => d.recurringId)).toEqual(['gym']);
  });

  it('skips bills already past due before onboarding (first period)', () => {
    // Onboarded Oct 20: rent (Oct 10) and the salary (Oct 5) happened outside the app.
    const due = dueTransactions({
      bills,
      incomes,
      period,
      today: '2026-10-31',
      trackingSince: '2026-10-20',
      existing: [],
    });
    expect(due.map((d) => d.recurringId)).toEqual(['gym']);
  });

  it('lands a bill on the 31st on the last day of a short month', () => {
    const febPeriod = payPeriod('2027-02-20', 15); // Feb 15 → Mar 15
    const due = dueTransactions({
      bills: [{ id: 'phone', amountMinor: 3000, day: 31 }],
      incomes: [],
      period: febPeriod,
      today: '2027-03-01',
      trackingSince: '2027-01-01',
      existing: [],
    });
    expect(due.map((d) => d.date)).toEqual(['2027-02-28']);
  });
});
