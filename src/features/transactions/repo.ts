// Reading and writing transactions. Takes a `Db` so tests can run it on the
// real migrations; screens use the live hooks in ../live.ts.

import { and, desc, eq, gte, lt } from 'drizzle-orm';
import type { CategoryId } from '@/db/categories';
import { newId as defaultNewId } from '@/db/id';
import {
  incomes,
  profile,
  recurringBills,
  skippedOccurrences,
  transactions,
  type Transaction,
} from '@/db/schema';
import type { Db } from '@/db/types';
import type { CalendarDate } from '@/domain/dates';
import type { TransactionKind } from '@/domain/leftToSpend';

export type TransactionInput = {
  kind: TransactionKind;
  amountMinor: number;
  categoryId: CategoryId | null;
  title: string;
  note?: string | null;
  /** Local calendar day. */
  date: CalendarDate;
  /** The moment it happened; defaults to now. */
  occurredAt?: Date;
};

function currencyOf(db: Db) {
  const row = db.select({ currency: profile.currency }).from(profile).get();
  if (!row) throw new Error('No profile yet: finish onboarding first');
  return row.currency;
}

function assertAmount(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new RangeError(
      `Amount must be a positive whole number of minor units, got ${amountMinor}`,
    );
  }
}

/** Adds something the user typed in: always a `manual` transaction. */
export function addTransaction(db: Db, input: TransactionInput, newId = defaultNewId): Transaction {
  assertAmount(input.amountMinor);
  return db
    .insert(transactions)
    .values({
      id: newId(),
      kind: input.kind,
      amountMinor: input.amountMinor,
      currency: currencyOf(db),
      categoryId: input.categoryId,
      title: input.title,
      note: input.note ?? null,
      date: input.date,
      occurredAt: (input.occurredAt ?? new Date()).toISOString(),
      source: 'manual',
    })
    .returning()
    .get();
}

/**
 * For a bill or salary payment: `one` changes only this payment, `future` also
 * changes the bill or income it came from, so every later month follows (#50).
 */
export type Scope = 'one' | 'future';

/** Marks a bill or salary date as handled so `syncDueTransactions` never recreates it. */
function skip(db: Db, recurringId: string, date: CalendarDate, newId: () => string) {
  db.insert(skippedOccurrences)
    .values({ id: newId(), recurringId, date })
    .onConflictDoNothing()
    .run();
}

/**
 * Changes a transaction. Bill and salary payments stay linked to their bill or
 * income; moving one to another day marks its old day as handled.
 */
export function updateTransaction(
  db: Db,
  id: string,
  input: TransactionInput,
  scope: Scope = 'one',
  newId = defaultNewId,
): Transaction {
  assertAmount(input.amountMinor);
  const existing = db.select().from(transactions).where(eq(transactions.id, id)).get();
  if (!existing) throw new Error(`No transaction ${id}`);

  return db.transaction((tx) => {
    const { recurringId } = existing;
    if (recurringId && input.date !== existing.date) skip(tx, recurringId, existing.date, newId);

    if (recurringId && scope === 'future') {
      if (existing.source === 'bill') {
        tx.update(recurringBills)
          .set({
            name: input.title,
            amountMinor: input.amountMinor,
            ...(input.categoryId ? { categoryId: input.categoryId } : {}),
          })
          .where(eq(recurringBills.id, recurringId))
          .run();
      } else if (existing.source === 'recurring_income') {
        tx.update(incomes)
          .set({ name: input.title, amountMinor: input.amountMinor })
          .where(eq(incomes.id, recurringId))
          .run();
      }
    }

    return tx
      .update(transactions)
      .set({
        kind: input.kind,
        amountMinor: input.amountMinor,
        categoryId: input.categoryId,
        title: input.title,
        note: input.note ?? null,
        date: input.date,
        occurredAt: (input.occurredAt ?? new Date(existing.occurredAt)).toISOString(),
      })
      .where(eq(transactions.id, id))
      .returning()
      .get();
  });
}

/**
 * Deletes a transaction. A bill or salary payment is marked as handled so it
 * doesn't come back; with `future` the bill stops (stays in Profile, turned
 * off) or the salary stops being added (#50).
 */
export function deleteTransaction(
  db: Db,
  id: string,
  scope: Scope = 'one',
  newId = defaultNewId,
): void {
  const existing = db.select().from(transactions).where(eq(transactions.id, id)).get();
  if (!existing) return;

  db.transaction((tx) => {
    const { recurringId } = existing;
    if (recurringId) {
      skip(tx, recurringId, existing.date, newId);
      if (scope === 'future' && existing.source === 'bill') {
        tx.update(recurringBills)
          .set({ active: false })
          .where(eq(recurringBills.id, recurringId))
          .run();
      }
      if (scope === 'future' && existing.source === 'recurring_income') {
        tx.delete(incomes).where(eq(incomes.id, recurringId)).run();
      }
    }
    tx.delete(transactions).where(eq(transactions.id, id)).run();
  });
}

/** Transactions with `start <= date < end`, newest day first, then the one added last. */
export function transactionsBetween(db: Db, start: CalendarDate, end: CalendarDate) {
  return db
    .select()
    .from(transactions)
    .where(and(gte(transactions.date, start), lt(transactions.date, end)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}

export function allTransactions(db: Db) {
  return db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}
