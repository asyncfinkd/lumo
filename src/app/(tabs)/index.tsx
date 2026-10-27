import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useScreenTop } from '@/components/useScreenTop';
import { Rise } from '@/components/motion';
import { Press } from '@/components/Press';
import type { Transaction } from '@/db/schema';
import { addDays } from '@/domain/dates';
import { BUDGETING } from '@/features/flags';
import { db } from '@/db/client';
import { BalanceCard } from '@/features/home/BalanceCard';
import { setHideAmounts } from '@/features/profile/repo';
import { FlowCard } from '@/features/home/FlowCard';
import { greetingKey, monthChange, recentDays } from '@/features/home/home';
import { LeftToSpendCard } from '@/features/home/LeftToSpendCard';
import { useHour } from '@/features/home/useHour';
import { Avatar } from '@/features/profile/Avatar';
import {
  useAllTransactions,
  useJarEntries,
  useJars,
  useMoneyMonth,
  useTransactionsBetween,
} from '@/features/live';
import { usePullToRefresh } from '@/features/money/usePullToRefresh';
import { usePickedJar } from '@/features/savings/dropStore';
import { SavingForCard } from '@/features/savings/SavingForCard';
import { savedByJar } from '@/features/savings/savings';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import { color, fontFamily, radius, shadow, size, space, text } from '@/theme';

// Main: greeting, your balance (or Left to spend, with budgeting on), Came in /
// Went out, and today's and yesterday's transactions.
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const screenTop = useScreenTop();
  const refreshControl = usePullToRefresh(screenTop);
  const hour = useHour();
  const { today, profile, summary } = useMoneyMonth();
  const recent = recentDays(useTransactionsBetween(addDays(today, -1), addDays(today, 1)), today);
  const transactions = useAllTransactions();
  const jarEntries = useJarEntries();
  const jars = useJars();
  const picked = usePickedJar((s) => s.id);
  // The jar up front on Savings.
  const jar = jars.find((j) => j.id === picked) ?? jars[0];
  const change = useMemo(
    () => monthChange(transactions, today, jarEntries),
    [transactions, today, jarEntries],
  );

  if (!profile || !summary) return null;
  const name = profile.name.trim();

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: screenTop }]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      <Rise style={styles.header}>
        {/* The same avatar as Profile: your photo, or your initial on its color. Opens Profile. */}
        <Press
          accessibilityRole="link"
          accessibilityLabel={t('tabs.profile')}
          onPress={() => router.navigate('/profile')}
          style={styles.avatar}
        >
          <Avatar
            name={name}
            tint={profile.avatarColor}
            photoUri={profile.photoUri}
            size={size.avatar}
          />
        </Press>
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
            onToggleHidden={() => setHideAmounts(db, !profile.hideAmounts)}
          />
        )}
      </Rise>

      <Rise delay={120} style={styles.flows}>
        <FlowCard
          kind="in"
          minor={summary.cameInMinor}
          byDay={summary.cameInByDay}
          currency={profile.currency}
        />
        <FlowCard
          kind="out"
          minor={summary.wentOutMinor}
          byDay={summary.wentOutByDay}
          currency={profile.currency}
        />
      </Rise>

      {jar ? (
        <Rise delay={180} style={styles.saving}>
          <SavingForCard
            jar={jar}
            savedMinor={savedByJar(jarEntries).get(jar.id) ?? 0}
            today={today}
            onPress={() => router.navigate('/savings')}
          />
        </Rise>
      ) : null}

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
  avatar: { borderRadius: size.avatar / 2, boxShadow: shadow.avatar },
  headerText: { flex: 1 },
  greeting: { ...text.greeting, color: color.ink },
  subtitle: { ...text.subtitle, color: color.muted },
  flows: { marginTop: space.cardGap, flexDirection: 'row', gap: space.cardGap },
  saving: { marginTop: space.cardGap },
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
