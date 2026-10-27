import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Orbs } from '@/components/Backdrop';
import { CheckIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { db } from '@/db/client';
import { daysLeft } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { greetingKey } from '@/features/home/home';
import { useHour } from '@/features/home/useHour';
import { useMoneyMonth } from '@/features/live';
import { setLanguage } from '@/features/profile/repo';
import { SettingsHeader } from '@/features/profile/SettingsHeader';
import i18n, { type Language } from '@/i18n';
import { categoryPalette, color, fontFamily, radius, shadow, space, text } from '@/theme';

// Language names are shown as themselves, not translated (ProfileLanguage).
const LANGUAGES: {
  code: Language;
  short: string;
  native: string;
  english: string;
  tile: string;
}[] = [
  { code: 'en', short: 'EN', native: 'English', english: 'English', tile: categoryPalette.sky.bg },
  {
    code: 'ka',
    short: 'ქა',
    native: 'ქართული',
    english: 'Georgian',
    tile: categoryPalette.butter.bg,
  },
];

// ProfileLanguage: English or Georgian; the whole app switches right away,
// with a preview of Home in that language.
export default function ProfileLanguageScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const hour = useHour();
  const { today, profile, summary } = useMoneyMonth();
  if (!profile || !summary) return null;

  const current = i18n.language as Language;
  const name = profile.name.trim();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Orbs />
      <SettingsHeader title={t('language.title')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('language.label')}
          style={styles.list}
        >
          {LANGUAGES.map((l) => {
            const on = l.code === current;
            return (
              <Press
                key={l.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={l.native}
                accessibilityLanguage={l.code}
                onPress={() => setLanguage(db, l.code)}
                style={[styles.row, on && styles.rowOn]}
              >
                <View style={[styles.tile, { backgroundColor: l.tile }]}>
                  <Text style={styles.short}>{l.short}</Text>
                </View>
                <View style={styles.names}>
                  <Text style={styles.native}>{l.native}</Text>
                  <Text style={styles.english}>{l.english}</Text>
                </View>
                <View style={[styles.dot, on ? styles.dotOn : styles.dotOff]}>
                  {on ? <CheckIcon color={color.white} /> : null}
                </View>
              </Press>
            );
          })}
        </View>
        <Text style={styles.more}>{t('language.more')}</Text>

        <Text accessibilityRole="header" style={styles.section}>
          {t('language.preview')}
        </Text>
        <View accessible style={styles.preview}>
          <Text style={styles.greet}>{t(`home.greeting.${greetingKey(hour)}`, { name })}</Text>
          <Text style={styles.left}>
            {t('language.previewLeft', {
              amount: formatMoney(summary.left.leftMinor, profile.currency),
              count: daysLeft(today, summary.period),
            })}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  content: { paddingTop: 24, paddingHorizontal: space.screen },
  list: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.listCard,
    boxShadow: shadow.languageCard,
    gap: 2,
  },
  row: {
    height: 64,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: 22,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowOn: { backgroundColor: color.selectedRow },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  short: { fontFamily: fontFamily.extrabold, fontSize: 15, color: color.ink },
  names: { flex: 1, gap: 1 },
  native: { ...text.rowTitle, color: color.ink },
  english: { fontFamily: fontFamily.semibold, fontSize: 13, color: color.muted },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: color.ink },
  dotOff: { borderWidth: 2, borderColor: color.radioRing },
  more: {
    marginTop: 10,
    paddingHorizontal: 4,
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: color.subtle,
  },
  section: {
    ...text.meta,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontFamily: fontFamily.extrabold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: color.muted,
  },
  preview: {
    padding: 16,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
    gap: 4,
  },
  greet: { fontFamily: fontFamily.extrabold, fontSize: 18, color: color.ink },
  left: { fontFamily: fontFamily.semibold, fontSize: 14, color: color.muted },
});
