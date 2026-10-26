import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CategoryIcon } from '@/components/Icons';
import type { Transaction } from '@/db/schema';
import { formatMoney } from '@/domain/money';
import { useCategories } from '@/features/categories/categories';
import { clockTime } from '@/features/home/home';
import { color, radius, size, text } from '@/theme';

/**
 * One transaction as in the design's lists: category tile, title, "Coffee · 8:40"
 * and the signed amount. Bills and salary say "monthly bill" / "monthly income"
 * instead of a time.
 */
export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const { t } = useTranslation();
  const { kind, source } = transaction;
  const category = useCategories().get(transaction.categoryId);

  const when =
    source === 'bill'
      ? t('home.monthlyBill')
      : source === 'recurring_income'
        ? t('home.monthlyIncome')
        : clockTime(transaction.occurredAt);
  const meta = transaction.categoryId ? `${category.label} · ${when}` : when;
  const amount = formatMoney(transaction.amountMinor, transaction.currency, {
    sign: kind === 'income' ? 'income' : 'expense',
  });

  return (
    <View
      accessible
      accessibilityLabel={`${transaction.title}, ${meta}, ${amount}`}
      style={styles.row}
    >
      <View style={[styles.tile, { backgroundColor: category.tint.bg }]}>
        <CategoryIcon icon={category.icon} color={category.tint.fg} />
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>
          {transaction.title}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {meta}
        </Text>
      </View>
      <Text style={[styles.amount, kind === 'income' && styles.income]}>{amount}</Text>
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
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...text.rowTitle, color: color.ink },
  meta: { ...text.meta, color: color.muted },
  amount: { ...text.rowTitle, color: color.ink, fontVariant: ['tabular-nums'] },
  income: { color: color.good },
});
