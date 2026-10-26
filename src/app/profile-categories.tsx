import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomFade, Orbs } from '@/components/Backdrop';
import { CategoryIcon, ChevronRightIcon, PlusIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import type { CategoryKind } from '@/db/categories';
import { categorySpent } from '@/domain/budgets';
import { isInPeriod } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { type CategoryView, useCategories } from '@/features/categories/categories';
import { useAllTransactions, useBudgets, useMoneyMonth } from '@/features/live';
import { HeaderButton, SettingsHeader } from '@/features/profile/SettingsHeader';
import { color, fontFamily, radius, shadow, space, text } from '@/theme';

// ProfileCategories: spending and income categories with this month's amount;
// tap one to edit it, or add a new one.
export default function ProfileCategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const { profile, summary } = useMoneyMonth();
  const transactions = useAllTransactions();
  const budgets = useBudgets();

  const detail = useMemo(() => {
    const currency = profile?.currency ?? 'GEL';
    const money = (minor: number) => formatMoney(minor, currency, { decimals: 'auto' });
    return (c: CategoryView) => {
      if (!summary || !c.id) return '';
      if (c.kind === 'income') {
        const earned = transactions
          .filter(
            (tx) =>
              tx.kind === 'income' &&
              tx.source !== 'adjustment' &&
              tx.categoryId === c.id &&
              isInPeriod(tx.date, summary.period),
          )
          .reduce((sum, tx) => sum + tx.amountMinor, 0);
        return t('categoryManage.earned', { amount: money(earned) });
      }
      const spent = money(categorySpent(transactions, c.id, summary.period));
      const budget = budgets.find((b) => b.categoryId === c.id);
      return budget
        ? t('categoryManage.spentWithBudget', { amount: spent, budget: money(budget.limitMinor) })
        : t('categoryManage.spentNoBudget', { amount: spent });
    };
  }, [profile, summary, transactions, budgets, t]);

  const open = (id?: string | null) =>
    router.push(id ? { pathname: '/profile-category', params: { id } } : '/profile-category');

  const groups: { kind: CategoryKind; label: string }[] = [
    { kind: 'expense', label: t('categoryManage.spending') },
    { kind: 'income', label: t('categoryManage.income') },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Orbs />
      <SettingsHeader
        title={t('categoryManage.title')}
        action={
          <HeaderButton label={t('categoryManage.new')} onPress={() => open()}>
            <PlusIcon size={20} width={2.2} color={color.ink} />
          </HeaderButton>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>{t('categoryManage.intro')}</Text>

        {groups.map((group) => (
          <View key={group.kind} style={styles.group}>
            <Text accessibilityRole="header" style={styles.groupTitle}>
              {group.label}
            </Text>
            <View style={styles.list}>
              {categories.ofKind(group.kind).map((c) => {
                const line = detail(c);
                return (
                  <Press
                    key={c.id}
                    accessibilityRole="button"
                    accessibilityLabel={t('categoryManage.rowLabel', {
                      name: c.label,
                      detail: line,
                    })}
                    onPress={() => open(c.id)}
                    style={styles.row}
                  >
                    <View style={[styles.tile, { backgroundColor: c.tint.bg }]}>
                      <CategoryIcon icon={c.icon} size={21} color={c.tint.fg} />
                    </View>
                    <View style={styles.rowText}>
                      <Text numberOfLines={1} style={styles.name}>
                        {c.label}
                      </Text>
                      <Text numberOfLines={1} style={styles.sub}>
                        {line}
                      </Text>
                    </View>
                    <ChevronRightIcon color={color.placeholder} />
                  </Press>
                );
              })}
            </View>
          </View>
        ))}

        <Press accessibilityRole="button" onPress={() => open()} style={styles.newButton}>
          <PlusIcon size={18} color={color.ink} />
          <Text style={styles.newText}>{t('categoryManage.new')}</Text>
        </Press>
      </ScrollView>
      <BottomFade />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  content: { paddingTop: 16, paddingHorizontal: space.screen },
  intro: { ...text.subtitle, lineHeight: 20, paddingHorizontal: 4, color: color.muted },
  group: { marginTop: 18, gap: 8 },
  groupTitle: {
    ...text.meta,
    paddingHorizontal: 4,
    fontFamily: fontFamily.extrabold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: color.muted,
  },
  list: {
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
  },
  row: { height: 60, flexDirection: 'row', alignItems: 'center', gap: 14 },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  name: { ...text.rowTitle, lineHeight: 20, color: color.ink },
  sub: { ...text.small, fontFamily: fontFamily.semibold, lineHeight: 16, color: color.muted },
  newButton: {
    marginTop: 14,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.wash,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  newText: { ...text.label, color: color.ink },
});
