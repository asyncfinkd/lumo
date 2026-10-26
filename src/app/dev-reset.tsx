import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { resetForOnboarding } from '@/features/onboarding/finish';

/**
 * Development only: open exp://…/--/dev-reset to wipe the database and land in
 * onboarding. Start Metro with EXPO_PUBLIC_SEED=false so the sample data isn't
 * loaded again on the next launch. Does nothing in release builds.
 */
export default function DevReset() {
  useEffect(() => {
    resetForOnboarding();
  }, []);
  return <Redirect href="/" />;
}
