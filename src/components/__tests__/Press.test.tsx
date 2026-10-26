import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Rise } from '../motion';
import { Press } from '../Press';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('Press', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is a button by default and calls onPress', async () => {
    const onPress = jest.fn();
    await render(<Press accessibilityLabel="Save" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('only buzzes when asked to', async () => {
    await render(<Press accessibilityLabel="Quiet" onPress={() => {}} />);
    fireEvent.press(screen.getByRole('button', { name: 'Quiet' }));
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});

describe('Rise', () => {
  it('renders its children', async () => {
    await render(
      <Rise>
        <Text>Left to spend</Text>
      </Rise>,
    );
    expect(screen.getByText('Left to spend')).toBeOnTheScreen();
  });
});
