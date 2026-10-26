// The profile photo: picked from the camera or library, cropped to the circle,
// kept as a small JPEG in the app's own documents. It never leaves the phone
// (ADR 0001).

import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type PickedPhoto = { uri: string; width: number; height: number };

/** Opens the camera or the library. `null` when cancelled or not allowed. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickedPhoto | null> {
  // The camera needs permission. The library doesn't: the system picker only
  // hands over the one photo the person chooses.
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: 'images',
    allowsEditing: false,
    quality: 1,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  return asset ? { uri: asset.uri, width: asset.width, height: asset.height } : null;
}

/** Side of the saved photo in pixels: sharp at 104pt on a 3× screen. */
const SAVED_SIZE = 512;

/**
 * Crops, shrinks and saves the photo into the app's documents. Returns its
 * file URI; a new name each time so images never show a stale copy.
 */
export async function savePhoto(
  uri: string,
  crop: { originX: number; originY: number; width: number; height: number },
): Promise<string> {
  const rendered = await ImageManipulator.manipulate(uri)
    .crop(crop)
    .resize({ width: SAVED_SIZE, height: SAVED_SIZE })
    .renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  const target = new File(Paths.document, `profile-photo-${Date.now()}.jpg`);
  await new File(saved.uri).copy(target);
  return target.uri;
}

/** Deletes an old photo file, if it's still there. */
export function deletePhotoFile(uri: string | null | undefined): void {
  if (!uri) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}
