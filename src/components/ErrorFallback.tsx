import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type ErrorBoundaryProps, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, space, text } from '@/theme';
import { Button } from './Button';
import { InfoIcon } from './Icons';
import { Sheet } from './Sheet';

/** In development the error is logged and shown under the message; never in a release. */
function useDevLog(error: Error | undefined) {
  useEffect(() => {
    if (__DEV__ && error) console.error(error);
  }, [error]);
}

function Message({ title, body, error }: { title: string; body: string; error?: Error }) {
  return (
    <>
      <View style={styles.tile}>
        <InfoIcon color={color.muted} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.body}>{body}</Text>
      {__DEV__ && error ? (
        <Text selectable style={styles.dev}>
          {error.message}
        </Text>
      ) : null}
    </>
  );
}

/**
 * A screen that threw while rendering: a calm message and Try again, in place
 * of the screen. Also the database error at launch, without `retry`.
 */
export function ScreenError({ error, retry }: { error?: Error; retry?: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  useDevLog(error);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        <Message title={t('errors.generic')} body={t('errors.screenBody')} error={error} />
        {/* In the middle, not at the bottom: a tab's floating tab bar covers the bottom. */}
        {retry ? (
          <Button label={t('errors.tryAgain')} onPress={retry} style={styles.button} />
        ) : null}
      </View>
    </View>
  );
}

/** For Expo Router: a route's `ErrorBoundary`, or a layout's `screenErrorBoundary`. */
export function ScreenErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ScreenError error={error} retry={retry} />;
}

/**
 * A sheet route that threw: the same message in a sheet of its own, so the
 * screen under it stays as it was. Close goes back; Try again opens it afresh.
 * Sheet routes export it: `export { SheetErrorBoundary as ErrorBoundary }`.
 */
export function SheetErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  const router = useRouter();
  useDevLog(error);

  return (
    <Sheet accessibilityLabel={t('errors.generic')} onDismissed={router.back}>
      {(close) => (
        <View style={styles.sheet}>
          <Message title={t('errors.generic')} body={t('errors.sheetBody')} error={error} />
          <View style={styles.actions}>
            <Button label={t('errors.tryAgain')} onPress={retry} />
            <Button variant="quiet" label={t('common.close')} onPress={close} />
          </View>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // Transparent so a tab's backdrop shows through; stack screens draw color.bg.
  screen: { flex: 1, paddingHorizontal: space.screen },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sheet: { paddingTop: 20, alignItems: 'center' },
  tile: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...text.section, marginTop: 16, textAlign: 'center', color: color.ink },
  body: { ...text.subtitle, marginTop: 6, maxWidth: 300, textAlign: 'center', color: color.muted },
  dev: {
    ...text.meta,
    marginTop: 12,
    maxWidth: 320,
    textAlign: 'center',
    color: color.subtle,
  },
  actions: { alignSelf: 'stretch', marginTop: 24, gap: 4 },
  button: { alignSelf: 'stretch', marginTop: 24 },
});
