import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useScreenTop } from '@/components/useScreenTop';
import { Donut } from '@/components/Donut';
import { CategoryIcon, SparkleIcon } from '@/components/Icons';
import { Fill, Rise } from '@/components/motion';
import { SegmentedControl } from '@/components/SegmentedControl';
import { addDays } from '@/domain/dates';
import { type CurrencyCode, formatMoney, percent } from '@/domain/money';
import { useCategories } from '@/features/categories/categories';
import { CATEGORY_EMOJI } from '@/features/categoryEmoji';
import {
  biggestDrop,
  type CategoryTotal,
  type Insight,
  previousWindow,
  spendingByCategory,
  weekRange,
} from '@/features/insights/insights';
import { useRouter } from 'expo-router';
import { useAllTransactions, useJarEntries, useJars, useMoneyMonth } from '@/features/live';
import { InsightsSavingsCard } from '@/features/savings/InsightsSavingsCard';
import { savedByJar } from '@/features/savings/savings';
import { usePullToRefresh } from '@/features/money/usePullToRefresh';
import { color, radius, shadow, space, text } from '@/theme';

type Range = 'day' | 'week' | 'month';

// Insights: where the money went today, this week or this pay period, a donut,
// one gentle sentence and the categories side by side.
export default function InsightsScreen() {
  const { t } = useTranslation();
  const screenTop = useScreenTop();
  const refreshControl = usePullToRefresh(screenTop);
  const [view, setView] = useState<Range>('day');
  const { today, profile, summary } = useMoneyMonth();
  const transactions = useAllTransactions();
  const categories = useCategories();
  const router = useRouter();
  const jars = useJars();
  const jarEntries = useJarEntries();
  const saved = useMemo(() => savedByJar(jarEntries), [jarEntries]);
  // "8% of what came in": this calendar month, as the bars count it.
  const cameInThisMonth = useMemo(() => {
    const month = today.slice(0, 7);
    return transactions
      .filter((tx) => tx.kind === 'income' && tx.source !== 'adjustment')
      .filter((tx) => tx.date.startsWith(month))
      .reduce((sum, tx) => sum + tx.amountMinor, 0);
  }, [transactions, today]);

  const data = useMemo(() => {
    if (!profile || !summary) return null;
    if (view === 'day') {
      // No sentence for a single day: the design only words week and month.
      return { items: spendingByCategory(transactions, today, addDays(today, 1)), insight: null };
    }
    if (view === 'week') {
      const { start, end } = weekRange(today);
      const items = spendingByCategory(transactions, start, end);
      const top = items[0];
      const insight: Insight | null = top ? { type: 'led', category: top.category } : null;
      return { items, insight };
    }
    const { start, end } = summary.period;
    const items = spendingByCategory(transactions, start, end);
    const before = previousWindow(today, profile.payday);
    const previous = spendingByCategory(transactions, before.start, before.end);
    return { items, insight: biggestDrop(items, previous, before.start) };
  }, [view, today, profile, summary, transactions]);

  if (!profile || !data) return null;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: screenTop }]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      <Rise style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('insights.title')}
        </Text>
        <Text style={styles.subtitle}>{t('insights.subtitle')}</Text>
      </Rise>

      <Rise delay={40} style={styles.period}>
        <SegmentedControl
          tone="card"
          accessibilityLabel={t('insights.period')}
          options={[
            { value: 'day', label: t('insights.day') },
            { value: 'week', label: t('insights.week') },
            { value: 'month', label: t('insights.month') },
          ]}
          value={view}
          onChange={setView}
        />
      </Rise>

      <Rise delay={80} style={styles.chartCard}>
        <Donut
          items={data.items.map((item) => {
            const c = categories.get(item.category);
            return { key: item.category, label: c.label, chart: c.tint.chart, minor: item.minor };
          })}
          currency={profile.currency}
          label={
            view === 'day'
              ? t('insights.spentToday')
              : view === 'week'
                ? t('insights.spentThisWeek')
                : t('insights.spentThisMonth')
          }
        />
      </Rise>

      {data.insight ? (
        <Rise delay={120}>
          <InsightCard insight={data.insight} />
        </Rise>
      ) : null}

      {jars.length > 0 ? (
        <Rise delay={140}>
          <InsightsSavingsCard
            jars={jars}
            entries={jarEntries}
            saved={saved}
            cameInMinor={cameInThisMonth}
            currency={profile.currency}
            today={today}
            onSeeJars={() => router.navigate('/savings')}
          />
        </Rise>
      ) : null}

      {data.items.length > 0 ? (
        <Rise delay={160} style={styles.byCategory}>
          <Text accessibilityRole="header" style={styles.section}>
            {t('insights.byCategory')}
          </Text>
          <View style={styles.list}>
            {data.items.slice(0, 6).map((item) => (
              <CategoryRow
                key={item.category}
                item={item}
                largest={data.items[0]!.minor}
                total={data.items.reduce((sum, i) => sum + i.minor, 0)}
                currency={profile.currency}
              />
            ))}
          </View>
        </Rise>
      ) : null}
    </ScrollView>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const { t, i18n } = useTranslation();
  const category = useCategories().get(insight.category).label;

  let line: string | null = null;
  if (insight.type === 'less') {
    const [y, m] = insight.previousStart.split('-').map(Number);
    line = t('insights.insight.less', {
      percent: insight.percent,
      category: category.toLocaleLowerCase(i18n.language),
      month: new Date(y!, m! - 1, 1).toLocaleDateString(i18n.language, { month: 'long' }),
      emoji: CATEGORY_EMOJI[insight.category] ?? '',
    });
  } else if (insight.category === 'groceries') {
    // The design only words this for groceries so far.
    line = t('insights.insight.led', {
      category,
      flavor: t('insights.insight.flavor.groceries'),
    });
  }
  if (!line) return null;

  return (
    <View accessibilityLabel={line} accessible style={styles.insight}>
      <View style={styles.insightIcon}>
        <SparkleIcon color={color.insightIcon} />
      </View>
      <Text style={styles.insightText}>{line}</Text>
    </View>
  );
}

