import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { ease } from './motion';
import { categories, type CategoryId, color, font } from './theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 200;
const R = 78;
const SW = 22;
const GAP = 6;
const C = 2 * Math.PI * R;

// One arc. Animating the offset of a full-length dash "draws" it from its start,
// which matches the design's growing stroke-dasharray.
function Segment({ length, startAngle, tint, progress }: { length: number; startAngle: number; tint: string; progress: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: C - Math.max(length * progress.value, 0.01),
    strokeOpacity: Math.min(progress.value * 2, 1),
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
  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);
  const p4 = useSharedValue(0);
  const p5 = useSharedValue(0);
  const progresses = [p0, p1, p2, p3, p4, p5];

  useEffect(() => {
    [p0, p1, p2, p3, p4, p5].forEach((p, i) => {
      if (reduceMotion) {
        p.value = 1;
        return;
      }
      p.value = 0;
      // Drawn 200ms after mount, .6s cubic-bezier(.22,1,.36,1), 70ms apart.
      p.value = withDelay(200 + i * 70, withTiming(1, { duration: 600, easing: ease.rise }));
    });
  }, [items, runKey, reduceMotion, p0, p1, p2, p3, p4, p5]);

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
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={color.donutTrack} strokeWidth={SW} />
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
  wrap: { width: SIZE, height: SIZE },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 2 },
  total: { fontSize: 30, lineHeight: 36, fontFamily: font.extrabold, color: color.ink, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  symbol: { fontSize: 18, fontFamily: font.semibold, color: color.subtle },
  label: { fontSize: 13, fontFamily: font.semibold, color: color.muted },
});
