import { SKIN_ASSETS } from '@/lib/skin-assets';
import type {
  ClassicBackdropId,
  MetronomeConfig,
  RoomId,
  SkinCategoryId,
  SkinId,
} from '@/lib/types';

export type RoomFamily = 'classic' | 'immersive' | 'custom';

export type RoomDef = {
  id: RoomId;
  category: SkinCategoryId;
  family: RoomFamily;
  label: string;
  shortLabel: string;
  descriptor: string;
  /** Hardware theme used for chrome when this room is active. */
  themeSkin: SkinId;
  /** Immersive environment skin, if any. */
  immersiveSkin: SkinId | null;
  backdrop: ClassicBackdropId | null;
  enabled: boolean;
};

export const FALLBACK_ROOM: RoomId = 'beatline';

/** Stale product names. Never appear in Home / MIX / launch. Kept only for migration. */
export const STALE_ROOM_IDS = [
  'heart',
  'heavy',
  'roots',
  'sundown',
  'happy',
  'pulse-circle',
  'tempo',
  'orbit',
] as const;

export const CLASSIC_ROOM_ORDER: RoomId[] = [
  'beatline',
  'pulse',
  'dial',
  'pro',
  'smart-pendulum',
  'pendula-classic',
  'ledgear',
  'rig',
];

/** Active immersive Pockets. Custom/Altered before Studio. Whiskey Bar is a Coming Soon teaser only. */
export const IMMERSIVE_ROOM_ORDER: RoomId[] = ['altered', 'studio'];

export const CUSTOM_ROOM_ORDER: RoomId[] = ['customized'];

export const ROOM_ORDER: RoomId[] = [...CLASSIC_ROOM_ORDER, ...CUSTOM_ROOM_ORDER, ...IMMERSIVE_ROOM_ORDER];

