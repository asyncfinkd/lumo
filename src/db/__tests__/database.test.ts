/**
 * @jest-environment node
 */
// Runs the real migrations on an in-memory SQLite database (better-sqlite3 in
// Node instead of expo-sqlite on a phone) and exercises the seed helpers.
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { totalBalance } from '@/domain/balance';
import { CATEGORY_ROWS } from '../categories';
import * as schema from '../schema';
import { deleteAllData, ensureCategories, hasProfile, seedSampleData } from '../seed';
import { openTestDb as openDb } from '../testing';

describe('database', () => {
  it('migrates an empty database and adds the fixed categories once', () => {
    const db = openDb();
    ensureCategories(db);
    ensureCategories(db);
    expect(db.select().from(schema.categories).all()).toHaveLength(CATEGORY_ROWS.length);
    expect(hasProfile(db)).toBe(false);
  });

  it('loads the sample data', () => {
    const db = openDb();
    ensureCategories(db);
    seedSampleData(db, '2026-10-31', randomUUID);

    expect(hasProfile(db)).toBe(true);
    expect(db.select().from(schema.recurringBills).all()).toHaveLength(6);
    expect(db.select().from(schema.budgets).all()).toHaveLength(6);

    const rows = db.select().from(schema.transactions).all();
    expect(totalBalance(rows)).toBe(1248050);

    // Bill transactions point at their bill, so they're never created twice (#4).
    const rent = db
      .select()
      .from(schema.recurringBills)
      .where(eq(schema.recurringBills.name, 'Rent'))
      .get();
    expect(rows.filter((r) => r.recurringId === rent!.id)).toHaveLength(1);
  });

  it('refuses a second transaction for the same bill on the same day', () => {
    const db = openDb();
    ensureCategories(db);
    seedSampleData(db, '2026-10-31', randomUUID);
    const bill = db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.source, 'bill'))
      .get()!;
    expect(() =>
      db
        .insert(schema.transactions)
        .values({ ...bill, id: randomUUID() })
        .run(),
    ).toThrow(/UNIQUE/);
  });

  it('refuses negative amounts and impossible days', () => {
    const db = openDb();
    ensureCategories(db);
    expect(() =>
      db
        .insert(schema.incomes)
        .values({ id: randomUUID(), name: 'Salary', amountMinor: -1, currency: 'GEL', day: 5 })
        .run(),
    ).toThrow(/CHECK/);
    expect(() =>
      db
        .insert(schema.incomes)
        .values({ id: randomUUID(), name: 'Salary', amountMinor: 100, currency: 'GEL', day: 32 })
        .run(),
    ).toThrow(/CHECK/);
  });

  it('deletes all user data but keeps the categories', () => {
    const db = openDb();
    ensureCategories(db);
    seedSampleData(db, '2026-10-31', randomUUID);
    deleteAllData(db);

    expect(hasProfile(db)).toBe(false);
    expect(db.select().from(schema.transactions).all()).toHaveLength(0);
    expect(db.select().from(schema.budgets).all()).toHaveLength(0);
    expect(db.select().from(schema.recurringBills).all()).toHaveLength(0);
    expect(db.select().from(schema.incomes).all()).toHaveLength(0);
    expect(db.select().from(schema.categories).all()).toHaveLength(CATEGORY_ROWS.length);
  });
});
