import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  AccountIcon,
  CategoryIcon,
  CloseIcon,
  InfoIcon,
  NoteIcon,
  RepeatIcon,
  TrashIcon,
} from '@/components/Icons';
import { Press } from '@/components/Press';
import { Sheet } from '@/components/Sheet';
import { type AccountView, useAccountViews } from '@/features/accounts/accounts';
import { useAllTransactions, useBills, useIncomes } from '@/features/live';
import { useTransactionView } from '@/features/transactions/useTransactionView';
import { color, fontFamily, radius, shadow, size, text } from '@/theme';

// A crash here shows Try again in a sheet, not over the screen under it.
export { SheetErrorBoundary as ErrorBoundary } from '@/components/ErrorFallback';

// TransactionDetail: what it was, when, where it came from, and Delete / Edit.
// Four looks: manual, automatic bill, income, balance adjusted. With two or more
// accounts it also says which one paid or got it (TransactionDetail-Account).
export default function TransactionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactions = useAllTransactions();
  const bills = useBills();
  const incomes = useIncomes();
  const view = useTransactionView();
  const accounts = useAccountViews();
  const tx = transactions.find((x) => x.id === id);

  if (!tx) return null;
  const v = view(tx);

  const repeatDay =
    tx.source === 'bill'
      ? bills.find((b) => b.id === tx.recurringId)?.day
      : tx.source === 'recurring_income'
        ? incomes.find((i) => i.id === tx.recurringId)?.day
        : undefined;

  const rows: { label: string; value: string; auto?: boolean; account?: AccountView }[] = [
    { label: t('history.detail.when'), value: v.when },
  ];
  const account = accounts.length > 1 ? accounts.find((a) => a.id === tx.accountId) : undefined;
  if (account) {
    rows.push({
      label: t(
        v.adjust
          ? 'history.detail.account'
          : v.income
            ? 'history.detail.wentTo'
            : 'history.detail.paidFrom',
      ),
      value: account.label,
      account,
    });
  }
  if (repeatDay) {
    rows.push({
      label: t('history.detail.repeats'),
      value: t('history.detail.repeatsValue', {
        day: t('onboarding.income.paydayValue', { count: repeatDay, ordinal: true }),
      }),
    });
  } else if (tx.note) {
    rows.push({ label: t('history.detail.note'), value: tx.note });
  }
  rows.push(
    tx.source === 'bill'
      ? { label: t('history.detail.added'), value: t('history.detail.fromBills'), auto: true }
      : tx.source === 'recurring_income'
        ? { label: t('history.detail.added'), value: t('history.detail.fromIncome'), auto: true }
        : { label: t('history.detail.added'), value: t('history.detail.byYou') },
  );

  const openDelete = () =>
    router.push({ pathname: '/transaction-delete', params: { id: tx.id, close: '2' } });
  const openEdit = () =>
    v.auto
      ? router.push({ pathname: '/transaction-scope', params: { id: tx.id, under: '1' } })
      : router.push({ pathname: '/add-transaction', params: { id: tx.id, under: '1' } });

  return (
    <Sheet accessibilityLabel={v.title} onDismissed={router.back}>
      {(close) => (
        <>
          <Press accessibilityLabel={t('common.close')} onPress={close} style={styles.close}>
            <CloseIcon color={color.muted} />
          </Press>

          <View style={styles.top}>
            <View style={[styles.icon, { backgroundColor: v.tint.bg }]}>
              <CategoryIcon icon={v.icon} size={30} color={v.tint.fg} />
              {v.auto ? (
                <View style={styles.badge}>
                  <RepeatIcon color={color.ink} size={14} width={2.8} />
                </View>
              ) : null}
            </View>
            <Text
              accessibilityRole="header"
              style={[styles.title, v.adjust && { color: color.softInk }]}
            >
              {v.title}
            </Text>
            <View style={[styles.chip, { backgroundColor: v.tint.bg }]}>
              <Text style={[styles.chipText, { color: v.tint.chip }]}>{v.label}</Text>
            </View>
            <View
              accessible
              accessibilityLabel={t(
                v.income ? 'history.detail.amountPlus' : 'history.detail.amountMinus',
                {
                  amount: `${v.symbol}${v.digits}`,
                },
              )}
              style={styles.amount}
            >
              {[v.sign, v.symbol, v.digits].map((part, i) => (
                <Text
                  key={i}
                  style={[
                    i === 1 ? styles.symbol : styles.digits,
                    {
                      color: v.adjust ? color.muted : v.income ? color.good : color.ink,
                    },
                  ]}
                >
                  {part}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.facts}>
            {rows.map((r) => (
              <View key={r.label} style={styles.fact}>
                <Text style={styles.factLabel}>{r.label}</Text>
                <View style={styles.factValueRow}>
                  {r.account ? (
                    <View style={[styles.factTile, { backgroundColor: r.account.tint.bg }]}>
                      <AccountIcon
                        kind={r.account.kind}
                        size={14}
                        width={2.1}
                        color={r.account.tint.fg}
                      />
                    </View>
                  ) : null}
                  <Text numberOfLines={1} style={styles.factValue}>
                    {r.value}
                  </Text>
                  {r.auto ? <Text style={styles.autoTag}>{t('history.auto')}</Text> : null}
                </View>
              </View>
            ))}
          </View>

          {v.income || v.adjust ? (
            <View
              style={[styles.note, { backgroundColor: v.adjust ? color.wash : color.goodSoft }]}
            >
              <InfoIcon color={v.adjust ? color.softInk : color.good} />
              <Text style={[styles.noteText, { color: v.adjust ? color.softInk : color.good }]}>
                {v.adjust ? t('history.detail.adjustNote') : t('history.detail.incomeNote')}
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Press accessibilityRole="button" onPress={openDelete} style={styles.delete}>
              <TrashIcon color={color.danger} />
              <Text style={styles.deleteText}>
                {v.adjust ? t('history.detail.remove') : t('history.detail.delete')}
              </Text>
            </Press>
            <Press accessibilityRole="button" haptic onPress={openEdit} style={styles.edit}>
              <NoteIcon color={color.white} size={20} />
              <Text style={styles.editText}>{t('history.detail.edit')}</Text>
            </Press>
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  close: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: size.touch,
    height: size.touch,
    borderRadius: size.touch / 2,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  top: { marginTop: 18, alignItems: 'center' },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color.white,
    boxShadow: shadow.rowBadge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 12,
    fontFamily: fontFamily.extrabold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    textAlign: 'center',
    color: color.ink,
  },
  chip: {
    marginTop: 6,
    height: 26,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  chipText: { fontFamily: fontFamily.extrabold, fontSize: 13 },
  amount: { marginTop: 12, flexDirection: 'row', alignItems: 'baseline' },
  digits: {
    fontFamily: fontFamily.extrabold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  symbol: {
    marginLeft: 4,
    marginRight: 3,
    fontFamily: fontFamily.bold,
    fontSize: 30,
    opacity: 0.6,
  },
  facts: {
    marginTop: 20,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.washSoft,
  },
  fact: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  factLabel: { ...text.subtitle, color: color.muted },
  factValueRow: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  factTile: {
    width: 24,
    height: 24,
    marginRight: 2,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  factValue: { flexShrink: 1, fontFamily: fontFamily.bold, fontSize: 15, color: color.ink },
  autoTag: {
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: color.track,
    fontFamily: fontFamily.extrabold,
    fontSize: 11,
    lineHeight: 20,
    color: color.softInk,
  },
  note: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteText: { flex: 1, fontFamily: fontFamily.bold, fontSize: 14, lineHeight: 20 },
  actions: { marginTop: 20, flexDirection: 'row', gap: 10 },
  delete: {
    width: 128,
    height: size.button,
    borderRadius: radius.pill,
    backgroundColor: color.dangerSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteText: { fontFamily: fontFamily.bold, fontSize: 16, color: color.danger },
  edit: {
    flex: 1,
    height: size.button,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    boxShadow: shadow.cta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editText: { fontFamily: fontFamily.bold, fontSize: 17, color: color.white },
});
