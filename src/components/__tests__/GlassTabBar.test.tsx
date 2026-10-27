import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import '@/i18n';
import { GlassTabBar } from '../GlassTabBar';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const renderBar = async (active: 'home' | 'insights' = 'home') => {
  const onChange = jest.fn();
  const onAdd = jest.fn();
  await render(
    <GlassTabBar
      active={active}
      onChange={onChange}
      onAdd={onAdd}
      blurTarget={{ current: null }}
    />,
  );
  return { onChange, onAdd };
};

describe('GlassTabBar', () => {
  it('names every tab for screen readers and marks the current one', async () => {
    await renderBar('insights');
    // Budgets is off in phase 1 (features/flags.ts).
    expect(screen.queryByRole('tab', { name: 'Budgets' })).toBeNull();
    for (const name of ['Home', 'Insights', 'History', 'Profile']) {
      expect(screen.getByRole('tab', { name })).toBeOnTheScreen();
    }
    expect(screen.getByRole('tab', { name: 'Insights' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Home' })).not.toBeSelected();
  });

  it('switches tabs', async () => {
    const { onChange } = await renderBar();
    await fireEvent.press(screen.getByRole('tab', { name: 'History' }));
    expect(onChange).toHaveBeenCalledWith('history');
  });

  it('opens the add sheet with a light haptic', async () => {
    const { onAdd } = await renderBar();
    await fireEvent.press(screen.getByRole('button', { name: 'Add transaction' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });
});