export const ROOMS: Record<RoomId, RoomDef> = {
  beatline: {
    id: 'beatline',
    category: 'classic',
    family: 'classic',
    label: 'BEATLINE',
    shortLabel: 'Beatline',
    descriptor: 'Machined rail. Rotary tempo. Instrument-grade click.',
    themeSkin: 'titanium',
    immersiveSkin: null,
    backdrop: 'beatline',
    enabled: true,
  },
  pulse: {
    id: 'pulse',
    category: 'classic',
    family: 'classic',
    label: 'PULSE',
    shortLabel: 'Pulse',
    descriptor: 'Thin ring. Expanding beat.',
    themeSkin: 'titanium',
    immersiveSkin: null,
    backdrop: 'ring',
    enabled: true,
  },
  dial: {
    id: 'dial',
    category: 'classic',
    family: 'classic',
    label: 'DIAL',
    shortLabel: 'Dial',
    descriptor: 'Circular tempo. Segmented beat ring.',
    themeSkin: 'titanium',
    immersiveSkin: null,
    backdrop: 'dial',
    enabled: true,
  },
  pro: {
    id: 'pro',
    category: 'classic',
    family: 'classic',
    label: 'PRO',
    shortLabel: 'Pro',
    descriptor: 'Safe dial. Precision tempo.',
    themeSkin: 'classic',
    immersiveSkin: null,
    backdrop: 'pro',
    enabled: true,
  },
  'smart-pendulum': {
    id: 'smart-pendulum',
    category: 'classic',
    family: 'classic',
    label: 'SMART PENDULUM',
    shortLabel: 'Smart Pendulum',
    descriptor: 'Light pendulum. Practice. Program.',
    themeSkin: 'titanium',
    immersiveSkin: null,
    backdrop: 'smart',
    enabled: true,
  },
  'pulse-circle': {
    id: 'pulse-circle',
    category: 'classic',
    family: 'classic',
    label: 'ORBIT',
    shortLabel: 'Orbit',
    descriptor: 'Retired classic room.',
    themeSkin: 'titanium',
    immersiveSkin: null,
    backdrop: 'pulse',
    enabled: false,
  },
  ledgear: {
    id: 'ledgear',
    category: 'classic',
    family: 'classic',
    label: 'LEDGEAR',
    shortLabel: 'LEDGear',
    descriptor: 'LED hardware. Studio digits.',
    themeSkin: 'titanium',
    immersiveSkin: null,
    backdrop: 'ledgear',
    enabled: true,
  },
  rig: {
    id: 'rig',
    category: 'classic',
    family: 'classic',
    label: 'CONSOLE',
    shortLabel: 'Console',
    descriptor: 'Tap. Roller. Industrial click.',
    themeSkin: 'titanium',
    immersiveSkin: null,
    backdrop: 'rig',
    enabled: true,
  },
  'pendula-classic': {
    id: 'pendula-classic',
    category: 'classic',
    family: 'classic',
    label: 'MECHANICAL',
    shortLabel: 'Mechanical',
    descriptor: 'Wooden mechanical metronome.',
    themeSkin: 'titanium',
    immersiveSkin: null,
    backdrop: 'pendula',
    enabled: true,
  },
  tempo: {
    id: 'tempo',
    category: 'classic',
    family: 'classic',
    label: 'TEMPO',
    shortLabel: 'Tempo',
    descriptor: 'Retired classic room.',
    themeSkin: 'classic',
    immersiveSkin: null,
    backdrop: 'tempo',
    enabled: false,
  },
  beats: {
    id: 'beats',
    category: 'classic',
    family: 'classic',
    label: 'BEATS',
    shortLabel: 'Beats',
    descriptor: 'Speed trainer. Visual beats.',
    themeSkin: 'titanium',
    immersiveSkin: null,
    backdrop: 'beats',
    enabled: false,
  },
  customized: {
    id: 'customized',
    category: 'classic',
    family: 'custom',
    label: 'CUSTOM',
    shortLabel: 'Custom',
    descriptor: 'Your metronome. Your surface.',
    themeSkin: 'titanium',
    immersiveSkin: null,
    backdrop: 'custom',
    enabled: true,
  },
  studio: {
    id: 'studio',
    category: 'immersive',
    family: 'immersive',
    label: 'STUDIO',
    shortLabel: 'Studio',
    descriptor: 'Record. Lock. Groove.',
    themeSkin: 'studio',
    immersiveSkin: 'studio',
    backdrop: null,
    enabled: true,
  },
  altered: {
    id: 'altered',
    category: 'immersive',
    family: 'immersive',
    label: 'ALTERED',
    shortLabel: 'Altered',
    descriptor: 'Lose the grid. Find the groove.',
    themeSkin: 'altered',
    immersiveSkin: 'altered',
    backdrop: null,
    enabled: true,
  },
  'after-dark': {
    id: 'after-dark',
    category: 'immersive',
    family: 'immersive',
    label: 'AFTER DARK',
    shortLabel: 'After Dark',
    descriptor: 'Preserved immersive room. Not in the active lineup.',
    themeSkin: 'after-dark',
    immersiveSkin: 'after-dark',
    backdrop: null,
    enabled: false,
  },
  bar: {
    id: 'bar',
    category: 'immersive',
    family: 'immersive',
    label: 'WHISKEY BAR',
    shortLabel: 'Whiskey Bar',
    descriptor: 'Warm room. Brass stage. Locked in.',
    themeSkin: 'bar',
    immersiveSkin: 'bar',
    backdrop: null,
    enabled: false,
  },
  heart: {
    id: 'heart',
    category: 'immersive',
    family: 'immersive',
    label: 'HEART',
    shortLabel: 'Heart',
    descriptor: 'Retired immersive room.',
    themeSkin: 'heart',
    immersiveSkin: 'heart',
    backdrop: null,
    enabled: false,
  },
  heavy: {
    id: 'heavy',
    category: 'immersive',
    family: 'immersive',
    label: 'HEAVY',
    shortLabel: 'Heavy',
    descriptor: 'Retired immersive room.',
    themeSkin: 'heavy',
    immersiveSkin: 'heavy',
    backdrop: null,
    enabled: false,
  },
  roots: {
    id: 'roots',
    category: 'immersive',
    family: 'immersive',
    label: 'ROOTS',
    shortLabel: 'Roots',
    descriptor: 'Retired immersive room.',
    themeSkin: 'roots',
    immersiveSkin: 'roots',
    backdrop: null,
    enabled: false,
  },
  sundown: {
    id: 'sundown',
    category: 'immersive',
    family: 'immersive',
    label: 'SUNDOWN',
    shortLabel: 'Sundown',
    descriptor: 'Retired immersive room.',
    themeSkin: 'sundown',
    immersiveSkin: 'sundown',
    backdrop: null,
    enabled: false,
  },
};

