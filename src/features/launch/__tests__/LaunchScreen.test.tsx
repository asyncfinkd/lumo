import { act, render, screen } from '@testing-library/react-native';
import '@/i18n';
import { LaunchScreen } from '../LaunchScreen';

describe('LaunchScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('says Lumo is opening, with the tagline and the privacy line', async () => {
    await render(<LaunchScreen done={false} onShown={() => {}} onGone={() => {}} />);
    expect(screen.getByLabelText('Lumo is opening')).toBeOnTheScreen();
    expect(screen.getByText('Money, but calmer.')).toBeOnTheScreen();
    expect(screen.getByText('Everything stays on this phone')).toBeOnTheScreen();
  });

  it('stays at least a second, then fades away once the app is ready', async () => {
    const onGone = jest.fn();
    const view = await render(<LaunchScreen done={false} onShown={() => {}} onGone={onGone} />);
    await view.rerender(<LaunchScreen done onShown={() => {}} onGone={onGone} />);
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(onGone).not.toHaveBeenCalled();
    // The minimum time passes, then the fade-out runs.
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(onGone).toHaveBeenCalledTimes(1);
  });

  it('waits for the app however long it takes', async () => {
    const onGone = jest.fn();
    await render(<LaunchScreen done={false} onShown={() => {}} onGone={onGone} />);
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(onGone).not.toHaveBeenCalled();
  });
});
