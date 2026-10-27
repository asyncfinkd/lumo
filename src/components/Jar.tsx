import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { JarTone } from '@/features/savings/savings';
import { color, fontFamily, jarColor } from '@/theme';

// The Jar board, drawn on its 200 × 240 grid and scaled to `size`. The liquid,
// coin and lid move as separate views, so every animation is a transform.

type Props = {
  /** 0–100. */
  pct: number;
  /** Width in points; the jar is 1.2× as tall. */
  size: number;
  tone: JarTone;
  /** The level it rises from after a drop (SavingsAdded). */
  from?: number;
  /** A coin falls in and the lid lifts (SavingsAdded). */
  drop?: boolean;
  /** The big "62%" on the jar; off on the small ones. */
  label?: boolean;
  /** Changes on every drop, so the same jar can drop again. */
  dropKey?: number;
  accessibilityLabel?: string;
};

/** The small sign after the number on the jar; the same in every language. */
const PERCENT = '%';
const W = 200;
const H = 240;
// The body: x 24, y 52, 152 × 178, rx 58.
const BODY = { x: 24, y: 52, w: 152, h: 178, r: 58 };
const WAVE_A = 'M-200 0 Q-150 9 -100 0 T0 0 T100 0 T200 0 T300 0 T400 0 V240 H-200 Z';
const WAVE_B = 'M-200 4 Q-150 -6 -100 4 T0 4 T100 4 T200 4 T300 4 T400 4 V240 H-200 Z';
const COINS = [
  [58, 212, 13],
  [86, 218, 13],
  [114, 214, 13],
  [142, 212, 13],
  [72, 196, 12],
  [100, 199, 12],
  [128, 195, 12],
] as const;
// Each sparkle with its box on the grid, so it grows around its own middle.
const SPARKS = [
  {
    d: 'M178 30c1.2 7 4 9.8 11 11-7 1.2-9.8 4-11 11-1.2-7-4-9.8-11-11 7-1.2 9.8-4 11-11z',
    box: [167, 30, 22, 22],
    at: 0,
  },
  {
    d: 'M18 70c.9 5 2.9 7 8 8-5 .9-7 2.9-8 8-.9-5-2.9-7-8-8 5-.9 7-2.9 8-8z',
    box: [10, 70, 16, 16],
    at: -600,
  },
  {
    d: 'M186 120c.8 4.4 2.5 6 6.8 6.8-4.3.8-6 2.5-6.8 6.8-.8-4.3-2.5-6-6.8-6.8 4.3-.8 6-2.4 6.8-6.8z',
    box: [179.2, 120, 13.6, 13.6],
    at: -1100,
  },
] as const;

/** Where the liquid's surface sits for a percent, on the 240 grid. */
const levelY = (pct: number) => (pct >= 100 ? 54 : 222 - 160 * (pct / 100));

