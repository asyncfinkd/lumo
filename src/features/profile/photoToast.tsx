import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { create } from 'zustand';
import { CheckIcon } from '@/components/Icons';
import { easing } from '@/components/motion';
import { color, radius, shadow, text } from '@/theme';

/** Set after "Use photo"; Profile shows the toast once. */
export const usePhotoToast = create<{ visible: boolean; show: () => void; hide: () => void }>()(
  (set) => ({
    visible: false,
    show: () => set({ visible: true }),
    hide: () => set({ visible: false }),
  }),
);

const SHOWN_FOR = 3000;

/** ProfileWithPhoto: "Looking good! Photo updated" above the tab bar. */
export function PhotoToast() {
  const { t } = useTranslation();
  const visible = usePhotoToast((s) => s.visible);
  const hide = usePhotoToast((s) => s.hide);
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!visible) return;
    // .toast: .7s with a little overshoot, after .5s
    if (!reduceMotion) {
      p.set(0);
      p.set(withDelay(500, withTiming(1, { duration: 700, easing: easing('switch') })));
    }
    const timer = setTimeout(hide, SHOWN_FOR + 500);
    return () => clearTimeout(timer);
  }, [visible, hide, p, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ translateY: (1 - p.get()) * 16 }, { scale: 0.95 + p.get() * 0.05 }],
  }));

  if (!visible) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View accessibilityRole="alert" style={[styles.toast, style]}>
        <View style={styles.check}>
          <CheckIcon color={color.good} />
        </View>
        <Text style={styles.label}>{t('profile.photo.updated')}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 107pt from the bottom: just above the tab bar.
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 107, alignItems: 'center' },
  toast: {
    height: 48,
    paddingLeft: 8,
    paddingRight: 18,
    borderRadius: radius.pill,
    backgroundColor: color.toast,
    boxShadow: shadow.photoToast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.cameInTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...text.label, color: color.ink },
});
