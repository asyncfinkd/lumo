import { type ReactNode, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Orbs } from '@/components/Backdrop';
import { Button } from '@/components/Button';
import { easing } from '@/components/motion';
import { Press } from '@/components/Press';
import { color, duration, radius, shadow, size, space, text } from '@/theme';

export const ONBOARDING_STEPS = 4;

type Props = {
  /** 1–4; drives the progress bar and "Step N of 4". */
  step: number;
  onBack: () => void;
  title: string;
  hint: string;
  children?: ReactNode;
  primary: { label: string; onPress: () => void; disabled?: boolean };
  /** A quiet second action under the primary one ("Skip for now"). */
  secondary?: { label: string; onPress: () => void };
};

/**
 * The frame every question in onboarding shares: back button, progress bar
 * growing from the previous step, the question sliding in, and the main button
 * at the bottom.
 */
export function OnboardingStep({ step, onBack, title, hint, children, primary, secondary }: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const target = (step / ONBOARDING_STEPS) * 100;
  const from = ((step - 1) / ONBOARDING_STEPS) * 100;

  const progress = useSharedValue(reduceMotion ? target : from);
  const slide = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    // .prog: .8s from the previous step · .slide: .7s in from the right
    progress.set(withTiming(target, { duration: duration.progress, easing: easing('thumb') }));
    slide.set(withTiming(1, { duration: duration.slide, easing: easing('sheet') }));
  }, [progress, slide, target, reduceMotion]);

  const bar = useAnimatedStyle(() => ({ width: `${progress.get()}%` }));
  const content = useAnimatedStyle(() => ({
    opacity: slide.get(),
    transform: [{ translateX: (1 - slide.get()) * 48 }],
  }));

  return (
    // The buttons ride above the keyboard (the name step opens it right away).
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <Orbs />
      <View style={styles.top}>
        <Press accessibilityLabel={t('common.back')} onPress={onBack} style={styles.back}>
          <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
            <Path
              d="M14.5 6 8.5 12l6 6"
              stroke={color.ink}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Press>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('onboarding.step', { step, total: ONBOARDING_STEPS })}
          accessibilityValue={{ min: 0, max: ONBOARDING_STEPS, now: step }}
          style={styles.track}
        >
          <Animated.View style={[styles.fill, bar]} />
        </View>
        <View style={styles.backSpace} />
      </View>

      <Animated.ScrollView
        style={content}
        contentContainerStyle={styles.main}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.hint}>{hint}</Text>
        {children}
      </Animated.ScrollView>

      <View style={styles.actions}>
        <Button {...primary} />
        {secondary ? <Button variant="quiet" {...secondary} /> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: {
    paddingTop: space.screenTop,
    paddingHorizontal: space.screen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  back: {
    width: size.touch,
    height: size.touch,
    borderRadius: size.touch / 2,
    backgroundColor: color.card,
    boxShadow: shadow.back,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpace: { width: size.touch },
  track: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: color.progressTrack,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: color.accent },
  main: { paddingTop: 28, paddingHorizontal: space.screen, paddingBottom: 16 },
  title: { ...text.h1, color: color.ink },
  hint: {
    ...text.label,
    fontFamily: text.subtitle.fontFamily,
    lineHeight: 21,
    color: color.muted,
    marginTop: 8,
  },
  actions: { paddingHorizontal: space.screen, paddingTop: 8, paddingBottom: 34, gap: 4 },
});
