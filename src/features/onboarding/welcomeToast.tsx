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
import Svg, { Circle, Path } from 'react-native-svg';
import { create } from 'zustand';
import { easing } from '@/components/motion';
import { color, radius, shadow, text } from '@/theme';

/** Set when onboarding finishes; Home shows the toast once. */
export const useWelcomeToast = create<{ visible: boolean; show: () => void; hide: () => void }>()(
  (set) => ({
    visible: false,
    show: () => set({ visible: true }),
    hide: () => set({ visible: false }),
  }),
);

const SHOWN_FOR = 4500;

/** OBHome: "All set. You've got this 🌞" rising above the tab bar, then fading. */
export function WelcomeToast() {
  const { t } = useTranslation();
  const visible = useWelcomeToast((s) => s.visible);
  const hide = useWelcomeToast((s) => s.hide);
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!visible) return;
    // .toast: .8s with a little overshoot, after 1.2s
    if (!reduceMotion) {
      p.set(withDelay(1200, withTiming(1, { duration: 800, easing: easing('press') })));
    }
    const timer = setTimeout(hide, SHOWN_FOR + 1200);
    return () => clearTimeout(timer);
  }, [visible, hide, p, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ translateY: (1 - p.get()) * 24 }, { scale: 0.94 + p.get() * 0.06 }],
  }));

  if (!visible) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.toast, style]}
      >
        <View style={styles.sun}>
          <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
            <Circle cx={12} cy={12} r={4} fill={color.orbButter} />
            <Path
              d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
              stroke={color.insightIcon}
              strokeWidth={1.9}
              strokeLinecap="round"
            />
          </Svg>
        </View>
        <Text style={styles.label}>{t('home.welcomeToast')}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 107pt from the bottom: just above the tab bar.
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 107, alignItems: 'center' },
  toast: {
    height: 52,
    paddingLeft: 8,
    paddingRight: 20,
    borderRadius: radius.pill,
    backgroundColor: color.glass,
    boxShadow: shadow.nav,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sun: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.insight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...text.label, color: color.ink },
});
