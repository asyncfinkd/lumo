import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useOnboarding } from '@/features/onboarding/store';

// Each step animates its own content in (OnboardingStep), so the stack
// doesn't add a push animation of its own.
export default function OnboardingLayout() {
  // Clear the answers once onboarding leaves the stack, not on "Looks good":
  // Your month stays on screen while Home slides in.
  useEffect(() => () => useOnboarding.getState().reset(), []);

  return <Stack screenOptions={{ headerShown: false, animation: 'none' }} />;
}
