import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CameInIcon, WentOutIcon } from '@/components/Icons';
import { Sparkline } from '@/components/Sparkline';
import { type CurrencyCode, currencies, formatMoney } from '@/domain/money';
import { color, radius, shadow, text } from '@/theme';

const KINDS = {
  in: { label: 'home.cameIn', tile: color.cameInTile, icon: color.cameInIcon, Icon: CameInIcon },
  out: {
    label: 'home.wentOut',
    tile: color.wentOutTile,
    icon: color.wentOutIcon,
    Icon: WentOutIcon,
  },
} as const;

/** "Came in" / "Went out" this pay period, in whole units, with the trend line. */
export function FlowCard({
  kind,
  minor,
  currency,
}: {
  kind: keyof typeof KINDS;
  minor: number;
  currency: CurrencyCode;
}) {
  const { t } = useTranslation();
  const { label, tile, icon, Icon } = KINDS[kind];
  const { symbol } = currencies[currency];
  const amount = formatMoney(minor, currency, { decimals: 'none' });

  return (
    <View accessible accessibilityLabel={`${t(label)} ${amount}`} style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.tile, { backgroundColor: tile }]}>
          <Icon color={icon} />
        </View>
        <Text style={styles.label}>{t(label)}</Text>
      </View>
      <View style={styles.bottom}>
        <View style={styles.amountRow}>
          <Text style={styles.symbol}>{symbol}</Text>
          <Text style={styles.amount}>{amount.slice(symbol.length)}</Text>
        </View>
        <View style={styles.spark}>
          <Sparkline kind={kind} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    gap: 8,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tile: {
    width: 32,
    height: 32,
    borderRadius: radius.tileSmall,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...text.label, fontSize: 14, color: color.muted },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  amountRow: { flexShrink: 0, flexDirection: 'row', alignItems: 'baseline' },
  // The amount keeps its size; the line takes what's left, up to the design's
  // 60×30 (narrow screens like a Galaxy Fold's cover screen).
  spark: { flexShrink: 1, minWidth: 0, width: 60, maxWidth: 60, aspectRatio: 2 },
  amount: { ...text.stat, color: color.ink },
  symbol: { ...text.stat, fontSize: 15, color: color.subtle, marginRight: 2 },
});
