import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScreenTop } from '@/components/useScreenTop';
import { BottomFade, Orbs } from '@/components/Backdrop';
import {
  AccountIcon,
  ChevronRightIcon,
  PlusIcon,
  SlidersIcon,
  TransferIcon,
} from '@/components/Icons';
import { Rise } from '@/components/motion';
import { Press } from '@/components/Press';
import { currencies, formatMoney } from '@/domain/money';
import { useAccountViews } from '@/features/accounts/accounts';
import { useProfile } from '@/features/live';
import { HeaderButton, SettingsHeader } from '@/features/profile/SettingsHeader';
import { color, fontFamily, fullLine, radius, shadow, space, text } from '@/theme';

// Accounts (#21): what's in each account and all together; tap one to edit
// it, move money between them, fix one's balance, or add another.
export default function AccountsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const screenTop = useScreenTop();
  const profile = useProfile();
  const accounts = useAccountViews();
  const currency = profile?.currency ?? 'GEL';
  const total = accounts.reduce((sum, a) => sum + a.balanceMinor, 0);
  const [whole, fraction] = formatMoney(total, currency)
    .replace(currencies[currency].symbol, '')
    .split('.');
  const cents = fraction ? `.${fraction}` : null;

  const open = (id?: string) =>
    router.push(id ? { pathname: '/account', params: { id } } : '/account');

  return (
    <View style={[styles.root, { paddingTop: screenTop }]}>
      <Orbs />
      <SettingsHeader
        title={t('accounts.title')}
        action={
          <HeaderButton label={t('accounts.add')} onPress={() => open()}>
            <PlusIcon size={20} width={2.2} color={color.ink} />
          </HeaderButton>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <Rise style={styles.together}>
          <Text style={styles.togetherLabel}>{t('accounts.together')}</Text>
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={formatMoney(total, currency)}
            style={styles.totalRow}
          >
            <Text style={styles.totalSmall}>{currencies[currency].symbol}</Text>
            <Text style={styles.total}>{whole}</Text>
            {cents ? <Text style={styles.totalSmall}>{cents}</Text> : null}
          </View>
          <Text style={styles.togetherNote}>{t('accounts.togetherNote')}</Text>
        </Rise>

        <Rise delay={60} style={styles.list}>
          {accounts.map((a) => {
            const amount = formatMoney(a.balanceMinor, currency);
            return (
              <Press
                key={a.id}
                accessibilityRole="button"
                accessibilityLabel={t('accounts.rowLabel', { name: a.label, amount })}
                onPress={() => open(a.id)}
                style={styles.row}
              >
                <View style={[styles.tile, { backgroundColor: a.tint.bg }]}>
                  <AccountIcon kind={a.kind} color={a.tint.fg} />
                </View>
                <View style={styles.rowText}>
                  <Text numberOfLines={1} style={styles.name}>
                    {a.label}
                  </Text>
                  <Text numberOfLines={1} style={styles.sub}>
                    {t(`accounts.kinds.${a.kind}`)}
                  </Text>
                </View>
                <Text style={styles.amount}>{amount}</Text>
                <ChevronRightIcon color={color.placeholder} />
              </Press>
            );
          })}
        </Rise>

        {accounts.length > 1 ? (
          <Rise delay={120} style={styles.actions}>
            <Press
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/add-transaction', params: { type: 'transfer' } })
              }
              style={styles.action}
            >
              <TransferIcon color={color.ink} />
              <Text style={styles.actionText}>{t('accounts.moveMoney')}</Text>
            </Press>
            <Press
              accessibilityRole="button"
              onPress={() => router.push('/balance')}
              style={styles.action}
            >
              <SlidersIcon color={color.ink} />
              <Text style={styles.actionText}>{t('accounts.fixBalance')}</Text>
            </Press>
          </Rise>
        ) : null}

        <Rise delay={160}>
          <Press accessibilityRole="button" onPress={() => open()} style={styles.addButton}>
            <View style={styles.addIcon}>
              <PlusIcon size={16} width={2.6} color={color.softInk} />
            </View>
            <Text style={styles.addText}>{t('accounts.add')}</Text>
          </Press>
        </Rise>

        {accounts.length > 1 ? <Text style={styles.footer}>{t('accounts.movingNote')}</Text> : null}
      </ScrollView>
      <BottomFade />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  content: { paddingTop: 18, paddingHorizontal: space.screen },
  together: {
    padding: 20,
    borderRadius: 32,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
  },
  togetherLabel: { ...text.label, color: color.muted },
  // Full lines so the digits' tops aren't clipped, on one baseline; the row
  // reaches up by the extra so the design's 48pt row and the note stay put.
  totalRow: {
    minHeight: fullLine(44),
    marginTop: 4 + 48 - fullLine(44),
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  total: {
    fontFamily: fontFamily.extrabold,
    fontSize: 44,
    lineHeight: fullLine(44),
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    color: color.ink,
  },
  totalSmall: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: fullLine(24),
    color: color.subtle,
    marginHorizontal: 2,
  },
  togetherNote: { ...text.meta, marginTop: 8, fontFamily: fontFamily.semibold, color: color.muted },
  list: {
    marginTop: 16,
    paddingVertical: 2,
    paddingHorizontal: 14,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
  },
  row: { height: 72, flexDirection: 'row', alignItems: 'center', gap: 14 },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  name: { ...text.rowTitle, lineHeight: 21, color: color.ink },
  sub: { ...text.small, fontFamily: fontFamily.semibold, lineHeight: 17, color: color.muted },
  amount: {
    ...text.rowTitle,
    fontFamily: fontFamily.extrabold,
    fontVariant: ['tabular-nums'],
    color: color.ink,
  },
  actions: { marginTop: 12, flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.card,
    boxShadow: shadow.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: { ...text.rowTitle, fontSize: 15, color: color.ink },
  footer: {
    ...text.meta,
    marginTop: 18,
    marginHorizontal: 12,
    fontFamily: fontFamily.semibold,
    lineHeight: 19,
    textAlign: 'center',
    color: color.muted,
  },
  addButton: {
    marginTop: 12,
    height: 64,
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(43,37,34,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.washSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { ...text.rowTitle, color: color.softInk },
});
