import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { easing } from '../motion';

// The Welcome illustration from the design (OBWelcome), drawn in three layers so
// the sun can rise behind the jar: glow, sun, then ground + jar + sparkles.
// Artwork colors live here, not in the theme.

const W = 260;
const H = 230;

function Sparkle({ d, fill, delay }: { d: string; fill: string; delay: number }) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    // .twinkle: scale .7 and 60% opacity halfway through 3.2s, forever.
    t.set(
      withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, true),
      ),
    );
  }, [delay, reduceMotion, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.get() * 0.4,
    transform: [{ scale: 1 - t.get() * 0.3 }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, style]}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Path d={d} fill={fill} />
      </Svg>
    </Animated.View>
  );
}

export function SunriseJar({ accessibilityLabel }: { accessibilityLabel: string }) {
  const reduceMotion = useReducedMotion();
  const rise = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    // .sunrise: up 34pt from 40% opacity over 1.8s, after .2s
    rise.set(withDelay(200, withTiming(1, { duration: 1800, easing: easing('rise') })));
  }, [rise, reduceMotion]);

  const sun = useAnimatedStyle(() => ({
    opacity: 0.4 + rise.get() * 0.6,
    transform: [{ translateY: (1 - rise.get()) * 34 }],
  }));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width: W, height: H }}
    >
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id="wGlow" cx="0.5" cy="0.45" r="0.5">
            <Stop offset="0" stopColor="#FFE3A3" stopOpacity={0.9} />
            <Stop offset="1" stopColor="#FFE3A3" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={130} cy={104} r={112} fill="url(#wGlow)" />
      </Svg>

      <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, sun]}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <LinearGradient id="wSun" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFDB8E" />
              <Stop offset="1" stopColor="#FFBF85" />
            </LinearGradient>
          </Defs>
          <G stroke="#FFD58A" strokeWidth={7} strokeLinecap="round">
            <Path d="M130 14v10M64 44l7 7M196 44l-7 7M42 104h10M208 104h10M74 158l6-6M186 158l-6-6" />
          </G>
          <Circle cx={130} cy={96} r={58} fill="url(#wSun)" />
        </Svg>
      </Animated.View>

      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        <Defs>
          <ClipPath id="wJar">
            <Rect x={88} y={118} width={84} height={92} rx={32} />
          </ClipPath>
        </Defs>
        <Ellipse cx={130} cy={212} rx={128} ry={26} fill="#F6E4D3" />
        <Rect x={110} y={94} width={40} height={18} rx={9} fill="#D7AF86" />
        <Rect x={114} y={97} width={32} height={4} rx={2} fill="#E6C6A2" />
        <Rect x={100} y={109} width={60} height={13} rx={6.5} fill="#F3E7DB" />
        <Rect x={88} y={118} width={84} height={92} rx={32} fill="#FFFFFF" opacity={0.94} />
        <G clipPath="url(#wJar)">
          <Rect x={80} y={168} width={100} height={50} fill="#FFE2A3" />
          <Circle cx={104} cy={166} r={11} fill="#FFD27A" />
          <Circle cx={128} cy={162} r={11} fill="#F9C463" />
          <Circle cx={152} cy={166} r={11} fill="#FFD27A" />
          <Circle cx={114} cy={186} r={11} fill="#F9C463" />
          <Circle cx={140} cy={186} r={11} fill="#FFDA8C" />
          <Circle cx={100} cy={204} r={11} fill="#FFDA8C" />
          <Circle cx={126} cy={206} r={11} fill="#F9C463" />
          <Circle cx={152} cy={204} r={11} fill="#FFD27A" />
          <Circle cx={125} cy={158} r={3} fill="#FFF3D0" />
        </G>
        <Rect x={100} y={130} width={8} height={26} rx={4} fill="#FFFFFF" />
        <Circle cx={104} cy={164} r={3.5} fill="#FFFFFF" opacity={0.85} />
      </Svg>

      <Sparkle
        d="M206 150c1 6 3.5 8.5 9.5 9.5-6 1-8.5 3.5-9.5 9.5-1-6-3.5-8.5-9.5-9.5 6-1 8.5-3.5 9.5-9.5z"
        fill="#F6B8A0"
        delay={0}
      />
      <Sparkle
        d="M54 134c.8 4.5 2.6 6.3 7 7-4.4.8-6.2 2.6-7 7-.8-4.4-2.6-6.2-7-7 4.4-.7 6.2-2.5 7-7z"
        fill="#F5CF7A"
        delay={1400}
      />
    </View>
  );
}
