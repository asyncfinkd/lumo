import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import { AccountIcon, ChevronDownIcon, ChevronRightIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { type CurrencyCode, formatMoney } from '@/domain/money';
import { useAccountViews } from '@/features/accounts/accounts';
import { useMoneyText } from '@/features/privacy/amounts';
import { color, fontFamily, radius } from '@/theme';

/**
 * Open or closed, kept while the app runs. Whether to remember it across
 * launches is still an open question on the board (acctN2).
 */
const useSplitOpen = create<{ open: boolean; toggle: () => void }>()((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
}));

/** Tiles drawn in the closed row; the rest still count in "In N accounts". */
const MAX_TILES = 3;

/**
 * Home's balance with two or more accounts (Main-Accounts): "In 3 accounts"
 * under the total, opening to what each one holds and "See accounts". Tap an
 * account to fix its balance.
 */
export function AccountsSplit({ currency }: { currency: CurrencyCode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const money = useMoneyText();
  const accounts = useAccountViews();
  const { open, toggle } = useSplitOpen();

  return (
    <>
      <View style={styles.line} />
      <Press
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={styles.toggle}
      >
        <View style={styles.stack}>
          {accounts.slice(0, MAX_TILES).map((a, i) => (
            <View
              key={a.id}
              style={[
                styles.tile,
                styles.stacked,
                i > 0 && styles.overlap,
                { backgroundColor: a.tint.bg },
              ]}
            >
              <AccountIcon kind={a.kind} size={16} width={2} color={a.tint.fg} />
            </View>
          ))}
        </View>
        <Text numberOfLines={1} style={styles.toggleText}>
          {t('home.inAccounts', { count: accounts.length })}
        </Text>
        <View style={open && styles.flipped}>
          <ChevronDownIcon color={color.muted} />
        </View>
      </Press>
      {open ? (
        <>
          <View style={styles.list}>
            {accounts.map((a) => {
              const amount = money(formatMoney(a.balanceMinor, currency));
              return (
                <Press
                  key={a.id}
                  accessibilityLabel={`${a.label}, ${amount}`}
                  accessibilityHint={t('home.changeBalance')}
                  onPress={() => router.push({ pathname: '/balance', params: { account: a.id } })}
                  style={styles.row}
                >
                  <View style={[styles.tile, { backgroundColor: a.tint.bg }]}>
                    <AccountIcon kind={a.kind} size={16} width={2} color={a.tint.fg} />
                  </View>
                  <Text numberOfLines={1} style={styles.name}>
                    {a.label}
                  </Text>
                  <Text style={styles.amount}>{amount}</Text>
                </Press>
              );
            })}
          </View>
          <Press
            accessibilityRole="link"
            onPress={() => router.push('/accounts')}
            style={styles.see}
          >
            <Text style={styles.seeText}>{t('home.seeAccounts')}</Text>
            <ChevronRightIcon color={color.ink} />
          </Press>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  line: { marginTop: 16, height: 1, backgroundColor: color.hairline },
  toggle: { marginTop: 10, height: 40, flexDirection: 'row', alignItems: 'center', gap: 12 },
  stack: { flexDirection: 'row' },
  tile: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stacked: { boxShadow: `0px 0px 0px 2px ${color.heroRing}` },
  overlap: { marginLeft: -8 },
  toggleText: { flex: 1, fontFamily: fontFamily.bold, fontSize: 14, color: color.softInk },
  flipped: { transform: [{ rotate: '180deg' }] },
  list: { marginTop: 6 },
  row: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { flex: 1, minWidth: 0, fontFamily: fontFamily.bold, fontSize: 15, color: color.ink },
  amount: {
    fontFamily: fontFamily.extrabold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    color: color.ink,
  },
  see: {
    marginTop: 6,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.wash,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  seeText: { fontFamily: fontFamily.bold, fontSize: 14, color: color.ink },
});
