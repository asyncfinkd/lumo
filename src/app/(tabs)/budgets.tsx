import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarIcon, CategoryIcon } from '@/components/Icons';
import { Fill, Rise } from '@/components/motion';
import { Press } from '@/components/Press';
import { type CurrencyCode, formatMoney } from '@/domain/money';
import { type BudgetRow, budgetRows, budgetsSummary } from '@/features/budgets/budgetRows';
import { useCategories } from '@/features/categories/categories';
import { useActiveBills, useAllTransactions, useBudgets, useMoneyMonth } from '@/features/live';
import { color, gradient, radius, shadow, space, text } from '@/theme';

// Budgets: what's left in each category this pay period. Tap one to edit it.
export default function BudgetsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, summary } = useMoneyMonth();
  const budgets = useBudgets();
  const bills = useActiveBills();
  const transactions = useAllTransactions();

  const rows = useMemo(
    () => (summary ? budgetRows({ budgets, transactions, bills, period: summary.period }) : []),
    [budgets, transactions, bills, summary],
  );

  if (!profile || !summary) return null;
  const totals = budgetsSummary(rows);
  const money = (minor: number) => formatMoney(minor, profile.currency, { decimals: 'auto' });

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <Rise style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('budgets.title')}
        </Text>
        <Text style={styles.subtitle}>
          {t('budgets.leftAcross', { amount: money(totals.leftMinor) })}
        </Text>
      </Rise>

      {rows.length > 0 ? (
        <>
          <Rise delay={40} style={styles.pills}>
            <View style={styles.pill}>
              <CalendarIcon color={color.muted} size={16} width={2} />
              <Text style={styles.pillText}>
                {t('budgets.daysToGo', { count: summary.daysLeft })}
              </Text>
            </View>
            <View style={[styles.pill, styles.pillGood]}>
              <Text style={[styles.pillText, styles.pillGoodText]}>
                {t('budgets.onTrack', { count: totals.onTrack, total: totals.total })}
              </Text>
            </View>
          </Rise>

          <Rise delay={80} style={styles.list}>
            {rows.map((row) => (
              <BudgetCard
                key={row.category}
                row={row}
                currency={profile.currency}
                daysLeft={summary.daysLeft}
                onPress={() =>
                  router.push({ pathname: '/edit-budget', params: { category: row.category } })
                }
              />
            ))}
          </Rise>
        </>
      ) : null}
    </ScrollView>
  );
}

const FILL: Record<BudgetRow['state'], object> = {
  allPaid: { backgroundImage: gradient.budgetCalm },
  plenty: { backgroundImage: gradient.budgetCalm },
  some: { backgroundImage: gradient.progress },
  low: { backgroundColor: color.warningFill },
};

function BudgetCard({
  row,
  currency,
  daysLeft,
  onPress,
}: {
  row: BudgetRow;
  currency: CurrencyCode;
  daysLeft: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const category = useCategories().get(row.category);
  const tint = category.tint;
  const name = category.label;
  const money = (minor: number) => formatMoney(minor, currency, { decimals: 'auto' });
  const left = money(row.leftMinor);

  const note =
    row.state === 'allPaid'
      ? t('budgets.note.allPaid')
      : row.state === 'low'
        ? t('budgets.note.low')
        : row.state === 'plenty'
          ? t('budgets.note.plenty')
          : t('budgets.note.left', { amount: left, count: daysLeft });
  const noteColor =
    row.state === 'allPaid' ? color.good : row.state === 'low' ? color.warning : color.muted;
  const width = row.leftPercent > 0 ? Math.max(row.leftPercent, 4) : 0;

  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={t('budgets.editBudget', {
        category: name,
        left,
        limit: money(row.limitMinor),
      })}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View style={[styles.icon, { backgroundColor: tint.bg }]}>
          <CategoryIcon icon={category.icon} size={22} color={tint.fg} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>
            {t('budgets.spentOf', { spent: money(row.spentMinor), limit: money(row.limitMinor) })}
          </Text>
        </View>
        <View style={styles.leftColumn}>
          <Text style={styles.leftAmount}>{left}</Text>
          <Text style={styles.leftLabel}>{t('budgets.left')}</Text>
        </View>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={name}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(row.leftPercent) }}
        style={styles.track}
      >
        <Fill percent={width} style={FILL[row.state]} />
      </View>
      <Text style={[styles.note, { color: noteColor }]}>{note}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.screen, paddingBottom: space.screenBottom },
  header: { gap: 2 },
  title: { ...text.h1, color: color.ink },
  subtitle: { ...text.subtitle, color: color.muted, fontVariant: ['tabular-nums'] },
  pills: { marginTop: 14, flexDirection: 'row', gap: 8 },
  pill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillGood: { backgroundColor: color.goodSoft },
  pillText: { ...text.meta, fontFamily: text.label.fontFamily, color: color.muted },
  pillGoodText: { color: color.good },
  list: { marginTop: 20, gap: space.cardGap },
  card: {
    padding: 16,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0, gap: 2 },
  name: { ...text.rowTitle, color: color.ink },
  meta: { ...text.meta, color: color.muted, fontVariant: ['tabular-nums'] },
  leftColumn: { alignItems: 'flex-end', gap: 2 },
  leftAmount: { ...text.rowTitle, color: color.ink, fontVariant: ['tabular-nums'] },
  leftLabel: { ...text.meta, fontSize: 12, lineHeight: 16, color: color.muted },
  track: {
    marginTop: 14,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: color.track,
    overflow: 'hidden',
  },
  note: { ...text.small, marginTop: 8 },
});
