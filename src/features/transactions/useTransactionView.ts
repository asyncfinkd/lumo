// How one transaction is named and colored on the details sheet and in its
// confirm dialogs (TransactionDetail, DeleteConfirm).

import { useTranslation } from 'react-i18next';
import type { CategoryIconKey } from '@/db/categories';
import type { Transaction } from '@/db/schema';
import { currencies, formatMoney } from '@/domain/money';
import { useCategories } from '@/features/categories/categories';
import { isAutomatic } from '@/features/history/history';
import { useDayLabel } from '@/features/history/useDayLabel';
import { clockTime } from '@/features/home/home';
import { useToday } from '@/features/live';
import { shortDate } from '@/features/transactions/addForm';
import { color } from '@/theme';

export type TransactionView = {
  title: string;
  /** The category's name, or "Adjustment". */
  label: string;
  icon: CategoryIconKey | 'none' | 'adjust';
  tint: { bg: string; fg: string; chip: string };
  auto: boolean;
  adjust: boolean;
  income: boolean;
  /** "−", "+". */
  sign: string;
  /** "₾". */
  symbol: string;
  /** "64.20", without the sign or symbol. */
  digits: string;
  /** "−₾64.20". */
  amount: string;
  /** "Today, Oct 27 · 13:15", "Yesterday · 20:45", "Sat, Oct 24 · 17:10". */
  when: string;
  /** "Today, 13:15" for the dialogs. */
  whenShort: string;
  /** "Today", "Sat, Oct 24". */
  day: string;
  time: string;
};

export function useTransactionView(): (tx: Transaction) => TransactionView {
  const { t, i18n } = useTranslation();
  const categories = useCategories();
  const dayLabel = useDayLabel();
  const today = useToday();

  return (tx) => {
    const adjust = tx.source === 'adjustment';
    const category = categories.get(tx.categoryId);
    const { symbol } = currencies[tx.currency];
    const plain = formatMoney(tx.amountMinor, tx.currency);
    const time = clockTime(tx.occurredAt);
    const day =
      tx.date === today
        ? `${t('home.today')}, ${shortDate(tx.date, i18n.language)}`
        : dayLabel(tx.date);
    return {
      title: adjust ? t('history.adjusted') : tx.title,
      label: adjust ? t('history.adjustment') : category.label,
      icon: adjust ? 'adjust' : category.icon,
      tint: adjust ? { bg: color.adjustTile, fg: color.muted, chip: color.softInk } : category.tint,
      auto: isAutomatic(tx),
      adjust,
      income: tx.kind === 'income',
      sign: tx.kind === 'income' ? '+' : '−',
      symbol,
      digits: plain.slice(symbol.length),
      amount: formatMoney(tx.amountMinor, tx.currency, {
        sign: tx.kind === 'income' ? 'income' : 'expense',
      }),
      when: `${day} · ${time}`,
      whenShort: `${dayLabel(tx.date)}, ${time}`,
      day: dayLabel(tx.date),
      time,
    };
  };
}
