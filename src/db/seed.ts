// Writing fixed and sample rows, and wiping user data. Works with any synchronous
// Drizzle SQLite database: expo-sqlite in the app, better-sqlite3 in tests.

import { count } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { CalendarDate } from '@/domain/dates';
import { CATEGORY_ROWS } from './categories';
import {
  buildSampleTransactions,
  sampleBills,
  sampleBudgets,
  sampleIncomes,
  sampleProfile,
} from './sampleData';
import * as schema from './schema';

export type Db = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
type NewId = () => string;

/** Adds the fixed categories; safe to run on every start. */
export function ensureCategories(db: Db): void {
  db.insert(schema.categories).values(CATEGORY_ROWS).onConflictDoNothing().run();
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
      .values({ id: newId(), ...sampleProfile, onboardedAt: new Date().toISOString() })
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
  db.transaction((tx) => {
    tx.delete(schema.transactions).run();
    tx.delete(schema.budgets).run();
    tx.delete(schema.recurringBills).run();
    tx.delete(schema.incomes).run();
    tx.delete(schema.profile).run();
  });
}
