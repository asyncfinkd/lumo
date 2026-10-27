import { ScrollView } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { usePullToRefresh } from '../usePullToRefresh';

const mockSync = jest.fn();
jest.mock('@/db/client', () => ({ db: {} }));
jest.mock('@/features/recurring/repo', () => ({
  syncDueTransactions: (...args: unknown[]) => mockSync(...args),
}));

function List() {
  return <ScrollView testID="list" refreshControl={usePullToRefresh()} />;
}

describe('usePullToRefresh', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('adds what came due, spins briefly, then stops', async () => {
    await render(<List />);
    const control = () => screen.getByTestId('list').props.refreshControl;
    expect(control().props.refreshing).toBe(false);

    await act(async () => {
      control().props.onRefresh();
    });
    expect(mockSync).toHaveBeenCalledTimes(1);
    expect(control().props.refreshing).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(control().props.refreshing).toBe(false);
  });
});
