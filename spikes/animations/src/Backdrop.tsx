import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { color } from './theme';

// The design blurs two solid ellipses by 70px. A radial gradient over the
// ellipse grown by 2σ on each side gives the same soft falloff without a blur.
const BLUR = 140;

function Orb({ w, h, fill, opacity, id }: { w: number; h: number; fill: string; opacity: number; id: string }) {
  const rx = w / 2 + BLUR;
  const ry = h / 2 + BLUR;
  // Where the original edge sits inside the grown ellipse (≈ 50% opacity point).
  const edge = (w / 2) / rx;
  return (
    <Svg width={rx * 2} height={ry * 2}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset={0} stopColor={fill} stopOpacity={opacity} />
          <Stop offset={Math.max(edge - 0.32, 0.05)} stopColor={fill} stopOpacity={opacity * 0.96} />
          <Stop offset={edge} stopColor={fill} stopOpacity={opacity * 0.5} />
          <Stop offset={Math.min(edge + 0.22, 0.92)} stopColor={fill} stopOpacity={opacity * 0.08} />
          <Stop offset={1} stopColor={fill} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={rx} cy={ry} rx={rx} ry={ry} fill={`url(#${id})`} />
    </Svg>
  );
}

// ".orb": drift 20px right, 18px down over 30s and back, forever.
function useDrift(reverse: boolean) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(reverse ? 0.53 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(withTiming(reverse ? 0 : 1, { duration: 30000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [reduceMotion, reverse, t]);
  return useAnimatedStyle(() => ({ transform: [{ translateX: t.value * 20 }, { translateY: t.value * 18 }] }));
}

export function Orbs() {
  const butter = useDrift(false);
  const peach = useDrift(true);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', left: -110 - BLUR, top: -40 - BLUR }, butter]}>
        <Orb id="butter" w={380} h={360} fill={color.orbButter} opacity={0.7} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', right: -130 - BLUR, bottom: -60 - BLUR }, peach]}>
        <Orb id="peach" w={400} h={380} fill={color.orbPeach} opacity={0.55} />
      </Animated.View>
    </View>
  );
}

// Fades the scrolling content into the background behind the tab bar.
export function BottomFade() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 116,
        backgroundImage: 'linear-gradient(180deg, rgba(251,247,242,0) 0%, rgba(251,247,242,0.8) 45%, #FBF7F2 100%)',
      }}
    />
  );
}
