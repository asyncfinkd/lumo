import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Orbs } from '@/components/Backdrop';
import { Button } from '@/components/Button';
import { db } from '@/db/client';
import { greetingKey } from '@/features/home/home';
import { useHour } from '@/features/home/useHour';
import { useProfile } from '@/features/live';
import { Avatar } from '@/features/profile/Avatar';
import { saveProfile } from '@/features/profile/repo';
import { SettingsHeader } from '@/features/profile/SettingsHeader';
import { color, fontFamily, radius, shadow, space, text } from '@/theme';

const MAX = 24;

// ProfileName: change the name Home greets you with, with a live preview.
export default function ProfileNameScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hour = useHour();
  const profile = useProfile();
  const [name, setName] = useState<string | null>(null);
  if (!profile) return null;

  const value = name ?? profile.name;
  const trimmed = value.trim();
  const save = () => {
    if (!trimmed) return;
    saveProfile(db, { ...profile, name: trimmed });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <Orbs />
      <SettingsHeader title={t('profile.name')} />
      <View style={styles.main}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('onboarding.name.title')}
        </Text>
        <Text style={styles.hint}>{t('profile.nameHint')}</Text>
        <View style={styles.field}>
          <TextInput
            accessibilityLabel={t('onboarding.name.title')}
            value={value}
            onChangeText={(next) => setName(next.slice(0, MAX))}
            maxLength={MAX}
            autoComplete="given-name"
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={save}
            style={styles.input}
          />
        </View>
        <Text style={styles.count}>
          {t('profile.nameCount', { count: value.length, max: MAX })}
        </Text>

        <Text accessibilityRole="header" style={styles.previewTitle}>
          {t('profile.preview')}
        </Text>
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.preview}
        >
          <Avatar
            name={trimmed || '·'}
            tint={profile.avatarColor}
            photoUri={profile.photoUri}
            size={44}
          />
          <View>
            <Text style={styles.greeting}>
              {t(`home.greeting.${greetingKey(hour)}`, { name: trimmed || t('profile.friend') })}
            </Text>
            <Text style={styles.sub}>{t('home.doingGreat')}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 34) }]}>
        <Button
          label={t('common.save')}
          disabled={!trimmed}
          onPress={save}
          style={!trimmed && styles.saveOff}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  main: { flex: 1, paddingTop: 32, paddingHorizontal: space.screen },
  title: { ...text.h1, color: color.ink },
  hint: {
    ...text.label,
    fontFamily: fontFamily.semibold,
    lineHeight: 21,
    color: color.muted,
    marginTop: 8,
  },
  field: {
    // The box is a View around the field: Android drops a TextInput's own
    // horizontal padding, which left the text against the edge.
    marginTop: 24,
    height: 68,
    paddingHorizontal: 22,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: color.field,
    boxShadow: shadow.fieldFocus,
    justifyContent: 'center',
  },
  input: {
    height: '100%',
    padding: 0,
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: color.ink,
  },
  count: {
    ...text.small,
    fontFamily: fontFamily.semibold,
    marginTop: 8,
    alignSelf: 'flex-end',
    color: color.muted,
  },
  previewTitle: {
    ...text.meta,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontFamily: fontFamily.extrabold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: color.muted,
  },
  preview: {
    padding: 16,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    boxShadow: shadow.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  greeting: { fontFamily: fontFamily.bold, fontSize: 18, lineHeight: 24, color: color.ink },
  sub: { ...text.meta, color: color.muted },
  actions: { paddingHorizontal: space.screen, paddingTop: 12 },
  // The design's disabled Save is a solid grey, not a faded black.
  saveOff: { opacity: 1, backgroundColor: color.disabled },
});
