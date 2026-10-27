// expo-notifications, only where it exists. Expo Go on Android dropped part of
// the module in SDK 53, and merely importing the package there throws ("Cannot
// find native module 'ExpoTopicSubscriptionModule'"). A real build has it, so
// reminders work there; in Expo Go on Android they're simply off.

import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

type NotificationsModule = typeof import('expo-notifications');

export const Notifications: NotificationsModule | null =
  Platform.OS === 'android' && isRunningInExpoGo()
    ? null
    : // Required lazily so the package's code never runs where it would throw.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('expo-notifications') as NotificationsModule);
