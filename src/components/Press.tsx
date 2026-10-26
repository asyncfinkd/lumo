import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { duration, pressScale } from '@/theme';
import { easing } from './motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** A light tap on press: the add button, keypad keys, primary actions. */
  haptic?: boolean;
};

/**
 * Every tappable thing in Lumo. The design's ".press": shrink to 96% on touch,
 * spring back on release. No scaling with Reduce Motion.
 */
export function Press({
  style,
  children,
  haptic = false,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  // `.set()` rather than `.value =`, which the React Compiler lint rules reject in handlers.
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      onPressIn={(e) => {
        if (!reduceMotion) {
          scale.set(
            withTiming(pressScale, { duration: duration.pressIn, easing: easing('press') }),
          );
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withTiming(1, { duration: duration.pressOut, easing: easing('press') }));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
