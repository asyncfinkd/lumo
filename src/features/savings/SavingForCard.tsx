import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Jar } from '@/components/Jar';
import { Fill } from '@/components/motion';
import { Press } from '@/components/Press';
import type { Jar as JarRow } from '@/db/schema';
import type { CalendarDate } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { useMoneyText } from '@/features/privacy/amounts';
import { color, fontFamily, gradient, radius, savingsColor, shadow } from '@/theme';
import { fullBy, jarPercent } from './savings';

/** The month "by Feb" points at, short: "Feb". */
function shortMonth(year: number, month: number, language: string): string {
  return new Date(year, month - 1, 1).toLocaleDateString(language, { month: 'short' });
}

/**
 * "Saving for" on Home (Main): the jar up front on Savings, how full it is and
 * when it will be full. Opens Savings. Nothing without a jar.
 */
export function SavingForCard({
  jar,
  savedMinor,
  today,
  onPress,
}: {
  jar: JarRow;
  savedMinor: number;
  today: CalendarDate;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation();
  const money = useMoneyText();
  const pct = jarPercent(savedMinor, jar.goalMinor);
  const left = jar.goalMinor - savedMinor;
  const by = left > 0 ? fullBy(today, left, jar) : null;
  const when = by
    ? t('savings.home.by', { month: shortMonth(by.year, by.month, i18n.language) })
    : t('savings.home.full');
  const amounts = money(
    t('savings.home.amounts', {
      saved: formatMoney(savedMinor, jar.currency, { decimals: 'auto' }),
      goal: formatMoney(jar.goalMinor, jar.currency, { decimals: 'auto' }),
    }),
  );

  return (
    <Press
      accessibilityRole="link"
      accessibilityLabel={t('savings.home.label', { name: jar.name, percent: pct })}
      onPress={onPress}
      style={styles.card}
    >
      <View pointerEvents="none" style={styles.glow} />
      <View style={styles.jar}>
        <Jar pct={pct} size={58} tone={jar.tone} label={false} />
      </View>
      <View style={styles.middle}>
        <Text style={styles.label}>{t('savings.home.savingFor')}</Text>
        <Text numberOfLines={1} style={styles.name}>
          {jar.name}
        </Text>
        <View style={styles.progressRow}>
          <View style={styles.track}>
            <Fill percent={pct} style={styles.fill} />
          </View>
          <Text style={styles.amounts}>{amounts}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.percent}>
          {pct}
          <Text style={styles.sign}>{t('savings.home.percentSign')}</Text>
        </Text>
        <Text style={styles.when}>{when}</Text>
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 92,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundImage: gradient.savingFor,
    boxShadow: shadow.savingFor,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  glow: {
    position: 'absolute',
    left: -30,
    top: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundImage: gradient.savingForGlow,
  },
  jar: { marginTop: 2 },
  middle: { flex: 1, minWidth: 0, gap: 2 },
  label: {
    fontFamily: fontFamily.extrabold,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: savingsColor.cardLabel,
  },
  name: { fontFamily: fontFamily.extrabold, fontSize: 17, lineHeight: 22, color: color.ink },
  progressRow: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: {
    flex: 1,
    maxWidth: 120,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: savingsColor.barTrack,
    overflow: 'hidden',
  },
  fill: { backgroundImage: gradient.jarBar },
  amounts: {
    fontFamily: fontFamily.extrabold,
    fontSize: 12,
    color: savingsColor.paceText,
    fontVariant: ['tabular-nums'],
  },
  right: { alignItems: 'flex-end' },
  percent: {
    fontFamily: fontFamily.extrabold,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: -0.6,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  sign: { fontSize: 14, color: savingsColor.cardLabel },
  when: { fontFamily: fontFamily.bold, fontSize: 11, color: color.subtle },
});
