import { AuthenticationType } from 'expo-local-authentication';
import { lockKind } from '../biometrics';

describe('lockKind', () => {
  it('is Face ID on an iPhone with face recognition, Touch ID otherwise', () => {
    expect(lockKind('ios', [AuthenticationType.FACIAL_RECOGNITION])).toBe('faceid');
    expect(lockKind('ios', [AuthenticationType.FINGERPRINT])).toBe('touchid');
  });

  it('is always fingerprint on Android, as the design draws it', () => {
    expect(lockKind('android', [AuthenticationType.FACIAL_RECOGNITION])).toBe('fingerprint');
    expect(lockKind('android', [])).toBe('fingerprint');
  });
});
