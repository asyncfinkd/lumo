import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalendarDate } from '@/domain/dates';
import { useToday } from '@/features/live';
import { dayName } from './history';

/** "Today", "Yesterday", or "Sat, Oct 24" in the app's language. */
export function useDayLabel(): (date: CalendarDate) => string {
  const { t, i18n } = useTranslation();
  const today = useToday();
  return useCallback(
    (date: CalendarDate) => {
      const name = dayName(date, today);
      if (name) return t(`home.${name}`);
      const [y, m, d] = date.split('-').map(Number);
      return new Date(y!, m! - 1, d!).toLocaleDateString(i18n.language, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    },
    [t, i18n.language, today],
  );
}
