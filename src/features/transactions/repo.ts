// Reading and writing transactions. Takes a `Db` so tests can run it on the
// real migrations; screens use the live hooks in ../live.ts.

import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { AccountId } from '@/db/accounts';
import type { CategoryId } from '@/db/categories';
import { defaultAccountId } from '@/db/defaultAccount';
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
import type { HistoryFilter, SearchWord } from '../history/history';

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
  /** Where the money came from or went; Main when left out (#21). */
  accountId?: AccountId;
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
      accountId: input.accountId ?? defaultAccountId(db),
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
export function skip(db: Db, recurringId: string, date: CalendarDate, newId: () => string) {
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
        accountId: input.accountId ?? existing.accountId,
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

/** Every transaction, or one account's, newest day first (History lists them all). */
export function transactionsList(db: Db, accountId: string | null = null) {
  return db
    .select()
    .from(transactions)
    .where(accountId ? eq(transactions.accountId, accountId) : undefined)
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}

/** One transaction (TransactionDetail, EditTransaction, the delete dialog). */
export function transactionById(db: Db, id: string) {
  return db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
}

/**
 * What came in and went out per category with `start <= date < end`, bills
 * included, adjustments never (Insights, Profile → Categories).
 */
export function categoryTotalsQuery(db: Db, start: CalendarDate, end: CalendarDate) {
  return db
    .select({
      categoryId: transactions.categoryId,
      kind: transactions.kind,
      amountMinor: sql<number>`sum(${transactions.amountMinor})`.mapWith(Number),
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.date, start),
        lt(transactions.date, end),
        ne(transactions.source, 'adjustment'),
        isNotNull(transactions.categoryId),
      ),
    )
    .groupBy(transactions.categoryId, transactions.kind);
}

/** Came in and went out with `start <= date < end`, adjustments left out. */
export function flowTotalsQuery(db: Db, start: CalendarDate, end: CalendarDate) {
  return db
    .select({
      kind: transactions.kind,
      amountMinor: sql<number>`sum(${transactions.amountMinor})`.mapWith(Number),
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.date, start),
        lt(transactions.date, end),
        ne(transactions.source, 'adjustment'),
      ),
    )
    .groupBy(transactions.kind);
}

/** Days with something you added yourself, `start <= date < end` (evening reminders). */
export function manualDatesQuery(db: Db, start: CalendarDate, end: CalendarDate) {
  return db
    .selectDistinct({ date: transactions.date })
    .from(transactions)
    .where(
      and(
        eq(transactions.source, 'manual'),
        gte(transactions.date, start),
        lt(transactions.date, end),
      ),
    );
}

/**
 * The expense (or income) you added or changed last in one of `accountIds`,
 * as a list of at most one for `lastUsedAccount`.
 */
export function lastUsedQuery(db: Db, kind: TransactionKind, accountIds: readonly string[]) {
  return db
    .select({
      kind: transactions.kind,
      source: transactions.source,
      accountId: transactions.accountId,
      updatedAt: transactions.updatedAt,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.kind, kind),
        eq(transactions.source, 'manual'),
        inArray(transactions.accountId, [...accountIds]),
      ),
    )
    .orderBy(desc(transactions.updatedAt))
    .limit(1);
}

/** Georgian has a capital script (Mtavruli) nobody types in names; its letters match as typed. */
const GEORGIAN = /[\u10a0-\u10ff\u1c90-\u1cbf\u2d00-\u2d2f]/;

/**
 * `text` anywhere, `%` and `_` matching themselves. SQLite's LIKE ignores case
 * for ASCII only, so any other letter that has a case matches any one
 * character; `searchTransactions` then checks the case-folded text exactly.
 */
export function likePattern(text: string): string {
  const pattern = [...text]
    .map((c) => {
      if (c === '\\' || c === '%' || c === '_') return `\\${c}`;
      const cased = c > '\x7f' && c.toLowerCase() !== c.toUpperCase() && !GEORGIAN.test(c);
      return cased ? '_' : c;
    })
    .join('');
  return `%${pattern}%`;
}

export type SearchInput = {
  /** What was typed, trimmed. Empty lists the most recent the chip allows. */
  query: string;
  /** The query word by word (`searchTerms`); every word has to match somewhere. */
  words: readonly SearchWord[];
  filter: HistoryFilter;
  /** At most this many, newest first. Only for the empty query: a search returns every match. */
  limit?: number;
};

/** One word in the name, the note, the category or the amount. */
function wordMatches(word: SearchWord): SQL | undefined {
  const pattern = likePattern(word.text);
  const amount = sql`cast(${transactions.amountMinor} as text)`;
  return or(
    sql`${transactions.title} like ${pattern} escape '\\'`,
    sql`${transactions.note} like ${pattern} escape '\\'`,
    word.categoryIds.length > 0 ? inArray(transactions.categoryId, word.categoryIds) : undefined,
    word.adjustments ? eq(transactions.source, 'adjustment') : undefined,
    word.digits ? sql`${amount} like ${likePattern(word.digits)} escape '\\'` : undefined,
    // "0", "0.0": amounts under one unit show a leading zero ("0.05").
    word.digits === '0' ? lt(transactions.amountMinor, 100) : undefined,
  );
}

/**
 * HistorySearch in SQL (issue 111): the chip, then each word in the name or
 * note (`LIKE`), the category or the amount. Finds everything
 * `searchTransactions` would and a little more (case, words in other order),
 * which the screen narrows away.
 */
export function searchQuery(db: Db, input: SearchInput) {
  const conditions: (SQL | undefined)[] = [];
  const notAdjustment = ne(transactions.source, 'adjustment');
  if (input.filter === 'spending') conditions.push(eq(transactions.kind, 'expense'), notAdjustment);
  if (input.filter === 'income') conditions.push(eq(transactions.kind, 'income'), notAdjustment);
  if (input.filter === 'auto') {
    conditions.push(inArray(transactions.source, ['bill', 'recurring_income']));
  }
  conditions.push(...input.words.map(wordMatches));
  const query = db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
  return input.query || input.limit === undefined ? query : query.limit(input.limit);
}

/** For the export: `start <= date < end` (`null`: from the first), oldest first. */
export function exportQuery(db: Db, start: CalendarDate | null, end: CalendarDate) {
  return db
    .select()
    .from(transactions)
    .where(and(start ? gte(transactions.date, start) : undefined, lt(transactions.date, end)))
    .orderBy(asc(transactions.date), asc(transactions.occurredAt));
}

/** How many the export would hold. */
export function exportCountQuery(db: Db, start: CalendarDate | null, end: CalendarDate) {
  return db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(transactions)
    .where(and(start ? gte(transactions.date, start) : undefined, lt(transactions.date, end)));
}
