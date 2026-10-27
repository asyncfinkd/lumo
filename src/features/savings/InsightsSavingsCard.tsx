import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Jar } from '@/components/Jar';
import { Press } from '@/components/Press';
import type { Jar as JarRow } from '@/db/schema';
import type { CalendarDate } from '@/domain/dates';
import { formatMoney, type CurrencyCode } from '@/domain/money';
import { useMoneyText } from '@/features/privacy/amounts';
import { color, fontFamily, gradient, radius, savingsColor, shadow, space, text } from '@/theme';
import { bestPaceStreak, fullBy, jarPercent, monthlyPutAway } from './savings';

/** The tallest bar; the others are measured against the best month. */
const BAR_MAX = 52;

/**
 * Savings on Insights (InsightsSavings): what went into jars this month and
 * how much of what came in that was, the last six months as bars, one line
 * about the pace, and up to three jars. Nothing without a jar.
 */
export function InsightsSavingsCard({
  jars,
  entries,
  saved,
  cameInMinor,
  currency,
  today,
  onSeeJars,
}: {
  jars: readonly JarRow[];
  entries: readonly { amountMinor: number; date: CalendarDate }[];
  saved: Map<string, number>;
  /** What came in this calendar month, for "8% of what came in". */
  cameInMinor: number;
  currency: CurrencyCode;
  today: CalendarDate;
  onSeeJars: () => void;
}) {
  const { t, i18n } = useTranslation();
  const money = useMoneyText();
  const months = useMemo(() => monthlyPutAway(entries, today), [entries, today]);
  const now = months[months.length - 1]!;
  const best = Math.max(...months.map((m) => m.minor));
  const streak = bestPaceStreak(months);
  const monthName = (year: number, month: number, style: 'long' | 'narrow') =>
    new Date(year, month - 1, 1).toLocaleDateString(i18n.language, { month: style });

  const lead = jars[0]!;
  const leadLeft = lead.goalMinor - (saved.get(lead.id) ?? 0);
  const leadFull = leadLeft > 0 ? fullBy(today, leadLeft, lead) : null;
  const sentence = [
    streak >= 2
      ? t('savings.insights.streak', { count: streak })
      : streak === 1
        ? t('savings.insights.best')
        : null,
    leadFull
      ? t('savings.insights.fullIn', {
          name: lead.name,
          month: monthName(leadFull.year, leadFull.month, 'long'),
        })
      : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('savings.title')}
        </Text>
        <Press accessibilityRole="link" onPress={onSeeJars} hitSlop={12}>
          <Text style={styles.link}>{t('savings.insights.seeJars')}</Text>
        </Press>
      </View>

      <View style={styles.card}>
        <View style={styles.top}>
          <View style={styles.totals}>
            <Text style={styles.putAway}>
              {t('savings.insights.putAway', { month: monthName(now.year, now.month, 'long') })}
            </Text>
            <Text style={styles.amount}>
              {money(formatMoney(now.minor, currency, { decimals: 'auto' }))}
            </Text>
            {cameInMinor > 0 ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>
                  {t('savings.insights.ofCameIn', {
                    percent: Math.round((now.minor * 100) / cameInMinor),
                  })}
                </Text>
              </View>
            ) : null}
          </View>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={t('savings.insights.barsLabel', {
              list: months
                .map(
                  (m) =>
                    `${monthName(m.year, m.month, 'long')} ${formatMoney(m.minor, currency, {
                      decimals: 'auto',
                    })}`,
                )
                .join(', '),
            })}
            style={styles.bars}
          >
            {months.map((m, i) => {
              const current = i === months.length - 1;
              return (
                <View key={`${m.year}-${m.month}`} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      { height: best > 0 ? Math.max(4, (m.minor / best) * BAR_MAX) : 4 },
                      current ? styles.barNow : styles.barIdle,
                    ]}
                  />
                  <Text style={[styles.barLabel, current && styles.barLabelNow]}>
                    {monthName(m.year, m.month, 'narrow')}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {sentence ? <Text style={styles.sentence}>{sentence}</Text> : null}

        <View style={styles.divider} />
        <View style={styles.jars}>
          {jars.slice(0, 3).map((jar) => {
            const pct = jarPercent(saved.get(jar.id) ?? 0, jar.goalMinor);
            return (
              <View
                key={jar.id}
                accessible
                accessibilityLabel={t('savings.jarLabel', { name: jar.name, percent: pct })}
                style={styles.jar}
              >
                <Jar pct={pct} size={34} tone={jar.tone} label={false} />
                <Text numberOfLines={1} style={styles.jarName}>
                  {jar.name}
                </Text>
                <Text style={styles.jarPct}>{t('insights.percent', { percent: pct })}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.sectionGap, gap: 8 },
  head: {
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: { ...text.section, color: color.ink },
  link: { fontFamily: fontFamily.bold, fontSize: 15, color: color.ink },
  card: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundImage: gradient.savingsCard,
    boxShadow: shadow.savingsCard,
  },
  top: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  totals: { flex: 1, minWidth: 0 },
  putAway: { fontFamily: fontFamily.bold, fontSize: 13, color: savingsColor.paceText },
  amount: {
    marginTop: 2,
    fontFamily: fontFamily.extrabold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  pill: {
    marginTop: 4,
    alignSelf: 'flex-start',
    height: 24,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: savingsColor.pill,
    justifyContent: 'center',
  },
  pillText: {
    fontFamily: fontFamily.extrabold,
    fontSize: 12,
    color: color.good,
    fontVariant: ['tabular-nums'],
  },
  bars: { width: 132, height: 72, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '100%', borderRadius: 6 },
  barIdle: { backgroundColor: savingsColor.barIdle },
  barNow: { backgroundImage: gradient.jarBarTall },
  barLabel: { fontFamily: fontFamily.extrabold, fontSize: 10, color: savingsColor.monthLabel },
  barLabelNow: { color: savingsColor.paceText },
  sentence: {
    marginTop: 14,
    fontFamily: fontFamily.bold,
    fontSize: 14,
    lineHeight: 20,
    color: color.insightText,
  },
  divider: { marginTop: 14, height: 1, backgroundColor: savingsColor.divider },
  jars: { marginTop: 12, flexDirection: 'row', gap: 8 },
  jar: { flex: 1, alignItems: 'center', gap: 3 },
  jarName: {
    fontFamily: fontFamily.extrabold,
    fontSize: 12,
    lineHeight: 15,
    color: color.ink,
  },
  jarPct: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: color.subtle,
    fontVariant: ['tabular-nums'],
  },
});
