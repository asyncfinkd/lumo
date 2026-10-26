/**
 * @jest-environment node
 */
// The write helpers and queries, run on the real migrations.
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { budgets, transactions } from '@/db/schema';
import { seedSampleData } from '@/db/seed';
import { openTestDb } from '@/db/testing';
import { totalBalance } from '@/domain/balance';
import { saveBudget } from '../budgets/repo';
import { adjustBalance, getProfile, markOnboarded, saveProfile } from '../profile/repo';
import { saveBill, saveIncome, setBillActive, syncDueTransactions } from '../recurring/repo';
import {
  addTransaction,
  deleteTransaction,
  transactionsBetween,
  updateTransaction,
} from '../transactions/repo';

const id = randomUUID;

function withProfile(onboardedOn = '2026-10-01') {
  const db = openTestDb();
  saveProfile(db, { name: 'Nika', currency: 'GEL', payday: 5 }, id);
  markOnboarded(db, new Date(`${onboardedOn}T08:00:00`));
  return db;
}

const coffee = {
  kind: 'expense' as const,
  amountMinor: 1150,
  categoryId: 'coffee' as const,
  title: 'Coffee Lab',
  date: '2026-10-31',
};

describe('profile', () => {
  it('creates once, then updates', () => {
    const db = openTestDb();
    saveProfile(db, { name: ' Nika ', currency: 'GEL', payday: 5 }, id);
    saveProfile(db, { name: 'Nika', currency: 'USD', payday: 25 }, id);
    expect(getProfile(db)).toMatchObject({ name: 'Nika', currency: 'USD', payday: 25 });
  });

  it('refuses an empty name or an impossible payday', () => {
    const db = openTestDb();
    expect(() => saveProfile(db, { name: '  ', currency: 'GEL', payday: 5 }, id)).toThrow();
    expect(() => saveProfile(db, { name: 'Nika', currency: 'GEL', payday: 32 }, id)).toThrow(
      RangeError,
    );
  });
});

describe('transactions', () => {
  it('adds a manual transaction in the profile currency', () => {
    const db = withProfile();
    const row = addTransaction(db, coffee, id);
    expect(row).toMatchObject({ source: 'manual', currency: 'GEL', amountMinor: 1150 });
  });

  it('refuses ₾0 and fractions of a tetri', () => {
    const db = withProfile();
    expect(() => addTransaction(db, { ...coffee, amountMinor: 0 }, id)).toThrow(RangeError);
    expect(() => addTransaction(db, { ...coffee, amountMinor: 11.5 }, id)).toThrow(RangeError);
  });

  it('edits keep the id; automatic ones can’t be edited', () => {
    const db = withProfile();
    const row = addTransaction(db, coffee, id);
    const edited = updateTransaction(db, row.id, { ...coffee, amountMinor: 1300, title: 'Lab' });
    expect(edited).toMatchObject({ id: row.id, amountMinor: 1300, title: 'Lab' });

    saveBill(db, { name: 'Rent', amountMinor: 80000, day: 10, categoryId: 'home' }, id);
    syncDueTransactions(db, '2026-10-31', id);
    const bill = db.select().from(transactions).where(eq(transactions.source, 'bill')).get()!;
    expect(() => updateTransaction(db, bill.id, coffee)).toThrow(/manual/);
  });

  it('deletes', () => {
    const db = withProfile();
    const row = addTransaction(db, coffee, id);
    deleteTransaction(db, row.id);
    expect(db.select().from(transactions).all()).toHaveLength(0);
  });

  it('lists a date range, end exclusive, newest first', () => {
    const db = withProfile();
    addTransaction(db, { ...coffee, date: '2026-10-04' }, id);
    addTransaction(db, { ...coffee, date: '2026-10-05', title: 'first' }, id);
    addTransaction(db, { ...coffee, date: '2026-11-04', title: 'last' }, id);
    addTransaction(db, { ...coffee, date: '2026-11-05' }, id);
    const rows = transactionsBetween(db, '2026-10-05', '2026-11-05').all();
    expect(rows.map((r) => r.title)).toEqual(['last', 'first']);
  });
});

