import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Orbs } from '@/components/Backdrop';
import { FaceIdIcon, FingerprintIcon, LockIcon } from '@/components/Icons';
import { Rise } from '@/components/motion';
import { Press } from '@/components/Press';
import { color, fontFamily, radius, shadow, size, text } from '@/theme';
import { authenticate, type LockKind, useBiometrics } from './biometrics';

/**
 * App lock (#24): covers the app when Lumo opens and whenever it comes back
 * from the background, and asks for Face ID / Touch ID / a fingerprint.
 * Turning the lock on in Profile doesn't lock right away; the next open does.
 * If the phone has no biometrics set up any more, nothing is locked, so a
 * restored backup can never shut anyone out.
 */
export function AppLock({ enabled }: { enabled: boolean }) {
  const biometrics = useBiometrics();
  const [locked, setLocked] = useState(enabled);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const enabledRef = useRef(enabled);
  const asking = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      // Not on "inactive": the Face ID prompt itself makes the app inactive.
      if (state === 'background' && enabledRef.current) {
        setLocked(true);
        setFailed(false);
      }
    });
    return () => subscription.remove();
  }, []);

  // Ask while locked and in front; once per try, so a cancel stays on the
  // "Didn't recognize you" screen until Unlock is tapped.
  const available = biometrics?.available;
  useEffect(() => {
    if (!enabled || !locked || !available || !active || failed || asking.current) return;
    asking.current = true;
    authenticate()
      .catch(() => false)
      .then((ok) => {
        asking.current = false;
        if (ok) setLocked(false);
        else setFailed(true);
      });
  }, [enabled, locked, available, active, failed]);

  if (!enabled || !locked || available === false) return null;
  // Retrying clears the failure; the effect above asks again.
  return (
    <LockScreen
      kind={biometrics?.kind ?? 'faceid'}
      failed={failed}
      onRetry={() => setFailed(false)}
    />
  );
}

/** LockScreen / LockScreenFailed: the Lumo tile with a lock badge and one calm line. */
function LockScreen({
  kind,
  failed,
  onRetry,
}: {
  kind: LockKind;
  failed: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const shake = useSharedValue(0);

  useEffect(() => {
    if (!failed || reduceMotion) return;
    const step = { duration: 100 };
    shake.set(
      withDelay(
        200,
        withSequence(
          withTiming(-6, step),
          withTiming(6, step),
          withTiming(-6, step),
          withTiming(6, step),
          withTiming(0, step),
        ),
      ),
    );
  }, [failed, reduceMotion, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const Icon = kind === 'faceid' ? FaceIdIcon : FingerprintIcon;

  return (
    <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, styles.root]}>
      <Orbs />
      {/* 150pt from the top on the 852pt board, of which ~59 is status bar. */}
      <View style={[styles.main, { paddingTop: insets.top + 91 }]}>
        <Animated.View style={[styles.tileWrap, shakeStyle]}>
          <View style={styles.tile}>
            <Svg width={TILE} height={TILE} viewBox="0 0 1024 1024">
              <Circle cx={590} cy={448} r={190} fill={color.iconInk} fillOpacity={0.45} />
              <Circle cx={442} cy={578} r={190} fill={color.iconInk} />
            </Svg>
          </View>
          <View style={[styles.badge, failed && { backgroundColor: color.lockFailed }]}>
            <LockIcon color={color.white} size={15} width={2.4} />
          </View>
        </Animated.View>

        <Rise replayKey={failed ? 1 : 0}>
          <Text accessibilityRole="header" style={styles.title}>
            {failed ? t('lock.failedTitle') : t('lock.title')}
          </Text>
        </Rise>
        <Rise delay={60} replayKey={failed ? 1 : 0}>
          <Text accessibilityLiveRegion="polite" style={styles.body}>
            {failed ? t('lock.failedBody') : t('lock.body')}
          </Text>
        </Rise>
      </View>

      {failed ? (
        <Rise delay={120} style={[styles.footer, { bottom: Math.max(insets.bottom, 34) }]}>
          <Press haptic onPress={onRetry} accessibilityRole="button" style={styles.button}>
            <Icon color={color.white} size={22} />
            <Text style={styles.buttonText}>{t(`lock.unlock.${kind}`)}</Text>
          </Press>
          <Text style={styles.hint}>{t('lock.passcodeHint')}</Text>
        </Rise>
      ) : null}
    </View>
  );
}

const TILE = 84;
const BADGE = 32;
const RING = 3;

const styles = StyleSheet.create({
  root: { backgroundColor: color.bg, zIndex: 5 },
  main: { alignItems: 'center', paddingHorizontal: 40 },
  tileWrap: { width: TILE, height: TILE },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 19,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: color.iconCream,
    boxShadow: shadow.lockTile,
  },
  badge: {
    position: 'absolute',
    right: -8 - RING,
    bottom: -8 - RING,
    width: BADGE + RING * 2,
    height: BADGE + RING * 2,
    borderRadius: radius.pill,
    borderWidth: RING,
    borderColor: color.bg,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 26,
    fontFamily: fontFamily.extrabold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    textAlign: 'center',
    color: color.ink,
  },
  body: {
    marginTop: 8,
    maxWidth: 280,
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    color: color.muted,
  },
  footer: { position: 'absolute', left: 24, right: 24, gap: 12 },
  button: {
    height: size.button,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    boxShadow: shadow.cta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: { ...text.section, color: color.white },
  hint: { ...text.meta, lineHeight: 18, textAlign: 'center', color: color.subtle },
});
