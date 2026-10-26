import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Placeholder } from '@/components/Placeholder';

// Smoke test: proves the Jest + React Native setup works end to end.
describe('Placeholder', () => {
  // Testing Library v14: render is async.
  it('shows the title and the note', async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 393, height: 852 },
          insets: { top: 59, left: 0, right: 0, bottom: 34 },
        }}
      >
        <Placeholder title="Home" note="Left to spend comes here." />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Home')).toBeOnTheScreen();
    expect(screen.getByText('Left to spend comes here.')).toBeOnTheScreen();
  });
});
