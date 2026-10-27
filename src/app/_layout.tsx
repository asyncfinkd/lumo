import { useEffect, useLayoutEffect } from 'react';
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
import { CategoriesProvider } from '@/features/categories/CategoriesProvider';
import { useProfileStatus } from '@/features/live';
import { DueTransactionsSync } from '@/features/recurring/DueTransactionsSync';
import i18n, { applyLanguage } from '@/i18n';
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

// Sheets draw and animate themselves over the current screen.
const sheetOptions = {
  presentation: 'transparentModal',
  animation: 'none',
  contentStyle: { backgroundColor: 'transparent' },
} as const;

// Onboarding until the profile is complete, the app after. Mounted once the
// database is ready; keeps the splash up until the first profile read.
function AppStack() {
  const { loaded, profile } = useProfileStatus();
  const onboarded = !!profile?.onboardedAt;

  // The saved language, before the first frame shows (ProfileLanguage).
  const language = profile?.language;
  useLayoutEffect(() => {
    if (loaded) applyLanguage(language);
  }, [loaded, language]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <CategoriesProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
        <Stack.Protected guard={onboarded} redirectTo="/welcome">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-transaction" options={sheetOptions} />
          <Stack.Screen name="balance" options={sheetOptions} />
          <Stack.Screen name="history" />
          <Stack.Screen name="transaction" options={sheetOptions} />
          <Stack.Screen
            name="transaction-delete"
            options={{ ...sheetOptions, animation: 'fade' }}
          />
          <Stack.Screen name="transaction-scope" options={{ ...sheetOptions, animation: 'fade' }} />
          <Stack.Screen name="history-search" options={{ animation: 'fade' }} />
          <Stack.Screen name="edit-budget" options={sheetOptions} />
          <Stack.Screen name="profile-photo" options={sheetOptions} />
          <Stack.Screen name="profile-name" />
          <Stack.Screen name="profile-categories" />
          <Stack.Screen name="profile-bills" />
          <Stack.Screen name="profile-language" />
          <Stack.Screen name="profile-export" />
          <Stack.Screen name="profile-bill" options={sheetOptions} />
          <Stack.Screen name="profile-category" options={sheetOptions} />
          <Stack.Screen
            name="profile-category-delete"
            options={{ ...sheetOptions, animation: 'fade' }}
          />
          <Stack.Screen name="profile-currency" />
          <Stack.Screen name="profile-income" />
          <Stack.Screen
            name="profile-delete-all"
            options={{ ...sheetOptions, animation: 'fade' }}
          />
          <Stack.Screen
            name="profile-photo-crop"
            options={{
              presentation: 'fullScreenModal',
              contentStyle: { backgroundColor: color.cropBg },
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!onboarded} redirectTo="/">
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Screen name="dev-reset" />
      </Stack>
    </CategoriesProvider>
  );
}
