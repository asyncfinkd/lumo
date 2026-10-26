import type { ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BellIcon,
  CameraIcon,
  ChevronRightIcon,
  DownloadIcon,
  GlobeIcon,
  GridIcon,
  MoneyIcon,
  PersonIcon,
  RepeatIcon,
  TrashIcon,
} from '@/components/Icons';
import { Rise } from '@/components/motion';
import { Press } from '@/components/Press';
import { currencies, formatMoney } from '@/domain/money';
import { useActiveBills, useCategories, useIncomes, useProfile } from '@/features/live';
import { Avatar } from '@/features/profile/Avatar';
import { PhotoToast } from '@/features/profile/photoToast';
import {
  categoryPalette,
  color,
  currencyColor,
  fontFamily,
  radius,
  shadow,
  space,
  text,
} from '@/theme';

const appIcon = require('../../../assets/icon.png');

// Profile: who you are, your money settings and preferences.
export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const incomes = useIncomes();
  const bills = useActiveBills();
  const categories = useCategories();
  if (!profile) return null;

  const { currency } = profile;
  const income = incomes.reduce((sum, i) => sum + i.amountMinor, 0);
  const since = profile.onboardedAt
    ? new Date(profile.onboardedAt).toLocaleDateString(i18n.language, {
        month: 'long',
        year: 'numeric',
      })
    : null;
  const changePhoto = () => router.push('/profile-photo');

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <Text accessibilityRole="header" style={styles.title}>
            {t('profile.title')}
          </Text>
        </Rise>

        <Rise delay={40} style={styles.you}>
          <View style={styles.avatarWrap}>
            <Press
              accessibilityLabel={t('profile.changePhoto')}
              onPress={changePhoto}
              style={styles.avatar}
            >
              <Avatar
                name={profile.name}
                tint={profile.avatarColor}
                photoUri={profile.photoUri}
                size={104}
              />
            </Press>
            <Press
              accessibilityLabel={t('profile.changePhoto')}
              onPress={changePhoto}
              style={styles.badge}
            >
              <CameraIcon color={color.white} size={18} width={2} fillOpacity={0.2} />
            </Press>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          {since ? <Text style={styles.since}>{t('profile.since', { month: since })}</Text> : null}
        </Rise>

        <Rise delay={80} style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t('profile.yourMoney')}
          </Text>
          <View style={styles.list}>
            <Row
              tile={categoryPalette.lilac}
              icon={<PersonIcon color={categoryPalette.lilac.fg} />}
              label={t('profile.name')}
              value={profile.name}
              onPress={() => router.push('/profile-name')}
            />
            <Row
              tile={currencyColor[currency]}
              icon={
                <Text style={[styles.symbol, { color: currencyColor[currency].fg }]}>
                  {currencies[currency].symbol}
                </Text>
              }
              label={t('profile.currency')}
              value={currency}
              onPress={() => router.push('/profile-currency')}
            />
            <Row
              tile={categoryPalette.sage}
              icon={<MoneyIcon color={categoryPalette.sage.fg} />}
              label={t('profile.income')}
              value={t('profile.incomeValue', {
                amount: formatMoney(income, currency, { decimals: 'auto' }),
                day: t('onboarding.income.paydayValue', { count: profile.payday, ordinal: true }),
              })}
              onPress={() => router.push('/profile-income')}
            />
            <Row
              tile={categoryPalette.sky}
              icon={<RepeatIcon color={categoryPalette.sky.fg} />}
              label={t('profile.bills')}
              value={t('profile.billsCount', { count: bills.length })}
            />
            <Row
              tile={categoryPalette.lilac}
              icon={<GridIcon color={categoryPalette.lilac.fg} />}
              label={t('profile.categories')}
              value={t('profile.categoriesCount', { count: categories.length })}
              onPress={() => router.push('/profile-categories')}
            />
          </View>
        </Rise>

        <Rise delay={120} style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t('profile.preferences')}
          </Text>
          <View style={styles.list}>
            <Row
              tile={categoryPalette.butter}
              icon={<BellIcon color={categoryPalette.butter.fg} />}
              label={t('profile.reminders')}
              sub={t('profile.remindersSub')}
              value={profile.reminders ? t('profile.on') : t('profile.off')}
            />
            <Row
              icon={<Image source={appIcon} accessible={false} style={styles.appIcon} />}
              label={t('profile.appIcon')}
              value={t('profile.appIconLight')}
            />
            <Row
              tile={{ bg: color.track, fg: color.muted }}
              icon={<GlobeIcon color={color.muted} />}
              label={t('profile.language')}
              value={t('profile.languageName')}
            />
          </View>
        </Rise>

        <Rise delay={160} style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t('profile.yourData')}
          </Text>
          <View style={styles.list}>
            <Row
              tile={categoryPalette.sage}
              icon={<DownloadIcon color={categoryPalette.sage.fg} />}
              label={t('profile.export')}
              value={t('profile.exportFormat')}
            />
            <Row
              tile={{ bg: color.dangerSoft, fg: color.danger }}
              icon={<TrashIcon color={color.danger} />}
              label={t('profile.deleteAll.row')}
              danger
              onPress={() => router.push('/profile-delete-all')}
            />
          </View>
        </Rise>

        <Text style={styles.footer}>
          {t('profile.footer', { version: Constants.expoConfig?.version ?? '' })}
        </Text>
      </ScrollView>
      <PhotoToast />
    </>
  );
}

