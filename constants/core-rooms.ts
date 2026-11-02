import type { SkinId } from '@/lib/types';

export type CoverFocal = {
  x: number;
  y: number;
};

export type CoreRoomId = Extract<SkinId, 'heavy' | 'roots' | 'sundown'>;

export type CoreRoomSpec = {
  landingFocal: CoverFocal;
  landingZoom: number;
  roomFocal: CoverFocal;
  enterMs: number;
  landingEndScale: number;
  roomStartScale: number;
  fallback: string;
};

/**
 * World rooms share cover math. Landing uses a tighter doorway crop.
 * In-room plates stay at cover 1.0 so the environment fills the viewport.
 */
export const CORE_ROOMS: Record<CoreRoomId, CoreRoomSpec> = {
  heavy: {
    landingFocal: { x: 0.5, y: 0.4 },
    landingZoom: 1.16,
    roomFocal: { x: 0.5, y: 0.44 },
    enterMs: 480,
    landingEndScale: 1.045,
    roomStartScale: 1.012,
    fallback: '#070708',
  },
  roots: {
    landingFocal: { x: 0.5, y: 0.38 },
    landingZoom: 1.14,
    roomFocal: { x: 0.5, y: 0.46 },
    enterMs: 560,
    landingEndScale: 1.03,
    roomStartScale: 1.008,
    fallback: '#120E0A',
  },
  sundown: {
    landingFocal: { x: 0.5, y: 0.36 },
    landingZoom: 1.15,
    roomFocal: { x: 0.5, y: 0.48 },
    enterMs: 520,
    landingEndScale: 1.035,
    roomStartScale: 1.01,
    fallback: '#16100C',
  },
};

export function isCoreRoom(skin: SkinId): skin is CoreRoomId {
  return skin === 'heavy' || skin === 'roots' || skin === 'sundown';
}
