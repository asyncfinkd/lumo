import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { CategoryIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { db } from '@/db/client';
import { formatMoney } from '@/domain/money';
import { BUDGETING } from '@/features/flags';
import { type CategoryView, useCategories } from '@/features/categories/categories';
import { categoryUsage, deleteCategory } from '@/features/categories/repo';
import { useBudgets, useProfile } from '@/features/live';
import { color, fontFamily, radius, shadow, text } from '@/theme';

/** The board offers the two closest categories to move into, plus "No category". */
const SUGGESTIONS = 2;

// ProfileCategoryDelete: nothing gets lost — the transactions move to another
// category (or none), and the budget goes.
export default function ProfileCategoryDeleteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const categories = useCategories();
  const budgets = useBudgets();
  const profile = useProfile();
  const category = categories.get(id);

  // Read once: how many transactions it has, and the most used of its kind.
  const [usage] = useState(() => categoryUsage(db, id));
  const [targets] = useState<CategoryView[]>(() => [
    ...categories
      .ofKind(category.kind)
      .filter((c) => c.id !== id)
      .map((c) => ({ c, n: categoryUsage(db, c.id!) }))
      .sort((a, b) => b.n - a.n)
      .slice(0, SUGGESTIONS)
      .map(({ c }) => c),
    categories.get(null),
  ]);
  const [moveTo, setMoveTo] = useState<string | null>(targets[0]?.id ?? null);
  const budget = budgets.find((b) => b.categoryId === id);

  const confirm = () => {
    deleteCategory(db, id, moveTo);
    // Back past the edit sheet to the list.
    router.dismissTo('/profile-categories');
  };

  return (
    <Dialog accessibilityLabel={t('categoryManage.deleteTitle', { name: category.label })}>
      <View style={[styles.icon, { backgroundColor: category.tint.bg }]}>
        <CategoryIcon icon={category.icon} size={26} color={category.tint.fg} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {t('categoryManage.deleteTitle', { name: category.label })}
      </Text>
      <Text style={styles.body}>
        {t('categoryManage.deleteBody', { count: usage, name: category.label })}
      </Text>

      <View accessibilityRole="radiogroup" style={styles.targets}>
        <Text style={styles.moveTo}>{t('categoryManage.moveTo')}</Text>
        {targets.map((target) => {
          const on = target.id === moveTo;
          return (
            <Press
              key={target.id ?? 'none'}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={target.label}
              onPress={() => setMoveTo(target.id)}
              style={[styles.target, on ? styles.targetOn : styles.targetOff]}
            >
              <View style={[styles.targetTile, { backgroundColor: target.tint.bg }]}>
                <CategoryIcon icon={target.icon} size={17} color={target.tint.fg} />
              </View>
              <Text style={styles.targetName}>{target.label}</Text>
              <View style={[styles.dot, on ? styles.dotOn : styles.dotOff]}>
                {on ? (
                  <Svg width={12} height={12} viewBox="0 0 24 24" accessible={false}>
                    <Path
                      d="m5.5 12.5 4 4 9-9"
                      stroke={color.white}
                      strokeWidth={3.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                ) : null}
              </View>
            </Press>
          );
        })}
      </View>

      {BUDGETING && budget ? (
        <Text style={styles.note}>
          {t('categoryManage.budgetRemoved', {
            amount: formatMoney(budget.limitMinor, profile?.currency ?? 'GEL', {
              decimals: 'auto',
            }),
          })}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Press accessibilityRole="button" haptic onPress={confirm} style={styles.delete}>
          <Text style={styles.deleteText}>
            {moveTo ? t('categoryManage.deleteAndMove') : t('categoryManage.deleteOnly')}
          </Text>
        </Press>
        <Button variant="quiet" label={t('categoryManage.keep')} onPress={() => router.back()} />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    fontFamily: fontFamily.extrabold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    textAlign: 'center',
    color: color.ink,
  },
  body: { ...text.subtitle, lineHeight: 20, marginTop: 8, textAlign: 'center', color: color.muted },
  targets: { marginTop: 16, alignSelf: 'stretch', gap: 6 },
  moveTo: {
    ...text.meta,
    fontFamily: fontFamily.bold,
    paddingHorizontal: 4,
    paddingBottom: 2,
    color: color.softInk,
  },
  target: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  targetOn: { backgroundColor: color.white, boxShadow: shadow.pickedRow },
  targetOff: { backgroundColor: color.washSoft },
  targetTile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetName: { ...text.label, flex: 1, color: color.ink },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: color.ink },
  dotOff: { borderWidth: 2, borderColor: color.radioRingSoft },
  note: { ...text.meta, lineHeight: 18, marginTop: 12, textAlign: 'center', color: color.muted },
  actions: { marginTop: 16, alignSelf: 'stretch', gap: 8 },
  delete: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.dangerStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { ...text.rowTitle, color: color.white },
});
