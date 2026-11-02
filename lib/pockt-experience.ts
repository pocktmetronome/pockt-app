import {
  FALLBACK_ROOM,
  isActiveRoomId,
  ROOM_ORDER,
  ROOMS,
  roomIdFromConfig,
  roomToConfigPatch,
} from '@/constants/rooms';
import type { MetronomeConfig, RoomId } from '@/lib/types';

/** Default professional View for first install and invalid last-used rooms. */
export const DEFAULT_LAUNCH_VIEW: RoomId = FALLBACK_ROOM;

/**
 * POCKT 2.0 Open → Play never restores transport. The engine stays ready.
 * Playback is always a user action after launch.
 */
export const RESTORE_PLAYBACK_ON_LAUNCH = false;

export function shouldRestorePlaybackOnLaunch(): false {
  return RESTORE_PLAYBACK_ON_LAUNCH;
}

/** Active Pockets in catalog order. Disabled rooms (Whiskey Bar) are excluded. */
export function activeViewOrder(): RoomId[] {
  return ROOM_ORDER.filter((id) => ROOMS[id]?.enabled === true);
}

export function isSelectableView(id: unknown): id is RoomId {
  return isActiveRoomId(id);
}

export function resolveActiveViewId(id: unknown): RoomId {
  return isSelectableView(id) ? id : DEFAULT_LAUNCH_VIEW;
}

export function resolveLaunchView(
  config: Pick<MetronomeConfig, 'skin' | 'skinCategory' | 'classicBackdrop'>
): RoomId {
  return resolveActiveViewId(roomIdFromConfig(config));
}

/**
 * Patch a persisted config off a disabled / retired View without touching musical state.
 * Returns null when the current mapping is already an active View.
 */
export function migrateDisabledExperience(
  config: Pick<MetronomeConfig, 'skin' | 'skinCategory' | 'classicBackdrop'>
): ReturnType<typeof roomToConfigPatch> | null {
  if (config.skin === 'bar' || config.skin === 'after-dark') {
    return roomToConfigPatch(DEFAULT_LAUNCH_VIEW);
  }
  const id = roomIdFromConfig(config);
  if (!isSelectableView(id)) return roomToConfigPatch(DEFAULT_LAUNCH_VIEW);
  return null;
}

/**
 * View switch patch: skin / backdrop only. Callers must not merge room-entry mix or sound.
 * Musical configuration stays on the existing metronome config.
 */
export function viewSwitchPatch(id: RoomId): ReturnType<typeof roomToConfigPatch> {
  return roomToConfigPatch(resolveActiveViewId(id));
}
