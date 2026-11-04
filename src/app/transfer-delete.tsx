import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/Dialog';
import { TransferIcon, TrashIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { db } from '@/db/client';
import { formatMoney } from '@/domain/money';
import { deleteTransfer } from '@/features/accounts/repo';
import { useTransferView } from '@/features/accounts/useTransferView';
import { useTransfer } from '@/features/live';
import { useMoneyText } from '@/features/privacy/amounts';
import { runWrite } from '@/features/runWrite';
import { color, fontFamily, radius, text } from '@/theme';

// A crash here shows Try again in a sheet, not over the screen under it.
export { SheetErrorBoundary as ErrorBoundary } from '@/components/ErrorFallback';

// Deleting a transfer: DeleteConfirm with its own words (#21) — "Delete this
// move? ₾200 goes back to Bank card." `close`: how many screens to close after
// (the dialog, plus the details or edit sheet under it).
export default function TransferDeleteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, close } = useLocalSearchParams<{ id: string; close?: string }>();
  const view = useTransferView();
  const money = useMoneyText();
  const transfer = useTransfer(id);
  if (!transfer) return null;

  const v = view(transfer);
  const title = t('history.transfer.deleteTitle');
  // The money comes back out of To: not if that leaves it below zero (#21).
  const canDelete = !!v.to && v.to.balanceMinor >= transfer.amountMinor;
  const remove = () => {
    if (!canDelete) return;
    router.dismiss(Number(close ?? 1));
    runWrite(() => deleteTransfer(db, transfer.id));
  };

  return (
    <Dialog accessibilityLabel={title} width={321}>
      <View style={[styles.icon, { backgroundColor: color.dangerSoft }]}>
        <TrashIcon color={color.danger} size={26} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>

      <View style={styles.item}>
        <View style={[styles.tile, { backgroundColor: color.track }]}>
          <TransferIcon color={color.softInk} size={20} width={1.9} />
        </View>
        <View style={styles.itemText}>
          <Text numberOfLines={1} style={styles.itemName}>
            {v.between}
          </Text>
          <Text numberOfLines={1} style={styles.itemWhen}>
            {v.whenShort}
          </Text>
        </View>
        <Text style={styles.itemAmount}>{money(v.amount)}</Text>
      </View>

      <Text style={styles.body}>
        {t('history.transfer.deleteBody', {
          amount: money(formatMoney(transfer.amountMinor, transfer.currency, { decimals: 'auto' })),
          name: v.from?.label ?? '',
        })}
      </Text>

      <View style={styles.actions}>
        <Press
          accessibilityRole="button"
          accessibilityState={{ disabled: !canDelete }}
          disabled={!canDelete}
          haptic
          onPress={remove}
          style={[styles.delete, !canDelete && styles.disabled]}
        >
          <Text style={styles.deleteText}>{t('history.confirm.delete')}</Text>
        </Press>
        <Press accessibilityRole="button" onPress={() => router.back()} style={styles.keep}>
          <Text style={styles.keepText}>{t('history.confirm.keep')}</Text>
        </Press>
      </View>
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
  itemAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    color: color.muted,
  },
  body: {
    ...text.subtitle,
    lineHeight: 20,
    marginTop: 14,
    textAlign: 'center',
    color: color.muted,
  },
  actions: { marginTop: 22, alignSelf: 'stretch', gap: 8 },
  delete: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.dangerStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
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
