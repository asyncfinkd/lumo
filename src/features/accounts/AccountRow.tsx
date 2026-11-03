import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { AccountIcon, ChevronDownIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { type CurrencyCode, formatMoney } from '@/domain/money';
import { useMoneyText } from '@/features/privacy/amounts';
import { color, fontFamily } from '@/theme';
import type { AccountView } from './accounts';

/**
 * An account to change (#21): From / To on a move (AddTransaction-Transfer),
 * or, `compact`, the one "Paid from" / "Goes to" / "Comes from" row
 * (AddTransaction-Account, SavingsAdd-Accounts). Opens the AccountPicker.
 */
export function AccountRow({
  label,
  a11y,
  account,
  currency,
  compact = false,
  style,
  onPress,
}: {
  label: string;
  a11y: string;
  account: AccountView;
  currency: CurrencyCode;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
}) {
  const money = useMoneyText();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={[styles.row, compact && styles.compact, style]}
    >
      <View
        style={[styles.tile, compact && styles.compactTile, { backgroundColor: account.tint.bg }]}
      >
        <AccountIcon kind={account.kind} size={20} width={1.9} color={account.tint.fg} />
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <Text numberOfLines={1} style={styles.name}>
          {account.label}
        </Text>
      </View>
      <Text style={styles.amount}>{money(formatMoney(account.balanceMinor, currency))}</Text>
      <ChevronDownIcon color={color.muted} />
    </Press>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 62,
    paddingLeft: 10,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compact: {
    height: 52,
    paddingLeft: 8,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: color.wash,
  },
  tile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTile: { width: 36, height: 36 },
  text: { flex: 1, minWidth: 0 },
  label: { fontFamily: fontFamily.bold, fontSize: 12, lineHeight: 15, color: color.muted },
  name: { fontFamily: fontFamily.extrabold, fontSize: 15, lineHeight: 19, color: color.ink },
  amount: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    color: color.muted,
  },
});
