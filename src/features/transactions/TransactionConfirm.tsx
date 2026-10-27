import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { CategoryIcon, RepeatIcon, TrashIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { db } from '@/db/client';
import { categorySpent } from '@/domain/budgets';
import { formatMoney } from '@/domain/money';
import { BUDGETING } from '@/features/flags';
import { useAllTransactions, useBudgets, useMoneyMonth } from '@/features/live';
import { deleteTransaction, type Scope } from '@/features/transactions/repo';
import { useTransactionView } from '@/features/transactions/useTransactionView';
import { color, fontFamily, radius, text } from '@/theme';

/**
 * DeleteConfirm and EditScope: one dialog. Deleting a manual transaction or an
 * adjustment asks once; a bill or salary payment asks "Just this one" or "This
 * and future ones", and so does editing one.
 *
 * `close`: how many screens to close after deleting (the dialog, plus the
 * details sheet or edit sheet under it). `under`: passed on to the edit sheet.
 */
export function TransactionConfirm({
  id,
  action,
  close = 1,
  under = 0,
}: {
  id: string;
  action: 'delete' | 'edit';
  close?: number;
  under?: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const transactions = useAllTransactions();
  const budgets = useBudgets();
  const { summary } = useMoneyMonth();
  const view = useTransactionView();
  const tx = transactions.find((x) => x.id === id);
  if (!tx) return null;

  const v = view(tx);
  const salary = tx.source === 'recurring_income';
  const edit = action === 'edit';
  const money = (minor: number) => formatMoney(minor, tx.currency, { decimals: 'auto' });

  const remove = (scope: Scope) => {
    router.dismiss(close);
    deleteTransaction(db, tx.id, scope);
  };
  const editWith = (scope: Scope) =>
    router.replace({
      pathname: '/add-transaction',
      params: { id: tx.id, scope, under: String(under) },
    });

  let title: string;
  let body: string;
  if (v.auto) {
    title = edit
      ? t(salary ? 'history.confirm.editSalary' : 'history.confirm.editBill')
      : t(salary ? 'history.confirm.deleteSalary' : 'history.confirm.deleteBill');
    body = t(edit ? 'history.confirm.bodyRepeatEdit' : 'history.confirm.bodyRepeatDelete', {
      name: v.title,
    });
  } else if (v.adjust) {
    title = t('history.confirm.removeAdjust');
    body = t(v.income ? 'history.confirm.bodyAdjustLess' : 'history.confirm.bodyAdjustMore', {
      amount: money(tx.amountMinor),
    });
  } else if (v.income) {
    title = t('history.confirm.deleteIncome');
    body = t('history.confirm.bodyIncome', { amount: money(tx.amountMinor) });
  } else {
    title = t('history.confirm.deleteExpense');
    const budget = tx.categoryId && budgets.find((b) => b.categoryId === tx.categoryId);
    // Only says it "goes back" when it's in this period's budget.
    const counted =
      BUDGETING && budget && summary && categorySpent([tx], budget.categoryId, summary.period) > 0;
    body = counted
      ? t('history.confirm.bodyBudget', { amount: money(tx.amountMinor), category: v.label })
      : t('history.confirm.bodyExpense');
  }

  return (
    <Dialog accessibilityLabel={title} width={321}>
      <View style={[styles.icon, { backgroundColor: edit ? color.track : color.dangerSoft }]}>
        {edit ? (
          <RepeatIcon color={color.ink} size={26} width={2} />
        ) : (
          <TrashIcon color={color.danger} size={26} />
        )}
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>

      <View style={styles.item}>
        <View style={[styles.tile, { backgroundColor: v.tint.bg }]}>
          <CategoryIcon icon={v.icon} size={20} color={v.tint.fg} />
        </View>
        <View style={styles.itemText}>
          <Text numberOfLines={1} style={styles.itemName}>
            {v.title}
          </Text>
          <Text numberOfLines={1} style={styles.itemWhen}>
            {v.auto ? t('history.confirm.everyMonth', { day: v.day }) : v.whenShort}
          </Text>
        </View>
        <Text
          style={[
            styles.itemAmount,
            { color: v.adjust ? color.muted : v.income ? color.good : color.ink },
          ]}
        >
          {v.amount}
        </Text>
      </View>

      <Text style={styles.body}>{body}</Text>

      {v.auto ? (
        <View style={styles.scope}>
          <Press
            accessibilityRole="button"
            onPress={() => (edit ? editWith('one') : remove('one'))}
            style={[styles.choice, { backgroundColor: color.washStrong }]}
          >
            <Text style={styles.choiceTitle}>{t('history.confirm.justThis')}</Text>
            <Text style={styles.choiceHint}>
              {edit
                ? t(salary ? 'history.confirm.onePayment' : 'history.confirm.oneMonth')
                : t(salary ? 'history.confirm.oneSalary' : 'history.confirm.oneBill')}
            </Text>
          </Press>
          <Press
            accessibilityRole="button"
            haptic
            onPress={() => (edit ? editWith('future') : remove('future'))}
            style={[styles.choice, { backgroundColor: edit ? color.ink : color.dangerStrong }]}
          >
            <Text style={[styles.choiceTitle, { color: color.white }]}>
              {t('history.confirm.future')}
            </Text>
            <Text style={[styles.choiceHint, { color: color.onDarkHint }]}>
              {edit
                ? t('history.confirm.fromNow')
                : t(salary ? 'history.confirm.futureSalary' : 'history.confirm.futureBill')}
            </Text>
          </Press>
          <Button
            variant="quiet"
            label={edit ? t('history.confirm.cancel') : t('history.confirm.keep')}
            onPress={() => router.back()}
          />
        </View>
      ) : (
        <View style={styles.actions}>
          <Press
            accessibilityRole="button"
            haptic
            onPress={() => remove('one')}
            style={styles.delete}
          >
            <Text style={styles.deleteText}>
              {v.adjust ? t('history.confirm.remove') : t('history.confirm.delete')}
            </Text>
          </Press>
          <Press accessibilityRole="button" onPress={() => router.back()} style={styles.keep}>
            <Text style={styles.keepText}>{t('history.confirm.keep')}</Text>
          </Press>
        </View>
      )}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    fontFamily: fontFamily.extrabold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    textAlign: 'center',
    color: color.ink,
  },
  item: {
    marginTop: 14,
    alignSelf: 'stretch',
    height: 56,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: color.washSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1, minWidth: 0 },
  itemName: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 20, color: color.ink },
  itemWhen: { fontFamily: fontFamily.semibold, fontSize: 12, lineHeight: 16, color: color.muted },
  itemAmount: { fontFamily: fontFamily.bold, fontSize: 15, fontVariant: ['tabular-nums'] },
  body: {
    ...text.subtitle,
    lineHeight: 20,
    marginTop: 14,
    textAlign: 'center',
    color: color.muted,
  },
  scope: { marginTop: 18, alignSelf: 'stretch', gap: 8 },
  choice: {
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderCurve: 'continuous',
    justifyContent: 'center',
    gap: 2,
  },
  choiceTitle: { fontFamily: fontFamily.extrabold, fontSize: 16, color: color.ink },
  choiceHint: { fontFamily: fontFamily.semibold, fontSize: 13, color: color.muted },
  actions: { marginTop: 22, alignSelf: 'stretch', gap: 8 },
  delete: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.dangerStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { fontFamily: fontFamily.bold, fontSize: 16, color: color.white },
  keep: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.washStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepText: { fontFamily: fontFamily.bold, fontSize: 16, color: color.ink },
});
