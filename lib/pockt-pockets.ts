import {
  CLASSIC_ROOM_ORDER,
  CUSTOM_ROOM_ORDER,
  IMMERSIVE_ROOM_ORDER,
  isActiveRoomId,
  ROOMS,
} from '@/constants/rooms';
import type { LibraryState } from '@/lib/library';
import type { RoomId } from '@/lib/types';

/** The one user-facing destination for choosing a metronome experience. */
export const POCKET_SELECTOR_TITLE = 'CHOOSE YOUR POCKET';

export const WHISKEY_BAR_TEASER_ID = 'bar' as const;

export const IMMERSIVE_POCKET_PRIORITY: RoomId[] = [...CUSTOM_ROOM_ORDER, 'altered', 'studio'];

export type PocketSelectorItem =
  | { kind: 'pocket'; id: RoomId }
  | { kind: 'teaser'; id: typeof WHISKEY_BAR_TEASER_ID };

/**
 * Existing installs already have a last-used Pocket.
 * First-use discovery is only for a true empty install.
 */
export function migratePocketDiscovery(library: LibraryState, hadPersistedSettings: boolean): LibraryState {
  if (library.pocketDiscoveryComplete) return library;
  if (hadPersistedSettings || library.hasEnteredRoom || library.recentRooms.length > 0) {
    return { ...library, pocketDiscoveryComplete: true };
  }
  return library;
}

export function needsFirstPocketChoice(library: LibraryState): boolean {
  return library.pocketDiscoveryComplete !== true;
}

export function markPocketChosen(library: LibraryState, id: RoomId): LibraryState {
  const next: LibraryState = {
    ...library,
    pocketDiscoveryComplete: true,
    hasEnteredRoom: true,
    recentRooms: [id, ...library.recentRooms.filter((room) => room !== id)].slice(0, 8),
  };
  return next;
}

/** Canonical Pocket catalog: classics, then Custom / Altered / Studio. Bar is not enterable. */
export function pocketCatalogOrder(): RoomId[] {
  const seen = new Set<RoomId>();
  const next: RoomId[] = [];
  for (const id of [...CLASSIC_ROOM_ORDER, ...IMMERSIVE_POCKET_PRIORITY]) {
    if (!isActiveRoomId(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  for (const id of IMMERSIVE_ROOM_ORDER) {
    if (!isActiveRoomId(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

/**
 * Selector order: current, recents, remaining catalog.
 * Never alphabetize. Immersive emphasis: Custom, Altered, then Studio.
 */
export function pocketSelectorOrder(library: LibraryState, activeId: RoomId): RoomId[] {
  const catalog = pocketCatalogOrder();
  const seen = new Set<RoomId>();
  const next: RoomId[] = [];
  const push = (id: RoomId) => {
    if (!isActiveRoomId(id) || seen.has(id)) return;
    seen.add(id);
    next.push(id);
  };
  push(activeId);
  for (const id of library.recentRooms) push(id);
  for (const id of library.favoriteRooms) push(id);
  for (const id of catalog) push(id);
  return next;
}

export function pocketSelectorHero(library: LibraryState, activeId: RoomId, discover: boolean): RoomId | null {
  if (discover) return null;
  if (isPocketEnterable(activeId)) return activeId;
  return library.recentRooms.find((id) => isPocketEnterable(id)) ?? null;
}

export function pocketSelectorGridItems(
  library: LibraryState,
  activeId: RoomId,
  hero: RoomId | null
): PocketSelectorItem[] {
  const items: PocketSelectorItem[] = pocketCatalogOrder()
    .filter((id) => id !== hero)
    .map((id) => ({ kind: 'pocket' as const, id }));
  items.push({ kind: 'teaser', id: WHISKEY_BAR_TEASER_ID });
  return items;
}

export function pocketSelectorItems(library: LibraryState, activeId: RoomId): PocketSelectorItem[] {
  const hero = pocketSelectorHero(library, activeId, false);
  const items: PocketSelectorItem[] = [];
  if (hero) items.push({ kind: 'pocket', id: hero });
  items.push(...pocketSelectorGridItems(library, activeId, hero));
  return items;
}

export function isPocketEnterable(id: unknown): id is RoomId {
  return isActiveRoomId(id) && id !== WHISKEY_BAR_TEASER_ID;
}

export function whiskeyBarTeaserLabel(): { title: string; status: string } {
  return {
    title: ROOMS.bar.shortLabel,
    status: 'COMING SOON',
  };
}
