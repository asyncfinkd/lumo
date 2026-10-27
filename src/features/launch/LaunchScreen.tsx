import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle } from 'react-native-svg';
import { Orbs } from '@/components/Backdrop';
import { LockIcon } from '@/components/Icons';
import { color, fontFamily, gradient, shadow } from '@/theme';

/** One loop of the coin, the breathing tile and the halo (Splash board). */
const LOOP = 2600;
/** Shown at least this long, so it reads as a moment instead of a flash. */
const MIN_VISIBLE = 1000;
const FADE_OUT = 300;
const TILE = 120;
/** The back coin comes in from (−148, 130) in the 1024 icon grid. */
const FROM = { x: (-148 * TILE) / 1024, y: (130 * TILE) / 1024 };

/** A value going 0 → 1 → 0 over one loop, forever (or holding at 1 with Reduce Motion). */
function usePulse(reduceMotion: boolean, period = LOOP): SharedValue<number> {
  const v = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    const half = { duration: period / 2, easing: Easing.inOut(Easing.ease) };
    v.set(withRepeat(withSequence(withTiming(1, half), withTiming(0, half)), -1));
  }, [reduceMotion, period, v]);
  return v;
}

/**
 * Splash ("Loading screen — app launch"): the Lumo tile breathing in a warm
 * halo while the back coin slides in and out, the name, three dots and
 * "Everything stays on this phone". Covers the app while the database and
 * profile load, then fades away; `onGone` unmounts it.
 */
export function LaunchScreen({
  done,
  onShown,
  onGone,
}: {
  /** The app underneath is ready. */
  done: boolean;
  /** Drawn for the first time: the native splash can go. */
  onShown: () => void;
  onGone: () => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [minPassed, setMinPassed] = useState(false);

  const breathe = usePulse(reduceMotion);
  const halo = usePulse(reduceMotion);
  const coin = useSharedValue(reduceMotion ? 1 : 0);
  const fade = useSharedValue(1);

  useEffect(() => {
    const timer = setTimeout(() => setMinPassed(true), reduceMotion ? 0 : MIN_VISIBLE);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    // .coin: comes in by 45%, rests until 78%, leaves by 100%.
    const ease = Easing.bezier(0.45, 0, 0.25, 1);
    coin.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: LOOP * 0.45, easing: ease }),
          withTiming(1, { duration: LOOP * 0.33 }),
          withTiming(0, { duration: LOOP * 0.22, easing: ease }),
        ),
        -1,
      ),
    );
  }, [reduceMotion, coin]);

  useEffect(() => {
    if (!done || !minPassed) return;
    fade.set(
      withTiming(0, { duration: reduceMotion ? 0 : FADE_OUT }, (finished) => {
        if (finished) scheduleOnRN(onGone);
      }),
    );
  }, [done, minPassed, reduceMotion, fade, onGone]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const tileStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.get() * 0.035 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + halo.get() * 0.45,
    transform: [{ scale: 0.94 + halo.get() * 0.12 }],
  }));
  const coinStyle = useAnimatedStyle(() => ({
    // Visible from 28% of the loop: most of the way in.
    opacity: Math.min(1, coin.get() / 0.62),
    transform: [
      { translateX: FROM.x * (1 - coin.get()) },
      { translateY: FROM.y * (1 - coin.get()) },
    ],
  }));

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('launch.opening')}
      onLayout={onShown}
      style={[StyleSheet.absoluteFill, styles.root, rootStyle]}
    >
      <Orbs />
      <View style={styles.main}>
        <View style={styles.tileWrap}>
          <Animated.View style={[styles.halo, haloStyle]} />
          <Animated.View style={[styles.tile, tileStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, coinStyle]}>
              <Svg width={TILE} height={TILE} viewBox="0 0 1024 1024">
                <Circle cx={590} cy={448} r={190} fill={color.iconInk} fillOpacity={0.45} />
              </Svg>
            </Animated.View>
            <Svg width={TILE} height={TILE} viewBox="0 0 1024 1024">
              <Circle cx={442} cy={578} r={190} fill={color.iconInk} />
            </Svg>
          </Animated.View>
        </View>

        <Rise delay={100}>
          <Text style={styles.name}>{Constants.expoConfig?.name}</Text>
        </Rise>
        <Rise delay={200}>
          <Text style={styles.tagline}>{t('onboarding.welcome.title')}</Text>
        </Rise>

        <View style={styles.dots}>
          {[0, 150, 300].map((delay) => (
            <Dot key={delay} delay={delay} reduceMotion={reduceMotion} />
          ))}
        </View>
      </View>

      <Rise delay={400} style={styles.footer}>
        <LockIcon color={color.subtle} />
        <Text style={styles.footerText}>{t('launch.private')}</Text>
      </Rise>
    </Animated.View>
  );
}

/** The design's .rise: fade in while moving up 10pt, after `delay` ms. */
function Rise({
  delay,
  style,
  children,
}: {
  delay: number;
  style?: object;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const own = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    own.set(
      withDelay(delay, withTiming(1, { duration: 900, easing: Easing.bezier(0.22, 1, 0.36, 1) })),
    );
  }, [reduceMotion, delay, own]);
  const animated = useAnimatedStyle(() => ({
    opacity: own.get(),
    transform: [{ translateY: (1 - own.get()) * 10 }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** One of the three loading dots: brightens and grows in turn. */
function Dot({ delay, reduceMotion }: { delay: number; reduceMotion: boolean }) {
  const v = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    v.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 480, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 480, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 240 }),
          ),
          -1,
        ),
      ),
    );
  }, [delay, reduceMotion, v]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.25 + v.get() * 0.75,
    transform: [{ scale: 0.8 + v.get() * 0.2 }],
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  root: { backgroundColor: color.bg, zIndex: 10 },
  main: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  tileWrap: { width: TILE, height: TILE },
  halo: {
    position: 'absolute',
    left: -60,
    top: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundImage: gradient.launchHalo,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 27,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: color.iconCream,
    boxShadow: shadow.launchTile,
  },
  name: {
    marginTop: 30,
    fontFamily: fontFamily.extrabold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1,
    textAlign: 'center',
    color: color.ink,
  },
  tagline: {
    marginTop: 4,
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: color.muted,
  },
  dots: { marginTop: 28, flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.accent },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: { fontFamily: fontFamily.bold, fontSize: 13, color: color.subtle },
});
