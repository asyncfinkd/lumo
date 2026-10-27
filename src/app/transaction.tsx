import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  CategoryIcon,
  CloseIcon,
  InfoIcon,
  NoteIcon,
  RepeatIcon,
  TrashIcon,
} from '@/components/Icons';
import { Fill } from '@/components/motion';
import { Press } from '@/components/Press';
import { Sheet } from '@/components/Sheet';
import { formatMoney } from '@/domain/money';
import { type BudgetRow, budgetRows } from '@/features/budgets/budgetRows';
import {
  useAllTransactions,
  useBills,
  useBudgets,
  useIncomes,
  useMoneyMonth,
} from '@/features/live';
import { useTransactionView } from '@/features/transactions/useTransactionView';
import { color, fontFamily, gradient, radius, shadow, size, text } from '@/theme';

// TransactionDetail: what it was, when, where it came from, how its budget
// stands, and Delete / Edit. Five looks: manual, no budget, automatic bill,
// income, balance adjusted.
export default function TransactionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactions = useAllTransactions();
  const budgets = useBudgets();
  const bills = useBills();
  const incomes = useIncomes();
  const { summary } = useMoneyMonth();
  const view = useTransactionView();
  const tx = transactions.find((x) => x.id === id);

  if (!tx) return null;
  const v = view(tx);
  const expense = tx.kind === 'expense' && !v.adjust;

  const repeatDay =
    tx.source === 'bill'
      ? bills.find((b) => b.id === tx.recurringId)?.day
      : tx.source === 'recurring_income'
        ? incomes.find((i) => i.id === tx.recurringId)?.day
        : undefined;

  const rows: { label: string; value: string; auto?: boolean }[] = [
    { label: t('history.detail.when'), value: v.when },
  ];
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

  const budget =
    expense && tx.categoryId ? budgets.find((b) => b.categoryId === tx.categoryId) : undefined;
  const money = (minor: number) => formatMoney(minor, tx.currency, { decimals: 'auto' });

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
                  <Text numberOfLines={1} style={styles.factValue}>
                    {r.value}
                  </Text>
                  {r.auto ? <Text style={styles.autoTag}>{t('history.auto')}</Text> : null}
                </View>
              </View>
            ))}
          </View>

          {budget && summary ? (
            <BudgetCard
              label={v.label}
              row={
                budgetRows({
                  budgets: [budget],
                  transactions,
                  bills: bills.filter((b) => b.active),
                  period: summary.period,
                })[0]!
              }
              money={money}
            />
          ) : expense && tx.categoryId ? (
            <View style={styles.noBudget}>
              <Text style={styles.noBudgetText}>
                {t('history.detail.noBudgetBefore')}
                <Text style={styles.noBudgetName}>{v.label}</Text>
                {t('history.detail.noBudgetAfter')}
              </Text>
              <Press
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/edit-budget', params: { category: tx.categoryId! } })
                }
                style={styles.setOne}
              >
                <Text style={styles.setOneText}>{t('history.detail.setOne')}</Text>
              </Press>
            </View>
          ) : null}

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

/** The category's budget as on the Budgets board: what's left, the bar, "All paid". */
function BudgetCard({
  label,
  row,
  money,
}: {
  label: string;
  row: BudgetRow;
  money: (minor: number) => string;
}) {
  const { t } = useTranslation();
  const pct = Math.round(row.leftPercent);
  return (
    <View style={styles.budget}>
      <View style={styles.budgetHead}>
        <Text style={styles.budgetLabel}>{t('history.detail.budget', { category: label })}</Text>
        <Text style={styles.budgetLeft}>
          {t('history.detail.leftOf', { left: money(row.leftMinor), limit: money(row.limitMinor) })}
        </Text>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('history.detail.budgetLeft', { category: label })}
        accessibilityValue={{ min: 0, max: 100, now: pct }}
        style={styles.track}
      >
        <Fill
          percent={pct > 0 ? Math.max(pct, 4) : 0}
          style={
            row.state === 'low'
              ? { backgroundColor: color.warningFill }
              : { backgroundImage: gradient.progress }
          }
        />
      </View>
      {row.state === 'allPaid' ? (
        <Text style={styles.paid}>{t('history.detail.allPaid')}</Text>
      ) : null}
    </View>
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
  budget: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.field,
    boxShadow: shadow.detailCard,
    gap: 10,
  },
  budgetHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  budgetLabel: { ...text.subtitle, fontFamily: fontFamily.bold, color: color.ink },
  budgetLeft: { ...text.subtitle, color: color.muted, fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 5, backgroundColor: color.track, overflow: 'hidden' },
  paid: { fontFamily: fontFamily.bold, fontSize: 12, color: color.good },
  noBudget: {
    marginTop: 12,
    height: 56,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.field,
    boxShadow: shadow.detailCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noBudgetText: { ...text.subtitle, flex: 1, color: color.muted },
  noBudgetName: { fontFamily: fontFamily.bold, color: color.ink },
  setOne: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.track,
    justifyContent: 'center',
  },
  setOneText: { ...text.subtitle, fontFamily: fontFamily.bold, color: color.ink },
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
