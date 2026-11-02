import { ROOMS } from '@/constants/rooms';
import type { RoomId } from '@/lib/types';

/**
 * DIAL is the landing numbered instrument.
 * RHYTHM is the segmented face, not a separate room.
 * Mechanical stays in the catalog and off the primary rail.
 */
export const PRIMARY_FACE_ORDER = ['dial', 'pulse', 'smart-pendulum', 'pro', 'beatline'] as const;

export const RHYTHM_RAIL_ID = 'rhythm' as const;

export const FACE_RAIL_ORDER = ['dial', RHYTHM_RAIL_ID, 'pulse', 'smart-pendulum', 'pro', 'beatline'] as const;

export type FaceRailId = (typeof FACE_RAIL_ORDER)[number];

export const DORMANT_FACE_ORDER = ['pendula-classic', 'ledgear'] as const;

export const INSTRUMENT_FACE_ORDER = [...PRIMARY_FACE_ORDER, ...DORMANT_FACE_ORDER] as const;

export type InstrumentFaceId = (typeof INSTRUMENT_FACE_ORDER)[number];

export type PrimaryFaceId = (typeof PRIMARY_FACE_ORDER)[number];

export type InstrumentFaceSpec = {
  id: InstrumentFaceId;
  label: string;
  short: string;
  rail: string;
  /** Shared beat strip is used when the face has no distinctive beat hardware. */
  sharedBeats: boolean;
};

export const INSTRUMENT_FACES: Record<InstrumentFaceId, InstrumentFaceSpec> = {
  dial: { id: 'dial', label: 'CLASSIC DIAL', short: 'DIAL', rail: 'DIAL', sharedBeats: true },
  pulse: { id: 'pulse', label: 'PULSE', short: 'PULSE', rail: 'PULSE', sharedBeats: false },
  'smart-pendulum': {
    id: 'smart-pendulum',
    label: 'SMART PENDULUM',
    short: 'SMART',
    rail: 'PENDULUM',
    sharedBeats: false,
  },
  pro: { id: 'pro', label: 'CLASSIC PRO', short: 'PRO', rail: 'PRO', sharedBeats: false },
  beatline: { id: 'beatline', label: 'BEATLINE', short: 'BEAT', rail: 'BEATLINE', sharedBeats: false },
  'pendula-classic': {
    id: 'pendula-classic',
    label: 'CLASSIC MECHANICAL',
    short: 'MECH',
    rail: 'MECHANICAL',
    sharedBeats: true,
  },
  ledgear: { id: 'ledgear', label: 'CLASSIC LED GEAR', short: 'LED', rail: 'LED GEAR', sharedBeats: false },
};

export function isInstrumentFace(id: unknown): id is InstrumentFaceId {
  return typeof id === 'string' && (INSTRUMENT_FACE_ORDER as readonly string[]).includes(id);
}

export function isPrimaryInstrumentFace(id: unknown): id is (typeof PRIMARY_FACE_ORDER)[number] {
  return typeof id === 'string' && (PRIMARY_FACE_ORDER as readonly string[]).includes(id);
}

export function instrumentFaceLabel(id: RoomId): string {
  if (isInstrumentFace(id)) return INSTRUMENT_FACES[id].label;
  return ROOMS[id]?.label ?? 'POCKT';
}

export function instrumentFaceShort(id: RoomId): string {
  if (isInstrumentFace(id)) return INSTRUMENT_FACES[id].short;
  return ROOMS[id]?.shortLabel ?? 'POCKT';
}
