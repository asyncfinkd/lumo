import { useEffect } from 'react';
import { AppState } from 'react-native';
import { db } from '@/db/client';
import { toCalendarDate } from '@/domain/dates';
import { useToday } from '../money/useToday';
import { syncDueTransactions } from './repo';

/**
 * Creates due bill and salary transactions (#4) when the app starts, when it
 * comes back to the foreground and when the day changes. Renders nothing; mount
 * it once the database is ready.
 */
export function DueTransactionsSync() {
  const today = useToday();

  useEffect(() => {
    syncDueTransactions(db, today);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncDueTransactions(db, toCalendarDate(new Date()));
    });
    return () => subscription.remove();
  }, [today]);

  return null;
}
