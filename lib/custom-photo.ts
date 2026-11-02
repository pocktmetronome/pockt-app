import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { sanitizePhotoUri } from '@/lib/photo-uri';

export { sanitizePhotoUri };

const PHOTO_PREFIX = 'pockt-classic-photo';

export type CustomPhotoPick =
  | { status: 'picked'; uri: string }
  | { status: 'canceled' }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'failed' };

let picking = false;

function photoDirectory(): Directory {
  return new Directory(Paths.document);
}

function uniquePhotoFile(): File {
  return new File(Paths.document, `${PHOTO_PREFIX}-${Date.now()}.jpg`);
}

function listStoredPhotos(): File[] {
  try {
    const entries = photoDirectory().list();
    return entries.filter((entry): entry is File => {
      return entry instanceof File && entry.uri.includes(PHOTO_PREFIX);
    });
  } catch {
    return [];
  }
}

async function copyPickerUri(sourceUri: string, dest: File): Promise<boolean> {
  try {
    const source = new File(sourceUri);
    if (source.exists) {
      source.copy(dest);
      if (dest.exists) return true;
    }
  } catch {
    /* try the next path */
  }

  try {
    await File.downloadFileAsync(sourceUri, dest);
    if (dest.exists) return true;
  } catch {
    /* try the next path */
  }

  try {
    const legacy = await import('expo-file-system/legacy');
    await legacy.copyAsync({ from: sourceUri, to: dest.uri });
    return dest.exists;
  } catch {
    return dest.exists;
  }
}

function removeStoredPhotos(keepUri?: string | null): void {
  for (const file of listStoredPhotos()) {
    if (keepUri && file.uri === keepUri) continue;
    try {
      if (file.exists) file.delete();
    } catch {
      /* ignore */
    }
  }
}

export async function persistCustomPhoto(sourceUri: string): Promise<string | null> {
  try {
    if (!sourceUri) return null;
    const dest = uniquePhotoFile();
    const copied = await copyPickerUri(sourceUri, dest);
    if (!copied) return null;
    removeStoredPhotos(dest.uri);
    return dest.uri;
  } catch {
    return null;
  }
}

export async function removeCustomPhoto(uri: string | null): Promise<void> {
  try {
    removeStoredPhotos(null);
    if (uri) {
      const extra = new File(uri);
      if (extra.exists) extra.delete();
    }
  } catch {
    /* ignore */
  }
}

export async function pickCustomPhoto(): Promise<CustomPhotoPick> {
  if (picking) return { status: 'canceled' };
  picking = true;
  try {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!current.granted) {
      if (current.status === 'denied' && current.canAskAgain === false) {
        return { status: 'denied', canAskAgain: false };
      }
      const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!requested.granted) {
        return { status: 'denied', canAskAgain: requested.canAskAgain !== false };
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.92,
      exif: false,
    });

    if (result.canceled || !result.assets[0]?.uri) return { status: 'canceled' };
    const uri = await persistCustomPhoto(result.assets[0].uri);
    if (!uri) return { status: 'failed' };
    return { status: 'picked', uri };
  } catch {
    return { status: 'failed' };
  } finally {
    picking = false;
  }
}
