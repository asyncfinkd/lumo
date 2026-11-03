import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TransferIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { formatMoney } from '@/domain/money';
import type { TransferMove } from '@/features/history/history';
import { clockTime } from '@/features/home/home';
import { maskAmount, useAmountsHidden } from '@/features/privacy/amounts';
import { color, fontFamily, radius, size, text } from '@/theme';
import type { AccountView } from './accounts';

/**
 * A transfer in History (HistoryAccounts). Under All accounts: "Bank card →
 * Cash · Moved · 12:00 ₾200.00", no sign, muted, a dot of its own. Filtered to
 * one side it reads from there: "From Bank card · Moved in +₾200.00" or "To
 * Cash · Moved out −₾200.00", with that account's dot. Opens its details.
 */
export function TransferRow({
  move,
  accounts,
  onPress,
}: {
  move: TransferMove;
  accounts: readonly AccountView[];
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const hidden = useAmountsHidden();
  const from = accounts.find((a) => a.id === move.fromAccountId);
  const to = accounts.find((a) => a.id === move.toAccountId);
  const time = clockTime(move.occurredAt);

  let title: string;
  let meta: string;
  let dot: string;
  if (move.flow === 'in') {
    title = t('history.transfer.fromName', { name: from?.label ?? '' });
    meta = t('history.transfer.movedIn', { time });
    dot = to?.tint.chart ?? color.transferDot;
  } else if (move.flow === 'out') {
    title = t('history.transfer.toName', { name: to?.label ?? '' });
    meta = t('history.transfer.movedOut', { time });
    dot = from?.tint.chart ?? color.transferDot;
  } else {
    title = t('history.transfer.between', { from: from?.label ?? '', to: to?.label ?? '' });
    meta = t('history.transfer.moved', { time });
    dot = color.transferDot;
  }
  const amount = formatMoney(move.amountMinor, move.currency, {
    sign: move.flow === 'in' ? 'income' : move.flow === 'out' ? 'expense' : 'auto',
  });
  const plain = formatMoney(move.amountMinor, move.currency);

  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={t('history.transfer.label', {
        title,
        amount: hidden ? t('home.amountHidden') : plain,
      })}
      accessibilityHint={t('history.showDetails')}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.tile}>
        <TransferIcon color={color.softInk} size={24} width={1.8} />
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <View style={styles.metaLine}>
          <View style={[styles.dot, { backgroundColor: dot }]} />
          <Text numberOfLines={1} style={styles.meta}>
            {meta}
          </Text>
        </View>
      </View>
      <Text style={styles.amount}>{hidden ? maskAmount(amount) : amount}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  row: { height: 68, flexDirection: 'row', alignItems: 'center', gap: 14 },
  tile: {
    width: size.rowIcon,
    height: size.rowIcon,
    borderRadius: radius.tile,
    borderCurve: 'continuous',
    backgroundColor: color.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...text.rowTitle, color: color.ink },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  meta: { ...text.meta, flexShrink: 1, color: color.muted },
  amount: {
    ...text.rowTitle,
    fontFamily: fontFamily.bold,
    fontVariant: ['tabular-nums'],
    color: color.muted,
  },
});
