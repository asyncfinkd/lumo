import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Orbs } from '@/components/Backdrop';
import { Button } from '@/components/Button';
import { SunriseJar } from '@/components/illustrations/SunriseJar';
import { Rise } from '@/components/motion';
import { color, space, text } from '@/theme';

// OBWelcome: the sun rises behind the jar, then "Money, but calmer."
export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={styles.root}>
      <Orbs />
      <View style={styles.main}>
        <SunriseJar accessibilityLabel={t('onboarding.welcome.illustration')} />
        <Rise delay={300}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('onboarding.welcome.title')}
          </Text>
        </Rise>
        <Rise delay={400}>
          <Text style={styles.body}>{t('onboarding.welcome.body')}</Text>
        </Rise>
      </View>
      <View style={styles.actions}>
        <Button label={t('onboarding.welcome.start')} onPress={() => router.push('/name')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  main: { flex: 1, paddingTop: 150, paddingHorizontal: 32, alignItems: 'center' },
  title: {
    ...text.h1,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: color.ink,
    marginTop: 36,
    textAlign: 'center',
  },
  body: {
    ...text.subtitle,
    fontSize: 17,
    lineHeight: 24,
    color: color.muted,
    marginTop: 12,
    maxWidth: 290,
    textAlign: 'center',
  },
  actions: { paddingHorizontal: space.screen, paddingBottom: 34 },
});
