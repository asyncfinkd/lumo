import { StyleSheet, Text, View } from 'react-native';
import { showToast } from '@/components/Toast';
import { currencies, type CurrencyCode, formatMoney } from '@/domain/money';
import i18n from '@/i18n';
import { fontFamily, savingsColor } from '@/theme';

/** SavingsAdded: "₾100 in the jar. 65% there!" above the tab bar, once the coin lands. */
export function showJarToast(amountMinor: number, percent: number, currency: CurrencyCode): void {
  const amount = formatMoney(amountMinor, currency, { decimals: 'auto' });
  showToast({
    tone: 'good',
    message: i18n.t('savings.toast', { amount, percent }),
    icon: <Coin currency={currency} />,
    // .toast waits 2.2s for the coin to land.
    delay: 2200,
  });
}

function Coin({ currency }: { currency: CurrencyCode }) {
  return (
    <View style={styles.coin}>
      <Text style={styles.symbol}>{currencies[currency].symbol}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  coin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: savingsColor.toastCoin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontFamily: fontFamily.extrabold, fontSize: 15, color: savingsColor.chipNote },
});