describe('balance', () => {
  it('starts with the typed balance and fixes it with the difference', () => {
    const db = withProfile();
    adjustBalance(db, 1248050, '2026-10-01', id);
    addTransaction(db, coffee, id);
    expect(totalBalance(db.select().from(transactions).all())).toBe(1248050 - 1150);

    adjustBalance(db, 1250000, '2026-10-31', id);
    expect(totalBalance(db.select().from(transactions).all())).toBe(1250000);

    // Already right: nothing new.
    const before = db.select().from(transactions).all().length;
    adjustBalance(db, 1250000, '2026-10-31', id);
    expect(db.select().from(transactions).all()).toHaveLength(before);
  });
});

describe('budgets', () => {
  it('keeps one budget per category', () => {
    const db = withProfile();
    const input = { categoryId: 'groceries' as const, nudgeEnabled: true, nudgeAtMinor: 5000 };
    saveBudget(db, { ...input, limitMinor: 90000 }, id);
    saveBudget(db, { ...input, limitMinor: 100000 }, id);
    const rows = db.select().from(budgets).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ limitMinor: 100000, currency: 'GEL' });
  });
});

describe('syncDueTransactions', () => {
  function withRecurring(onboardedOn = '2026-10-01') {
    const db = withProfile(onboardedOn);
    saveIncome(db, { name: 'Salary', amountMinor: 380000, day: 5 }, id);
    saveBill(db, { name: 'Rent', amountMinor: 80000, day: 10, categoryId: 'home' }, id);
    saveBill(db, { name: 'Gym', amountMinor: 7000, day: 30, categoryId: 'bills' }, id);
    saveBill(db, { name: 'Internet', amountMinor: 5000, day: 1, categoryId: 'bills' }, id);
    return db;
  }

  it('adds what is due by today, with the bill’s name and category', () => {
    const db = withRecurring();
    expect(syncDueTransactions(db, '2026-10-31', id)).toBe(3);
    const rows = db.select().from(transactions).all();
    expect(rows.map((r) => [r.title, r.categoryId, r.source, r.date]).sort()).toEqual([
      ['Gym', 'bills', 'bill', '2026-10-30'],
      ['Rent', 'home', 'bill', '2026-10-10'],
      ['Salary', 'salary', 'recurring_income', '2026-10-05'],
    ]);
  });

  it('never adds the same one twice', () => {
    const db = withRecurring();
    syncDueTransactions(db, '2026-10-31', id);
    expect(syncDueTransactions(db, '2026-10-31', id)).toBe(0);
    expect(db.select().from(transactions).all()).toHaveLength(3);
  });

  it('adds the rest as days pass', () => {
    const db = withRecurring();
    syncDueTransactions(db, '2026-10-12', id);
    expect(db.select().from(transactions).all()).toHaveLength(2);
    syncDueTransactions(db, '2026-11-01', id);
    expect(db.select().from(transactions).all()).toHaveLength(4);
  });

  it('skips what was due before onboarding', () => {
    const db = withRecurring('2026-10-20');
    syncDueTransactions(db, '2026-10-31', id);
    expect(
      db
        .select()
        .from(transactions)
        .all()
        .map((r) => r.title),
    ).toEqual(['Gym']);
  });

  it('skips paused bills', () => {
    const db = withRecurring();
    const bills = db.query.recurringBills.findMany().sync();
    setBillActive(db, bills.find((b) => b.name === 'Rent')!.id, false);
    syncDueTransactions(db, '2026-10-31', id);
    expect(
      db
        .select()
        .from(transactions)
        .all()
        .map((r) => r.title)
        .sort(),
    ).toEqual(['Gym', 'Salary']);
  });

  it('does nothing before onboarding is finished', () => {
    const db = openTestDb();
    saveProfile(db, { name: 'Nika', currency: 'GEL', payday: 5 }, id);
    expect(syncDueTransactions(db, '2026-10-31', id)).toBe(0);
  });
});

describe('dev seed and due sync', () => {
  it('agree: syncing right after seeding adds nothing', () => {
    const db = openTestDb();
    seedSampleData(db, '2026-10-31', id);
    expect(syncDueTransactions(db, '2026-10-31', id)).toBe(0);
  });

  it('brings back a due bill that went missing', () => {
    const db = openTestDb();
    seedSampleData(db, '2026-10-31', id);
    db.delete(transactions).where(eq(transactions.title, 'Rent')).run();
    expect(syncDueTransactions(db, '2026-10-31', id)).toBe(1);
  });
});
