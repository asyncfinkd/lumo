// Live data for screens. Each hook re-renders when its tables change
// (expo-sqlite change listener + Drizzle `useLiveQuery`). Screens read through
// these and write through the repo functions, never through the client directly.

import { useMemo } from 'react';
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { categories, recurringBills } from '@/db/schema';
import type { CalendarDate } from '@/domain/dates';
import { accountsQuery, transferById, transfersQuery } from './accounts/repo';
import { useMoney } from './money/MoneyProvider';
import { useToday } from './money/useToday';
import { profileQuery } from './profile/repo';
import { allJarsQuery, jarEntriesQuery, openJarsQuery } from './savings/repo';
import { billsQuery, incomesQuery } from './recurring/repo';
import {
  categoryTotalsQuery,
  exportCountQuery,
  flowTotalsQuery,
  manualDatesQuery,
  type SearchInput,
  searchQuery,
  transactionById,
  transactionsBetween,
  transactionsList,
} from './transactions/repo';

export { useToday };

export function useProfile() {
  return useProfileStatus().profile;
}

/** The profile plus whether the first read has finished (so "none" isn't a guess). */
export function useProfileStatus() {
  const { data, updatedAt } = useLiveQuery(profileQuery(db));
  return { loaded: updatedAt !== undefined, profile: data[0] };
}

export function useCategories() {
  return useLiveQuery(db.select().from(categories).orderBy(categories.sortOrder)).data;
}

/** Accounts in their order; just Main until someone adds another (#21). */
export function useAccounts() {
  return useLiveQuery(accountsQuery(db)).data;
}

/**
 * What each account's balance is made of, summed in SQL (issue 111): its
 * transactions per kind (with how many there are), its jar money, and the
 * transfers per pair of accounts.
 */
export function useAccountTotals() {
  // Queried once, in MoneyProvider: a dozen mounted screens show balances.
  return useMoney().accountTotals;
}

/** Money moved between accounts, newest first. */
export function useTransfers() {
  return useLiveQuery(transfersQuery(db)).data;
}

export function useBills() {
  return useLiveQuery(billsQuery(db)).data;
}

/** Bills that are on: what Left to spend reserves and the add sheet calls "covered". */
export function useActiveBills() {
  return useLiveQuery(billsQuery(db).where(eq(recurringBills.active, true))).data;
}

export function useIncomes() {
  return useLiveQuery(incomesQuery(db)).data;
}

/** Savings jars still open, oldest first (Savings). */
export function useJars() {
  return useLiveQuery(openJarsQuery(db)).data;
}

/** Every jar, closed ones too (History). */
export function useAllJars() {
  return useLiveQuery(allJarsQuery(db)).data;
}

/** Every move into or out of a jar: the balance takes them off. */
export function useJarEntries() {
  return useLiveQuery(jarEntriesQuery(db)).data;
}

/** One transfer by id; `undefined` until the first read (or when it's gone). */
export function useTransfer(id: string | undefined) {
  return useLiveQuery(transferById(db, id ?? ''), [id]).data[0];
}

/**
 * Every transaction, or one account's, newest day first. Only History needs
 * the whole list: a total or one row has its own query below (issue 111).
 */
export function useTransactionList(accountId: string | null = null) {
  return useLiveQuery(transactionsList(db, accountId), [accountId]).data;
}

/** One transaction by id; `undefined` until the first read (or when it's gone). */
export function useTransaction(id: string | undefined) {
  return useLiveQuery(transactionById(db, id ?? ''), [id]).data[0];
}

/** Transactions with `start <= date < end`, newest first. */
export function useTransactionsBetween(start: CalendarDate, end: CalendarDate) {
  return useLiveQuery(transactionsBetween(db, start, end), [start, end]).data;
}

/** Came in and went out per category, `start <= date < end`, adjustments left out. */
export function useCategoryTotals(start: CalendarDate, end: CalendarDate) {
  return useLiveQuery(categoryTotalsQuery(db, start, end), [start, end]).data;
}

/** Came in and went out, `start <= date < end`, adjustments left out. */
export function useFlowTotals(start: CalendarDate, end: CalendarDate) {
  const rows = useLiveQuery(flowTotalsQuery(db, start, end), [start, end]).data;
  return useMemo(
    () => ({
      cameInMinor: rows.find((r) => r.kind === 'income')?.amountMinor ?? 0,
      wentOutMinor: rows.find((r) => r.kind === 'expense')?.amountMinor ?? 0,
    }),
    [rows],
  );
}

/** Days with something you added yourself, `start <= date < end`. */
export function useManualDates(start: CalendarDate, end: CalendarDate) {
  const rows = useLiveQuery(manualDatesQuery(db, start, end), [start, end]).data;
  return useMemo(() => new Set(rows.map((r) => r.date)), [rows]);
}

/** How many transactions an export of `start <= date < end` holds (`null`: from the first). */
export function useExportCount(start: CalendarDate | null, end: CalendarDate) {
  return useLiveQuery(exportCountQuery(db, start, end), [start, end]).data[0]?.count ?? 0;
}

/** HistorySearch's matches, found in SQL. */
export function useSearch(input: SearchInput) {
  return useLiveQuery(searchQuery(db, input), [JSON.stringify(input)]).data;
}

/**
 * Left to spend, Came in / Went out and the balance for today's pay period,
 * plus how the balance moved this month. Worked out once per change, near the
 * root (MoneyProvider); every screen reads the same result.
 */
export function useMoneyMonth() {
  return useMoney();
}
