import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  AccountIcon,
  ArrowRightIcon,
  CloseIcon,
  InfoIcon,
  NoteIcon,
  TransferIcon,
  TrashIcon,
} from '@/components/Icons';
import { Press } from '@/components/Press';
import { Sheet } from '@/components/Sheet';
import { formatMoney } from '@/domain/money';
import type { AccountView } from '@/features/accounts/accounts';
import { useTransferView } from '@/features/accounts/useTransferView';
import { useTransfers } from '@/features/live';
import { useMoneyText } from '@/features/privacy/amounts';
import { color, fontFamily, radius, shadow, size, text } from '@/theme';

// A crash here shows Try again in a sheet, not over the screen under it.
export { SheetErrorBoundary as ErrorBoundary } from '@/components/ErrorFallback';

// TransactionDetail-Transfer (#21): where the money went, what each account
// holds now, and Delete / Edit.
export default function TransferScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transfers = useTransfers();
  const view = useTransferView();
  const money = useMoneyText();
  const transfer = transfers.find((x) => x.id === id);

  if (!transfer) return null;
  const v = view(transfer);
  const title = t('history.transfer.title', { name: v.to?.label ?? '' });

  const rows = [{ label: t('history.detail.when'), value: v.when }];
  if (transfer.note) rows.push({ label: t('history.detail.note'), value: transfer.note });
  rows.push({ label: t('history.detail.added'), value: t('history.detail.byYou') });

  const now = (a: AccountView) =>
    t('history.transfer.now', { amount: money(formatMoney(a.balanceMinor, transfer.currency)) });

  return (
    <Sheet accessibilityLabel={title} onDismissed={router.back}>
      {(close) => (
        <>
          <Press accessibilityLabel={t('common.close')} onPress={close} style={styles.close}>
            <CloseIcon color={color.muted} />
          </Press>

          <View style={styles.top}>
            <View style={styles.icon}>
              <TransferIcon color={color.softInk} size={30} width={1.8} />
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{t('history.transfer.chip')}</Text>
            </View>
            <View accessible accessibilityLabel={money(v.amount)} style={styles.amount}>
              <Text style={styles.symbol}>{v.symbol}</Text>
              <Text style={styles.digits}>{money(v.digits)}</Text>
            </View>
          </View>

          <View style={styles.facts}>
            {rows.map((r) => (
              <View key={r.label} style={styles.fact}>
                <Text style={styles.factLabel}>{r.label}</Text>
                <Text numberOfLines={1} style={styles.factValue}>
                  {r.value}
                </Text>
              </View>
            ))}
          </View>

          {v.from && v.to ? (
            <View style={styles.flow}>
              <FlowSide account={v.from} change={now(v.from)} />
              <View style={styles.arrow}>
                <ArrowRightIcon color={color.softInk} />
              </View>
              <FlowSide account={v.to} change={now(v.to)} />
            </View>
          ) : null}

          <View style={styles.note}>
            <InfoIcon color={color.softInk} />
            <Text style={styles.noteText}>{t('history.transfer.note')}</Text>
          </View>

          <View style={styles.actions}>
            <Press
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/transfer-delete',
                  params: { id: transfer.id, close: '2' },
                })
              }
              style={styles.delete}
            >
              <TrashIcon color={color.danger} />
              <Text style={styles.deleteText}>{t('history.detail.delete')}</Text>
            </Press>
            <Press
              accessibilityRole="button"
              haptic
              onPress={() =>
                router.push({
                  pathname: '/add-transaction',
                  params: { transfer: transfer.id, under: '1' },
                })
              }
              style={styles.edit}
            >
              <NoteIcon color={color.white} size={20} />
              <Text style={styles.editText}>{t('history.detail.edit')}</Text>
            </Press>
          </View>
        </>
      )}
    </Sheet>
  );
}

/** One side of the move: the account and what it holds now. */
function FlowSide({ account, change }: { account: AccountView; change: string }) {
  return (
    <View accessible style={styles.side}>
      <View style={[styles.sideTile, { backgroundColor: account.tint.bg }]}>
        <AccountIcon kind={account.kind} size={20} width={1.9} color={account.tint.fg} />
      </View>
      <Text numberOfLines={1} style={styles.sideName}>
        {account.label}
      </Text>
      <Text numberOfLines={1} style={styles.sideChange}>
        {change}
      </Text>
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
    backgroundColor: color.track,
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
    backgroundColor: color.track,
    justifyContent: 'center',
  },
  chipText: { fontFamily: fontFamily.extrabold, fontSize: 13, color: color.softInk },
  amount: { marginTop: 12, flexDirection: 'row', alignItems: 'baseline' },
  digits: {
    fontFamily: fontFamily.extrabold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    color: color.muted,
  },
  symbol: {
    marginLeft: 4,
    marginRight: 3,
    fontFamily: fontFamily.bold,
    fontSize: 30,
    opacity: 0.6,
    color: color.muted,
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
  factValue: { flexShrink: 1, fontFamily: fontFamily.bold, fontSize: 15, color: color.ink },
  flow: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.field,
    boxShadow: shadow.detailCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  side: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6 },
  sideTile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideName: { fontFamily: fontFamily.extrabold, fontSize: 14, lineHeight: 18, color: color.ink },
  sideChange: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: 15,
    fontVariant: ['tabular-nums'],
    color: color.muted,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.wash,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteText: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 14,
    lineHeight: 20,
    color: color.softInk,
  },
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
