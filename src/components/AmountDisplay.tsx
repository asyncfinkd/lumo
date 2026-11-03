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
import { color, duration, fullLine, text } from '@/theme';

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
 * A line shorter than the font's own height (Nunito is about 1.37× its size)
 * gets its top clipped, which cut off the digits and the ₾. So each line is
 * that tall and the pieces sit on the text baseline, which also keeps them
 * lined up when iOS or Android text is set larger.
 */
const ANDROID = Platform.OS === 'android';
const SYMBOL_SIZE = 30;
/** The design's row; the amount's full line is taller. */
const ROW = 64;
const LINE = fullLine(text.amount.fontSize);

const styles = StyleSheet.create({
  row: {
    minHeight: LINE,
    // iOS keeps the design's 64pt row: the extra line height reaches up into
    // the space above instead of pushing everything below down. (Android
    // already had the taller row.)
    marginTop: ANDROID ? 0 : ROW - LINE,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  symbol: {
    fontFamily: text.subtitle.fontFamily,
    fontSize: SYMBOL_SIZE,
    lineHeight: fullLine(SYMBOL_SIZE),
    color: color.subtle,
    marginRight: 4,
  },
  amount: { ...text.amount, lineHeight: LINE, color: color.ink },
  caret: {
    width: 3,
    height: 46,
    marginLeft: 4,
    // A view's baseline is its bottom edge: dip just below the digits. (Yoga
    // ignores a margin for baseline alignment on iOS.)
    transform: [{ translateY: 4 }],
    borderRadius: 999,
    backgroundColor: color.ink,
  },
});
