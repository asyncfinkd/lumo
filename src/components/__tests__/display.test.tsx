import { Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '@/i18n';
import { DigitRoll } from '../DigitRoll';
import { Donut, slotLengths } from '../Donut';
import { Sheet } from '../Sheet';
import { Sparkline } from '../Sparkline';

describe('DigitRoll', () => {
  it('reads the whole amount to screen readers', async () => {
    await render(<DigitRoll minor={79970} currency="GEL" />);
    expect(screen.getByRole('text', { name: '₾799.70' })).toBeOnTheScreen();
  });

  it('keeps the thousands comma', async () => {
    await render(<DigitRoll minor={1248050} currency="GEL" />);
    expect(screen.getByRole('text', { name: '₾12,480.50' })).toBeOnTheScreen();
    expect(screen.getByText(',')).toBeOnTheScreen();
    expect(screen.getByText('.50')).toBeOnTheScreen();
  });
});

describe('Donut', () => {
  it('describes the chart and the total', async () => {
    // docs/sample-data.md, this month.
    await render(
      <Donut
        currency="GEL"
        label="spent this month"
        items={[
          { key: 'groceries', label: 'Groceries', chart: '#000', minor: 81240 },
          { key: 'home', label: 'Home', chart: '#000', minor: 80000 },
          { key: 'treats', label: 'Treats', chart: '#000', minor: 50330 },
          { key: 'bills', label: 'Bills', chart: '#000', minor: 35000 },
          { key: 'transport', label: 'Getting around', chart: '#000', minor: 28600 },
          { key: 'coffee', label: 'Coffee', chart: '#000', minor: 24860 },
        ]}
      />,
    );
    expect(
      screen.getByRole('image', {
        name: 'Donut chart: Groceries 27%, Home 27%, Treats 17%, Bills 12%, Getting around 10%, Coffee 8%. ₾3,000 spent this month',
      }),
    ).toBeOnTheScreen();
  });

  it('keeps small shares from running into their neighbours', () => {
    const slots = slotLengths([96000, 1500, 1200, 800, 300, 200]);
    const ring = 2 * Math.PI * 78;
    expect(slots.reduce((a, b) => a + b, 0)).toBeCloseTo(ring);
    // Round caps (22) plus the gap (6) must fit in every slot.
    for (const slot of slots) expect(slot).toBeGreaterThanOrEqual(28);
    expect(slots[0]).toBeGreaterThan(slots[1]!);
  });

  it('splits by size when every share is large enough', () => {
    const slots = slotLengths([3, 1]);
    expect(slots[0]! / slots[1]!).toBeCloseTo(3);
  });
});

describe('Sparkline', () => {
  it('renders both kinds', async () => {
    await render(
      <>
        <Sparkline kind="in" values={[0, 380000, 380000]} />
        <Sparkline kind="out" values={[0, 0, 0]} />
      </>,
    );
  });
});

/** A phone's safe areas, as the app's root provides them. */
const metrics = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 62, left: 0, right: 0, bottom: 34 },
};

describe('Sheet', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows its content and is dismissed after sliding away', async () => {
    const onDismissed = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <GestureHandlerRootView>
          <Sheet accessibilityLabel="New expense" top={96} onDismissed={onDismissed}>
            {(close) => <Text onPress={close}>Done</Text>}
          </Sheet>
        </GestureHandlerRootView>
      </SafeAreaProvider>,
    );
    expect(screen.getByText('Done')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Done'));
    expect(onDismissed).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(onDismissed).toHaveBeenCalledTimes(1);
  });

  it('closes when tapping outside', async () => {
    const onDismissed = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <GestureHandlerRootView>
          <Sheet accessibilityLabel="Edit budget" onDismissed={onDismissed}>
            {() => <Text>Groceries</Text>}
          </Sheet>
        </GestureHandlerRootView>
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(onDismissed).toHaveBeenCalledTimes(1);
  });
});
