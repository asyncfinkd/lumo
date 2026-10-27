import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { easing } from '@/components/motion';
import { currencies, type CurrencyCode } from '@/domain/money';
import { color, fontFamily, radius, savingsColor, shadow, text } from '@/theme';

/** After the coin lands (.toast waits 2.2s), shown for 3s. */
const DELAY = 2200;
const SHOWN_FOR = 3000;

/** SavingsAdded: "₾100 in the jar. 65% there!" above the tab bar. */
export function JarToast({
  amount,
  percent,
  currency,
}: {
  amount: string;
  percent: number;
  currency: CurrencyCode;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(reduceMotion ? 1 : 0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!reduceMotion) {
      p.set(withDelay(DELAY, withTiming(1, { duration: 700, easing: easing('switch') })));
    }
    const timer = setTimeout(() => setGone(true), DELAY + SHOWN_FOR);
    return () => clearTimeout(timer);
  }, [p, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ translateY: (1 - p.get()) * 16 }, { scale: 0.94 + p.get() * 0.06 }],
  }));

  if (gone) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View accessibilityRole="alert" style={[styles.toast, style]}>
        <View style={styles.coin}>
          <Text style={styles.symbol}>{currencies[currency].symbol}</Text>
        </View>
        <Text style={styles.label}>{t('savings.toast', { amount, percent })}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 107pt from the bottom: just above the tab bar.
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 107, alignItems: 'center' },
  toast: {
    height: 50,
    paddingLeft: 8,
    paddingRight: 18,
    borderRadius: radius.pill,
    backgroundColor: color.toast,
    boxShadow: shadow.jarToast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: savingsColor.toastCoin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontFamily: fontFamily.extrabold, fontSize: 15, color: savingsColor.chipNote },
  label: { ...text.label, color: color.ink, fontVariant: ['tabular-nums'] },
});
