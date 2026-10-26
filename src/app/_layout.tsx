import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
import { Placeholder } from '@/components/Placeholder';
import { useDatabase } from '@/db/useDatabase';
import i18n from '@/i18n';
import { color } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  const database = useDatabase();
  const fontsDone = fontsLoaded || !!fontError;
  const dbDone = database.ready || !!database.error;

  useEffect(() => {
    if (fontsDone && dbDone) SplashScreen.hideAsync();
  }, [fontsDone, dbDone]);

  if (!fontsDone || !dbDone) return null;
  if (database.error) {
    return <Placeholder title={i18n.t('errors.generic')} note={database.error.message} />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="add-transaction" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
