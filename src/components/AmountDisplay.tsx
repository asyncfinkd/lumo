import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
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

/**
 * Android clips the top of a line shorter than the font's own height (Nunito
 * is about 1.37× its size), which cut off the digits and the ₾. There the line
 * is that tall and the pieces sit on the text baseline; iOS keeps the design's
 * tight lines.
 */
const ANDROID = Platform.OS === 'android';
const fullLine = (fontSize: number) => Math.ceil(fontSize * 1.37);

const styles = StyleSheet.create({
  row: ANDROID
    ? { minHeight: 64, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }
    : { height: 64, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  symbol: {
    fontFamily: text.subtitle.fontFamily,
    fontSize: 30,
    lineHeight: ANDROID ? fullLine(30) : 30,
    color: color.subtle,
    marginRight: 4,
    marginBottom: ANDROID ? 0 : 9,
  },
  amount: {
    ...text.amount,
    ...(ANDROID ? { lineHeight: fullLine(text.amount.fontSize) } : null),
    color: color.ink,
  },
  caret: {
    width: 3,
    height: 46,
    marginLeft: 4,
    marginBottom: ANDROID ? -4 : 6,
    borderRadius: 999,
    backgroundColor: color.ink,
  },
});
