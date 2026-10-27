import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CategoryIcon, ChevronRightIcon, CloseIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Sheet } from '@/components/Sheet';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type CategoryColorKey,
  type CategoryIconKey,
  type CategoryKind,
  DEFAULT_CATEGORY_IDS,
} from '@/db/categories';
import { db } from '@/db/client';
import { formatMoney } from '@/domain/money';
import { BUDGETING } from '@/features/flags';
import { useCategories } from '@/features/categories/categories';
import { saveCategory } from '@/features/categories/repo';
import { useBudgets, useProfile } from '@/features/live';
import { categoryPalette, color, fontFamily, radius, shadow, size, text } from '@/theme';

const MAX_NAME = 20;

// ProfileCategoryEdit / ProfileCategoryNew: name, spending or income, icon,
// color and (for spending) the monthly budget.
export default function ProfileCategoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const categories = useCategories();
  const budgets = useBudgets();
  const profile = useProfile();
  // Set when a new category is saved early to give it a budget.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const id = params.id ?? createdId;
  const existing = params.id ? categories.get(params.id) : null;
  const isNew = !params.id;

  const [name, setName] = useState(existing?.label ?? '');
  const [kind, setKind] = useState<CategoryKind>(existing?.kind ?? 'expense');
  const [icon, setIcon] = useState<CategoryIconKey>(
    existing && existing.icon !== 'none' ? existing.icon : 'paw',
  );
  const [tint, setTint] = useState<CategoryColorKey>(existing?.color ?? 'coral');
  const palette = categoryPalette[tint];
  const trimmed = name.trim();
  const budget = id ? budgets.find((b) => b.categoryId === id) : undefined;

  const save = () => {
    if (!trimmed) return null;
    return saveCategory(db, {
      id: id ?? undefined,
      name: trimmed,
      kind,
      icon,
      color: tint,
      renamed: !!id && DEFAULT_CATEGORY_IDS.has(id) && trimmed !== existing?.label,
    });
  };

  const openBudget = () => {
    const saved = save();
    if (!saved) return;
    setCreatedId(saved);
    router.push({ pathname: '/edit-budget', params: { category: saved } });
  };

  return (
    <Sheet
      accessibilityLabel={isNew ? t('categoryManage.new') : t('categoryManage.edit')}
      onDismissed={router.back}
    >
      {(close) => (
        <>
          <View style={styles.header}>
            <View style={styles.spacer} />
            <Text accessibilityRole="header" style={styles.title}>
              {isNew ? t('categoryManage.new') : t('categoryManage.edit')}
            </Text>
            <Press accessibilityLabel={t('common.close')} onPress={close} style={styles.close}>
              <CloseIcon color={color.muted} />
            </Press>
          </View>

          <View style={styles.nameRow}>
            <View style={[styles.preview, { backgroundColor: palette.bg }]}>
              <CategoryIcon icon={icon} size={28} color={palette.fg} />
            </View>
            <View style={styles.nameField}>
              <TextInput
                accessibilityLabel={t('categoryManage.nameLabel')}
                value={name}
                onChangeText={setName}
                placeholder={t('categoryManage.namePlaceholder')}
                placeholderTextColor={color.placeholder}
                maxLength={MAX_NAME}
                autoFocus={isNew}
                returnKeyType="done"
                style={styles.name}
              />
            </View>
          </View>

          <View style={styles.type}>
            <SegmentedControl
              accessibilityLabel={t('categoryManage.type')}
              options={[
                { value: 'expense', label: t('categoryManage.spending') },
                { value: 'income', label: t('categoryManage.income') },
              ]}
              value={kind}
              onChange={setKind}
            />
          </View>

          <Text accessibilityRole="header" style={styles.groupTitle}>
            {t('categoryManage.icon')}
          </Text>
          <View accessibilityRole="radiogroup" style={styles.icons}>
            {CATEGORY_ICONS.map((key) => {
              const selected = key === icon;
              return (
                <Press
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={t(`categoryManage.icons.${key}`)}
                  onPress={() => setIcon(key)}
                  style={[
                    styles.iconCell,
                    selected
                      ? {
                          backgroundColor: palette.bg,
                          boxShadow: `inset 0px 0px 0px 2px ${palette.fg}`,
                        }
                      : { backgroundColor: color.washSoft },
                  ]}
                >
                  <CategoryIcon icon={key} color={selected ? palette.fg : color.muted} />
                </Press>
              );
            })}
          </View>

          <Text accessibilityRole="header" style={styles.groupTitle}>
            {t('categoryManage.color')}
          </Text>
          <View accessibilityRole="radiogroup" style={styles.colors}>
            {CATEGORY_COLORS.map((key) => {
              const c = categoryPalette[key];
              const selected = key === tint;
              return (
                <Press
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={t(`categoryManage.colors.${key}`)}
                  onPress={() => setTint(key)}
                  style={[
                    styles.color,
                    {
                      backgroundColor: c.bg,
                      boxShadow: selected ? shadow.initialPicked : shadow.initialIdle,
                    },
                  ]}
                >
                  <View style={[styles.colorDot, { backgroundColor: c.fg }]} />
                </Press>
              );
            })}
          </View>

          {BUDGETING && kind === 'expense' ? (
            <Press accessibilityRole="button" onPress={openBudget} style={styles.budget}>
              <Text style={styles.budgetLabel}>{t('categoryManage.budget')}</Text>
              <Text style={styles.budgetValue}>
                {budget
                  ? formatMoney(budget.limitMinor, profile?.currency ?? 'GEL', { decimals: 'auto' })
                  : t('categoryManage.setBudget')}
              </Text>
              <ChevronRightIcon color={color.placeholder} />
            </Press>
          ) : null}

          {isNew ? (
            <Press
              accessibilityRole="button"
              accessibilityState={{ disabled: !trimmed }}
              disabled={!trimmed}
              haptic
              onPress={() => {
                save();
                close();
              }}
              style={[styles.add, trimmed ? styles.addOn : styles.addOff]}
            >
              <Text style={[styles.addText, { color: trimmed ? color.white : color.subtle }]}>
                {t('categoryManage.add')}
              </Text>
            </Press>
          ) : (
            <View style={styles.actions}>
              <Press
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/profile-category-delete', params: { id: params.id! } })
                }
                style={styles.delete}
              >
                <Text style={styles.deleteText}>{t('categoryManage.delete')}</Text>
              </Press>
              <Press
                accessibilityRole="button"
                accessibilityState={{ disabled: !trimmed }}
                disabled={!trimmed}
                haptic
                onPress={() => {
                  save();
                  close();
                }}
                style={[styles.save, !trimmed && styles.saveOff]}
              >
                <Text style={styles.saveText}>{t('categoryManage.save')}</Text>
              </Press>
            </View>
          )}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 10,
    height: size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spacer: { width: size.touch },
  title: { ...text.section, color: color.ink },
  close: {
    width: size.touch,
    height: size.touch,
    borderRadius: size.touch / 2,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 14 },
  preview: {
    width: 60,
    height: 60,
    borderRadius: 19,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameField: {
    // The box is a View around the field: Android drops a TextInput's own
    // horizontal padding, which left the text against the edge.
    flex: 1,
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.washSoft,
    justifyContent: 'center',
  },
  name: {
    height: '100%',
    padding: 0,
    fontFamily: fontFamily.extrabold,
    fontSize: 18,
    color: color.ink,
  },
  type: { marginTop: 14 },
  groupTitle: {
    ...text.meta,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontFamily: fontFamily.extrabold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: color.muted,
  },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCell: {
    width: '14.66%',
    flexGrow: 1,
    height: 48,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colors: { flexDirection: 'row', justifyContent: 'space-between' },
  color: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  budget: {
    marginTop: 16,
    height: 56,
    paddingLeft: 18,
    paddingRight: 12,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.washSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetLabel: { ...text.label, flex: 1, color: color.muted },
  budgetValue: { ...text.label, color: color.ink },
  add: {
    marginTop: 18,
    height: size.button,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOn: { backgroundColor: color.ink, boxShadow: shadow.cta },
  addOff: { backgroundColor: color.washStrong },
  addText: { ...text.section },
  actions: { marginTop: 18, flexDirection: 'row', gap: 10 },
  delete: {
    width: 128,
    height: size.button,
    borderRadius: radius.pill,
    backgroundColor: color.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { ...text.rowTitle, color: color.danger },
  save: {
    flex: 1,
    height: size.button,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    boxShadow: shadow.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveOff: { backgroundColor: color.disabled, boxShadow: 'none' },
  saveText: { ...text.section, color: color.white },
});
