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
import { curve, duration } from '@/theme';

/** A design curve from the theme as a Reanimated easing. */
export function easing(name: keyof typeof curve): ReturnType<typeof Easing.bezier> {
  const [x1, y1, x2, y2] = curve[name];
  return Easing.bezier(x1, y1, x2, y2);
}

type RiseProps = {
  delay?: number;
  /** Change it to play the entrance again. */
  replayKey?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** The design's ".rise": fade in while moving up 14pt. Skipped with Reduce Motion. */
export function Rise({ delay = 0, replayKey = 0, style, children }: RiseProps) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      t.value = 1;
      return;
    }
    t.value = 0;
    t.value = withDelay(delay, withTiming(1, { duration: duration.rise, easing: easing('rise') }));
  }, [delay, replayKey, reduceMotion, t]);

  const animated = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 14 }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

type FillProps = {
  /** Width as a percent of the track, 0–100. */
  percent: number;
  replayKey?: number;
  delay?: number;
  duration?: number;
  curve?: keyof typeof curve;
  style?: StyleProp<ViewStyle>;
};

/** The design's ".fill": a bar growing from 0 to `percent` of its track. */
export function Fill({
  percent,
  replayKey = 0,
  delay = duration.fillDelay,
  duration: ms = duration.fill,
  curve: curveName = 'fill',
  style,
}: FillProps) {
  const reduceMotion = useReducedMotion();
  const width = useSharedValue(reduceMotion ? percent : 0);

  useEffect(() => {
    if (reduceMotion) {
      width.value = percent;
      return;
    }
    width.value = 0;
    width.value = withDelay(
      delay,
      withTiming(percent, { duration: ms, easing: easing(curveName) }),
    );
  }, [percent, replayKey, delay, ms, curveName, reduceMotion, width]);

  const animated = useAnimatedStyle(() => ({ width: `${Math.max(width.value, 0)}%` }));
  return <Animated.View style={[{ height: '100%', borderRadius: 999 }, style, animated]} />;
}
