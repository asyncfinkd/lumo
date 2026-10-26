import { type ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { color, shadow } from '@/theme';
import { easing } from './motion';

/**
 * A confirm dialog as in the design (Delete all, Delete category): the screen
 * dims and blurs, the card pops up in the middle.
 */
export function Dialog({
  accessibilityLabel,
  width = 329,
  children,
}: {
  accessibilityLabel: string;
  width?: number;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(reduceMotion ? 1 : 0);
  const dim = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    // .pop: .5s with an overshoot · .dim: .3s ease-out
    p.set(withTiming(1, { duration: 500, easing: easing('switch') }));
    dim.set(withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }));
  }, [p, dim, reduceMotion]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.get() }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ scale: 0.9 + p.get() * 0.1 }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, dimStyle]}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color.dim }]} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        accessibilityRole="alert"
        accessibilityLabel={accessibilityLabel}
        style={[styles.card, { width }, cardStyle]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 20,
    borderRadius: 32,
    borderCurve: 'continuous',
    backgroundColor: color.dialog,
    boxShadow: shadow.dialog,
    alignItems: 'center',
  },
});
