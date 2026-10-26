import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { categories, type CategoryId, color, font } from './theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 200;
const R = 78;
const SW = 22;
const GAP = 6;
const C = 2 * Math.PI * R;

// One arc: a full-length dash pushed off by its offset, so animating the offset
// "draws" the arc from its start angle.
function Segment({ length, startAngle, tint, progress }: { length: number; startAngle: number; tint: string; progress: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: C - length * progress.value,
  }));
  return (
    <G rotation={startAngle} origin={`${SIZE / 2}, ${SIZE / 2}`}>
      <AnimatedCircle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        fill="none"
        stroke={tint}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeDasharray={`${C} ${C}`}
        animatedProps={animatedProps}
      />
    </G>
  );
}

type Props = { items: [CategoryId, number][]; label: string; runKey: number };

export function Donut({ items, label, runKey }: Props) {
  const reduceMotion = useReducedMotion();
  const total = items.reduce((sum, [, v]) => sum + v, 0);
  const progresses = [useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0)];

  useEffect(() => {
    progresses.forEach((p, i) => {
      if (reduceMotion) {
        p.value = 1;
        return;
      }
      p.value = 0;
      p.value = withDelay(200 + i * 70, withTiming(1, { duration: 900, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, runKey, reduceMotion]);

  let cum = 0;
  const segments = items.map(([id, v], i) => {
    const len = (v / total) * C;
    const seg = {
      id,
      length: Math.max(len - SW - GAP, 0.01),
      // -90° starts at 12 o'clock; skip half a cap and half a gap.
      startAngle: -90 + ((cum + SW / 2 + GAP / 2) / C) * 360,
      progress: progresses[i],
    };
    cum += len;
    return seg;
  });

  const whole = Math.round(total / 100).toLocaleString('en-US');
  const a11y = 'Donut chart: ' + items.map(([id, v]) => `${categories[id].name} ${Math.round((v / total) * 100)}%`).join(', ');

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={a11y} style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={color.track} strokeWidth={SW} opacity={0.6} />
        {segments.map((s) => (
          <Segment key={s.id} length={s.length} startAngle={s.startAngle} tint={categories[s.id].color} progress={s.progress} />
        ))}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.total}>
          <Text style={styles.symbol}>₾</Text>
          {whole}
        </Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignSelf: 'center' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  total: { fontSize: 30, fontFamily: font.extrabold, color: color.ink, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  symbol: { fontSize: 18, fontFamily: font.semibold, color: color.subtle },
  label: { marginTop: 2, fontSize: 13, fontFamily: font.semibold, color: color.muted },
});
