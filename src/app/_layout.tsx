import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
import { Placeholder } from '@/components/Placeholder';
import { useDatabase } from '@/db/useDatabase';
import { useProfileStatus } from '@/features/live';
import { DueTransactionsSync } from '@/features/recurring/DueTransactionsSync';
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

  useEffect(() => {
    if (fontsDone && database.error) SplashScreen.hideAsync();
  }, [fontsDone, database.error]);

  if (!fontsDone || (!database.ready && !database.error)) return null;
  if (database.error) {
    return <Placeholder title={i18n.t('errors.generic')} note={database.error.message} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <DueTransactionsSync />
      <AppStack />
    </GestureHandlerRootView>
  );
}

// Onboarding until the profile is complete, the app after. Mounted once the
// database is ready; keeps the splash up until the first profile read.
function AppStack() {
  const { loaded, profile } = useProfileStatus();
  const onboarded = !!profile?.onboardedAt;

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
      <Stack.Protected guard={onboarded} redirectTo="/welcome">
        <Stack.Screen name="(tabs)" />
        {/* The sheet draws and animates itself over the current screen. */}
        <Stack.Screen
          name="add-transaction"
          options={{
            presentation: 'transparentModal',
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded} redirectTo="/">
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Screen name="dev-reset" />
    </Stack>
  );
}