/**
 * One settings row: icon tile, label (with an optional second line), the
 * current value and a chevron. Rows whose page isn't built yet don't open.
 */
function Row({
  tile,
  icon,
  label,
  sub,
  value,
  danger = false,
  onPress,
}: {
  tile?: { bg: string; fg: string };
  icon: ReactNode;
  label: string;
  sub?: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  const body = (
    <>
      <View style={[styles.tile, tile && { backgroundColor: tile.bg }]}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: color.danger }]}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {danger ? null : <ChevronRightIcon color={color.placeholder} />}
    </>
  );
  const a11y = value ? `${label}, ${value}` : label;
  return onPress ? (
    <Press
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={[styles.row, sub && styles.rowTall]}
    >
      {body}
    </Press>
  ) : (
    <View accessible accessibilityLabel={a11y} style={[styles.row, sub && styles.rowTall]}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.screen, paddingBottom: space.screenBottom },
  title: { ...text.h1, color: color.ink },
  you: { marginTop: 20, alignItems: 'center' },
  avatarWrap: { width: 104, height: 104 },
  avatar: { width: 104, height: 104, borderRadius: 52, boxShadow: shadow.profileAvatar },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: color.ink,
    boxShadow: shadow.avatarBadge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: 14,
    fontFamily: fontFamily.extrabold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: color.ink,
  },
  since: { ...text.subtitle, marginTop: 2, color: color.muted },
  section: { marginTop: space.sectionGap, gap: 8 },
  sectionTitle: {
    ...text.meta,
    fontFamily: fontFamily.extrabold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: color.muted,
    paddingHorizontal: 4,
  },
  list: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
  },
  row: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 14 },
  tile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontFamily: fontFamily.bold, fontSize: 18 },
  appIcon: { width: 36, height: 36, borderRadius: 10, boxShadow: shadow.appIconRing },
  rowTall: { height: 64 },
  rowText: { flex: 1, minWidth: 0, gap: 1 },
  rowLabel: { ...text.rowTitle, color: color.ink },
  rowSub: { ...text.small, fontFamily: fontFamily.semibold, color: color.muted },
  rowValue: { ...text.label, fontFamily: fontFamily.semibold, color: color.muted },
  footer: {
    ...text.meta,
    marginTop: space.sectionGap,
    textAlign: 'center',
    color: color.subtle,
  },
});
