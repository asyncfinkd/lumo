import { type ReactNode, useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { FullWindowOverlay } from 'react-native-screens';
import { create } from 'zustand';
import { color, radius, shadow, text } from '@/theme';
import { CheckIcon, InfoIcon } from './Icons';
import { easing } from './motion';

export type ToastTone = 'good' | 'error';

export type ToastInput = {
  /** `good`: above the tab bar ("Photo updated"). `error`: at the top, over sheets and the keyboard. */
  tone: ToastTone;
  message: string;
  /** In place of the tone's round icon (the welcome sun, the jar coin). */
  icon?: ReactNode;
  /** Wait before rising, so it follows an animation (the coin landing). */
  delay?: number;
  /** How long it stays up once it has risen. */
  duration?: number;
};

type Shown = ToastInput & { key: number };

const SHOWN_FOR = 3000;

let nextKey = 0;
export const useToast = create<{ toast: Shown | null; hide: (key: number) => void }>()((set) => ({
  toast: null,
  // A newer toast may already have taken its place.
  hide: (key) => set((s) => (s.toast?.key === key ? { toast: null } : s)),
}));

/** Shows one toast; a newer one replaces it. Mounted once, by ToastHost at the root. */
export function showToast(toast: ToastInput): void {
  useToast.setState({ toast: { ...toast, key: ++nextKey } });
}

/**
 * The one place toasts are drawn. On iOS sheets are native modals above the
 * app's root view, so the toast goes in a window-wide overlay to show over them.
 */
export function ToastHost() {
  const toast = useToast((s) => s.toast);
  if (!toast) return null;
  const body = <ToastView key={toast.key} toast={toast} />;
  return Platform.OS === 'ios' ? <FullWindowOverlay>{body}</FullWindowOverlay> : body;
}

function ToastView({ toast }: { toast: Shown }) {
  const { key, tone, message, icon, delay = 0, duration = SHOWN_FOR } = toast;
  const hide = useToast((s) => s.hide);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(reduceMotion ? 1 : 0);
  const top = tone === 'error';

  useEffect(() => {
    // .toast: .7s with a little overshoot
    if (!reduceMotion) {
      p.set(withDelay(delay, withTiming(1, { duration: 700, easing: easing('switch') })));
    }
    const timer = setTimeout(() => hide(key), delay + duration);
    return () => clearTimeout(timer);
  }, [key, delay, duration, hide, p, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ translateY: (1 - p.get()) * (top ? -16 : 16) }, { scale: 0.94 + p.get() * 0.06 }],
  }));

  return (
    <View pointerEvents="none" style={[styles.wrap, top ? { top: insets.top + 8 } : styles.bottom]}>
      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion={top ? 'assertive' : 'polite'}
        style={[styles.toast, style]}
      >
        {icon ?? (
          <View
            style={[styles.tile, { backgroundColor: top ? color.dangerSoft : color.cameInTile }]}
          >
            {top ? <InfoIcon color={color.danger} /> : <CheckIcon color={color.good} />}
          </View>
        )}
        <Text style={styles.label}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  // 107pt from the bottom: just above the tab bar.
  bottom: { bottom: 107 },
  toast: {
    minHeight: 50,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 18,
    borderRadius: radius.pill,
    backgroundColor: color.toast,
    boxShadow: shadow.photoToast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tile: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...text.label, flexShrink: 1, color: color.ink, fontVariant: ['tabular-nums'] },
});
