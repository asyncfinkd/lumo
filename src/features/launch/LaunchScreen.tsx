import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
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
import { Orbs } from '@/components/Backdrop';
import { LockIcon } from '@/components/Icons';
import { KeptCoin, KeptK } from '@/components/KeptMark';
import { color, fontFamily, gradient, shadow } from '@/theme';

/** One loop of the coin, the breathing tile and the halo (Splash board). */
const LOOP = 3200;
/** Shown at least this long, so it reads as a moment instead of a flash. */
const MIN_VISIBLE = 1000;
const FADE_OUT = 300;
const TILE = 120;
/** 1024 icon-grid units in points: the coin comes in from 300 to the right. */
const UNIT = TILE / 1024;

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
 * Splash ("Loading screen — app launch"): the Kept tile breathing in a warm
 * halo while the coin slides into the K's arms, the name, three dots and
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
  /** Where in the loop the coin is, 0 → 1; held in the K's arms with Reduce Motion. */
  const coin = useSharedValue(reduceMotion ? 0.52 : 0);
  const fade = useSharedValue(1);

  useEffect(() => {
    const timer = setTimeout(() => setMinPassed(true), reduceMotion ? 0 : MIN_VISIBLE);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    // One pass through the loop; the keyframes below are read off it.
    coin.set(withRepeat(withTiming(1, { duration: LOOP, easing: Easing.linear }), -1));
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
    // .coin: in from the right by 38%, a small overshoot, held in the arms
    // until 90%, then gone by 100%.
    opacity: interpolate(coin.get(), [0, 0.06, 0.2, 0.9, 1], [0, 0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateX:
          interpolate(
            coin.get(),
            [0, 0.06, 0.38, 0.46, 0.52],
            [300, 300, -14, 4, 0],
            Extrapolation.CLAMP,
          ) * UNIT,
      },
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
            <KeptK size={TILE} />
            <Animated.View style={[StyleSheet.absoluteFill, coinStyle]}>
              <KeptCoin size={TILE} />
            </Animated.View>
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
    backgroundColor: color.bg,
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