export const CLASSIC_BACKDROP_ORDER: ClassicBackdropId[] = [
  'ledgear',
  'pulse',
  'ring',
  'pendula',
  'smart',
  'pro',
  'tempo',
  'beats',
  'beatline',
  'custom',
  'dial',
  'rig',
];

const LEGACY_ROOM: Record<string, RoomId> = {
  ledgear: 'ledgear',
  'pulse-circle': FALLBACK_ROOM,
  pulse: 'pulse',
  orbit: FALLBACK_ROOM,
  'pendula-classic': 'pendula-classic',
  'smart-pendulum': 'smart-pendulum',
  smart: 'smart-pendulum',
  pro: 'pro',
  tempo: FALLBACK_ROOM,
  beats: 'beatline',
  beatline: 'beatline',
  dial: 'dial',
  rig: 'rig',
  customized: 'customized',
  studio: 'studio',
  altered: 'altered',
  'after-dark': 'bar',
  bar: 'bar',
  heart: FALLBACK_ROOM,
  'classic-titanium': 'pulse',
  'classic-heavy': 'pendula-classic',
  'classic-roots': 'ledgear',
  'classic-custom': 'customized',
  titanium: 'pulse',
  classic: 'pro',
  heavy: FALLBACK_ROOM,
  roots: FALLBACK_ROOM,
  sundown: FALLBACK_ROOM,
  happy: FALLBACK_ROOM,
};

const LEGACY_BACKDROP: Record<string, ClassicBackdropId> = {
  ledgear: 'ledgear',
  pulse: 'pulse',
  ring: 'ring',
  aura: 'ring',
  pendula: 'pendula',
  smart: 'smart',
  pro: 'pro',
  tempo: 'tempo',
  beats: 'beatline',
  beatline: 'beatline',
  custom: 'custom',
  dial: 'dial',
  rig: 'rig',
  titanium: 'pulse',
  heavy: 'pendula',
  roots: 'ledgear',
};

const STALE_SET = new Set<string>(STALE_ROOM_IDS);

export function isStaleRoomId(value: unknown): boolean {
  return typeof value === 'string' && STALE_SET.has(value);
}

export function isActiveRoomId(value: unknown): value is RoomId {
  return (
    typeof value === 'string' &&
    (ROOM_ORDER as readonly string[]).includes(value) &&
    ROOMS[value as RoomId]?.enabled === true
  );
}

export function isRoomId(value: unknown): value is RoomId {
  return isActiveRoomId(value);
}

export function isClassicBackdropId(value: unknown): value is ClassicBackdropId {
  return typeof value === 'string' && (CLASSIC_BACKDROP_ORDER as readonly string[]).includes(value);
}

export function migrateRoomId(value: unknown): RoomId {
  if (typeof value !== 'string') return FALLBACK_ROOM;
  if (isStaleRoomId(value)) return FALLBACK_ROOM;
  if (value in LEGACY_ROOM) {
    const next = LEGACY_ROOM[value];
    return isActiveRoomId(next) ? next : FALLBACK_ROOM;
  }
  return FALLBACK_ROOM;
}

export function migrateClassicBackdrop(value: unknown): ClassicBackdropId {
  if (typeof value === 'string' && value in LEGACY_BACKDROP) return LEGACY_BACKDROP[value];
  return 'beatline';
}

export function firstRoomInCategory(category: SkinCategoryId): RoomId {
  if (category === 'classic') return FALLBACK_ROOM;
  return IMMERSIVE_ROOM_ORDER.find((id) => ROOMS[id]?.enabled) ?? FALLBACK_ROOM;
}

export function categoryStartIndex(category: SkinCategoryId): number {
  return category === 'classic' ? roomIndex(FALLBACK_ROOM) : CLASSIC_ROOM_ORDER.length + CUSTOM_ROOM_ORDER.length;
}

export function categoryForRoom(id: RoomId): SkinCategoryId {
  return (ROOMS[id] ?? ROOMS[FALLBACK_ROOM]).category;
}