function CategoryRow({
  item,
  largest,
  total,
  currency,
}: {
  item: CategoryTotal;
  largest: number;
  total: number;
  currency: CurrencyCode;
}) {
  const { t } = useTranslation();
  const view = useCategories().get(item.category);
  const tint = view.tint;
  const name = view.label;
  const amount = formatMoney(item.minor, currency, { decimals: 'auto' });
  const share = percent(item.minor, total);

  return (
    <View
      accessible
      accessibilityLabel={t('insights.rowLabel', { category: name, amount, percent: share })}
      style={styles.row}
    >
      <View style={[styles.rowIcon, { backgroundColor: tint.bg }]}>
        <CategoryIcon icon={view.icon} size={22} color={tint.fg} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName}>{name}</Text>
          <Text style={styles.rowAmount}>{amount}</Text>
        </View>
        <View style={styles.rowBottom}>
          <View style={styles.track}>
            <Fill
              percent={Math.max((item.minor / largest) * 100, 6)}
              style={{ backgroundColor: tint.chart }}
            />
          </View>
          <Text style={styles.percent}>{t('insights.percent', { percent: share })}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.screen, paddingBottom: space.screenBottom },
  header: { gap: 2 },
  title: { ...text.h1, color: color.ink },
  subtitle: { ...text.subtitle, color: color.muted },
  period: { marginTop: 16 },
  chartCard: {
    marginTop: 16,
    padding: 20,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
    alignItems: 'center',
  },
  insight: {
    marginTop: 12,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 18,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.insight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  insightIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.tileSmall,
    borderCurve: 'continuous',
    backgroundColor: color.listCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: { ...text.label, lineHeight: 21, color: color.insightText, flex: 1 },
  byCategory: { marginTop: space.sectionGap, gap: 8 },
  section: { ...text.section, color: color.ink, paddingHorizontal: 4 },
  list: {
    paddingVertical: 2,
    paddingHorizontal: 14,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
  },
  row: { height: 68, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.tileSmall,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0, gap: 7 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  rowName: { ...text.label, color: color.ink },
  rowAmount: { ...text.label, color: color.ink, fontVariant: ['tabular-nums'] },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: color.track,
    overflow: 'hidden',
  },
  percent: {
    ...text.small,
    width: 34,
    textAlign: 'right',
    color: color.muted,
    fontVariant: ['tabular-nums'],
  },
});
