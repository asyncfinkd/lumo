import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CategoryIcon, RepeatIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import type { Transaction } from '@/db/schema';
import { formatMoney } from '@/domain/money';
import { useCategories } from '@/features/categories/categories';
import { isAutomatic } from '@/features/history/history';
import { clockTime } from '@/features/home/home';
import { color, fontFamily, radius, shadow, size, text } from '@/theme';

/**
 * Where the row is drawn:
 * - `home`: "Coffee · 8:40", bills and salary say "monthly bill" / "monthly income".
 * - `history`: the four row types (RowTypes) — automatic rows get a repeat
 *   badge and an "Auto · bill" tag, adjustments are grey and muted.
 * - `search`: like history, with the day in the second line (HistorySearch).
 */
export type RowVariant = 'home' | 'history' | 'search';

/**
 * One transaction as in the design's lists: category tile, title, the second
 * line and the signed amount.
 */
export function TransactionRow({
  transaction,
  variant = 'home',
  day,
  onPress,
}: {
  transaction: Transaction;
  variant?: RowVariant;
  /** For `search`: "Today", "Sat, Oct 24". */
  day?: string;
  /** Opens the details sheet. */
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const { kind, source } = transaction;
  const category = useCategories().get(transaction.categoryId);
  const adjust = source === 'adjustment';
  const auto = variant !== 'home' && isAutomatic(transaction);

  const time = clockTime(transaction.occurredAt);
  const title = adjust ? t('history.adjusted') : transaction.title;
  let meta: string;
  if (variant === 'home') {
    const when =
      source === 'bill'
        ? t('home.monthlyBill')
        : source === 'recurring_income'
          ? t('home.monthlyIncome')
          : time;
    meta = transaction.categoryId ? `${category.label} · ${when}` : when;
  } else if (variant === 'history') {
    meta = adjust
      ? t('history.notCounted')
      : transaction.categoryId
        ? `${category.label} · ${time}`
        : time;
  } else {
    const parts = [
      adjust ? t('history.adjustment') : transaction.categoryId ? category.label : null,
      `${day}, ${time}`,
      auto ? t('history.auto') : null,
    ];
    meta = parts.filter(Boolean).join(' · ');
  }
  const tag =
    auto && variant === 'history'
      ? t(source === 'bill' ? 'history.autoBill' : 'history.autoSalary')
      : null;

  const amount = formatMoney(transaction.amountMinor, transaction.currency, {
    sign: kind === 'income' ? 'income' : 'expense',
  });
  const tile = adjust ? { bg: color.adjustTile, fg: color.muted } : category.tint;

  const label = [title, meta, amount, tag].filter(Boolean).join(', ');
  const body = (
    <>
      <View style={[styles.tile, { backgroundColor: tile.bg }]}>
        <CategoryIcon icon={adjust ? 'adjust' : category.icon} color={tile.fg} />
        {auto ? (
          <View style={styles.badge}>
            <RepeatIcon color={color.ink} size={12} width={2.8} />
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.title, adjust && { color: color.softInk }]}>
          {title}
        </Text>
        <View style={styles.metaLine}>
          <Text numberOfLines={1} style={styles.meta}>
            {meta}
          </Text>
          {tag ? <Text style={styles.tag}>{tag}</Text> : null}
        </View>
      </View>
      <Text
        style={[
          styles.amount,
          kind === 'income' && styles.income,
          adjust && variant !== 'home' && styles.adjustAmount,
        ]}
      >
        {amount}
      </Text>
    </>
  );
  return onPress ? (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t('history.showDetails')}
      onPress={onPress}
      style={styles.row}
    >
      {body}
    </Press>
  ) : (
    <View accessible accessibilityLabel={label} style={styles.row}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 68, flexDirection: 'row', alignItems: 'center', gap: 14 },
  tile: {
    width: size.rowIcon,
    height: size.rowIcon,
    borderRadius: radius.tile,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: color.white,
    boxShadow: shadow.rowBadge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...text.rowTitle, color: color.ink },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  meta: { ...text.meta, flexShrink: 1, color: color.muted },
  tag: {
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: color.track,
    fontFamily: fontFamily.extrabold,
    fontSize: 11,
    lineHeight: 20,
    color: color.softInk,
  },
  amount: { ...text.rowTitle, color: color.ink, fontVariant: ['tabular-nums'] },
  income: { color: color.good },
  adjustAmount: { fontFamily: fontFamily.semibold, color: color.muted },
});
