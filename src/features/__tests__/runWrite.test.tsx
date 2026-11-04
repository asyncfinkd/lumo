import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ProfileNameScreen from '@/app/profile-name';
import { ToastHost, useToast } from '@/components/Toast';
import { saveProfile } from '@/features/profile/repo';
import { runWrite } from '@/features/runWrite';
import '@/i18n';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock('@/db/client', () => ({ db: {} }));
jest.mock('@/features/live', () => ({
  useProfile: () => ({ name: 'Nika', currency: 'GEL', payday: 5, avatarColor: 'butter' }),
}));
jest.mock('@/features/profile/repo', () => ({ saveProfile: jest.fn() }));

const metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

describe('runWrite', () => {
  let logged: jest.SpyInstance;
  beforeEach(() => {
    useToast.setState({ toast: null });
    mockBack.mockClear();
    logged = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => logged.mockRestore());

  it('returns true and shows nothing when the write works', () => {
    expect(runWrite(() => {})).toBe(true);
    expect(useToast.getState().toast).toBeNull();
  });

  it('shows the error toast, logs in development and returns false when it throws', () => {
    const error = new Error('CHECK constraint failed');
    expect(
      runWrite(() => {
        throw error;
      }),
    ).toBe(false);
    expect(useToast.getState().toast).toMatchObject({
      tone: 'error',
      message: "That didn't save. Try again.",
    });
    expect(logged).toHaveBeenCalledWith(error);
  });

  it('takes its own message, and waits for an async write', async () => {
    await expect(
      runWrite(() => Promise.reject(new Error('disk full')), { errorMessage: 'No room' }),
    ).resolves.toBe(false);
    expect(useToast.getState().toast?.message).toBe('No room');
    await expect(runWrite(() => Promise.resolve())).resolves.toBe(true);
  });

  it('keeps the screen and what was typed when the save fails', async () => {
    jest.mocked(saveProfile).mockImplementation(() => {
      throw new Error('no profile');
    });
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ProfileNameScreen />
        <ToastHost />
      </SafeAreaProvider>,
    );

    await fireEvent.changeText(screen.getByDisplayValue('Nika'), 'Ana');
    await act(() => screen.getByDisplayValue('Ana').props.onSubmitEditing());

    expect(saveProfile).toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Ana')).toBeOnTheScreen();
    expect(screen.getByText("That didn't save. Try again.")).toBeOnTheScreen();
  });

  it('goes back once the save works', async () => {
    jest.mocked(saveProfile).mockImplementation(() => ({}) as never);
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ProfileNameScreen />
      </SafeAreaProvider>,
    );
    await act(() => screen.getByDisplayValue('Nika').props.onSubmitEditing());
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
