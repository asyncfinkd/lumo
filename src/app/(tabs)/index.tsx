import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Rise } from '@/components/motion';
import { Press } from '@/components/Press';
import type { Transaction } from '@/db/schema';
import { addDays } from '@/domain/dates';
import { BUDGETING } from '@/features/flags';
import { BalanceCard } from '@/features/home/BalanceCard';
import { FlowCard } from '@/features/home/FlowCard';
import { greetingKey, monthChange, recentDays } from '@/features/home/home';
import { LeftToSpendCard } from '@/features/home/LeftToSpendCard';
import { useHour } from '@/features/home/useHour';
import { useAllTransactions, useMoneyMonth, useTransactionsBetween } from '@/features/live';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import { color, fontFamily, radius, shadow, size, space, text } from '@/theme';

// Main: greeting, your balance (or Left to spend, with budgeting on), Came in /
// Went out, and today's and yesterday's transactions.
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hour = useHour();
  const { today, profile, summary } = useMoneyMonth();
  const recent = recentDays(useTransactionsBetween(addDays(today, -1), addDays(today, 1)), today);
  const transactions = useAllTransactions();
  const change = useMemo(() => monthChange(transactions, today), [transactions, today]);

  if (!profile || !summary) return null;
  const name = profile.name.trim();

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <Rise style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.greeting}>
            {t(`home.greeting.${greetingKey(hour)}`, { name })}
          </Text>
          {(BUDGETING ? summary.left.overMinor === 0 : (change?.deltaMinor ?? 0) >= 0) ? (
            <Text style={styles.subtitle}>{t('home.doingGreat')}</Text>
          ) : null}
        </View>
      </Rise>

      <Rise delay={60}>
        {BUDGETING ? (
          <LeftToSpendCard
            summary={summary}
            currency={profile.currency}
            onBalance={() => router.push('/balance')}
          />
        ) : (
          <BalanceCard
            balanceMinor={summary.balanceMinor}
            change={change}
            currency={profile.currency}
            onBalance={() => router.push('/balance')}
          />
        )}
      </Rise>

      <Rise delay={120} style={styles.flows}>
        <FlowCard kind="in" minor={summary.cameInMinor} currency={profile.currency} />
        <FlowCard kind="out" minor={summary.wentOutMinor} currency={profile.currency} />
      </Rise>

      <Rise delay={240} style={styles.recent}>
        <View style={styles.sectionRow}>
          <Text accessibilityRole="header" style={styles.section}>
            {t('home.today')}
          </Text>
          <Press accessibilityRole="link" onPress={() => router.push('/history')} hitSlop={12}>
            <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
          </Press>
        </View>
        <DayList rows={recent.today} empty={t('home.nothingToday')} shadowed />

        {recent.yesterday.length > 0 ? (
          <>
            <Text accessibilityRole="header" style={[styles.section, styles.yesterday]}>
              {t('home.yesterday')}
            </Text>
            <DayList rows={recent.yesterday} />
          </>
        ) : null}
      </Rise>
    </ScrollView>
  );
}

function DayList({
  rows,
  empty,
  shadowed = false,
}: {
  rows: Transaction[];
  empty?: string;
  shadowed?: boolean;
}) {
  const router = useRouter();
  return (
    <View style={[styles.list, shadowed && styles.listShadow]}>
      {rows.length > 0 ? (
        rows.map((row) => (
          <TransactionRow
            key={row.id}
            transaction={row}
            onPress={() => router.push({ pathname: '/transaction', params: { id: row.id } })}
          />
        ))
      ) : (
        <Text style={styles.empty}>{empty}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.screen, paddingBottom: space.screenBottom },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: size.avatar / 2,
    backgroundColor: color.avatar,
    boxShadow: shadow.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontFamily: fontFamily.extrabold, fontSize: 18, color: color.ink },
  headerText: { flex: 1 },
  greeting: { ...text.greeting, color: color.ink },
  subtitle: { ...text.subtitle, color: color.muted },
  flows: { marginTop: space.cardGap, flexDirection: 'row', gap: space.cardGap },
  recent: { marginTop: space.sectionGap, gap: 8 },
  sectionRow: {
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  section: { ...text.section, color: color.ink, paddingHorizontal: 4 },
  seeAll: { fontFamily: fontFamily.bold, fontSize: 15, color: color.ink },
  yesterday: { marginTop: 12 },
  list: {
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.card,
  },
  listShadow: { boxShadow: shadow.card },
  empty: { ...text.meta, color: color.muted, paddingVertical: 24, textAlign: 'center' },
});
