import {
  buildSampleTransactions,
  SAMPLE_PAYDAY,
  sampleBills,
  sampleBudgets,
  sampleIncomes,
} from '@/db/sampleData';
import { categorySpent } from '@/domain/budgets';
import { payPeriod } from '@/domain/dates';
import { summarizeMonth } from '../../money/summary';
import { occurredAt, pickableDays, shortDate, transactionTitle } from '../addForm';
import { addMessage, messageTone } from '../addMessage';

// docs/sample-data.md on Oct 31.
const today = '2026-10-31';
const period = payPeriod(today, SAMPLE_PAYDAY);
const transactions = buildSampleTransactions(today);
const { left } = summarizeMonth({
  today,
  payday: SAMPLE_PAYDAY,
  incomes: sampleIncomes,
  bills: sampleBills,
  transactions,
});
const base = { budgets: sampleBudgets, bills: sampleBills, transactions, period, left };

describe('categorySpent', () => {
  it('matches the budgets table, bills included', () => {
    expect(categorySpent(transactions, 'coffee', period)).toBe(24860);
    expect(categorySpent(transactions, 'groceries', period)).toBe(81240);
    expect(categorySpent(transactions, 'home', period)).toBe(80000);
    expect(categorySpent(transactions, 'bills', period)).toBe(35000);
  });

  it('leaves out income, adjustments and other periods', () => {
    const extra = [
      {
        kind: 'expense' as const,
        amountMinor: 999,
        date: today,
        source: 'adjustment' as const,
        categoryId: 'coffee',
      },
      {
        kind: 'expense' as const,
        amountMinor: 999,
        date: '2026-10-04',
        source: 'manual' as const,
        categoryId: 'coffee',
      },
      {
        kind: 'income' as const,
        amountMinor: 999,
        date: today,
        source: 'manual' as const,
        categoryId: 'coffee',
      },
    ];
    expect(categorySpent([...transactions, ...extra], 'coffee', period)).toBe(24860);
  });
});

describe('addMessage', () => {
  it('shows what stays in the budget: ₾24.50 coffee leaves ₾46.90 (design)', () => {
    const message = addMessage({ ...base, kind: 'expense', category: 'coffee', amountMinor: 2450 });
    expect(message).toEqual({ type: 'stillLeft', category: 'coffee', amountMinor: 4690 });
    expect(messageTone(message)).toBe('good');
  });

  it('says how far over, calmly', () => {
    const message = addMessage({
      ...base,
      kind: 'expense',
      category: 'groceries',
      amountMinor: 10000,
    });
    expect(message).toEqual({ type: 'over', category: 'groceries', amountMinor: 1240 });
    expect(messageTone(message)).toBe('calm');
  });

  it('calls categories with a bill covered', () => {
    expect(addMessage({ ...base, kind: 'expense', category: 'home', amountMinor: 500 })).toEqual({
      type: 'covered',
      category: 'home',
    });
  });

  it('falls back to Left to spend without a budget', () => {
    const noBudgets = { ...base, budgets: [] };
    expect(
      addMessage({ ...noBudgets, kind: 'expense', category: 'treats', amountMinor: 970 }),
    ).toEqual({
      type: 'stillLeftToSpend',
      amountMinor: 79000,
    });
    expect(
      addMessage({ ...noBudgets, kind: 'expense', category: 'treats', amountMinor: 80000 }),
    ).toEqual({
      type: 'overMonth',
      amountMinor: 30,
    });
  });

  it('cheers income', () => {
    expect(addMessage({ ...base, kind: 'income', category: 'gift', amountMinor: 5000 })).toEqual({
      type: 'income',
    });
  });
});

describe('add form', () => {
  it('lets you pick payday up to today', () => {
    const days = pickableDays(period, today);
    expect(days[0]).toBe('2026-10-05');
    expect(days.at(-1)).toBe(today);
    expect(days).toHaveLength(27);
    expect(pickableDays(period, '2026-10-05')).toEqual(['2026-10-05']);
  });

  it('keeps the current time on another day', () => {
    const at = occurredAt('2026-10-29', new Date(2026, 9, 31, 18, 20, 5));
    expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours(), at.getMinutes()]).toEqual(
      [2026, 9, 29, 18, 20],
    );
  });

  it('uses the note as the title, or the category name', () => {
    expect(transactionTitle('  Coffee Lab ', 'Coffee')).toBe('Coffee Lab');
    expect(transactionTitle('   ', 'Coffee')).toBe('Coffee');
  });

  it('writes short dates', () => {
    expect(shortDate('2026-10-31', 'en')).toBe('Oct 31');
  });
});
