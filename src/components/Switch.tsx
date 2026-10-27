import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { color, duration, radius, shadow } from '@/theme';
import { easing } from './motion';
import { Press } from './Press';

type Props = {
  value: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
  /** Shown as it is but can't be flipped (a reminder while Reminders is off). */
  disabled?: boolean;
};

/** The design's switch (EditBudget's nudge): green when on, the knob springs across. */
export function Switch({ value, onChange, accessibilityLabel, disabled = false }: Props) {
  const reduceMotion = useReducedMotion();
  const on = useSharedValue(value ? 1 : 0);
  const track = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    const target = value ? 1 : 0;
    if (reduceMotion) {
      on.set(target);
      track.set(target);
      return;
    }
    on.set(withTiming(target, { duration: duration.switchKnob, easing: easing('switch') }));
    track.set(withTiming(target, { duration: duration.switchTrack }));
  }, [value, reduceMotion, on, track]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(track.get(), [0, 1], [color.switchOff, color.switchOn]),
  }));
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: on.get() * 20 }] }));

  return (
    <Press
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onChange(!value)}
      hitSlop={{ top: 7, bottom: 7 }}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </Press>
  );
}

const styles = StyleSheet.create({
  track: { width: 51, height: 31, padding: 2, borderRadius: radius.pill },
  knob: {
    width: 27,
    height: 27,
    borderRadius: radius.pill,
    backgroundColor: color.white,
    boxShadow: shadow.switchKnob,
  },
});
