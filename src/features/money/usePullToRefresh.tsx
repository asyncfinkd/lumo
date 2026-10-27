import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl } from 'react-native';
import { db } from '@/db/client';
import { toCalendarDate } from '@/domain/dates';
import { syncDueTransactions } from '@/features/recurring/repo';
import { color } from '@/theme';
import { refreshToday } from './useToday';

/** Long enough for the spinner to read as "done", not a flicker. */
const SPIN = 600;

/**
 * Pull down on Home, History or Insights: adds bills and salary that came due
 * and picks up a new day. Everything else already updates by itself (live
 * queries), so this is a check, not a reload.
 */
export function usePullToRefresh(topInset = 0) {
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    syncDueTransactions(db, toCalendarDate(new Date()));
    refreshToday();
    timer.current = setTimeout(() => setRefreshing(false), SPIN);
  }, []);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={color.accent}
      colors={[color.accent]}
      progressViewOffset={topInset}
    />
  );
}
