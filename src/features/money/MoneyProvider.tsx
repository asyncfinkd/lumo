// The pay-period summary, worked out once per change (issue 111). Mounted near the
// root; Home, Insights, the add sheet and the rest read it with `useMoneyMonth`
// instead of each running their own queries and sums. Sheets open over the
// tabs, so before this one write re-ran the same work in every mounted screen.

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { type Profile, recurringBills } from '@/db/schema';
import { type CalendarDate, payPeriod } from '@/domain/dates';
import { monthChangeFromTotals, monthChangeSince } from '../home/home';
import { billsQuery, incomesQuery } from '../recurring/repo';
import {
  accountTotalsQuery,
  jarBalanceQuery,
  jarTotalsByAccountQuery,
  periodFlowQuery,
  toBalanceTotals,
  transactionBalanceQuery,
  transferTotalsQuery,
} from './repo';
import { type MonthSummary, summarizePeriod } from './summary';
import { useToday } from './useToday';

export type Money = {
  today: CalendarDate;
  profile: Profile | undefined;
  /** `undefined` until there's a profile. */
  summary: MonthSummary | undefined;
  /** How the balance moved since the 1st ("₾800 more than on Oct 1", Main). */
  monthChange: { since: CalendarDate; deltaMinor: number } | null;
  /** What each account's balance is made of (`useAccountTotals`, `useAccountViews`). */
  accountTotals: AccountTotals;
};

export type AccountTotals = {
  transactions: ReturnType<ReturnType<typeof accountTotalsQuery>['all']>;
  jarEntries: ReturnType<ReturnType<typeof jarTotalsByAccountQuery>['all']>;
  transfers: ReturnType<ReturnType<typeof transferTotalsQuery>['all']>;
};

const MoneyContext = createContext<Money | null>(null);

/** `profile`: the one AppStack already reads, so it isn't queried twice. */
export function MoneyProvider({
  profile,
  children,
}: {
  profile: Profile | undefined;
  children: ReactNode;
}) {
  const today = useToday();
  const incomes = useLiveQuery(incomesQuery(db)).data;
  const bills = useLiveQuery(billsQuery(db).where(eq(recurringBills.active, true))).data;

  // Before the profile is read the period is a placeholder; nothing shows it.
  const payday = profile?.payday ?? 1;
  const { start, end } = useMemo(() => payPeriod(today, payday), [today, payday]);
  const flow = useLiveQuery(periodFlowQuery(db, start, end), [start, end]).data;

  const since = monthChangeSince(today);
  const txBalance = useLiveQuery(transactionBalanceQuery(db, since), [since]).data[0];
  const jarBalance = useLiveQuery(jarBalanceQuery(db, since), [since]).data[0];

  // Every account's sums, once for all the screens that show balances.
  const accountTransactions = useLiveQuery(accountTotalsQuery(db)).data;
  const accountJarEntries = useLiveQuery(jarTotalsByAccountQuery(db)).data;
  const accountTransfers = useLiveQuery(transferTotalsQuery(db)).data;
  const accountTotals = useMemo(
    () => ({
      transactions: accountTransactions,
      jarEntries: accountJarEntries,
      transfers: accountTransfers,
    }),
    [accountTransactions, accountJarEntries, accountTransfers],
  );

  const value = useMemo<Money>(() => {
    const balance = toBalanceTotals(txBalance, jarBalance);
    return {
      today,
      profile,
      summary: profile
        ? summarizePeriod({
            today,
            payday: profile.payday,
            incomes,
            bills,
            periodTransactions: flow,
            balance: balance.now,
          })
        : undefined,
      monthChange: monthChangeFromTotals(since, balance.before, balance.now),
      accountTotals,
    };
  }, [today, profile, incomes, bills, flow, since, txBalance, jarBalance, accountTotals]);

  return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>;
}

/** What MoneyProvider worked out. */
export function useMoney(): Money {
  const money = useContext(MoneyContext);
  if (!money) throw new Error('useMoneyMonth needs a MoneyProvider above it');
  return money;
}
