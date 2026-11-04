// The sums behind the pay-period summary and the balance (issue 111). SQL adds the
// rows up, so a screen gets a few numbers instead of every transaction; the
// rules stay in the pure functions (summary.ts, domain/) that read these.
// Amounts are summed as integer minor units, never divided (ADR 0003).
//
// Each query reads one table: live queries only watch the table they select from.

import { and, eq, gte, lt, or, sql } from 'drizzle-orm';
import { jarEntries, transactions, transfers } from '@/db/schema';
import type { Db } from '@/db/types';
import type { BalanceTotals } from '@/domain/balance';
import type { CalendarDate } from '@/domain/dates';

/** Income +, expense −: what a transaction does to the balance. */
export const signedAmount = sql<number>`case when ${transactions.kind} = 'income' then ${transactions.amountMinor} else -${transactions.amountMinor} end`;

/**
 * Transactions with `start <= date < end`, summed per day, kind and source:
 * at most a few rows a day, and each one reads like a transaction to
 * `summarizePeriod` and `leftToSpend`.
 */
export function periodFlowQuery(db: Db, start: CalendarDate, end: CalendarDate) {
  return db
    .select({
      date: transactions.date,
      kind: transactions.kind,
      source: transactions.source,
      amountMinor: sql<number>`sum(${transactions.amountMinor})`.mapWith(Number),
    })
    .from(transactions)
    .where(and(gte(transactions.date, start), lt(transactions.date, end)))
    .groupBy(transactions.date, transactions.kind, transactions.source);
}

/**
 * The transactions' part of the balance: everything, and only what's dated
 * before `since` (the 1st of the month Home compares with). One row.
 */
export function transactionBalanceQuery(db: Db, since: CalendarDate) {
  const before = sql`${transactions.date} < ${since}`;
  const adjustment = sql`${transactions.source} = 'adjustment'`;
  return db
    .select({
      netMinor: sql<number>`coalesce(sum(${signedAmount}), 0)`.mapWith(Number),
      netBeforeMinor:
        sql<number>`coalesce(sum(case when ${before} then ${signedAmount} else 0 end), 0)`.mapWith(
          Number,
        ),
      adjustments: sql<number>`coalesce(sum(case when ${adjustment} then 1 else 0 end), 0)`.mapWith(
        Number,
      ),
      adjustmentsBefore:
        sql<number>`coalesce(sum(case when ${adjustment} and ${before} then 1 else 0 end), 0)`.mapWith(
          Number,
        ),
    })
    .from(transactions);
}

/** What sits in jars: everything, and only what was moved before `since`. One row. */
export function jarBalanceQuery(db: Db, since: CalendarDate) {
  return db
    .select({
      totalMinor: sql<number>`coalesce(sum(${jarEntries.amountMinor}), 0)`.mapWith(Number),
      beforeMinor:
        sql<number>`coalesce(sum(case when ${jarEntries.date} < ${since} then ${jarEntries.amountMinor} else 0 end), 0)`.mapWith(
          Number,
        ),
    })
    .from(jarEntries);
}

type TransactionBalanceRow = {
  netMinor: number;
  netBeforeMinor: number;
  adjustments: number;
  adjustmentsBefore: number;
};
type JarBalanceRow = { totalMinor: number; beforeMinor: number };

/** Per account and kind: the sum and how many (balances, "Used in"); or one account's. */
export function accountTotalsQuery(db: Db, accountId?: string) {
  return db
    .select({
      accountId: transactions.accountId,
      kind: transactions.kind,
      amountMinor: sql<number>`sum(${transactions.amountMinor})`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(transactions)
    .where(accountId ? eq(transactions.accountId, accountId) : undefined)
    .groupBy(transactions.accountId, transactions.kind);
}

/** What each account put into jars, less what came back (issue 111). */
export function jarTotalsByAccountQuery(db: Db, accountId?: string) {
  return db
    .select({
      accountId: jarEntries.accountId,
      amountMinor: sql<number>`sum(${jarEntries.amountMinor})`.mapWith(Number),
    })
    .from(jarEntries)
    .where(accountId ? eq(jarEntries.accountId, accountId) : undefined)
    .groupBy(jarEntries.accountId);
}

/** Money moved from one account to another, summed per pair (issue 111). */
export function transferTotalsQuery(db: Db, accountId?: string) {
  return db
    .select({
      fromAccountId: transfers.fromAccountId,
      toAccountId: transfers.toAccountId,
      amountMinor: sql<number>`sum(${transfers.amountMinor})`.mapWith(Number),
    })
    .from(transfers)
    .where(
      accountId
        ? or(eq(transfers.fromAccountId, accountId), eq(transfers.toAccountId, accountId))
        : undefined,
    )
    .groupBy(transfers.fromAccountId, transfers.toAccountId);
}

/** The two rows above as the balance's parts now and before `since`. */
export function toBalanceTotals(
  tx: TransactionBalanceRow | undefined,
  jar: JarBalanceRow | undefined,
): { now: BalanceTotals; before: BalanceTotals } {
  return {
    now: {
      netMinor: tx?.netMinor ?? 0,
      hasAdjustment: (tx?.adjustments ?? 0) > 0,
      jarMinor: jar?.totalMinor ?? 0,
    },
    before: {
      netMinor: tx?.netBeforeMinor ?? 0,
      hasAdjustment: (tx?.adjustmentsBefore ?? 0) > 0,
      jarMinor: jar?.beforeMinor ?? 0,
    },
  };
}

/** The balance's parts right now, read once (for a write, not a screen). */
export function readBalanceTotals(db: Db, since: CalendarDate = '0000-01-01') {
  return toBalanceTotals(
    transactionBalanceQuery(db, since).get(),
    jarBalanceQuery(db, since).get(),
  );
}
