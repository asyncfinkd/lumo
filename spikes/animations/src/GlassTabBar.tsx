import { type ComponentRef, type RefObject, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Press } from './Press';
import { color, springs } from './theme';

export type Tab = 'home' | 'insights' | 'budgets' | 'profile';
export type BlurTarget = RefObject<ComponentRef<typeof View> | null>;

const SLOTS: (Tab | 'add')[] = ['home', 'insights', 'add', 'budgets', 'profile'];
const LABELS: Record<Tab, string> = { home: 'Home', insights: 'Insights', budgets: 'Budgets', profile: 'Profile' };
const PILL_W = 56;

function Icon({ tab, tint }: { tab: Tab; tint: string }) {
  const common = { stroke: tint, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {tab === 'home' && (
        <Path {...common} fill={tint} fillOpacity={0.22} d="M4 10.5 12 4l8 6.5V19a2 2 0 0 1-2 2h-3.5v-5h-5v5H6a2 2 0 0 1-2-2z" />
      )}
      {tab === 'insights' && (
        <>
          <Path {...common} fill={tint} fillOpacity={0.22} d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z" />
          <Path {...common} d="M15 3.8A8.5 8.5 0 0 1 20.2 9H15z" />
        </>
      )}
      {tab === 'budgets' && (
        <>
          <Rect {...common} fill={tint} fillOpacity={0.22} x={3.5} y={6.5} width={17} height={13} rx={4} />
          <Path {...common} d="M16 13h1.5M6.5 6.5 15 3.8a1.5 1.5 0 0 1 2 1.4v1.3" />
        </>
      )}
      {tab === 'profile' && (
        <>
          <Circle {...common} fill={tint} fillOpacity={0.22} cx={12} cy={8.5} r={4} />
          <Path {...common} d="M4.5 20c1.5-3.4 4.3-5 7.5-5s6 1.6 7.5 5" />
        </>
      )}
    </Svg>
  );
}

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
  onAdd: () => void;
  // Android blurs only what's inside this BlurTargetView (expo-blur SDK 58).
  blurTarget: BlurTarget;
};

export function GlassTabBar({ active, onChange, onAdd, blurTarget }: Props) {
  const [slotW, setSlotW] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (!slotW) return;
    const target = SLOTS.indexOf(active) * slotW + (slotW - PILL_W) / 2;
    x.value = x.value === 0 ? target : withSpring(target, springs.thumb);
  }, [active, slotW, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      <BlurView
        intensity={40}
        tint="systemUltraThinMaterialLight"
        blurTarget={blurTarget}
        blurMethod="dimezisBlurViewSdk31Plus"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glass} />
      <View
        style={styles.row}
        onLayout={(e) => setSlotW((e.nativeEvent.layout.width - 12) / SLOTS.length)}
      >
        {slotW > 0 && <Animated.View style={[styles.pill, pill]} />}
        {SLOTS.map((slot) =>
          slot === 'add' ? (
            <View key={slot} style={styles.slot}>
              <Press haptic accessibilityRole="button" accessibilityLabel="Add transaction" onPress={onAdd} style={styles.fab}>
                <Svg width={26} height={26} viewBox="0 0 24 24">
                  <Path d="M12 5.5v13M5.5 12h13" stroke={color.ink} strokeWidth={2.4} strokeLinecap="round" />
                </Svg>
              </Press>
            </View>
          ) : (
            <View key={slot} style={styles.slot}>
              <Press
                accessibilityRole="tab"
                accessibilityLabel={LABELS[slot]}
                accessibilityState={{ selected: active === slot }}
                onPress={() => onChange(slot)}
                style={styles.tab}
              >
                <Icon tab={slot} tint={active === slot ? color.accentDeep : 'rgba(43,37,34,0.5)'} />
              </Press>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 25,
    height: 68,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#C8916A',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
  },
  glass: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 6 },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill: {
    position: 'absolute',
    left: 6,
    top: 12,
    width: PILL_W,
    height: 44,
    borderRadius: 999,
    backgroundColor: color.accentSoft,
  },
  tab: { width: PILL_W, height: 44, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: color.accent,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
  },
});
