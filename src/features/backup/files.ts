// Reading and writing the .lumo file on the phone (./backup.ts is the format).

import { File, Paths } from 'expo-file-system';
import { db } from '@/db/client';
import { useOnboarding } from '@/features/onboarding/store';
import { deletePhotoFile } from '@/features/profile/photo';
import { getProfile } from '@/features/profile/repo';
import { type Backup, BACKUP_EXTENSION, buildBackup, parseBackup, restoreBackup } from './backup';

/** Writes everything into `<name>.lumo` in the cache, ready for the share sheet. */
export async function writeBackupFile(name: string): Promise<File> {
  const photoUri = getProfile(db)?.photoUri;
  const photoFile = photoUri ? new File(photoUri) : null;
  const photo = photoFile?.exists ? await photoFile.base64() : null;
  const target = new File(Paths.cache, `${name}.${BACKUP_EXTENSION}`);
  if (target.exists) target.delete();
  await target.write(JSON.stringify(buildBackup(db, photo)));
  return target;
}

/** Opens Files to choose a backup. `null` when cancelled; throws a BackupError for other files. */
export async function pickBackup(): Promise<Backup | null> {
  const picked = await File.pickFileAsync({ mimeTypes: '*/*' });
  if (picked.canceled) return null;
  return parseBackup(await picked.result.text());
}

/** Replaces everything on this phone with the backup, photo included. */
export async function restoreFromBackup(backup: Backup): Promise<void> {
  const oldPhoto = getProfile(db)?.photoUri;
  let photoUri: string | null = null;
  if (backup.photo) {
    const file = new File(Paths.document, `profile-photo-${Date.now()}.jpg`);
    await file.write(backup.photo, { encoding: 'base64' });
    photoUri = file.uri;
  }
  try {
    restoreBackup(db, backup, photoUri);
  } catch (e) {
    deletePhotoFile(photoUri);
    throw e;
  }
  deletePhotoFile(oldPhoto);
  useOnboarding.getState().reset();
}
