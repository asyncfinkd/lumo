import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalendarDate } from '@/domain/dates';
import { monthsBetween } from './savings';

/**
 * "February" for a month within the next year, "February 2028" further out,
 * so "ready by February" never means the wrong one.
 */
export function useMonthName(today: CalendarDate) {
  const { i18n } = useTranslation();
  return useCallback(
    (year: number, month: number) => {
      const date = new Date(year, month - 1, 1);
      const far =
        monthsBetween(today.slice(0, 8) + '01', `${year}-${String(month).padStart(2, '0')}-01`) >=
        12;
      return date.toLocaleDateString(
        i18n.language,
        far ? { month: 'long', year: 'numeric' } : { month: 'long' },
      );
    },
    [i18n.language, today],
  );
}