export function Jar({
  pct: raw,
  size,
  tone,
  from,
  drop = false,
  label = true,
  dropKey = 0,
  accessibilityLabel,
}: Props) {
  const reduceMotion = useReducedMotion();
  const pct = Math.max(0, Math.min(100, raw));
  const s = size / W;
  const height = Math.round(size * 1.2);
  const colors = jarColor.tone[tone];
  const liquidY = levelY(pct);
  const rises = from !== undefined && from >= 0 && from !== pct && !reduceMotion;

  // .wave-a 5s and .wave-b 7s, forever.
  const waveA = useSharedValue(0);
  const waveB = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    const loop = (ms: number) =>
      withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false);
    waveA.set(loop(5000));
    waveB.set(loop(7000));
  }, [reduceMotion, waveA, waveB]);

  // .level: 1.1s after 1.3s; .coin: 1.1s after .35s; .lid-up 2.4s; .ripple .9s after 1.35s.
  const level = useSharedValue(0);
  const coin = useSharedValue(0);
  const lid = useSharedValue(0);
  const ripple = useSharedValue(0);
  useEffect(() => {
    if (rises) {
      level.set(1);
      level.set(
        withDelay(
          1300,
          withTiming(0, { duration: 1100, easing: Easing.bezier(0.34, 1.25, 0.64, 1) }),
        ),
      );
    } else {
      level.set(0);
    }
    if (!drop || reduceMotion) return;
    coin.set(0);
    coin.set(
      withDelay(350, withTiming(1, { duration: 1100, easing: Easing.bezier(0.55, 0, 0.75, 0.3) })),
    );
    const lidEase = Easing.bezier(0.34, 1.3, 0.64, 1);
    lid.set(0);
    lid.set(
      withSequence(
        withTiming(1, { duration: 430, easing: lidEase }),
        withTiming(1, { duration: 1250 }),
        withTiming(0, { duration: 720, easing: lidEase }),
      ),
    );
    ripple.set(0);
    ripple.set(withDelay(1350, withTiming(1, { duration: 900, easing: Easing.out(Easing.ease) })));
    // Each drop replays, even at the same percent.
  }, [dropKey, drop, rises, reduceMotion, level, coin, lid, ripple]);

  const fromOffset = rises ? (levelY(from!) - liquidY) * s : 0;
  const levelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: level.get() * fromOffset }],
  }));
  const waveAStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -waveA.get() * 200 * s }],
  }));
  const waveBStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (waveB.get() - 1) * 200 * s }],
  }));
  const fall = (liquidY - 10) * s;
  const coinStyle = useAnimatedStyle(() => {
    const p = coin.get();
    return {
      opacity: p === 0 || p === 1 ? 0 : p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1,
      transform: [{ translateY: -70 * s + p * (fall + 70 * s) }, { rotate: `${-20 + p * 50}deg` }],
    };
  });
  const lidStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: lid.get() * 34 * s },
      { translateY: lid.get() * -26 * s },
      { rotate: `${lid.get() * 14}deg` },
    ],
  }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: ripple.get() === 0 ? 0 : 0.9 * (1 - ripple.get()),
    transform: [{ scale: 0.2 + ripple.get() * 1.4 }],
  }));

  const at = (v: number) => v * s;
  const percentTop = ((pct > 55 ? Math.min(liquidY + 30, 170) : 128) / H) * height;

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height }}
    >
      <Svg width={size} height={height} viewBox={`0 0 ${W} ${H}`} style={StyleSheet.absoluteFill}>
        <Ellipse cx={100} cy={234} rx={78} ry={7} fill={jarColor.shadow} />
        <Rect
          x={BODY.x}
          y={BODY.y}
          width={BODY.w}
          height={BODY.h}
          rx={BODY.r}
          fill={jarColor.glass}
        />
      </Svg>

      {/* The liquid, clipped to the jar's body. */}
      <View
        style={{
          position: 'absolute',
          left: at(BODY.x),
          top: at(BODY.y),
          width: at(BODY.w),
          height: at(BODY.h),
          borderRadius: at(BODY.r),
          overflow: 'hidden',
        }}
      >
        <Animated.View style={[StyleSheet.absoluteFill, levelStyle]}>
          {[
            { d: WAVE_B, fill: colors.top, opacity: 0.6, style: waveBStyle },
            { d: WAVE_A, fill: colors.deep, opacity: 1, style: waveAStyle },
          ].map((wave) => (
            <Animated.View
              key={wave.d}
              style={[
                {
                  position: 'absolute',
                  left: at(-200 - BODY.x),
                  top: at(liquidY - 10 - BODY.y),
                },
                wave.style,
              ]}
            >
              <Svg width={at(600)} height={at(H)} viewBox={`-200 -10 600 ${H}`}>
                <Path d={wave.d} fill={wave.fill} opacity={wave.opacity} />
              </Svg>
            </Animated.View>
          ))}
          {pct > 8 ? (
            <Svg
              width={at(W)}
              height={at(H)}
              viewBox={`0 0 ${W} ${H}`}
              style={{ position: 'absolute', left: at(-BODY.x), top: at(-BODY.y) }}
            >
              <G fill={colors.coins} opacity={0.55}>
                {COINS.map(([cx, cy, r]) => (
                  <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
                ))}
              </G>
            </Svg>
          ) : null}
        </Animated.View>
        {drop && !reduceMotion ? (
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: at(74 - BODY.x),
                top: at(liquidY - 5 - BODY.y),
                width: at(52),
                height: at(10),
              },
              rippleStyle,
            ]}
          >
            <Svg width={at(52)} height={at(10)} viewBox="-1.5 -1.5 55 13">
              <Ellipse
                cx={26}
                cy={5}
                rx={26}
                ry={5}
                fill="none"
                stroke={jarColor.shine}
                strokeWidth={2.5}
              />
            </Svg>
          </Animated.View>
        ) : null}
      </View>

      <Svg width={size} height={height} viewBox={`0 0 ${W} ${H}`} style={StyleSheet.absoluteFill}>
        <Rect
          x={BODY.x}
          y={BODY.y}
          width={BODY.w}
          height={BODY.h}
          rx={BODY.r}
          fill="none"
          stroke={jarColor.rim}
          strokeWidth={3}
        />
        <Rect x={40} y={76} width={11} height={70} rx={5.5} fill={jarColor.shine} opacity={0.85} />
        <Circle cx={45.5} cy={160} r={5} fill={jarColor.shine} opacity={0.75} />
        <Rect x={50} y={40} width={100} height={18} rx={9} fill={jarColor.neck} />
      </Svg>

      {/* The lid turns around its middle, 100 / 28 on the grid. */}
      <Animated.View
        style={[
          { position: 'absolute', left: at(58), top: at(14), width: at(84), height: at(28) },
          lidStyle,
        ]}
      >
        <Svg width={at(84)} height={at(28)} viewBox="58 14 84 28">
          <Rect x={58} y={14} width={84} height={28} rx={12} fill={jarColor.lid} />
          <Rect x={64} y={19} width={72} height={6} rx={3} fill={jarColor.lidBand} />
        </Svg>
      </Animated.View>

      {drop && !reduceMotion ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', left: at(85), top: at(-5), width: at(30), height: at(30) },
            coinStyle,
          ]}
        >
          <Svg width={at(30)} height={at(30)} viewBox="85 -5 30 30">
            <Circle cx={100} cy={10} r={15} fill={jarColor.coin} />
            <Circle
              cx={100}
              cy={10}
              r={10.5}
              fill="none"
              stroke={jarColor.coinRing}
              strokeWidth={2.2}
            />
            <Rect x={97.5} y={4} width={5} height={12} rx={2.5} fill={jarColor.coinMark} />
          </Svg>
        </Animated.View>
      ) : null}

      {pct >= 100
        ? SPARKS.map((spark, i) => (
            <Spark
              key={spark.d}
              d={spark.d}
              box={spark.box}
              offset={spark.at}
              color={jarColor.sparks[i]!}
              s={s}
            />
          ))
        : null}

      {label ? (
        <Text
          accessible={false}
          style={[
            styles.percent,
            { top: percentTop, fontSize: 38 * s, lineHeight: 38 * s, letterSpacing: -1 * s },
          ]}
        >
          {Math.round(pct)}
          <Text style={[styles.sign, { fontSize: 20 * s }]}>{PERCENT}</Text>
        </Text>
      ) : null}
    </View>
  );
}

/** .spark: grows and fades, 1.8s, forever, each one out of step. */
function Spark({
  d,
  box: [x, y, w, h],
  offset,
  color,
  s,
}: {
  d: string;
  box: readonly [number, number, number, number];
  offset: number;
  color: string;
  s: number;
}) {
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    const half = { duration: 900, easing: Easing.inOut(Easing.ease) };
    p.set(
      withDelay(
        1800 + offset,
        withRepeat(withSequence(withTiming(1, half), withTiming(0, half)), -1),
      ),
    );
  }, [reduceMotion, offset, p]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.4 + p.get() * 0.6,
    transform: [{ scale: 0.6 + p.get() * 0.5 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: x * s, top: y * s, width: w * s, height: h * s },
        style,
      ]}
    >
      <Svg width={w * s} height={h * s} viewBox={`${x} ${y} ${w} ${h}`}>
        <Path d={d} fill={color} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  percent: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fontFamily.extrabold,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  sign: { fontFamily: fontFamily.extrabold, color: jarColor.percentSign },
});
