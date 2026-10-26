import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The local hour (0–23) for the greeting, updated on the hour and when the app
 * comes back to the foreground.
 */
export function useHour(): number {
  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const refresh = () => setHour(new Date().getHours());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1);
    const timer = setTimeout(refresh, next.getTime() - now.getTime() + 1000);

    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, [hour]);

  return hour;
}
