import { showToast } from '@/components/Toast';
import i18n from '@/i18n';

type Options = { errorMessage?: string };

/**
 * Every write from the UI goes through this. Repos throw (a CHECK constraint,
 * a missing profile, a full disk); here that becomes the shared error toast and
 * `false`, so the caller stays put with what was typed instead of closing the
 * sheet or navigating away.
 */
export function runWrite(write: () => Promise<unknown>, options?: Options): Promise<boolean>;
export function runWrite(write: () => unknown, options?: Options): boolean;
export function runWrite(
  write: () => unknown,
  { errorMessage }: Options = {},
): boolean | Promise<boolean> {
  const fail = (error: unknown) => {
    // No crash reporting (ADR 0001): the error stays on the device.
    if (__DEV__) console.error(error);
    showToast({ tone: 'error', message: errorMessage ?? i18n.t('errors.notSaved') });
    return false;
  };
  try {
    const result = write();
    return result instanceof Promise ? result.then(() => true, fail) : true;
  } catch (error) {
    return fail(error);
  }
}
