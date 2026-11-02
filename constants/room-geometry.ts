/**
 * One shared metronome chrome/BPM geometry for every room.
 * When the privacy shade is up, only the hanging P is visible — no curtain sheet.
 * HOME / MIX stay in the nav zone. The P hangs from the top edge on a cord.
 */
export const ROOM_NAV_HEIGHT = 48;
export const ROOM_CHROME_PAD = 4;
export const ROOM_CURTAIN_HANDLE = 52;
export const ROOM_CURTAIN_OPEN_EXTRA = 8;
export const ROOM_BPM_BREATH = 18;
export const ROOM_PRIVACY_BLOCKER = 0.12;
export const ROOM_PRIVACY_CURTAIN = 0.86;

export type RoomGeometry = {
  safeAreaTop: number;
  chromeTop: number;
  navHeight: number;
  curtainOpenHeight: number;
  curtainHandleTop: number;
  bpmTop: number;
};

export function roomGeometry(safeAreaTop: number): RoomGeometry {
  const safe = Math.max(0, safeAreaTop);
  const chromeTop = safe + ROOM_CHROME_PAD;
  const curtainOpenHeight = chromeTop + ROOM_NAV_HEIGHT + ROOM_CURTAIN_OPEN_EXTRA;
  return {
    safeAreaTop: safe,
    chromeTop,
    navHeight: ROOM_NAV_HEIGHT,
    curtainOpenHeight,
    curtainHandleTop: chromeTop,
    bpmTop: curtainOpenHeight + ROOM_BPM_BREATH,
  };
}
