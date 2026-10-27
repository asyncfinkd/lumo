import { type ComponentRef, type RefObject, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { BUDGETING } from '@/features/flags';
import { color, duration, radius, shadow, size } from '@/theme';
import { PlusIcon, TabIcon, type TabIconName } from './Icons';
import { easing } from './motion';
import { Press } from './Press';

export type Tab = TabIconName;
export type BlurTarget = RefObject<ComponentRef<typeof View> | null>;

// Budgets is off in phase 1 (features/flags.ts): Home, Insights, +, Profile.
const SLOTS: (Tab | 'add')[] = (['home', 'insights', 'add', 'budgets', 'profile'] as const).filter(
  (slot) => BUDGETING || slot !== 'budgets',
);
const PAD = 6;

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
  onAdd: () => void;
  /** Android blurs only what's inside this BlurTargetView (expo-blur). */
  blurTarget: BlurTarget;
};

/**
 * The design's glass tab bar: 80pt tall (68 + 6 padding, CSS content-box),
 * 24pt from the sides, 25pt from the bottom, with a sliding active pill and the
 * add button in the middle.
 */
export function GlassTabBar({ active, onChange, onAdd, blurTarget }: Props) {
  const { t } = useTranslation();
  const [slotWidth, setSlotWidth] = useState(0);
  const x = useSharedValue(-1);

  useEffect(() => {
    if (!slotWidth) return;
    const target = SLOTS.indexOf(active) * slotWidth + (slotWidth - size.tabItem.width) / 2;
    x.value =
      x.value < 0
        ? target
        : withTiming(target, { duration: duration.thumb, easing: easing('thumb') });
  }, [active, slotWidth, x]);

  const pill = useAnimatedStyle(() => ({
    opacity: x.value < 0 ? 0 : 1,
    transform: [{ translateX: Math.max(x.value, 0) }],
  }));

  return (
    <View style={styles.bar} accessibilityRole="tablist">
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
      <View
        style={styles.row}
        onLayout={(e) => setSlotWidth((e.nativeEvent.layout.width - PAD * 2) / SLOTS.length)}
      >
        <Animated.View style={[styles.pill, pill]} />
        {SLOTS.map((slot) => (
          <View key={slot} style={styles.slot}>
            {slot === 'add' ? (
              <Press haptic accessibilityLabel={t('tabs.add')} onPress={onAdd} style={styles.add}>
                <PlusIcon color={color.ink} />
              </Press>
            ) : (
              <Press
                accessibilityRole="tab"
                accessibilityLabel={t(`tabs.${slot}`)}
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
  bar: {
    position: 'absolute',
    left: size.tabBarInset,
    right: size.tabBarInset,
    bottom: size.tabBarBottom,
    height: size.tabBar,
    borderRadius: radius.pill,
    boxShadow: shadow.nav,
  },
  clip: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  glass: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: color.glass,
  },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: PAD },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill: {
    position: 'absolute',
    left: PAD,
    top: (size.tabBar - size.tabItem.height) / 2,
    width: size.tabItem.width,
    height: size.tabItem.height,
    borderRadius: radius.pill,
    backgroundColor: color.accentSoft,
  },
  tab: {
    width: size.tabItem.width,
    height: size.tabItem.height,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    width: size.fab,
    height: size.fab,
    borderRadius: size.fab / 2,
    backgroundColor: color.accent,
    boxShadow: shadow.fab,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
