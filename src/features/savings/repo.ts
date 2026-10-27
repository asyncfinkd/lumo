// Savings jars (Savings, SavingsAdd, SavingsNew, SavingsDone). Money in a jar
// is a jar entry, not a transaction: it leaves the balance and nothing else.

import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { newId as defaultNewId } from '@/db/id';
import { jarEntries, jars, profile } from '@/db/schema';
import type { Db } from '@/db/types';
import type { CalendarDate } from '@/domain/dates';
import type { Cadence, JarTone } from './savings';

export function openJarsQuery(db: Db) {
  return db.select().from(jars).where(isNull(jars.closedAt)).orderBy(asc(jars.createdAt));
}

export function jarEntriesQuery(db: Db) {
  return db.select().from(jarEntries);
}

/** What's in one jar right now. */
export function jarSaved(db: Db, jarId: string): number {
  const row = db
    .select({ total: sql<number>`coalesce(sum(${jarEntries.amountMinor}), 0)` })
    .from(jarEntries)
    .where(eq(jarEntries.jarId, jarId))
    .get();
  return row?.total ?? 0;
}

function assertPositive(name: string, minor: number) {
  if (!Number.isSafeInteger(minor) || minor <= 0) {
    throw new RangeError(`${name} must be more than 0 minor units, got ${minor}`);
  }
}

export type JarInput = {
  name: string;
  tone: JarTone;
  goalMinor: number;
  planMinor: number;
  cadence: Cadence;
};

/** "Create jar" (SavingsNew). Returns the new jar's id. */
export function createJar(
  db: Db,
  input: JarInput,
  today: CalendarDate,
  newId = defaultNewId,
): string {
  const name = input.name.trim();
  if (!name) throw new Error('Name is required');
  assertPositive('goalMinor', input.goalMinor);
  assertPositive('planMinor', input.planMinor);
  const me = db.select({ currency: profile.currency }).from(profile).get();
  if (!me) throw new Error('No profile yet');
  const id = newId();
  db.insert(jars)
    .values({
      id,
      name,
      tone: input.tone,
      goalMinor: input.goalMinor,
      planMinor: input.planMinor,
      cadence: input.cadence,
      currency: me.currency,
      startDate: today,
    })
    .run();
  return id;
}

/** "Drop ₾100 in the jar" (SavingsAdd): moves money from the balance into the jar. */
export function addToJar(
  db: Db,
  jarId: string,
  amountMinor: number,
  date: CalendarDate,
  newId = defaultNewId,
): void {
  assertPositive('amountMinor', amountMinor);
  db.insert(jarEntries).values({ id: newId(), jarId, amountMinor, date }).run();
}

/** "Take money out": back from the jar to the balance, never more than is in it. */
export function takeFromJar(
  db: Db,
  jarId: string,
  amountMinor: number,
  date: CalendarDate,
  newId = defaultNewId,
): void {
  assertPositive('amountMinor', amountMinor);
  if (amountMinor > jarSaved(db, jarId)) throw new RangeError('More than is in the jar');
  db.insert(jarEntries).values({ id: newId(), jarId, amountMinor: -amountMinor, date }).run();
}

/**
 * "Time to treat yourself" (SavingsDone): the jar closes and everything in it
 * goes back to the balance, to spend.
 */
export function closeJar(db: Db, jarId: string, date: CalendarDate, newId = defaultNewId): void {
  db.transaction((tx) => {
    const saved = jarSaved(tx, jarId);
    if (saved !== 0) {
      tx.insert(jarEntries).values({ id: newId(), jarId, amountMinor: -saved, date }).run();
    }
    tx.update(jars)
      .set({ closedAt: new Date().toISOString() })
      .where(and(eq(jars.id, jarId), isNull(jars.closedAt)))
      .run();
  });
}
