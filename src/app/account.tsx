import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AccountIcon, CloseIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { Sheet } from '@/components/Sheet';
import {
  ACCOUNT_COLORS,
  ACCOUNT_KINDS,
  type AccountColor,
  type AccountKind,
  KIND_COLOR,
} from '@/db/accounts';
import { db } from '@/db/client';
import { currencies, formatMoney, parseAmount } from '@/domain/money';
import { accountLabel, useAccountViews } from '@/features/accounts/accounts';
import { accountById, accountUsage, createAccount, updateAccount } from '@/features/accounts/repo';
import { useProfile, useToday } from '@/features/live';
import { categoryPalette, color, fontFamily, radius, shadow, size, text } from '@/theme';

const MAX_NAME = 24;

// NewAccount / EditAccount (#21): name, kind, color; a new one starts with
// what's in it now, an existing one shows its balance and can be deleted.
export default function AccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const today = useToday();
  const params = useLocalSearchParams<{ id?: string }>();
  const profile = useProfile();
  const views = useAccountViews();
  const currency = profile?.currency ?? 'GEL';
  const isNew = !params.id;
  // Read once, so the fields start filled in rather than waiting on the live query.
  const [row] = useState(() => (params.id ? accountById(db, params.id) : undefined));
  const [label] = useState(() => (row ? accountLabel(row, t('accounts.main')) : ''));
  const balanceMinor = views.find((a) => a.id === params.id)?.balanceMinor ?? 0;

  const [name, setName] = useState(label);
  const [kind, setKind] = useState<AccountKind>(row?.kind ?? 'cash');
  // A new account's color follows its kind until one is picked.
  const [tint, setTint] = useState<AccountColor | null>(row?.color ?? null);
  const [start, setStart] = useState('');
  const [usage] = useState(() => (params.id ? accountUsage(db, params.id) : 0));
  const shown = tint ?? KIND_COLOR[kind];
  const palette = categoryPalette[shown];
  const trimmed = name.trim();
  const startMinor = start.trim() ? parseAmount(start, currency) : 0;
  const ready = !!trimmed && startMinor !== null;

  const save = (close: () => void) => {
    if (!ready) return;
    if (isNew) {
      createAccount(db, { name: trimmed, kind, color: shown, startMinor: startMinor ?? 0 }, today);
    } else if (row) {
      // Main's translated name, left as it was, isn't a rename.
      updateAccount(db, row.id, {
        name: trimmed,
        kind,
        color: shown,
        renamed: trimmed !== label,
      });
    }
    close();
  };

  return (
    <Sheet
      accessibilityLabel={isNew ? t('accounts.new') : t('accounts.edit')}
      onDismissed={router.back}
      top={84}
    >
      {(close) => (
        <>
          <View style={styles.header}>
            <Press accessibilityLabel={t('common.close')} onPress={close} style={styles.close}>
              <CloseIcon color={color.muted} />
            </Press>
            <Text accessibilityRole="header" style={styles.title}>
              {isNew ? t('accounts.new') : t('accounts.edit')}
            </Text>
            <View style={styles.spacer} />
          </View>

          <View style={styles.nameRow}>
            <View style={[styles.preview, { backgroundColor: palette.bg }]}>
              <AccountIcon kind={kind} size={30} width={1.7} color={palette.fg} />
            </View>
            <View style={styles.nameField}>
              <TextInput
                accessibilityLabel={t('accounts.nameLabel')}
                value={name}
                onChangeText={setName}
                placeholder={t('accounts.namePlaceholder')}
                placeholderTextColor={color.placeholder}
                maxLength={MAX_NAME}
                autoFocus={isNew}
                returnKeyType="done"
                style={styles.name}
              />
            </View>
          </View>

          <Text accessibilityRole="header" style={styles.groupTitle}>
            {t('accounts.kind')}
          </Text>
          <View accessibilityRole="radiogroup" style={styles.kinds}>
            {ACCOUNT_KINDS.map((key) => {
              const on = key === kind;
              return (
                <Press
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={t(`accounts.kinds.${key}`)}
                  onPress={() => setKind(key)}
                  style={[styles.kind, on ? styles.kindOn : styles.kindOff]}
                >
                  <AccountIcon kind={key} size={24} color={color.softInk} />
                  <Text style={styles.kindText}>{t(`accounts.kinds.${key}`)}</Text>
                </Press>
              );
            })}
          </View>

          <Text accessibilityRole="header" style={styles.groupTitle}>
            {t('accounts.color')}
          </Text>
          <View accessibilityRole="radiogroup" style={styles.colors}>
            {ACCOUNT_COLORS.map((key) => {
              const on = key === shown;
              return (
                <Press
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={t(`accounts.colors.${key}`)}
                  onPress={() => setTint(key)}
                  style={[
                    styles.color,
                    {
                      backgroundColor: categoryPalette[key].chart,
                      boxShadow: on ? shadow.initialPicked : shadow.initialIdle,
                    },
                  ]}
                />
              );
            })}
          </View>

          {isNew ? (
            <>
              <Text accessibilityRole="header" style={styles.groupTitle}>
                {t('accounts.startTitle')}
              </Text>
              <View style={styles.startField}>
                <Text style={styles.startSymbol}>{currencies[currency].symbol}</Text>
                <TextInput
                  accessibilityLabel={t('accounts.startLabel')}
                  value={start}
                  onChangeText={setStart}
                  placeholder="0.00"
                  placeholderTextColor={color.placeholder}
                  keyboardType="decimal-pad"
                  style={styles.startInput}
                />
              </View>
              <Press
                accessibilityRole="button"
                accessibilityState={{ disabled: !ready }}
                disabled={!ready}
                haptic
                onPress={() => save(close)}
                style={[styles.add, ready ? styles.addOn : styles.addOff]}
              >
                <Text style={[styles.addText, { color: ready ? color.white : color.subtle }]}>
                  {t('accounts.add')}
                </Text>
              </Press>
            </>
          ) : (
            <>
              <View style={styles.facts}>
                <View style={styles.fact}>
                  <Text style={styles.factLabel}>{t('accounts.balanceNow')}</Text>
                  <Text style={styles.factValue}>{formatMoney(balanceMinor, currency)}</Text>
                </View>
                <View style={[styles.fact, styles.factLine]}>
                  <Text style={styles.factLabel}>{t('accounts.usedIn')}</Text>
                  <Text style={styles.factValue}>{t('accounts.usedCount', { count: usage })}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Press
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/account-delete', params: { id: params.id! } })
                  }
                  style={styles.delete}
                >
                  <Text style={styles.deleteText}>{t('accounts.delete')}</Text>
                </Press>
                <Press
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !ready }}
                  disabled={!ready}
                  haptic
                  onPress={() => save(close)}
                  style={[styles.save, !ready && styles.saveOff]}
                >
                  <Text style={styles.saveText}>{t('accounts.save')}</Text>
                </Press>
              </View>
            </>
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
  nameRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 14 },
  preview: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameField: {
    flex: 1,
    height: 60,
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
    fontSize: 20,
    color: color.ink,
  },
  groupTitle: {
    ...text.meta,
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontFamily: fontFamily.extrabold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: color.muted,
  },
  kinds: { flexDirection: 'row', gap: 8 },
  kind: {
    flex: 1,
    height: 72,
    borderRadius: 20,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  kindOn: { backgroundColor: color.white, boxShadow: `inset 0px 0px 0px 2px ${color.ink}` },
  kindOff: { backgroundColor: color.washSoft },
  kindText: { ...text.meta, fontFamily: fontFamily.extrabold, color: color.ink },
  colors: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  color: { width: 40, height: 40, borderRadius: 20 },
  startField: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: color.washSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  startSymbol: { fontFamily: fontFamily.bold, fontSize: 17, color: color.placeholder },
  startInput: {
    padding: 0,
    textAlign: 'right',
    fontFamily: fontFamily.extrabold,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    color: color.ink,
  },
  add: {
    marginTop: 'auto',
    height: size.button,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOn: { backgroundColor: color.ink, boxShadow: shadow.cta },
  addOff: { backgroundColor: color.washStrong },
  addText: { ...text.section },
  facts: {
    marginTop: 20,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.washSoft,
  },
  fact: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 10 },
  factLine: { borderTopWidth: 1, borderTopColor: 'rgba(43,37,34,0.06)' },
  factLabel: { ...text.subtitle, flex: 1, color: color.muted },
  factValue: {
    ...text.label,
    fontFamily: fontFamily.extrabold,
    fontVariant: ['tabular-nums'],
    color: color.ink,
  },
  actions: { marginTop: 'auto', flexDirection: 'row', gap: 10 },
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