export function familyForRoom(id: RoomId): RoomFamily {
  return (ROOMS[id] ?? ROOMS[FALLBACK_ROOM]).family;
}

export function roomIndex(id: RoomId): number {
  const index = ROOM_ORDER.indexOf(id);
  return index >= 0 ? index : roomIndex(FALLBACK_ROOM);
}

export function roomFromIndex(index: number): RoomId {
  return ROOM_ORDER[Math.max(0, Math.min(ROOM_ORDER.length - 1, index))] ?? FALLBACK_ROOM;
}

export function roomPreviewAsset(id: RoomId): number | undefined {
  const room = ROOMS[id];
  if (!room || room.family !== 'immersive') return undefined;
  const skin = room.immersiveSkin ?? room.themeSkin;
  return SKIN_ASSETS[skin].landing ?? SKIN_ASSETS[skin].hero;
}

export function classicBackdropAsset(_backdrop: ClassicBackdropId): number | undefined {
  return undefined;
}

export function isClassicExperience(config: Pick<MetronomeConfig, 'skinCategory'>): boolean {
  return config.skinCategory === 'classic';
}

/** Pulse owns backdrop `ring`. Retired Orbit backdrop `pulse` and Tempo migrate to Beatline. */
export function classicBackdropToRoom(backdrop: ClassicBackdropId): RoomId {
  if (backdrop === 'ledgear') return 'ledgear';
  if (backdrop === 'ring') return 'pulse';
  if (backdrop === 'pulse') return FALLBACK_ROOM;
  if (backdrop === 'pendula') return 'pendula-classic';
  if (backdrop === 'smart') return 'smart-pendulum';
  if (backdrop === 'pro') return 'pro';
  if (backdrop === 'tempo') return FALLBACK_ROOM;
  if (backdrop === 'beats') return FALLBACK_ROOM;
  if (backdrop === 'beatline') return 'beatline';
  if (backdrop === 'dial') return 'dial';
  if (backdrop === 'rig') return 'rig';
  if (backdrop === 'custom') return 'customized';
  return FALLBACK_ROOM;
}

const STALE_SKINS = new Set<SkinId>(['heart', 'heavy', 'roots', 'sundown']);

export function roomIdFromConfig(
  config: Pick<MetronomeConfig, 'skin' | 'skinCategory' | 'classicBackdrop'>
): RoomId {
  if (config.skinCategory === 'classic') {
    return classicBackdropToRoom(migrateClassicBackdrop(config.classicBackdrop));
  }
  if (config.skin === 'after-dark' || config.skin === 'bar') {
    return isActiveRoomId('bar') ? 'bar' : FALLBACK_ROOM;
  }
  if (STALE_SKINS.has(config.skin)) return 'studio';
  const migrated = migrateRoomId(config.skin);
  return ROOMS[migrated]?.family === 'immersive' && ROOMS[migrated]?.enabled ? migrated : 'studio';
}

export function roomToConfigPatch(
  id: RoomId
): Pick<MetronomeConfig, 'skin' | 'skinCategory'> & Partial<Pick<MetronomeConfig, 'classicBackdrop'>> {
  const room = ROOMS[id]?.enabled ? ROOMS[id] : ROOMS[FALLBACK_ROOM];
  if (room.category === 'classic') {
    return {
      skin: room.themeSkin,
      skinCategory: 'classic',
      classicBackdrop: room.backdrop ?? 'pulse',
    };
  }
  return {
    skin: room.themeSkin,
    skinCategory: 'immersive',
  };
}

export function roomLabel(id: RoomId): string {
  return (ROOMS[id] ?? ROOMS[FALLBACK_ROOM]).label;
}

export function roomShortLabel(id: RoomId): string {
  return (ROOMS[id] ?? ROOMS[FALLBACK_ROOM]).shortLabel;
}

export function roomA11yLabel(id: RoomId): string {
  const room = ROOMS[id] ?? ROOMS[FALLBACK_ROOM];
  const family =
    room.family === 'classic' ? 'Classic room' : room.family === 'immersive' ? 'Immersive room' : 'Custom room';
  return `${room.shortLabel}, ${family}`;
}
