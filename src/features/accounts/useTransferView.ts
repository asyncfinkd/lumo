// How one transfer is named on its details sheet and its delete dialog
// (TransactionDetail-Transfer, DeleteConfirm), like useTransactionView.

import { useTranslation } from 'react-i18next';
import type { Transfer } from '@/db/schema';
import { currencies, formatMoney } from '@/domain/money';
import { useDayLabel } from '@/features/history/useDayLabel';
import { clockTime } from '@/features/home/home';
import { useToday } from '@/features/live';
import { shortDate } from '@/features/transactions/addForm';
import { type AccountView, useAccountViews } from './accounts';

export type TransferView = {
  from: AccountView | undefined;
  to: AccountView | undefined;
  /** "Bank card → Cash". */
  between: string;
  /** "₾". */
  symbol: string;
  /** "200.00", without the symbol. */
  digits: string;
  /** "₾200.00": no sign, it's still yours. */
  amount: string;
  /** "Today, Oct 27 · 12:00". */
  when: string;
  /** "Today, 12:00" for the dialog. */
  whenShort: string;
};

export function useTransferView(): (transfer: Transfer) => TransferView {
  const { t, i18n } = useTranslation();
  const accounts = useAccountViews();
  const dayLabel = useDayLabel();
  const today = useToday();

  return (transfer) => {
    const from = accounts.find((a) => a.id === transfer.fromAccountId);
    const to = accounts.find((a) => a.id === transfer.toAccountId);
    const { symbol } = currencies[transfer.currency];
    const amount = formatMoney(transfer.amountMinor, transfer.currency);
    const time = clockTime(transfer.occurredAt);
    const day =
      transfer.date === today
        ? `${t('home.today')}, ${shortDate(transfer.date, i18n.language)}`
        : dayLabel(transfer.date);
    return {
      from,
      to,
      between: t('history.transfer.between', { from: from?.label ?? '', to: to?.label ?? '' }),
      symbol,
      digits: amount.slice(symbol.length),
      amount,
      when: `${day} · ${time}`,
      whenShort: `${dayLabel(transfer.date)}, ${time}`,
    };
  };
}
