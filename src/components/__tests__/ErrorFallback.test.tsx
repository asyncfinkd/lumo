import { Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { ScreenErrorBoundary, SheetErrorBoundary } from '@/components/ErrorFallback';
// Sets up react-i18next (English).
import '@/i18n';

// The screen throws until `broken` is turned off, as a bad render would.
let broken = true;
function Flaky() {
  if (broken) throw new Error('boom');
  return <Text>Home</Text>;
}

describe('error boundaries', () => {
  let logged: jest.SpyInstance;
  beforeEach(() => {
    broken = true;
    // React and the boundary both log the error in development.
    logged = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => logged.mockRestore());

  it('shows the fallback for a screen that throws, and Try again renders it again', async () => {
    await renderRouter({
      _layout: {
        default: () => <Stack screenOptions={{ headerShown: false }} />,
        unstable_settings: { screenErrorBoundary: ScreenErrorBoundary },
      },
      index: Flaky,
    });

    expect(screen.getByText('Something went wrong')).toBeOnTheScreen();
    expect(screen.queryByText('Home')).toBeNull();
    expect(logged).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));

    broken = false;
    await fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByText('Home')).toBeOnTheScreen();
  });

  it('shows a sheet that throws as a sheet with Try again', async () => {
    await renderRouter(
      {
        _layout: () => (
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }} />
          </GestureHandlerRootView>
        ),
        sheet: { default: Flaky, ErrorBoundary: SheetErrorBoundary },
      },
      { initialUrl: '/sheet' },
    );

    expect(
      screen.getByText("This didn't open properly. Nothing you've saved has changed."),
    ).toBeOnTheScreen();
    broken = false;
    await fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByText('Home')).toBeOnTheScreen();
  });
});
