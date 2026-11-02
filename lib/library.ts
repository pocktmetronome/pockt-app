import { isActiveRoomId, isStaleRoomId, ROOM_ORDER } from '@/constants/rooms';
import { sanitizeClassicOrder, sanitizeImmersiveOrder } from '@/lib/room-order';
import type { LaunchBehavior, RoomId } from '@/lib/types';

export type LibraryState = {
  version: 1;
  launchBehavior: LaunchBehavior;
  favoriteRooms: RoomId[];
  recentRooms: RoomId[];
  favoriteRoom: RoomId | null;
  hasEnteredRoom: boolean;
  /** True after the user has chosen a Pocket, or after migrating an existing install. */
  pocketDiscoveryComplete: boolean;
  classicRoomOrder: RoomId[];
  immersiveRoomOrder: RoomId[];
};

export const DEFAULT_LIBRARY: LibraryState = {
  version: 1,
  launchBehavior: 'last',
  favoriteRooms: [],
  recentRooms: [],
  favoriteRoom: null,
  hasEnteredRoom: false,
  pocketDiscoveryComplete: false,
  classicRoomOrder: sanitizeClassicOrder(null),
  immersiveRoomOrder: sanitizeImmersiveOrder(null),
};

function asLaunchBehavior(value: unknown): LaunchBehavior {
  if (value === 'favorite' || value === 'gallery' || value === 'last') return value;
  return 'last';
}

export function sanitizeLibrary(raw: unknown): LibraryState {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const favoriteRooms = uniqueRooms(source.favoriteRooms);
  const recentRooms = uniqueRooms(source.recentRooms);
  const favoriteRoom =
    typeof source.favoriteRoom === 'string' && isActiveRoomId(source.favoriteRoom)
      ? source.favoriteRoom
      : favoriteRooms[0] ?? null;
  const hasEnteredRoom = source.hasEnteredRoom === true;
  const pocketDiscoveryComplete =
    source.pocketDiscoveryComplete === true || hasEnteredRoom || recentRooms.length > 0;
  return {
    version: 1,
    launchBehavior: asLaunchBehavior(source.launchBehavior) === 'gallery' ? 'last' : asLaunchBehavior(source.launchBehavior),
    favoriteRooms,
    recentRooms,
    favoriteRoom,
    hasEnteredRoom,
    pocketDiscoveryComplete,
    classicRoomOrder: sanitizeClassicOrder(source.classicRoomOrder),
    immersiveRoomOrder: sanitizeImmersiveOrder(source.immersiveRoomOrder),
  };
}

export function toggleFavorite(state: LibraryState, id: RoomId): LibraryState {
  const has = state.favoriteRooms.includes(id);
  const favoriteRooms = has ? state.favoriteRooms.filter((room) => room !== id) : [id, ...state.favoriteRooms];
  return {
    ...state,
    favoriteRooms,
    favoriteRoom: has && state.favoriteRoom === id ? favoriteRooms[0] ?? null : has ? state.favoriteRoom : id,
  };
}

export function rememberRecent(state: LibraryState, id: RoomId): LibraryState {
  return {
    ...state,
    hasEnteredRoom: true,
    pocketDiscoveryComplete: true,
    recentRooms: [id, ...state.recentRooms.filter((room) => room !== id)].slice(0, 8),
  };
}

export function isFavorite(state: LibraryState, id: RoomId): boolean {
  return state.favoriteRooms.includes(id);
}

function uniqueRooms(value: unknown): RoomId[] {
  if (!Array.isArray(value)) return [];
  const next: RoomId[] = [];
  for (const item of value) {
    if (isStaleRoomId(item)) continue;
    if (typeof item === 'string' && isActiveRoomId(item) && ROOM_ORDER.includes(item) && !next.includes(item)) {
      next.push(item);
    }
  }
  return next;
}
