import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { type CurrencyCode, currencies, formatMoney } from '@/domain/money';
import { MASK } from '@/features/privacy/amounts';
import { color, duration, fontFamily, text } from '@/theme';
import { easing } from './motion';

// Nunito's digits reach above and below a 48pt line, so each column's window
// gets room around the glyph; the extra is pulled back out of the layout so the
// baseline stays where the design puts it.
const HEIGHT = text.hero.lineHeight + 12;
const OVERFLOW = (HEIGHT - text.hero.lineHeight) / 2;

// The same for the 26pt symbol and fraction: a taller line, less bottom margin.
const SMALL_LINE = 34;
const SMALL_BOTTOM = 6 - (SMALL_LINE - 26) / 2;
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// One 0–9 column that rolls to its digit.
function Column({ digit, index, replayKey }: { digit: number; index: number; replayKey: number }) {
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(reduceMotion ? -digit * HEIGHT : 0);

  useEffect(() => {
    if (reduceMotion) {
      y.set(-digit * HEIGHT);
      return;
    }
    y.set(0);
    y.set(
      withDelay(
        160 + index * duration.digitStagger,
        withTiming(-digit * HEIGHT, { duration: duration.digit, easing: easing('digit') }),
      ),
    );
  }, [digit, index, replayKey, reduceMotion, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  return (
    <View style={styles.window}>
      <Animated.View style={style}>
        {DIGITS.map((d) => (
          <Text key={d} style={styles.digit}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

type Props = {
  minor: number;
  currency: CurrencyCode;
  /** Change it to roll the digits again. */
  replayKey?: number;
  /** "Hide amounts" (Main): the symbol stays, the number becomes dots. */
  hidden?: boolean;
};

/**
 * The Home hero number: whole units roll up digit by digit, the fraction and
 * the symbol stay still. Screen readers hear the formatted amount.
 */
export function DigitRoll({ minor, currency, replayKey = 0, hidden = false }: Props) {
  const { symbol, minorUnits } = currencies[currency];
  const scale = 10 ** minorUnits;
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / scale).toLocaleString('en-US');
  const fraction = minorUnits > 0 ? String(abs % scale).padStart(minorUnits, '0') : '';

  // Digits roll one after another; the comma stays put.
  const parts: { ch: string; digitIndex: number }[] = [];
  let digitIndex = 0;
  for (const ch of whole) parts.push({ ch, digitIndex: /\d/.test(ch) ? digitIndex++ : -1 });
  const fractionText = fraction ? `.${fraction}` : '';

  if (hidden) {
    return (
      <View style={styles.row}>
        <Text style={styles.symbol}>{symbol}</Text>
        <Text style={styles.dots}>{MASK}</Text>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={formatMoney(minor, currency)}
      style={styles.row}
    >
      <Text style={styles.symbol}>{symbol}</Text>
      {parts.map(({ ch, digitIndex: index }, i) =>
        index >= 0 ? (
          <Column key={i} digit={Number(ch)} index={index} replayKey={replayKey} />
        ) : (
          <Text key={i} style={styles.digit}>
            {ch}
          </Text>
        ),
      )}
      {fractionText ? <Text style={styles.fraction}>{fractionText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', height: 50 },
  window: { height: HEIGHT, marginVertical: -OVERFLOW, overflow: 'hidden' },
  digit: {
    ...text.hero,
    height: HEIGHT,
    lineHeight: HEIGHT,
    color: color.ink,
    includeFontPadding: false,
  },
  symbol: {
    fontFamily: text.subtitle.fontFamily,
    fontSize: 26,
    lineHeight: SMALL_LINE,
    color: color.subtle,
    marginRight: 3,
    marginBottom: SMALL_BOTTOM,
  },
  // Dots in place of the digits, sitting on the same line as the symbol.
  dots: {
    fontFamily: fontFamily.extrabold,
    fontSize: 30,
    lineHeight: SMALL_LINE,
    letterSpacing: 3,
    color: color.ink,
    marginBottom: SMALL_BOTTOM,
  },
  fraction: {
    fontFamily: text.subtitle.fontFamily,
    fontSize: 26,
    lineHeight: SMALL_LINE,
    color: color.subtle,
    letterSpacing: -0.8,
    marginLeft: 1,
    marginBottom: SMALL_BOTTOM,
  },
});
