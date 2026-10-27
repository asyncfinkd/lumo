// What the phone can unlock Lumo with, and the unlock prompt itself (#24).

import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import i18n from '@/i18n';

/** The three App lock boards: Face ID, Touch ID (iPhone SE) and Android's fingerprint. */
export type LockKind = 'faceid' | 'touchid' | 'fingerprint';

export type Biometrics = {
  kind: LockKind;
  /** Face ID / a fingerprint is set up on the phone (ProfileLockUnavailable when not). */
  available: boolean;
};

/** Android says fingerprint for every kind of sensor; the design only draws that one. */
export function lockKind(os: string, types: readonly number[]): LockKind {
  if (os !== 'ios') return 'fingerprint';
  return types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ? 'faceid'
    : 'touchid';
}

export async function readBiometrics(): Promise<Biometrics> {
  const [hardware, enrolled, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);
  return { kind: lockKind(Platform.OS, types), available: hardware && enrolled };
}

/**
 * The phone's biometrics, read again each time Lumo comes back: Face ID may
 * have been set up (or removed) in Settings meanwhile. `null` until known.
 */
export function useBiometrics(): Biometrics | null {
  const [biometrics, setBiometrics] = useState<Biometrics | null>(null);
  useEffect(() => {
    let live = true;
    const read = () =>
      readBiometrics().then(
        (b) => live && setBiometrics(b),
        () => live && setBiometrics({ kind: lockKind(Platform.OS, []), available: false }),
      );
    read();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);
  return biometrics;
}

/**
 * The system Face ID / fingerprint prompt. The phone falls back to its
 * passcode after a few tries ("After a few tries…" on LockScreenFailed).
 */
export async function authenticate(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: i18n.t('lock.prompt'),
    cancelLabel: i18n.t('common.cancel'),
  });
  return result.success;
}
