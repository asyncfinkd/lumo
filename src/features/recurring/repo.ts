// Monthly bills and incomes, and the transactions they create (#4).

import { and, eq, gte, isNotNull, lt } from 'drizzle-orm';
import type { CategoryId } from '@/db/categories';
import { newId as defaultNewId } from '@/db/id';
import { incomes, profile, recurringBills, skippedOccurrences, transactions } from '@/db/schema';
import type { Db } from '@/db/types';
import { type CalendarDate, payPeriod, toCalendarDate } from '@/domain/dates';
import { dueTransactions } from '@/domain/leftToSpend';

export function billsQuery(db: Db) {
  return db.select().from(recurringBills);
}

export function incomesQuery(db: Db) {
  return db.select().from(incomes);
}

function currencyOf(db: Db) {
  const row = db.select({ currency: profile.currency }).from(profile).get();
  if (!row) throw new Error('No profile yet');
  return row.currency;
}

function assertRecurring(amountMinor: number, day: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError(`Amount must be 0 or more minor units, got ${amountMinor}`);
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new RangeError(`day must be 1–31, got ${day}`);
  }
}

export type BillInput = { name: string; amountMinor: number; day: number; categoryId: CategoryId };

export function saveBill(db: Db, input: BillInput & { id?: string }, newId = defaultNewId) {
  assertRecurring(input.amountMinor, input.day);
  const values = {
    name: input.name.trim(),
    amountMinor: input.amountMinor,
    day: input.day,
    categoryId: input.categoryId,
    currency: currencyOf(db),
  };
  if (input.id) {
    return db
      .update(recurringBills)
      .set(values)
      .where(eq(recurringBills.id, input.id))
      .returning()
      .get();
  }
  return db
    .insert(recurringBills)
    .values({ id: newId(), ...values })
    .returning()
    .get();
}

/** "Remind me a day before" (ProfileBillEdit). */
export function setBillRemind(db: Db, id: string, remind: boolean): void {
  db.update(recurringBills).set({ remind }).where(eq(recurringBills.id, id)).run();
}

/**
 * Deletes a bill (ProfileBillEdit). Its past transactions stay in History as
 * they were; nothing new is added for it.
 */
export function deleteBill(db: Db, id: string): void {
  db.transaction((tx) => {
    tx.delete(skippedOccurrences).where(eq(skippedOccurrences.recurringId, id)).run();
    tx.delete(recurringBills).where(eq(recurringBills.id, id)).run();
  });
}

/** Stops a bill from now on; its past transactions stay. */
export function setBillActive(db: Db, id: string, active: boolean): void {
  db.update(recurringBills).set({ active }).where(eq(recurringBills.id, id)).run();
}

export type IncomeInput = { name: string; amountMinor: number; day: number };

export function saveIncome(db: Db, input: IncomeInput & { id?: string }, newId = defaultNewId) {
  assertRecurring(input.amountMinor, input.day);
  const values = {
    name: input.name.trim(),
    amountMinor: input.amountMinor,
    day: input.day,
    currency: currencyOf(db),
  };
  if (input.id) {
    return db.update(incomes).set(values).where(eq(incomes.id, input.id)).returning().get();
  }
  return db
    .insert(incomes)
    .values({ id: newId(), ...values })
    .returning()
    .get();
}

export function deleteIncome(db: Db, id: string): void {
  db.delete(incomes).where(eq(incomes.id, id)).run();
}

/**
 * Creates the bill and salary transactions that are due by `today` in the
 * current pay period and don't exist yet. Safe to run as often as you like:
 * the unique (recurring id, date) index never lets one in twice.
 * Returns how many it added.
 */
export function syncDueTransactions(db: Db, today: CalendarDate, newId = defaultNewId): number {
  const me = db.select().from(profile).get();
  if (!me?.onboardedAt) return 0;

  const period = payPeriod(today, me.payday);
  const bills = db.select().from(recurringBills).where(eq(recurringBills.active, true)).all();
  const allIncomes = db.select().from(incomes).all();
  const existing = db
    .select({ recurringId: transactions.recurringId, date: transactions.date })
    .from(transactions)
    .where(
      and(
        isNotNull(transactions.recurringId),
        gte(transactions.date, period.start),
        lt(transactions.date, period.end),
      ),
    )
    .all()
    .map((row) => ({ recurringId: row.recurringId!, date: row.date }));
  // Payments the user deleted or moved count as done too (#50).
  const skipped = db
    .select({ recurringId: skippedOccurrences.recurringId, date: skippedOccurrences.date })
    .from(skippedOccurrences)
    .where(and(gte(skippedOccurrences.date, period.start), lt(skippedOccurrences.date, period.end)))
    .all();

  const due = dueTransactions({
    bills: bills.map((b) => ({ id: b.id, amountMinor: b.amountMinor, day: b.day })),
    incomes: allIncomes.map((i) => ({ id: i.id, amountMinor: i.amountMinor, day: i.day })),
    period,
    today,
    trackingSince: toCalendarDate(new Date(me.onboardedAt)),
    existing: [...existing, ...skipped],
  });
  if (due.length === 0) return 0;

  const billById = new Map(bills.map((b) => [b.id, b]));
  const incomeById = new Map(allIncomes.map((i) => [i.id, i]));
  db.transaction((tx) => {
    for (const d of due) {
      const bill = billById.get(d.recurringId);
      const income = incomeById.get(d.recurringId);
      tx.insert(transactions)
        .values({
          id: newId(),
          kind: d.kind,
          amountMinor: d.amountMinor,
          currency: me.currency,
          categoryId: bill ? bill.categoryId : 'salary',
          title: bill?.name ?? income?.name ?? '',
          date: d.date,
          // Bills and pay land in the morning of their day.
          occurredAt: new Date(`${d.date}T09:00:00`).toISOString(),
          source: d.source,
          recurringId: d.recurringId,
        })
        .onConflictDoNothing()
        .run();
    }
  });
  return due.length;
}
