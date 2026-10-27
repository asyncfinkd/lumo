import { type ReactNode, useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { color, duration, radius, shadow } from '@/theme';
import { easing } from './motion';
import { Press } from './Press';

type Props = {
  /** Called once the sheet has slid away; navigate or unmount here. */
  onDismissed: () => void;
  accessibilityLabel: string;
  /**
   * Distance from the top of the screen for a tall sheet (the add sheet uses
   * 96). Leave out for a sheet that fits its content (edit budget).
   */
  top?: number;
  /** Gets `close()`, which slides the sheet away before `onDismissed`. */
  children: (close: () => void) => ReactNode;
};

/** Keyboard height minus this: the sheet's bottom padding, less a small gap. */
const KEYBOARD_GAP = 26;

/**
 * A bottom sheet as in the design: slides up over a blurred, dimmed screen;
 * tap outside, drag down or call `close()` to dismiss.
 *
 * On Android the blur needs a BlurTargetView around the content behind; a sheet
 * opened as its own route can't reach the tabs' one, so there it falls back to
 * the dimmed scrim alone.
 */
export function Sheet({ onDismissed, accessibilityLabel, top, children }: Props) {
  const { t } = useTranslation();
  const { height: screen } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [height, setHeight] = useState(top !== undefined ? screen - top : 0);

  const y = useSharedValue(screen);
  const scrim = useSharedValue(0);
  // A second tap or drag while it's already closing would call onDismissed
  // (router.back) twice.
  const closing = useSharedValue(false);
  // How far the sheet rides up over the keyboard (name and amount fields).
  const lift = useSharedValue(0);

  useEffect(() => {
    // A tall sheet (`top`) has no room to move; Android resizes the window itself.
    if (top !== undefined || Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      // The sheet's own bottom padding already clears the home indicator. A
      // tall sheet stops below the status bar; tap it to put the keyboard away.
      const room = Math.max(0, screen - height - insets.top - 8);
      const to = Math.min(room, Math.max(0, e.endCoordinates.height - KEYBOARD_GAP));
      lift.set(reduceMotion ? to : withTiming(to, { duration: e.duration || 250 }));
    });
    const hide = Keyboard.addListener('keyboardWillHide', (e) => {
      lift.set(reduceMotion ? 0 : withTiming(0, { duration: e.duration || 250 }));
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [top, reduceMotion, lift, screen, height, insets.top]);

  useEffect(() => {
    if (!height) return;
    if (reduceMotion) {
      y.set(0);
      scrim.set(1);
      return;
    }
    // .sheet: sheetUp .7s · .scrim: .5s ease-out
    y.set(height);
    y.set(withTiming(0, { duration: duration.sheet, easing: easing('sheet') }));
    scrim.set(withTiming(1, { duration: duration.scrim, easing: Easing.out(Easing.ease) }));
  }, [height, reduceMotion, scrim, y]);

  const dismiss = (ms: number) => {
    'worklet';
    if (closing.get()) return;
    closing.set(true);
    scrim.set(withTiming(0, { duration: ms }));
    y.set(
      withTiming(height || screen, { duration: ms, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) scheduleOnRN(onDismissed);
      }),
    );
  };
  const close = () => dismiss(reduceMotion ? 0 : 280);

  // Drag down to dismiss; a short drag snaps back.
  const pan = usePanGesture({
    activeOffsetY: 10,
    onUpdate: (e) => {
      'worklet';
      const moved = Math.max(0, e.translationY);
      y.set(moved);
      scrim.set(1 - Math.min(1, moved / (height || screen)));
    },
    onDeactivate: (e) => {
      'worklet';
      if (e.translationY > 140 || e.velocityY > 900) {
        dismiss(220);
      } else {
        y.set(withTiming(0, { duration: 450, easing: easing('sheet') }));
        scrim.set(withTiming(1, { duration: 200 }));
      }
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.get() - lift.get() }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.get() }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        {/* backdrop-filter: blur(6px), then the design's scrim color. */}
        <BlurView intensity={30} style={StyleSheet.absoluteFill} />
        <Press
          accessibilityLabel={t('common.close')}
          onPress={close}
          style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]}
        />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          // A tap on the sheet itself (not a field or button) puts the keyboard away.
          onStartShouldSetResponder={() => {
            Keyboard.dismiss();
            return false;
          }}
          onLayout={(e) => {
            if (top === undefined && !height) setHeight(e.nativeEvent.layout.height);
          }}
          style={[styles.sheet, top !== undefined && { top }, sheetStyle]}
        >
          <View style={styles.glass}>
            <BlurView intensity={100} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: color.sheet }]} />
          </View>
          <View style={styles.grabber} />
          {children(close)}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 34,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderCurve: 'continuous',
    boxShadow: shadow.sheet,
  },
  glass: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: color.grabber,
  },
});
