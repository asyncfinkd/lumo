// Writing fixed and sample rows, and wiping user data. Works with any synchronous
// Drizzle SQLite database: expo-sqlite in the app, better-sqlite3 in tests.

import { count, sql } from 'drizzle-orm';
import type { CalendarDate } from '@/domain/dates';
import { CATEGORY_ROWS } from './categories';
import {
  buildSampleTransactions,
  sampleBills,
  sampleBudgets,
  sampleIncomes,
  sampleOnboardedOn,
  sampleProfile,
} from './sampleData';
import * as schema from './schema';
import type { Db } from './types';

export type { Db } from './types';
type NewId = () => string;

/** Adds the fixed categories; safe to run on every start. */
/**
 * Puts the default categories into an empty table (a new install). Once there
 * are categories they're the person's: a deleted default doesn't come back.
 */
export function ensureCategories(db: Db): void {
  const [row] = db.select({ n: count() }).from(schema.categories).all();
  if ((row?.n ?? 0) > 0) return;
  db.insert(schema.categories).values(CATEGORY_ROWS).run();
}

export function hasProfile(db: Db): boolean {
  const [row] = db.select({ n: count() }).from(schema.profile).all();
  return (row?.n ?? 0) > 0;
}

/**
 * Fills an empty database with docs/sample-data.md. Development only: the app
 * calls it under `__DEV__` when there's no profile yet.
 */
export function seedSampleData(db: Db, today: CalendarDate, newId: NewId): void {
  const currency = sampleProfile.currency;
  db.transaction((tx) => {
    tx.insert(schema.profile)
      .values({
        id: newId(),
        ...sampleProfile,
        onboardedAt: new Date(`${sampleOnboardedOn(today)}T09:00:00`).toISOString(),
      })
      .run();

    const recurringIds = new Map<string, string>();
    for (const income of sampleIncomes) {
      const id = newId();
      recurringIds.set(income.key, id);
      tx.insert(schema.incomes)
        .values({
          id,
          name: income.name,
          amountMinor: income.amountMinor,
          currency,
          day: income.day,
        })
        .run();
    }
    for (const bill of sampleBills) {
      const id = newId();
      recurringIds.set(bill.key, id);
      tx.insert(schema.recurringBills)
        .values({
          id,
          name: bill.name,
          amountMinor: bill.amountMinor,
          currency,
          day: bill.day,
          categoryId: bill.categoryId,
        })
        .run();
    }
    for (const budget of sampleBudgets) {
      tx.insert(schema.budgets)
        .values({ id: newId(), ...budget, currency, nudgeAtMinor: 5000 })
        .run();
    }
    for (const t of buildSampleTransactions(today)) {
      tx.insert(schema.transactions)
        .values({
          id: newId(),
          kind: t.kind,
          amountMinor: t.amountMinor,
          currency,
          categoryId: t.categoryId,
          title: t.title,
          date: t.date,
          // The local wall-clock time on that date, stored as an instant.
          occurredAt: new Date(`${t.date}T${t.time}:00`).toISOString(),
          source: t.source,
          recurringId: t.recurringKey ? (recurringIds.get(t.recurringKey) ?? null) : null,
        })
        .run();
    }
  });
}

/** "Delete all data" in Profile: everything the user entered. Categories stay. */
export function deleteAllData(db: Db): void {
  // `WHERE 1` turns off SQLite's truncate shortcut, which skips the change hook
  // and would leave live queries showing the old rows.
  const all = sql`1`;
  db.transaction((tx) => {
    tx.delete(schema.transactions).where(all).run();
    tx.delete(schema.skippedOccurrences).where(all).run();
    tx.delete(schema.budgets).where(all).run();
    tx.delete(schema.recurringBills).where(all).run();
    tx.delete(schema.incomes).where(all).run();
    tx.delete(schema.profile).where(all).run();
    // Back to the default categories, as on a new install.
    tx.delete(schema.categories).where(all).run();
    tx.insert(schema.categories).values(CATEGORY_ROWS).run();
  });
}
