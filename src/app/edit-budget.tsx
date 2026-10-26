import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { BellIcon, CategoryIcon, CloseIcon, MinusIcon, PlusIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { Sheet } from '@/components/Sheet';
import { Switch } from '@/components/Switch';
import type { CategoryId } from '@/db/categories';
import { db } from '@/db/client';
import { categorySpent } from '@/domain/budgets';
import { currencies, formatMoney } from '@/domain/money';
import { quickAmounts } from '@/features/budgets/budgetRows';
import { useCategories } from '@/features/categories/categories';
import { getBudget, saveBudget } from '@/features/budgets/repo';
import { useAllTransactions, useMoneyMonth } from '@/features/live';
import { getProfile } from '@/features/profile/repo';
import { color, fontFamily, radius, shadow, size, text } from '@/theme';

/** − / + move the limit by 50 whole units, between 50 and 5,000 (design). */
const STEP = 50;
const MAX = 5000;

// EditBudget: change one category's monthly limit and its nudge.
export default function EditBudgetScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { category: param } = useLocalSearchParams<{ category: CategoryId }>();
  const category = param ?? 'groceries';
  const { summary } = useMoneyMonth();
  const transactions = useAllTransactions();

  // Read once on open: the sheet starts from the budget as it is now.
  const [start] = useState(() => {
    const currency = getProfile(db)?.currency ?? 'GEL';
    const scale = 10 ** currencies[currency].minorUnits;
    const budget = getBudget(db, category);
    return {
      currency,
      scale,
      limitMinor: budget?.limitMinor ?? STEP * scale,
      nudge: budget?.nudgeEnabled ?? true,
      nudgeAtMinor: budget?.nudgeAtMinor ?? STEP * scale,
    };
  });
  const { currency, scale } = start;
  const [limitMinor, setLimitMinor] = useState(start.limitMinor);
  const [nudge, setNudge] = useState(start.nudge);

  const view = useCategories().get(category);
  const tint = view.tint;
  const name = view.label;
  const money = (minor: number) => formatMoney(minor, currency, { decimals: 'auto' });
  const spent = summary ? categorySpent(transactions, category, summary.period) : 0;
  const left = limitMinor - spent;
  const step = STEP * scale;
  const symbol = currencies[currency].symbol;

  const save = (close: () => void) => {
    saveBudget(db, {
      categoryId: category,
      limitMinor,
      nudgeEnabled: nudge,
      nudgeAtMinor: start.nudgeAtMinor,
    });
    close();
  };

  return (
    <Sheet
      accessibilityLabel={t('editBudget.title', { category: name.toLocaleLowerCase() })}
      onDismissed={router.back}
    >
      {(close) => (
        <>
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: tint.bg }]}>
              <CategoryIcon icon={view.icon} color={tint.fg} />
            </View>
            <View style={styles.headerText}>
              <Text accessibilityRole="header" style={styles.name}>
                {name}
              </Text>
              <Text style={styles.monthly}>{t('editBudget.monthly')}</Text>
            </View>
            <Press accessibilityLabel={t('common.close')} onPress={close} style={styles.close}>
              <CloseIcon color={color.muted} />
            </Press>
          </View>

          <View style={styles.stepper}>
            <Press
              accessibilityLabel={t('editBudget.lower', { amount: money(step) })}
              onPress={() => setLimitMinor((v) => Math.max(step, v - step))}
              style={styles.round}
            >
              <MinusIcon color={color.ink} />
            </Press>
            <View
              accessible
              accessibilityRole="text"
              accessibilityLabel={money(limitMinor)}
              accessibilityLiveRegion="polite"
              style={styles.amountRow}
            >
              <Text style={styles.symbol}>{symbol}</Text>
              <Text style={styles.amount}>{money(limitMinor).slice(symbol.length)}</Text>
            </View>
            <Press
              accessibilityLabel={t('editBudget.raise', { amount: money(step) })}
              onPress={() => setLimitMinor((v) => Math.min(MAX * scale, v + step))}
              style={styles.round}
            >
              <PlusIcon size={22} color={color.ink} />
            </Press>
          </View>
          <Text style={[styles.hint, left < 0 && styles.hintWarning]}>
            {left >= 0
              ? t('editBudget.spentSoFar', { spent: money(spent), left: money(left) })
              : t('editBudget.stretch', { spent: money(spent) })}
          </Text>

          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('editBudget.quickAmounts')}
            style={styles.picks}
          >
            {quickAmounts(start.limitMinor, step).map((amount) => {
              const selected = amount === limitMinor;
              return (
                <Press
                  key={amount}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setLimitMinor(amount)}
                  style={[
                    styles.pick,
                    selected
                      ? { backgroundColor: tint.selected, boxShadow: shadow.chipSelected(tint.fg) }
                      : { backgroundColor: color.wash },
                  ]}
                >
                  <Text style={styles.pickText}>{money(amount)}</Text>
                </Press>
              );
            })}
          </View>

          <View style={styles.nudge}>
            <View style={styles.bell}>
              <BellIcon color={color.muted} />
            </View>
            <Text style={styles.nudgeText}>
              {t('editBudget.nudge', { amount: money(start.nudgeAtMinor) })}
            </Text>
            <Switch
              value={nudge}
              onChange={setNudge}
              accessibilityLabel={t('editBudget.nudge', { amount: money(start.nudgeAtMinor) })}
            />
          </View>

          <Button label={t('editBudget.save')} onPress={() => save(close)} style={styles.save} />
          <Button
            variant="quiet"
            label={t('common.maybeLater')}
            onPress={close}
            style={styles.later}
          />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: {
    width: size.rowIcon,
    height: size.rowIcon,
    borderRadius: radius.tile,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0, gap: 1 },
  name: { fontFamily: fontFamily.extrabold, fontSize: 20, lineHeight: 26, color: color.ink },
  monthly: { ...text.meta, color: color.muted },
  close: {
    width: size.touch,
    height: size.touch,
    borderRadius: size.touch / 2,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  round: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end' },
  symbol: {
    fontFamily: fontFamily.semibold,
    fontSize: 28,
    lineHeight: 36,
    color: color.subtle,
    marginRight: 4,
    marginBottom: 2,
  },
  amount: {
    fontFamily: fontFamily.extrabold,
    fontSize: 48,
    lineHeight: 60,
    letterSpacing: -1,
    color: color.ink,
    marginBottom: -6,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    ...text.meta,
    fontFamily: fontFamily.bold,
    marginTop: 8,
    textAlign: 'center',
    color: color.muted,
  },
  hintWarning: { color: color.warning },
  picks: { marginTop: 20, flexDirection: 'row', gap: 8 },
  pick: {
    flex: 1,
    height: size.chip,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickText: { ...text.label, color: color.ink, fontVariant: ['tabular-nums'] },
  nudge: {
    marginTop: 16,
    height: 64,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.washSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeText: { ...text.label, lineHeight: 20, flex: 1, color: color.ink },
  save: { marginTop: 20 },
  later: { marginTop: 8 },
});
