import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { type CurrencyCode, currencies } from '@/domain/money';
import { color, duration, text } from '@/theme';

/** Keypad text with thousands grouping: "3800.5" → "3,800.5". */
export function groupTyped(typed: string): string {
  const [whole = '0', fraction] = typed.split('.');
  const grouped = Number(whole || '0').toLocaleString('en-US');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/** The big typed amount with a blinking caret, as in the add sheet and Income step. */
export function AmountDisplay({
  typed,
  currency,
  accessibilityLabel,
}: {
  typed: string;
  currency: CurrencyCode;
  accessibilityLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const caret = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    // .caret: blink 1.1s steps(1)
    const half = duration.caretBlink / 2;
    caret.set(
      withRepeat(
        withSequence(
          withDelay(half, withTiming(0, { duration: 0 })),
          withDelay(half, withTiming(1, { duration: 0 })),
        ),
        -1,
      ),
    );
  }, [caret, reduceMotion]);

  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.get() }));

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      style={styles.row}
    >
      <Text style={styles.symbol}>{currencies[currency].symbol}</Text>
      <Text style={styles.amount}>{groupTyped(typed)}</Text>
      <Animated.View style={[styles.caret, caretStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 64, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  symbol: {
    fontFamily: text.subtitle.fontFamily,
    fontSize: 30,
    lineHeight: 30,
    color: color.subtle,
    marginRight: 4,
    marginBottom: 9,
  },
  amount: { ...text.amount, color: color.ink },
  caret: {
    width: 3,
    height: 46,
    marginLeft: 4,
    marginBottom: 6,
    borderRadius: 999,
    backgroundColor: color.ink,
  },
});
