import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Extra room under Android's status bar, which is much shorter than an iPhone's. */
const ANDROID_EXTRA = 20;

/**
 * Where a screen's content starts: below the status bar, as on the boards. On
 * iPhones the safe area already gives that room (about 60pt); Android's status
 * bar is only ~24–30pt, which left the content against the top edge.
 */
export function useScreenTop(): number {
  const { top } = useSafeAreaInsets();
  return Platform.OS === 'android' ? top + ANDROID_EXTRA : top;
}
