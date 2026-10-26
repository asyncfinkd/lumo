// Live data for screens. Each hook re-renders when its tables change
// (expo-sqlite change listener + Drizzle `useLiveQuery`). Screens read through
// these and write through the repo functions, never through the client directly.

import { useMemo } from 'react';
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { recurringBills } from '@/db/schema';
import type { CalendarDate } from '@/domain/dates';
import { budgetsQuery } from './budgets/repo';
import { summarizeMonth } from './money/summary';
import { useToday } from './money/useToday';
import { profileQuery } from './profile/repo';
import { billsQuery, incomesQuery } from './recurring/repo';
import { allTransactions, transactionsBetween } from './transactions/repo';

export { useToday };

export function useProfile() {
  return useProfileStatus().profile;
}

/** The profile plus whether the first read has finished (so "none" isn't a guess). */
export function useProfileStatus() {
  const { data, updatedAt } = useLiveQuery(profileQuery(db));
  return { loaded: updatedAt !== undefined, profile: data[0] };
}

export function useBudgets() {
  return useLiveQuery(budgetsQuery(db)).data;
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

export function useAllTransactions() {
  return useLiveQuery(allTransactions(db)).data;
}

/** Transactions with `start <= date < end`, newest first. */
export function useTransactionsBetween(start: CalendarDate, end: CalendarDate) {
  return useLiveQuery(transactionsBetween(db, start, end), [start, end]).data;
}

/** Left to spend, Came in / Went out and the balance for today's pay period. */
export function useMoneyMonth() {
  const today = useToday();
  const profile = useProfile();
  const incomes = useIncomes();
  const bills = useActiveBills();
  const transactions = useAllTransactions();

  const summary = useMemo(
    () =>
      profile
        ? summarizeMonth({ today, payday: profile.payday, incomes, bills, transactions })
        : undefined,
    [today, profile, incomes, bills, transactions],
  );
  return { today, profile, summary };
}
