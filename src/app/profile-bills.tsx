import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomFade, Orbs } from '@/components/Backdrop';
import { PlusIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { currencies, formatMoney } from '@/domain/money';
import { useBills, useProfile } from '@/features/live';
import { HeaderButton, SettingsHeader } from '@/features/profile/SettingsHeader';
import { BillTile } from '@/features/recurring/BillTile';
import { color, fontFamily, gradient, radius, shadow, space, text } from '@/theme';

// ProfileBills: every monthly bill, what they add up to, and which ones Lumo
// adds by itself. Tap one to change it, or add a new one.
export default function ProfileBillsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const bills = [...useBills()].sort((a, b) => a.day - b.day || a.name.localeCompare(b.name));
  if (!profile) return null;

  const { currency } = profile;
  const total = bills.reduce((sum, b) => sum + b.amountMinor, 0);
  const totalText = formatMoney(total, currency, { decimals: 'auto' });
  const symbol = currencies[currency].symbol;
  const open = (id?: string) =>
    router.push(id ? { pathname: '/profile-bill', params: { id } } : '/profile-bill');
  const ordinal = (day: number) =>
    t('onboarding.income.paydayValue', { count: day, ordinal: true });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Orbs />
      <SettingsHeader
        title={t('billsManage.title')}
        action={
          <HeaderButton label={t('billsManage.add')} onPress={() => open()}>
            <PlusIcon size={20} width={2.2} color={color.ink} />
          </HeaderButton>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.total}>
          <View style={styles.totalText}>
            <Text style={styles.totalLabel}>{t('billsManage.everyMonth')}</Text>
            <Text accessibilityLabel={totalText} style={styles.totalAmount}>
              <Text style={styles.totalSymbol}>{symbol}</Text>
              {totalText.slice(symbol.length)}
            </Text>
          </View>
          <View style={styles.count}>
            <Text style={styles.countText}>{t('billsManage.count', { count: bills.length })}</Text>
          </View>
        </View>

        <Text style={styles.intro}>{t('billsManage.intro')}</Text>

        {bills.length > 0 ? (
          <View style={styles.list}>
            {bills.map((b) => {
              const due = t('billsManage.due', { day: ordinal(b.day) });
              const amount = formatMoney(b.amountMinor, b.currency);
              return (
                <Press
                  key={b.id}
                  accessibilityRole="button"
                  accessibilityLabel={t('billsManage.rowLabel', {
                    name: b.name,
                    amount,
                    due,
                    mode: b.active ? t('billsManage.autoA11y') : t('billsManage.reminderA11y'),
                  })}
                  onPress={() => open(b.id)}
                  style={styles.row}
                >
                  <BillTile name={b.name} categoryId={b.categoryId} />
                  <View style={styles.rowText}>
                    <Text numberOfLines={1} style={styles.name}>
                      {b.name}
                    </Text>
                    <View style={styles.metaLine}>
                      <Text style={styles.due}>{due}</Text>
                      <Text style={[styles.tag, !b.active && styles.tagQuiet]}>
                        {b.active ? t('billsManage.auto') : t('billsManage.reminderOnly')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.amount}>{amount}</Text>
                </Press>
              );
            })}
          </View>
        ) : null}

        <Press accessibilityRole="button" onPress={() => open()} style={styles.addButton}>
          <PlusIcon size={18} color={color.ink} />
          <Text style={styles.addText}>{t('billsManage.add')}</Text>
        </Press>
      </ScrollView>
      <BottomFade />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  content: { paddingTop: 24, paddingHorizontal: space.screen },
  total: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    backgroundImage: gradient.heroGlow,
    boxShadow: shadow.billsTotal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalText: { gap: 2 },
  totalLabel: { ...text.subtitle, fontFamily: fontFamily.bold, color: color.muted },
  totalAmount: {
    fontFamily: fontFamily.extrabold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  totalSymbol: { fontSize: 20, color: color.subtle },
  count: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: color.goodSoft,
    justifyContent: 'center',
  },
  countText: { fontFamily: fontFamily.bold, fontSize: 13, color: color.good },
  intro: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 19,
    color: color.muted,
  },
  list: {
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
  },
  row: { height: 68, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  name: { ...text.rowTitle, lineHeight: 21, color: color.ink },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  due: { fontFamily: fontFamily.semibold, fontSize: 13, color: color.muted },
  tag: {
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
  tagQuiet: { backgroundColor: color.wash },
  amount: { ...text.rowTitle, color: color.ink, fontVariant: ['tabular-nums'] },
  addButton: {
    marginTop: 12,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.wash,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addText: { ...text.label, color: color.ink },
});
