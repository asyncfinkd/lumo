import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { color, duration, radius, shadow, size, text } from '@/theme';
import { easing } from './motion';
import { Press } from './Press';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  /**
   * `sheet`: on a sheet, beige track with a white thumb (Expense / Income).
   * `card`: on the ground, white track with a beige thumb (Week / Month).
   */
  tone?: 'sheet' | 'card';
};

const PAD = 4;

/** Two or more options with a thumb that slides to the chosen one. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  tone = 'sheet',
}: Props<T>) {
  const reduceMotion = useReducedMotion();
  const [segment, setSegment] = useState(0);
  const x = useSharedValue(0);
  const index = Math.max(
    options.findIndex((o) => o.value === value),
    0,
  );

  useEffect(() => {
    const target = index * segment;
    x.set(
      reduceMotion || !segment
        ? target
        : withTiming(target, { duration: duration.thumb, easing: easing('thumb') }),
    );
  }, [index, segment, reduceMotion, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, tone === 'sheet' ? styles.sheetTrack : styles.cardTrack]}
      onLayout={(e) => setSegment((e.nativeEvent.layout.width - PAD * 2) / options.length)}
    >
      {segment > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            tone === 'sheet' ? styles.sheetThumb : styles.cardThumb,
            { width: segment },
            thumb,
          ]}
        />
      )}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Press
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            style={styles.item}
          >
            <Text style={[styles.label, { color: selected ? color.ink : color.muted }]}>
              {option.label}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // 44pt + 4pt padding each side: 52pt (the design's CSS is content-box).
  track: { height: size.segmented, padding: PAD, borderRadius: radius.pill, flexDirection: 'row' },
  sheetTrack: { backgroundColor: color.track },
  cardTrack: { backgroundColor: color.card, boxShadow: shadow.card },
  thumb: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: radius.pill },
  sheetThumb: { backgroundColor: color.white, boxShadow: shadow.thumb },
  cardThumb: { backgroundColor: color.track },
  item: { flex: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  label: { ...text.label },
});
