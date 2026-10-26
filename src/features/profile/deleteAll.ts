import { db } from '@/db/client';
import { deleteAllData } from '@/db/seed';
import { useOnboarding } from '@/features/onboarding/store';
import { getProfile } from './repo';
import { deletePhotoFile } from './photo';

/**
 * "Delete everything" (ADR 0001): every row on this phone and the profile
 * photo. With no profile left, the app goes back to Welcome on its own.
 */
export function deleteEverything(): void {
  deletePhotoFile(getProfile(db)?.photoUri);
  deleteAllData(db);
  useOnboarding.getState().reset();
}
