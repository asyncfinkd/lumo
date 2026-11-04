import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScreenTop } from '@/components/useScreenTop';
import { BottomFade, Orbs } from '@/components/Backdrop';
import { ChevronLeftIcon, PlusIcon, SearchIcon } from '@/components/Icons';
import { EmptyClipboard } from '@/components/illustrations/EmptyClipboard';
import { Rise } from '@/components/motion';
import { Press } from '@/components/Press';
import { calendarMonth } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { useAccountViews } from '@/features/accounts/accounts';
import { TransferRow } from '@/features/accounts/TransferRow';
import {
  dayGroups,
  dayHasTotal,
  isAutomatic,
  jarMoves,
  transferMoves,
  withJarMoves,
  withTransfers,
} from '@/features/history/history';
import { SwipeRow } from '@/features/history/SwipeRow';
import { useDayLabel } from '@/features/history/useDayLabel';
import { useMoneyText } from '@/features/privacy/amounts';
import {
  useAllJars,
  useFlowTotals,
  useJarEntries,
  useProfile,
  useToday,
  useTransactionList,
  useTransfers,
} from '@/features/live';
import { usePullToRefresh } from '@/features/money/usePullToRefresh';
import { HeaderButton } from '@/features/profile/SettingsHeader';
import { usePickedJar } from '@/features/savings/dropStore';
import { JarMoveRow } from '@/features/savings/JarMoveRow';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import { color, fontFamily, radius, shadow, space, text } from '@/theme';

