import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { AppState, Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScreenTop } from '@/components/useScreenTop';
import { Orbs } from '@/components/Backdrop';
import { CategoryIcon, MoonIcon, PurseIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { Switch } from '@/components/Switch';
import { db } from '@/db/client';
import { formatMoney } from '@/domain/money';
import { useBills, useProfile } from '@/features/live';
import { type ReminderKind, setReminderKind, setReminders } from '@/features/profile/repo';
import { BUDGETING } from '@/features/flags';
import { SettingsHeader } from '@/features/profile/SettingsHeader';
import { askForNotifications, notificationsAllowed } from '@/features/reminders/RemindersSync';
import { categoryPalette, color, fontFamily, radius, shadow, space, text } from '@/theme';

const appIcon = require('../../assets/icon.png');

const KINDS: {
  kind: ReminderKind;
  title: 'bills' | 'payday' | 'low' | 'evening';
  tint: { bg: string; fg: string };
  icon: (fg: string) => ReactNode;
}[] = [
  {
    kind: 'remindBills',
    title: 'bills',
    tint: categoryPalette.sage,
    icon: (fg) => <CategoryIcon icon="bolt" size={20} color={fg} />,
  },
  {
    kind: 'remindPayday',
    title: 'payday',
    tint: categoryPalette.mint,
    icon: (fg) => <CategoryIcon icon="wallet" size={20} color={fg} />,
  },
  {
    kind: 'remindLowBudget',
    title: 'low',
    tint: categoryPalette.butter,
    icon: (fg) => <PurseIcon color={fg} />,
  },
  {
    kind: 'remindEvening',
    title: 'evening',
    tint: categoryPalette.lilac,
    icon: (fg) => <MoonIcon color={fg} />,
  },
];

// ProfileReminders: one main switch and four kinds of gentle reminders, with a
// sample of what one looks like. Turning Reminders on asks the phone first.
export default function ProfileRemindersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const screenTop = useScreenTop();
  const profile = useProfile();
  const bills = useBills();
  // Whether the phone lets Lumo notify; checked again when you come back from Settings.
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [blocked, setBlocked] = useState(false);

  const check = useCallback(() => {
    notificationsAllowed().then((ok) => {
      setAllowed(ok);
      if (ok) setBlocked(false);
    });
  }, []);
  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  if (!profile) return null;
  const on = profile.reminders && allowed === true;

  const toggleAll = async (next: boolean) => {
    if (!next) {
      setReminders(db, false);
      return;
    }
    const ok = await askForNotifications();
    setAllowed(ok);
    setBlocked(!ok);
    if (ok) setReminders(db, true);
  };

  // The sample uses your first bill, as the board does.
  const bill = [...bills].sort((a, b) => a.day - b.day)[0];
  const sample = bill
    ? {
        title: t('remindersScreen.notify.billTitle', { name: bill.name }),
        body: bill.active
          ? t('remindersScreen.notify.billAuto', {
              amount: formatMoney(bill.amountMinor, bill.currency, { decimals: 'auto' }),
              day: t('onboarding.income.paydayValue', { count: bill.day, ordinal: true }),
            })
          : t('remindersScreen.notify.billManual', {
              amount: formatMoney(bill.amountMinor, bill.currency, { decimals: 'auto' }),
            }),
      }
    : {
        title: t('remindersScreen.notify.eveningTitle'),
        body: t('remindersScreen.notify.eveningBody'),
      };

  return (
    <View style={[styles.root, { paddingTop: screenTop }]}>
      <Orbs />
      <SettingsHeader title={t('remindersScreen.title')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>{t('remindersScreen.intro')}</Text>

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.sample}
        >
          <Image source={appIcon} style={styles.sampleIcon} />
          <View style={styles.sampleText}>
            <View style={styles.sampleTop}>
              <Text style={styles.sampleApp}>{Constants.expoConfig?.name}</Text>
              <Text style={styles.sampleNow}>{t('remindersScreen.now')}</Text>
            </View>
            <Text numberOfLines={1} style={styles.sampleTitle}>
              {sample.title}
            </Text>
            <Text numberOfLines={2} style={styles.sampleBody}>
              {sample.body}
            </Text>
          </View>
        </View>
        <Text style={styles.caption}>{t('remindersScreen.sampleCaption')}</Text>

        <View style={styles.master}>
          <Text style={styles.masterLabel}>{t('remindersScreen.all')}</Text>
          <Switch value={on} onChange={toggleAll} accessibilityLabel={t('remindersScreen.all')} />
        </View>

        {blocked ? (
          <View accessibilityLiveRegion="polite" style={styles.blocked}>
            <Text style={styles.blockedText}>{t('remindersScreen.blocked')}</Text>
            <Press
              accessibilityRole="button"
              onPress={() => Linking.openSettings()}
              style={styles.settings}
            >
              <Text style={styles.settingsText}>{t('remindersScreen.openSettings')}</Text>
            </Press>
          </View>
        ) : null}

        <View style={[styles.list, !on && styles.listOff]}>
          {KINDS.filter((k) => BUDGETING || k.kind !== 'remindLowBudget').map((k) => {
            const value = on && profile[k.kind];
            const title = t(`remindersScreen.${k.title}`);
            return (
              <View key={k.kind} style={styles.row}>
                <View style={[styles.tile, { backgroundColor: k.tint.bg }]}>
                  {k.icon(k.tint.fg)}
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{title}</Text>
                  <Text style={styles.rowHint}>{t(`remindersScreen.${k.title}Hint`)}</Text>
                </View>
                <Switch
                  value={value}
                  disabled={!on}
                  onChange={(next) => setReminderKind(db, k.kind, next)}
                  accessibilityLabel={title}
                />
              </View>
            );
          })}
        </View>
        <Text style={styles.quiet}>{t('remindersScreen.quiet')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  content: { paddingTop: 20, paddingHorizontal: space.screen },
  intro: { ...text.subtitle, fontSize: 15, lineHeight: 21, color: color.muted },
  sample: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: color.notificationCard,
    boxShadow: shadow.notificationCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sampleIcon: { width: 38, height: 38, borderRadius: 9, boxShadow: shadow.appIconRing },
  sampleText: { flex: 1, minWidth: 0, gap: 1 },
  sampleTop: { flexDirection: 'row', justifyContent: 'space-between' },
  sampleApp: { fontFamily: fontFamily.extrabold, fontSize: 13, color: color.ink },
  sampleNow: { fontFamily: fontFamily.semibold, fontSize: 13, color: color.muted },
  sampleTitle: { fontFamily: fontFamily.bold, fontSize: 14, color: color.ink },
  sampleBody: { fontFamily: fontFamily.semibold, fontSize: 13, color: color.softInk },
  caption: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: color.subtle,
  },
  master: {
    marginTop: 16,
    minHeight: 64,
    paddingLeft: 18,
    paddingRight: 12,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: color.field,
    boxShadow: shadow.masterRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  masterLabel: { flex: 1, fontFamily: fontFamily.extrabold, fontSize: 17, color: color.ink },
  blocked: {
    marginTop: 8,
    padding: 14,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.calmSoft,
    gap: 10,
  },
  blockedText: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: color.softInk,
  },
  settings: {
    alignSelf: 'flex-start',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    justifyContent: 'center',
  },
  settingsText: { fontFamily: fontFamily.bold, fontSize: 14, color: color.white },
  list: {
    marginTop: 12,
    paddingVertical: 4,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
  },
  listOff: { opacity: 0.45 },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontFamily: fontFamily.bold, fontSize: 15, color: color.ink },
  rowHint: { fontFamily: fontFamily.semibold, fontSize: 12, lineHeight: 16, color: color.muted },
  quiet: {
    marginTop: 12,
    paddingHorizontal: 4,
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 17,
    color: color.subtle,
  },
});
