import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { type CalendarDate, toCalendarDate } from '@/domain/dates';

/** Every mounted useToday, so a pull to refresh can update them all. */
const listeners = new Set<() => void>();

/** Reads the date again everywhere (pull to refresh). */
export function refreshToday(): void {
  for (const listener of listeners) listener();
}

/**
 * Today's local date, updated when the app comes back to the foreground, at
 * midnight and on a pull to refresh, so periods and "Today" never go stale.
 */
export function useToday(): CalendarDate {
  const [today, setToday] = useState(() => toCalendarDate(new Date()));

  useEffect(() => {
    const refresh = () => setToday(toCalendarDate(new Date()));
    listeners.add(refresh);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 1000);

    return () => {
      listeners.delete(refresh);
      subscription.remove();
      clearTimeout(timer);
    };
  }, [today]);

  return today;
}
