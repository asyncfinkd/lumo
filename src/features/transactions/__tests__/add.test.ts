import { buildSampleTransactions, SAMPLE_PAYDAY } from '@/db/sampleData';
import { categorySpent } from '@/domain/budgets';
import { payPeriod } from '@/domain/dates';
import { editedTitle, occurredAt, pickableDays, shortDate, transactionTitle } from '../addForm';

// docs/sample-data.md on Oct 31.
const today = '2026-10-31';
const period = payPeriod(today, SAMPLE_PAYDAY);
const transactions = buildSampleTransactions(today);

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

describe('editedTitle', () => {
  it('uses a typed note', () => {
    expect(editedTitle({ title: 'Groceries', note: null }, 'Groceries', ' Market ', 'Coffee')).toBe(
      'Market',
    );
  });

  it('follows the new category when the title was the old category', () => {
    expect(editedTitle({ title: 'Groceries', note: null }, 'Groceries', '', 'Coffee')).toBe(
      'Coffee',
    );
    // The note was the title and got cleared.
    expect(editedTitle({ title: 'Lunch', note: 'Lunch' }, 'Treats', '', 'Treats')).toBe('Treats');
  });

  it('keeps any other title', () => {
    expect(editedTitle({ title: 'Fresh Market', note: null }, 'Groceries', '', 'Coffee')).toBe(
      'Fresh Market',
    );
  });
});
