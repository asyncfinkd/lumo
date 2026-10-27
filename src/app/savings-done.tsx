import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Orbs } from '@/components/Backdrop';
import { Button } from '@/components/Button';
import { Jar } from '@/components/Jar';
import { Rise } from '@/components/motion';
import { db } from '@/db/client';
import type { CalendarDate } from '@/domain/dates';
import { type CurrencyCode, formatMoney } from '@/domain/money';
import { useProfile, useToday } from '@/features/live';
import { closeJar } from '@/features/savings/repo';
import { type JarTone, monthsTaken } from '@/features/savings/savings';
import { color, fontFamily, gradient, savingsColor, text } from '@/theme';

// SavingsDone: confetti, the full jar and "You did it". Treating yourself
// closes the jar and gives its money back to the balance.
export default function SavingsDoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // From the add sheet: closing the jar takes it out of the live lists.
  const jar = useLocalSearchParams<{
    jar: string;
    name: string;
    tone: JarTone;
    saved: string;
    currency: CurrencyCode;
    start: CalendarDate;
  }>();
  const today = useToday();
  const profile = useProfile();
  if (!profile) return null;

  const savedMinor = Number(jar.saved);
  const months = monthsTaken(jar.start, today);
  const treat = () => {
    closeJar(db, jar.jar, today);
    router.back();
  };

  return (
    <View style={styles.root}>
      <Orbs />
      <Confetti />
      <View style={[styles.main, { paddingTop: insets.top + 61 }]}>
        <View style={styles.jarWrap}>
          <Glow />
          <Pop>
            <Jar pct={100} size={200} tone={jar.tone} label={false} />
          </Pop>
        </View>
        <Rise delay={250}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('savings.done.title', { name: profile.name.trim() })}
          </Text>
        </Rise>
        <Rise delay={350}>
          <Text style={styles.body}>
            <Text style={styles.amount}>
              {formatMoney(savedMinor, jar.currency, { decimals: 'auto' })}
            </Text>{' '}
            {t('savings.done.body', { jar: jar.name, count: months })}
          </Text>
        </Rise>
      </View>

      <Rise delay={500} style={[styles.footer, { bottom: Math.max(insets.bottom, 34) }]}>
        <Button label={t('savings.done.treat')} onPress={treat} />
        <Button label={t('savings.done.keep')} variant="quiet" onPress={() => router.back()} />
      </Rise>
    </View>
  );
}

/** .pop: the jar grows in with a bounce. */
function Pop({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    p.set(withTiming(1, { duration: 900, easing: Easing.bezier(0.34, 1.5, 0.64, 1) }));
  }, [reduceMotion, p]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.get()),
    transform: [{ scale: 0.7 + p.get() * 0.3 }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** .glow: a warm light that breathes behind the jar, 3s. */
function Glow() {
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(reduceMotion ? 0.5 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    const half = { duration: 1500, easing: Easing.inOut(Easing.ease) };
    p.set(withRepeat(withSequence(withTiming(1, half), withTiming(0, half)), -1));
  }, [reduceMotion, p]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.8 + p.get() * 0.2,
    transform: [{ scale: 0.95 + p.get() * 0.11 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.glow, style]} />;
}

// The board's eight pieces: left, size, round or not, and how far into the fall.
const PIECES = [
  { left: 40, w: 10, h: 10, round: false, at: 0.4 },
  { left: 92, w: 8, h: 12, round: false, at: 2.1 },
  { left: 150, w: 9, h: 9, round: true, at: 1.3 },
  { left: 214, w: 10, h: 10, round: false, at: 2.7 },
  { left: 268, w: 8, h: 12, round: false, at: 0.9 },
  { left: 330, w: 10, h: 10, round: true, at: 1.8 },
  { left: 360, w: 7, h: 11, round: false, at: 3 },
  { left: 18, w: 8, h: 8, round: true, at: 2.4 },
] as const;
const FALL = 3200;

/** .fall: confetti drifting down and turning, forever. None with Reduce Motion. */
function Confetti() {
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PIECES.map((piece, i) => (
        <Piece
          key={i}
          piece={piece}
          color={savingsColor.confetti[i]!}
          // The board is 393pt wide; spread the same way on any phone.
          left={(piece.left / 393) * width}
          distance={height + 48}
        />
      ))}
    </View>
  );
}

function Piece({
  piece,
  color: fill,
  left,
  distance,
}: {
  piece: (typeof PIECES)[number];
  color: string;
  left: number;
  distance: number;
}) {
  // Started part-way in, like the board's negative delays.
  const p = useSharedValue(piece.at / (FALL / 1000));
  useEffect(() => {
    const rest = (1 - p.get()) * FALL;
    p.set(
      withSequence(
        withTiming(1, { duration: rest, easing: Easing.linear }),
        withTiming(0, { duration: 0 }),
        withRepeat(withTiming(1, { duration: FALL, easing: Easing.linear }), -1),
      ),
    );
  }, [p]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -40 + p.get() * distance }, { rotate: `${p.get() * 540}deg` }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left,
          width: piece.w,
          height: piece.h,
          borderRadius: piece.round ? piece.w / 2 : 3,
          backgroundColor: fill,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  main: { alignItems: 'center', paddingHorizontal: 32 },
  jarWrap: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundImage: gradient.jarDoneGlow,
  },
  title: {
    marginTop: 26,
    fontFamily: fontFamily.extrabold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    textAlign: 'center',
    color: color.ink,
  },
  body: {
    ...text.subtitle,
    marginTop: 10,
    maxWidth: 300,
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
    color: color.muted,
    fontVariant: ['tabular-nums'],
  },
  amount: { fontFamily: fontFamily.bold, color: color.ink },
  footer: { position: 'absolute', left: 24, right: 24, gap: 6 },
});