// History: every transaction by day, newest day first, with each day's total
// (History, HistoryEmpty), and money moved into or out of jars among them
// (HistoryJars). Opens from Home's "See all"; Savings has its tab. With two
// or more accounts (HistoryAccounts) it shows one account or all of them, each
// row with its account's dot, and the moves between them.
export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const screenTop = useScreenTop();
  const insets = useSafeAreaInsets();
  const refreshControl = usePullToRefresh();
  const today = useToday();
  const profile = useProfile();
  const jars = useAllJars();
  const jarEntries = useJarEntries();
  const transfers = useTransfers();
  const accounts = useAccountViews();
  const multi = accounts.length > 1;
  const [picked, setPicked] = useState<string | null>(null);
  // Back to All accounts once there's one left, or the one shown is gone.
  const account = multi && accounts.some((a) => a.id === picked) ? picked : null;
  const pickJar = usePickedJar((s) => s.pick);
  const dayLabel = useDayLabel();
  const money = useMoneyText();
  // History lists every row, so it reads them all; one account's come filtered in SQL.
  const transactions = useTransactionList(account);
  const thisMonth = calendarMonth(today);
  const spent = useFlowTotals(thisMonth.start, thisMonth.end).wentOutMinor;
  const groups = useMemo(() => {
    const jarRows = jarMoves(jarEntries, jars).filter((m) => !account || m.accountId === account);
    return withTransfers(
      withJarMoves(dayGroups(transactions), jarRows),
      transferMoves(transfers, account),
    );
  }, [transactions, jarEntries, jars, transfers, account]);
  if (!profile) return null;

  const currency = profile.currency;
  const [y, m] = today.split('-').map(Number);
  const month = new Date(y!, m! - 1, 1).toLocaleDateString(i18n.language, { month: 'long' });
  const shown = accounts.find((a) => a.id === account);
  const subtitle = shown
    ? t('history.accounts.now', {
        name: shown.label,
        amount: money(formatMoney(shown.balanceMinor, currency)),
      })
    : groups.length === 0
      ? t('history.nothingYet', { month })
      : t('history.spent', { month, amount: money(formatMoney(spent, currency)) });
  const dotOf = new Map(accounts.map((a) => [a.id, a]));
  const rowAccount = (id: string) => {
    const a = multi ? dotOf.get(id) : undefined;
    return a ? { label: a.label, dot: a.tint.chart, named: !account } : undefined;
  };

  const header = (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('history.title')}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {multi ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('history.accounts.show')}
          style={styles.chips}
          contentContainerStyle={styles.chipsContent}
        >
          {[null, ...accounts].map((a) => {
            const on = (a?.id ?? null) === account;
            return (
              <Press
                key={a?.id ?? 'all'}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setPicked(a?.id ?? null)}
                style={[styles.chip, a && styles.chipDotted, on ? styles.chipOn : styles.chipOff]}
              >
                {a ? <View style={[styles.chipDot, { backgroundColor: a.tint.chart }]} /> : null}
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {a ? a.label : t('history.accounts.all')}
                </Text>
              </Press>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: screenTop }]}>
      <Orbs />
      <View style={styles.bar}>
        <HeaderButton label={t('history.back')} onPress={() => router.back()}>
          <ChevronLeftIcon color={color.ink} />
        </HeaderButton>
        <HeaderButton label={t('history.search')} onPress={() => router.push('/history-search')}>
          <SearchIcon color={color.ink} />
        </HeaderButton>
      </View>

      {/* One account with nothing in it yet: just the header and its chips. */}
      {groups.length === 0 && account ? (
        header
      ) : groups.length === 0 ? (
        <>
          {header}
          <Rise style={styles.empty}>
            <View style={styles.emptyTile}>
              <EmptyClipboard />
            </View>
            <Text accessibilityRole="header" style={styles.emptyTitle}>
              {t('history.emptyTitle')}
            </Text>
            <Text style={styles.emptyBody}>{t('history.emptyBody')}</Text>
            <Press
              accessibilityRole="button"
              haptic
              onPress={() => router.push('/add-transaction')}
              style={styles.add}
            >
              <PlusIcon size={18} color={color.white} />
              <Text style={styles.addText}>{t('history.addExpense')}</Text>
            </Press>
          </Rise>
        </>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.date}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          initialNumToRender={6}
          windowSize={7}
          renderItem={({ item }) => {
            const label = dayLabel(item.date);
            const total = formatMoney(item.totalMinor, currency, {
              sign: item.totalMinor > 0 ? 'income' : 'auto',
            });
            return (
              <View style={styles.day}>
                <View style={styles.dayHead}>
                  <Text accessibilityRole="header" style={styles.dayLabel}>
                    {label}
                  </Text>
                  {/* A day of jar moves or transfers only spent nothing: no "₾0.00". */}
                  {!dayHasTotal(item.rows) ? null : (
                    <Text style={styles.dayTotal}>{money(total)}</Text>
                  )}
                </View>
                <View style={styles.list}>
                  {item.rows.map((row) =>
                    'flow' in row ? (
                      <SwipeRow
                        key={row.id}
                        onEdit={() =>
                          router.push({
                            pathname: '/add-transaction',
                            params: { transfer: row.id },
                          })
                        }
                        onDelete={() =>
                          router.push({ pathname: '/transfer-delete', params: { id: row.id } })
                        }
                      >
                        <TransferRow
                          move={row}
                          accounts={accounts}
                          onPress={() =>
                            router.push({ pathname: '/transfer', params: { id: row.id } })
                          }
                        />
                      </SwipeRow>
                    ) : 'jarId' in row ? (
                      <JarMoveRow
                        key={row.id}
                        move={row}
                        onPress={() => {
                          if (jars.some((j) => j.id === row.jarId && !j.closedAt)) {
                            pickJar(row.jarId);
                          }
                          router.navigate('/savings');
                        }}
                      />
                    ) : (
                      <SwipeRow
                        key={row.id}
                        onEdit={() =>
                          isAutomatic(row)
                            ? router.push({
                                pathname: '/transaction-scope',
                                params: { id: row.id },
                              })
                            : router.push({ pathname: '/add-transaction', params: { id: row.id } })
                        }
                        onDelete={() =>
                          router.push({ pathname: '/transaction-delete', params: { id: row.id } })
                        }
                      >
                        <TransactionRow
                          transaction={row}
                          variant="history"
                          account={rowAccount(row.accountId)}
                          onPress={() =>
                            router.push({ pathname: '/transaction', params: { id: row.id } })
                          }
                        />
                      </SwipeRow>
                    ),
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
      <BottomFade />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  bar: {
    paddingHorizontal: space.screen,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  header: { paddingTop: 12, paddingHorizontal: space.screen },
  title: { ...text.h1, color: color.ink },
  subtitle: { ...text.subtitle, marginTop: 2, color: color.muted, fontVariant: ['tabular-nums'] },
  chips: { marginTop: 14, marginHorizontal: -space.screen, flexGrow: 0 },
  chipsContent: { paddingHorizontal: space.screen, gap: 8 },
  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  chipDotted: { paddingLeft: 12 },
  chipOn: { backgroundColor: color.ink },
  chipOff: { backgroundColor: color.tileOff, boxShadow: shadow.accountChip },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { fontFamily: fontFamily.bold, fontSize: 14, color: color.ink },
  chipTextOn: { color: color.white },
  day: { marginTop: space.sectionGap, paddingHorizontal: space.screen, gap: 8 },
  dayHead: {
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  dayLabel: { ...text.section, color: color.ink },
  dayTotal: {
    ...text.subtitle,
    fontFamily: fontFamily.bold,
    color: color.muted,
    fontVariant: ['tabular-nums'],
  },
  list: {
    paddingVertical: 2,
    overflow: 'hidden',
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
  },
  empty: { paddingTop: 96, paddingHorizontal: 40, alignItems: 'center' },
  emptyTile: {
    width: 132,
    height: 132,
    borderRadius: 40,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.emptyTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 28,
    fontFamily: fontFamily.extrabold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: color.ink,
  },
  emptyBody: {
    marginTop: 8,
    maxWidth: 280,
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: color.muted,
  },
  add: {
    marginTop: 28,
    height: 52,
    paddingHorizontal: 24,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    boxShadow: shadow.cta,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addText: { fontFamily: fontFamily.bold, fontSize: 16, color: color.white },
});
