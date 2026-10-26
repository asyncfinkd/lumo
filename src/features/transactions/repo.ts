// Reading and writing transactions. Takes a `Db` so tests can run it on the
// real migrations; screens use the live hooks in ../live.ts.

import { and, desc, eq, gte, lt } from 'drizzle-orm';
import type { CategoryId } from '@/db/categories';
import { newId as defaultNewId } from '@/db/id';
import { profile, transactions, type Transaction } from '@/db/schema';
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

/** Changes a transaction the user typed in. Automatic ones (bills, salary) can't be edited. */
export function updateTransaction(db: Db, id: string, input: TransactionInput): Transaction {
  assertAmount(input.amountMinor);
  const existing = db.select().from(transactions).where(eq(transactions.id, id)).get();
  if (!existing) throw new Error(`No transaction ${id}`);
  if (existing.source !== 'manual') throw new Error(`Only manual transactions can be edited`);
  return db
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
}

export function deleteTransaction(db: Db, id: string): void {
  db.delete(transactions).where(eq(transactions.id, id)).run();
}

/** Transactions with `start <= date < end`, newest first. */
export function transactionsBetween(db: Db, start: CalendarDate, end: CalendarDate) {
  return db
    .select()
    .from(transactions)
    .where(and(gte(transactions.date, start), lt(transactions.date, end)))
    .orderBy(desc(transactions.date), desc(transactions.occurredAt));
}

export function allTransactions(db: Db) {
  return db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.date), desc(transactions.occurredAt));
}
