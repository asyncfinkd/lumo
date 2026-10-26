import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Rise } from '@/components/motion';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { useOnboarding } from '@/features/onboarding/store';
import { color, radius, shadow, text } from '@/theme';

// OBName: step 1 of 4.
export default function NameScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const name = useOnboarding((s) => s.name);
  const setName = useOnboarding((s) => s.setName);
  const [focused, setFocused] = useState(false);

  const trimmed = name.trim();
  const next = () => {
    if (trimmed) router.push('/currency');
  };

  return (
    <OnboardingStep
      step={1}
      onBack={router.back}
      title={t('onboarding.name.title')}
      hint={t('onboarding.name.hint')}
      primary={{ label: t('common.continue'), onPress: next, disabled: !trimmed }}
    >
      <TextInput
        accessibilityLabel={t('onboarding.name.label')}
        placeholder={t('onboarding.name.label')}
        placeholderTextColor={color.placeholder}
        value={name}
        onChangeText={setName}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={next}
        autoFocus
        autoComplete="given-name"
        textContentType="givenName"
        autoCapitalize="words"
        returnKeyType="next"
        maxLength={40}
        style={[styles.input, { boxShadow: focused ? shadow.fieldFocus : shadow.field }]}
      />
      {trimmed ? (
        <Rise style={styles.greeting}>
          <View style={styles.avatar}>
            <Text style={styles.initial}>{trimmed[0]!.toUpperCase()}</Text>
          </View>
          <Text style={styles.nice}>{t('onboarding.name.niceToMeet', { name: trimmed })}</Text>
        </Rise>
      ) : null}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: 28,
    height: 68,
    paddingHorizontal: 22,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.field,
    ...text.stat,
    fontSize: 24,
    lineHeight: undefined,
    color: color.ink,
  },
  greeting: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.avatar,
    boxShadow: shadow.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { ...text.section, fontFamily: text.h1.fontFamily, color: color.ink },
  nice: { ...text.rowTitle, color: color.ink },
});
