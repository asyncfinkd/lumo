import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  type SharedValue,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { type CurrencyCode, currencies, formatMoney, percent } from '@/domain/money';
import { color, duration, text } from '@/theme';
import { easing } from './motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 200;
const R = 78;
const STROKE = 22;
const GAP = 6;
const C = 2 * Math.PI * R;
/** The design draws up to six categories. */
const MAX_SEGMENTS = 6;
/** Room a slot needs: both round caps, the gap and a sliver of arc. */
const MIN_SLOT = STROKE + GAP + 4;

/**
 * How much of the ring each share gets. Round caps make every arc at least
 * STROKE long, so a small share gets MIN_SLOT and the rest is split by size —
 * otherwise its cap spills into the next category.
 */
export function slotLengths(values: readonly number[]): number[] {
  const pinned = values.map(() => false);
  for (;;) {
    const free = C - pinned.filter(Boolean).length * MIN_SLOT;
    const freeTotal = values.reduce((sum, v, i) => (pinned[i] ? sum : sum + v), 0);
    const slots = values.map((v, i) =>
      pinned[i] ? MIN_SLOT : freeTotal > 0 ? (v / freeTotal) * free : 0,
    );
    let changed = false;
    slots.forEach((slot, i) => {
      if (!pinned[i] && slot < MIN_SLOT) {
        pinned[i] = true;
        changed = true;
      }
    });
    if (!changed) return slots;
  }
}

// One arc. Moving the offset of a full-length dash draws it from its start.
function Segment({
  length,
  startAngle,
  tint,
  progress,
}: {
  length: number;
  startAngle: number;
  tint: string;
  progress: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: C - Math.max(length * progress.get(), 0.01),
    strokeOpacity: Math.min(progress.get() * 2, 1),
  }));
  return (
    <G rotation={startAngle} origin={`${SIZE / 2}, ${SIZE / 2}`}>
      <AnimatedCircle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        fill="none"
        stroke={tint}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${C} ${C}`}
        animatedProps={animatedProps}
      />
    </G>
  );
}

type Props = {
  /** Largest first, at most six. */
  items: readonly { key: string; label: string; chart: string; minor: number }[];
  currency: CurrencyCode;
  /** Under the total: "spent this month". */
  label: string;
  replayKey?: number;
};

/** Insights donut: one arc per category drawing in, the total in the middle. */
export function Donut({ items, currency, label, replayKey = 0 }: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const shown = items.filter((item) => item.minor > 0).slice(0, MAX_SEGMENTS);
  const total = shown.reduce((sum, item) => sum + item.minor, 0);

  // A fixed number of hooks, one per possible segment.
  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);
  const p4 = useSharedValue(0);
  const p5 = useSharedValue(0);
  const progress = [p0, p1, p2, p3, p4, p5];

  useEffect(() => {
    [p0, p1, p2, p3, p4, p5].forEach((p, i) => {
      if (reduceMotion) {
        p.set(1);
        return;
      }
      p.set(0);
      p.set(
        withDelay(
          200 + i * duration.donutStagger,
          withTiming(1, { duration: duration.donutSegment, easing: easing('rise') }),
        ),
      );
    });
  }, [items, replayKey, reduceMotion, p0, p1, p2, p3, p4, p5]);

  // Each arc starts where the previous one ended.
  const segments: {
    key: string;
    chart: string;
    length: number;
    startAngle: number;
    progress: SharedValue<number>;
  }[] = [];
  const slots = slotLengths(shown.map((item) => item.minor));
  let cum = 0;
  for (const [i, item] of shown.entries()) {
    const len = slots[i]!;
    segments.push({
      key: item.key,
      chart: item.chart,
      length: Math.max(len - STROKE - GAP, 0.01),
      // -90° starts at 12 o'clock; skip half a cap and half a gap.
      startAngle: -90 + ((cum + STROKE / 2 + GAP / 2) / C) * 360,
      progress: progress[i]!,
    });
    cum += len;
  }

  const parts = shown.map((item) => `${item.label} ${percent(item.minor, total)}%`).join(', ');
  const wholeTotal = formatMoney(
    Math.round(total / 10 ** currencies[currency].minorUnits) *
      10 ** currencies[currency].minorUnits,
    currency,
    { decimals: 'none' },
  );

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${t('insights.chart', { parts })}. ${wholeTotal} ${label}`}
      style={styles.wrap}
    >
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color.donutTrack}
          strokeWidth={STROKE}
        />
        {segments.map((s) => (
          <Segment
            key={s.key}
            length={s.length}
            startAngle={s.startAngle}
            tint={s.chart}
            progress={s.progress}
          />
        ))}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.total}>
          <Text style={styles.symbol}>{currencies[currency].symbol}</Text>
          {wholeTotal.replace(currencies[currency].symbol, '')}
        </Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  total: { ...text.total, color: color.ink },
  symbol: { fontFamily: text.subtitle.fontFamily, fontSize: 18, color: color.subtle },
  label: { ...text.meta, color: color.muted },
});
