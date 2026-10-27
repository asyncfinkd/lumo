import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScreenTop } from '@/components/useScreenTop';
import { Orbs } from '@/components/Backdrop';
import { CloseIcon, SearchIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import type { Transaction } from '@/db/schema';
import { formatMoney } from '@/domain/money';
import { useCategories } from '@/features/categories/categories';
import { type HistoryFilter, searchTransactions } from '@/features/history/history';
import { useDayLabel } from '@/features/history/useDayLabel';
import { useAllTransactions } from '@/features/live';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import { color, fontFamily, radius, shadow, space, text } from '@/theme';

const FILTERS: HistoryFilter[] = ['all', 'spending', 'income', 'auto'];
const FILTER_LABEL = {
  all: 'history.searchScreen.all',
  spending: 'history.searchScreen.spending',
  income: 'history.searchScreen.income',
  auto: 'history.searchScreen.automatic',
} as const satisfies Record<HistoryFilter, string>;

// HistorySearch: find a transaction by shop, category or amount, and narrow
// to spending, income or automatic ones.
export default function HistorySearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const screenTop = useScreenTop();
  const transactions = useAllTransactions();
  const categories = useCategories();
  const dayLabel = useDayLabel();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const results = useMemo(
    () =>
      searchTransactions(transactions, query, filter, (tx: Transaction) => ({
        category:
          tx.source === 'adjustment'
            ? t('history.adjustment')
            : tx.categoryId
              ? categories.get(tx.categoryId).label
              : '',
        // "64.20" without the symbol, so typing an amount finds it.
        amount: formatMoney(tx.amountMinor, tx.currency).replace(/[^\d.,]/g, ''),
      })),
    [transactions, query, filter, categories, t],
  );
  const searching = query.trim().length > 0;

  return (
    <View style={[styles.root, { paddingTop: screenTop }]}>
      <Orbs />
      <View style={styles.bar}>
        <View style={styles.field}>
          <SearchIcon color={color.muted} />
          <TextInput
            accessibilityLabel={t('history.searchScreen.label')}
            value={query}
            onChangeText={setQuery}
            placeholder={t('history.searchScreen.placeholder')}
            placeholderTextColor={color.subtle}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
          />
          {query ? (
            <Press
              accessibilityLabel={t('history.searchScreen.clear')}
              onPress={() => setQuery('')}
              style={styles.clear}
            >
              <CloseIcon size={14} color={color.softInk} />
            </Press>
          ) : null}
        </View>
        <Press accessibilityRole="button" onPress={() => router.back()} style={styles.cancel}>
          <Text style={styles.cancelText}>{t('history.searchScreen.cancel')}</Text>
        </Press>
      </View>

      <View>
        <ScrollView
          horizontal
          accessibilityRole="radiogroup"
          accessibilityLabel={t('history.searchScreen.show')}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {FILTERS.map((f) => {
            const on = f === filter;
            return (
              <Press
                key={f}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setFilter(f)}
                style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
              >
                <Text style={[styles.chipText, on && { color: color.white }]}>
                  {t(FILTER_LABEL[f])}
                </Text>
              </Press>
            );
          })}
        </ScrollView>
      </View>

      {results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(tx) => tx.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.results, { paddingBottom: insets.bottom + 48 }]}
          ListHeaderComponent={
            <Text accessibilityLiveRegion="polite" style={styles.count}>
              {searching
                ? t('history.searchScreen.matches', { count: results.length })
                : t('history.searchScreen.recent')}
            </Text>
          }
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.item,
                index === 0 && styles.itemFirst,
                index === results.length - 1 && styles.itemLast,
              ]}
            >
              <TransactionRow
                transaction={item}
                variant="search"
                day={dayLabel(item.date)}
                onPress={() => router.push({ pathname: '/transaction', params: { id: item.id } })}
              />
            </View>
          )}
        />
      ) : searching ? (
        <View style={styles.none}>
          <View style={styles.noneTile}>
            <SearchIcon color={color.placeholder} size={40} />
          </View>
          <Text accessibilityRole="header" style={styles.noneTitle}>
            {t('history.searchScreen.noMatch', { query: query.trim() })}
          </Text>
          <Text style={styles.noneHint}>{t('history.searchScreen.noMatchHint')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  bar: {
    paddingLeft: space.screen,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  field: {
    flex: 1,
    height: 48,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: radius.pill,
    backgroundColor: color.white,
    boxShadow: shadow.searchField,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    padding: 0,
    flex: 1,
    height: 48,
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: color.ink,
  },
  clear: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: { height: 48, paddingHorizontal: 8, justifyContent: 'center' },
  cancelText: { fontFamily: fontFamily.bold, fontSize: 16, color: color.ink },
  chips: { marginTop: 14, paddingHorizontal: space.screen, gap: 8 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: 'center' },
  chipOn: { backgroundColor: color.ink },
  chipOff: { backgroundColor: color.listCard },
  chipText: { ...text.subtitle, fontFamily: fontFamily.bold, color: color.ink },
  results: { paddingTop: 20, paddingHorizontal: space.screen },
  count: {
    ...text.meta,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontFamily: fontFamily.extrabold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: color.muted,
  },
  // One card around all results, drawn row by row so the list stays virtualized.
  item: { paddingHorizontal: 12, backgroundColor: color.card },
  itemFirst: {
    paddingTop: 2,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  itemLast: {
    paddingBottom: 2,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
  },
  none: { paddingTop: 92, paddingHorizontal: space.screen, alignItems: 'center' },
  noneTile: {
    width: 88,
    height: 88,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: color.listCard,
    boxShadow: shadow.emptyTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noneTitle: {
    marginTop: 20,
    fontFamily: fontFamily.extrabold,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
    color: color.ink,
  },
  noneHint: {
    marginTop: 6,
    maxWidth: 270,
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    color: color.muted,
  },
});
