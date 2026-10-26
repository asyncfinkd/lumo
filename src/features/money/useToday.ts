import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { type CalendarDate, toCalendarDate } from '@/domain/dates';

/**
 * Today's local date, updated when the app comes back to the foreground and at
 * midnight, so periods and "Today" never go stale.
 */
export function useToday(): CalendarDate {
  const [today, setToday] = useState(() => toCalendarDate(new Date()));

  useEffect(() => {
    const refresh = () => setToday(toCalendarDate(new Date()));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 1000);

    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, [today]);

  return today;
}
