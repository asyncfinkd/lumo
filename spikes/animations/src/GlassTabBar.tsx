import { type ComponentRef, type RefObject, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PlusIcon, TabIcon } from './Icons';
import { ease } from './motion';
import { Press } from './Press';
import { color, shadow } from './theme';

export type Tab = 'home' | 'insights' | 'budgets' | 'profile';
export type BlurTarget = RefObject<ComponentRef<typeof View> | null>;

const SLOTS: (Tab | 'add')[] = ['home', 'insights', 'add', 'budgets', 'profile'];
const LABELS: Record<Tab, string> = { home: 'Home', insights: 'Insights', budgets: 'Budgets', profile: 'Profile' };
const PILL_W = 56;
const PAD = 6;

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
  onAdd: () => void;
  // Android blurs only what's inside this BlurTargetView (expo-blur SDK 58).
  blurTarget: BlurTarget;
};

// nav: 68px content + 6px padding (CSS content-box, so 80px tall), 24px from
// the sides, 25px from the bottom.
export function GlassTabBar({ active, onChange, onAdd, blurTarget }: Props) {
  const [slotW, setSlotW] = useState(0);
  const x = useSharedValue(-1);

  useEffect(() => {
    if (!slotW) return;
    const target = SLOTS.indexOf(active) * slotW + (slotW - PILL_W) / 2;
    x.value = x.value < 0 ? target : withTiming(target, { duration: 450, easing: ease.thumb });
  }, [active, slotW, x]);

  const pill = useAnimatedStyle(() => ({ opacity: x.value < 0 ? 0 : 1, transform: [{ translateX: Math.max(x.value, 0) }] }));

  return (
    <View style={styles.nav} accessibilityRole="tablist">
      <View style={styles.clip}>
        {/* backdrop-filter: blur(30px); no tint, the 72% white layer is the design's. */}
        <BlurView
          intensity={100}
          blurTarget={blurTarget}
          blurMethod="dimezisBlurViewSdk31Plus"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.glass} />
      </View>
      <View style={styles.row} onLayout={(e) => setSlotW((e.nativeEvent.layout.width - PAD * 2) / SLOTS.length)}>
        <Animated.View style={[styles.pill, pill]} />
        {SLOTS.map((slot) => (
          <View key={slot} style={styles.slot}>
            {slot === 'add' ? (
              <Press haptic accessibilityRole="button" accessibilityLabel="Add transaction" onPress={onAdd} style={styles.fab}>
                <PlusIcon color={color.ink} />
              </Press>
            ) : (
              <Press
                accessibilityRole="tab"
                accessibilityLabel={LABELS[slot]}
                accessibilityState={{ selected: active === slot }}
                onPress={() => onChange(slot)}
                style={styles.tab}
              >
                <TabIcon name={slot} color={active === slot ? color.accentDeep : color.inactive} />
              </Press>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 25,
    height: 80,
    borderRadius: 999,
    boxShadow: shadow.nav,
  },
  clip: { ...StyleSheet.absoluteFill, borderRadius: 999, overflow: 'hidden' },
  glass: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,0.72)' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: PAD },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill: {
    position: 'absolute',
    left: PAD,
    top: (80 - 44) / 2,
    width: PILL_W,
    height: 44,
    borderRadius: 999,
    backgroundColor: color.accentSoft,
  },
  tab: { width: PILL_W, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.accent,
    boxShadow: shadow.fab,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
