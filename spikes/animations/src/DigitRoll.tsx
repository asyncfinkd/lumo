import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { color, font, springs } from './theme';

const HEIGHT = 48;
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// One column of 0–9 that springs to its digit, like the Home hero in the design.
function Column({ digit, index, runKey }: { digit: number; index: number; runKey: number }) {
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(reduceMotion ? -digit * HEIGHT : 0);

  useEffect(() => {
    if (reduceMotion) {
      y.value = -digit * HEIGHT;
      return;
    }
    y.value = 0;
    y.value = withDelay(160 + index * 90, withSpring(-digit * HEIGHT, springs.digit));
  }, [digit, index, runKey, reduceMotion, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

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

// Rolls the whole part of an amount in minor units; the fraction stays still.
export function DigitRoll({ minor, runKey }: { minor: number; runKey: number }) {
  const whole = Math.floor(minor / 100);
  const fraction = String(minor % 100).padStart(2, '0');
  const chars = whole.toLocaleString('en-US').split('');

  let digitIndex = 0;
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${whole} lari ${Number(fraction)} tetri left`}
      style={styles.row}
    >
      <Text style={styles.symbol}>₾</Text>
      {chars.map((ch, i) =>
        ch === ',' ? (
          <Text key={i} style={styles.digit}>
            ,
          </Text>
        ) : (
          <Column key={i} digit={Number(ch)} index={digitIndex++} runKey={runKey} />
        ),
      )}
      <Text style={styles.fraction}>.{fraction}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', height: 50 },
  window: { height: HEIGHT, overflow: 'hidden' },
  digit: {
    height: HEIGHT,
    fontSize: 48,
    lineHeight: HEIGHT,
    fontFamily: font.bold,
    color: color.ink,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  symbol: { fontSize: 26, fontFamily: font.semibold, color: color.subtle, marginRight: 3, marginBottom: 6 },
  fraction: { fontSize: 26, fontFamily: font.semibold, color: color.subtle, marginLeft: 1, marginBottom: 6 },
});
