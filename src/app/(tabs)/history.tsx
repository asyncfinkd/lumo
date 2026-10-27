import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useScreenTop } from '@/components/useScreenTop';
import { PlusIcon, SearchIcon } from '@/components/Icons';
import { EmptyClipboard } from '@/components/illustrations/EmptyClipboard';
import { Rise } from '@/components/motion';
import { Press } from '@/components/Press';
import { formatMoney } from '@/domain/money';
import { dayGroups, isAutomatic, monthSpent } from '@/features/history/history';
import { SwipeRow } from '@/features/history/SwipeRow';
import { useDayLabel } from '@/features/history/useDayLabel';
import { useAllTransactions, useProfile, useToday } from '@/features/live';
import { usePullToRefresh } from '@/features/money/usePullToRefresh';
import { HeaderButton } from '@/features/profile/SettingsHeader';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import { color, fontFamily, radius, shadow, space, text } from '@/theme';

// History: every transaction by day, newest day first, with each day's total
// (History, HistoryEmpty). A tab after the add button.
export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const screenTop = useScreenTop();
  const refreshControl = usePullToRefresh();
  const today = useToday();
  const profile = useProfile();
  const transactions = useAllTransactions();
  const dayLabel = useDayLabel();
  const groups = useMemo(() => dayGroups(transactions), [transactions]);
  if (!profile) return null;

  const currency = profile.currency;
  const [y, m] = today.split('-').map(Number);
  const month = new Date(y!, m! - 1, 1).toLocaleDateString(i18n.language, { month: 'long' });
  const spent = monthSpent(transactions, today);
  const subtitle =
    groups.length === 0
      ? t('history.nothingYet', { month })
      : t('history.spent', { month, amount: formatMoney(spent, currency) });

  const header = (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('history.title')}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: screenTop }]}>
      <View style={styles.bar}>
        <HeaderButton label={t('history.search')} onPress={() => router.push('/history-search')}>
          <SearchIcon color={color.ink} />
        </HeaderButton>
      </View>

      {groups.length === 0 ? (
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
          contentContainerStyle={{ paddingBottom: space.screenBottom }}
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
                  <Text style={styles.dayTotal}>{total}</Text>
                </View>
                <View style={styles.list}>
                  {item.rows.map((row) => (
                    <SwipeRow
                      key={row.id}
                      onEdit={() =>
                        isAutomatic(row)
                          ? router.push({ pathname: '/transaction-scope', params: { id: row.id } })
                          : router.push({ pathname: '/add-transaction', params: { id: row.id } })
                      }
                      onDelete={() =>
                        router.push({ pathname: '/transaction-delete', params: { id: row.id } })
                      }
                    >
                      <TransactionRow
                        transaction={row}
                        variant="history"
                        onPress={() =>
                          router.push({ pathname: '/transaction', params: { id: row.id } })
                        }
                      />
                    </SwipeRow>
                  ))}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // The tabs layout draws the background and orbs.
  root: { flex: 1 },
  bar: {
    paddingHorizontal: space.screen,
    flexDirection: 'row',
    // A tab (no back button): search sits on the right.
    justifyContent: 'flex-end',
  },
  header: { paddingTop: 12, paddingHorizontal: space.screen },
  title: { ...text.h1, color: color.ink },
  subtitle: { ...text.subtitle, marginTop: 2, color: color.muted, fontVariant: ['tabular-nums'] },
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
