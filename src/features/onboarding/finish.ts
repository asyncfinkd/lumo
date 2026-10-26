import { db } from '@/db/client';
import { deleteAllData } from '@/db/seed';
import i18n from '@/i18n';
import { type OnboardingAnswers, saveOnboarding } from './save';
import { useOnboarding } from './store';
import { useWelcomeToast } from './welcomeToast';

/** "Looks good": saves the answers and queues the welcome toast. */
export function finishOnboarding(answers: OnboardingAnswers): void {
  saveOnboarding(
    db,
    answers,
    (key) => i18n.t(`onboarding.bills.items.${key}`),
    i18n.t('categories.salary'),
  );
  useWelcomeToast.getState().show();
}

/** Development only: wipe everything and start onboarding again. */
export function resetForOnboarding(): void {
  if (!__DEV__) return;
  deleteAllData(db);
  useOnboarding.getState().reset();
}
