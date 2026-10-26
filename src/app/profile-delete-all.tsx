import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { TrashIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { deleteEverything } from '@/features/profile/deleteAll';
import { color, fontFamily, radius, text } from '@/theme';

const WORD = 'DELETE';

// ProfileDeleteAll: type DELETE, then everything on this phone goes away.
export default function ProfileDeleteAllScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const ok = typed.trim().toUpperCase() === WORD;

  return (
    <Dialog accessibilityLabel={t('profile.deleteAll.title')}>
      <View style={styles.icon}>
        <TrashIcon color={color.danger} size={26} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {t('profile.deleteAll.title')}
      </Text>
      <Text style={styles.body}>{t('profile.deleteAll.body')}</Text>

      <Text style={styles.label}>
        {t('profile.deleteAll.typeBefore')}
        <Text style={styles.word}>{WORD}</Text>
        {t('profile.deleteAll.typeAfter')}
      </Text>
      <TextInput
        accessibilityLabel={t('profile.deleteAll.typeLabel', { word: WORD })}
        value={typed}
        onChangeText={setTyped}
        placeholder={WORD}
        placeholderTextColor={color.placeholder}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        style={styles.input}
      />

      <View style={styles.actions}>
        <Press
          accessibilityRole="button"
          accessibilityState={{ disabled: !ok }}
          disabled={!ok}
          haptic
          onPress={() => {
            // Close the dialog first, so it isn't left alone in the stack when Welcome takes over.
            router.dismissAll();
            deleteEverything();
          }}
          style={[styles.delete, ok ? styles.deleteOn : styles.deleteOff]}
        >
          <Text style={[styles.deleteText, { color: ok ? color.white : color.subtle }]}>
            {t('profile.deleteAll.confirm')}
          </Text>
        </Press>
        <Button variant="quiet" label={t('common.cancel')} onPress={() => router.back()} />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: color.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    fontFamily: fontFamily.extrabold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    textAlign: 'center',
    color: color.ink,
  },
  body: { ...text.subtitle, lineHeight: 20, marginTop: 8, textAlign: 'center', color: color.muted },
  label: {
    ...text.meta,
    fontFamily: fontFamily.bold,
    marginTop: 16,
    alignSelf: 'stretch',
    color: color.softInk,
  },
  word: { fontFamily: fontFamily.extrabold, color: color.danger },
  input: {
    marginTop: 6,
    alignSelf: 'stretch',
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: color.wash,
    fontFamily: fontFamily.extrabold,
    fontSize: 16,
    letterSpacing: 1,
    color: color.ink,
  },
  actions: { marginTop: 16, alignSelf: 'stretch', gap: 8 },
  delete: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteOn: { backgroundColor: color.dangerStrong },
  deleteOff: { backgroundColor: color.washStrong },
  deleteText: { ...text.rowTitle },
});
