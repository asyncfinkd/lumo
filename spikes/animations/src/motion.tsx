import { type ReactNode, useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

// CSS easings from the design, so timings match 1:1.
export const ease = {
  rise: Easing.bezier(0.22, 1, 0.36, 1), // .rise, .draw, donut
  fill: Easing.bezier(0.34, 1.35, 0.64, 1), // .fill
  digit: Easing.bezier(0.34, 1.2, 0.64, 1), // hero digits
  press: Easing.bezier(0.34, 1.56, 0.64, 1), // .press release
  thumb: Easing.bezier(0.34, 1.3, 0.64, 1), // segmented thumbs
  bar: Easing.bezier(0.34, 1.25, 0.64, 1), // Insights bars
  sheet: Easing.bezier(0.32, 1.15, 0.5, 1), // sheetUp
};

// The design's ".rise": fade in while moving up 14px over 0.9s.
export function Rise({ delay = 0, runKey = 0, style, children }: { delay?: number; runKey?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      t.value = 1;
      return;
    }
    t.value = 0;
    t.value = withDelay(delay, withTiming(1, { duration: 900, easing: ease.rise }));
  }, [delay, runKey, reduceMotion, t]);
  const animated = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 14 }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

// The design's ".fill": a bar growing from 0 to `pct`% of its track.
export function Fill({
  pct,
  runKey = 0,
  delay = 450,
  duration = 1000,
  easing = ease.fill,
  style,
}: {
  pct: number;
  runKey?: number;
  delay?: number;
  duration?: number;
  easing?: typeof ease.fill;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();
  const w = useSharedValue(reduceMotion ? pct : 0);
  useEffect(() => {
    if (reduceMotion) {
      w.value = pct;
      return;
    }
    w.value = 0;
    w.value = withDelay(delay, withTiming(pct, { duration, easing }));
  }, [pct, runKey, delay, duration, easing, reduceMotion, w]);
  const animated = useAnimatedStyle(() => ({ width: `${Math.max(w.value, 0)}%` }));
  return <Animated.View style={[{ height: '100%', borderRadius: 999 }, style, animated]} />;
}
