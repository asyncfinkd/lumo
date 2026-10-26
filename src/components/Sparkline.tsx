import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { color } from '@/theme';
import { easing } from './motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The two trend lines from the design's Came in / Went out cards, with their
// measured lengths (for drawing them in).
const LINES = {
  in: {
    d: 'M3 24 C12 24 16 21 24 20 S36 14 42 10 S52 6 57 6',
    length: 58.15,
    tint: color.cameInLine,
    areaOpacity: 0.28,
  },
  out: {
    d: 'M3 22 C10 21 14 15 22 15 S34 18 40 13 S51 8 57 8',
    length: 57.44,
    tint: color.wentOutLine,
    areaOpacity: 0.3,
  },
} as const;

type Props = { kind: keyof typeof LINES; replayKey?: number };

/** A small decorative trend line: ".draw" strokes it in, ".fadein" fills the area. */
export function Sparkline({ kind, replayKey = 0 }: Props) {
  const reduceMotion = useReducedMotion();
  const line = LINES[kind];
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const fade = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      draw.set(1);
      fade.set(1);
      return;
    }
    draw.set(0);
    fade.set(0);
    draw.set(withDelay(600, withTiming(1, { duration: 900, easing: easing('rise') })));
    fade.set(withDelay(900, withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) })));
  }, [replayKey, reduceMotion, draw, fade]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: line.length * (1 - draw.get()),
  }));
  const areaProps = useAnimatedProps(() => ({ opacity: fade.get() }));
  const gradientId = `spark-${kind}`;

  return (
    <Svg width={60} height={30} viewBox="0 0 60 30" accessible={false}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor={line.tint} stopOpacity={line.areaOpacity} />
          <Stop offset={1} stopColor={line.tint} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <AnimatedPath
        d={`${line.d} L57 30 L3 30 Z`}
        fill={`url(#${gradientId})`}
        animatedProps={areaProps}
      />
      <AnimatedPath
        d={line.d}
        stroke={line.tint}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={`${line.length} ${line.length}`}
        animatedProps={lineProps}
      />
    </Svg>
  );
}
