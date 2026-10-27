import { useEffect, useMemo } from 'react';
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
import { sparkPath } from './sparkPath';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The Came in / Went out cards' colors (Main).
const TINTS = {
  in: { tint: color.cameInLine, areaOpacity: 0.28 },
  out: { tint: color.wentOutLine, areaOpacity: 0.3 },
} as const;

type Props = {
  kind: keyof typeof TINTS;
  /** The running total for each day so far, oldest first. */
  values: readonly number[];
  replayKey?: number;
};

/**
 * The trend line on Came in / Went out: how the period's total grew, day by
 * day. ".draw" strokes it in, ".fadein" fills the area.
 */
export function Sparkline({ kind, values, replayKey = 0 }: Props) {
  const reduceMotion = useReducedMotion();
  const line = { ...TINTS[kind], ...useMemo(() => sparkPath(values), [values]) };
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
    // Fills its box (60×30 at most, see FlowCard); on a narrow screen it shrinks
    // with its proportions instead of spilling out of the card.
    <Svg width="100%" height="100%" viewBox="0 0 60 30" accessible={false}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor={line.tint} stopOpacity={line.areaOpacity} />
          <Stop offset={1} stopColor={line.tint} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <AnimatedPath d={line.area} fill={`url(#${gradientId})`} animatedProps={areaProps} />
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
