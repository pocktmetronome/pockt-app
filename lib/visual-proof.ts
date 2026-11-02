import { defaultAccentPattern } from '@/lib/accents';
import type { AccentLevel, TimeSignatureId } from '@/lib/types';
import type { TunerReading } from '@/lib/tuner-math';

export type ProofRail = 'dial' | 'rhythm' | 'pulse' | 'smart-pendulum' | 'pro' | 'beatline';

export type ProofFrame = {
  id: string;
  rail: ProofRail;
  tuner: boolean;
  width: number;
  height: number;
  playing: boolean;
  meter: TimeSignatureId;
  beatIndex: number;
  accents: AccentLevel[];
  fronts?: { progress: number; strength: number }[];
  pendulumAngle?: number | null;
  pendulumHeld?: boolean;
  phase?: number | null;
  reading?: TunerReading | null;
  trailCents?: number[];
};

const PHONE = { width: 390, height: 844 };

function accents(meter: TimeSignatureId): AccentLevel[] {
  if (meter === '4/4') return ['strong', 'normal', 'soft', 'mute'];
  return defaultAccentPattern(meter);
}

function frame(
  id: string,
  rail: ProofRail,
  extra: Partial<ProofFrame> & { meter?: TimeSignatureId } = {}
): ProofFrame {
  const meter = extra.meter ?? '4/4';
  return {
    id,
    rail,
    tuner: false,
    width: PHONE.width,
    height: PHONE.height,
    playing: false,
    meter,
    beatIndex: 0,
    accents: accents(meter),
    pendulumAngle: null,
    phase: null,
    reading: null,
    ...extra,
  };
}

export function proofTunerReading(cents: number): TunerReading {
  const state = Math.abs(cents) < 0.5 ? 'in-tune' : cents < 0 ? 'flat' : 'sharp';
  return {
    frequency: 164.81,
    midi: 52,
    note: 'E',
    octave: 3,
    cents,
    state,
    confidence: 0.92,
  };
}

export const PROOF_SHOTS: ProofFrame[] = [
  frame('01_DIAL_STOPPED', 'dial'),
  frame('02_DIAL_PLAYING', 'dial', { playing: true, beatIndex: 0 }),
  frame('03_RHYTHM_STOPPED_4-4', 'rhythm'),
  frame('04_RHYTHM_BEAT1_4-4', 'rhythm', { playing: true, beatIndex: 0 }),
  frame('05_RHYTHM_BEAT3_4-4', 'rhythm', { playing: true, beatIndex: 2 }),
  frame('06_RHYTHM_7-8', 'rhythm', { playing: true, meter: '7/8', beatIndex: 0 }),
  frame('07_RHYTHM_12-8', 'rhythm', { playing: true, meter: '12/8', beatIndex: 0 }),
  frame('08_PULSE_STOPPED', 'pulse', { fronts: [] }),
  frame('09_PULSE_ORIGIN', 'pulse', { playing: true, fronts: [{ progress: 0.02, strength: 1 }] }),
  frame('10_PULSE_25_PERCENT', 'pulse', { playing: true, fronts: [{ progress: 0.25, strength: 0.75 }] }),
  frame('11_PULSE_50_PERCENT', 'pulse', { playing: true, fronts: [{ progress: 0.5, strength: 0.75 }] }),
  frame('12_PULSE_75_PERCENT', 'pulse', { playing: true, fronts: [{ progress: 0.75, strength: 0.75 }] }),
  frame('13_PULSE_MULTIPLE_WAVES', 'pulse', {
    playing: true,
    fronts: [
      { progress: 0.18, strength: 1 },
      { progress: 0.46, strength: 0.7 },
      { progress: 0.72, strength: 0.4 },
    ],
  }),
  frame('14_PENDULUM_CENTER', 'smart-pendulum', { pendulumAngle: 0 }),
  frame('15_PENDULUM_LEFT', 'smart-pendulum', { pendulumAngle: -32 }),
  frame('16_PENDULUM_RIGHT', 'smart-pendulum', { pendulumAngle: 32 }),
  frame('17_PENDULUM_GRABBED', 'smart-pendulum', { pendulumAngle: 18, pendulumHeld: true }),
  frame('18_PRO_STOPPED_4-4', 'pro', { phase: 0 }),
  frame('19_PRO_PLAYING_4-4', 'pro', { playing: true, beatIndex: 1, phase: 0.62 }),
  frame('20_PRO_7-8', 'pro', { playing: true, meter: '7/8', beatIndex: 3, phase: -0.4 }),
  frame('21_PRO_12-8', 'pro', { playing: true, meter: '12/8', beatIndex: 6, phase: 0.25 }),
  frame('22_BEATLINE_STOPPED_4-4', 'beatline'),
  frame('23_BEATLINE_BEAT1_4-4', 'beatline', { playing: true, beatIndex: 0 }),
  frame('24_BEATLINE_BEAT3_4-4', 'beatline', { playing: true, beatIndex: 2 }),
  frame('25_BEATLINE_7-8', 'beatline', { playing: true, meter: '7/8', beatIndex: 4 }),
  frame('26_BEATLINE_12-8', 'beatline', { playing: true, meter: '12/8', beatIndex: 0 }),
  frame('27_TUNER_NO_PITCH', 'dial', { tuner: true, reading: null }),
  frame('28_TUNER_E3_MINUS25', 'dial', { tuner: true, reading: proofTunerReading(-25), trailCents: [-25] }),
  frame('29_TUNER_E3_MINUS5', 'dial', { tuner: true, reading: proofTunerReading(-5), trailCents: [-25, -12, -5] }),
  frame('30_TUNER_E3_IN_TUNE', 'dial', { tuner: true, reading: proofTunerReading(0), trailCents: [-16, -6, 0] }),
  frame('31_TUNER_E3_PLUS5', 'dial', { tuner: true, reading: proofTunerReading(5), trailCents: [-4, 1, 5] }),
  frame('32_TUNER_E3_PLUS25', 'dial', { tuner: true, reading: proofTunerReading(25), trailCents: [-25, -10, 0, 10, 25] }),
];

export const FACE_REVIEW_IDS = [
  '03_RHYTHM_STOPPED_4-4',
  '13_PULSE_MULTIPLE_WAVES',
  '14_PENDULUM_CENTER',
  '19_PRO_PLAYING_4-4',
  '23_BEATLINE_BEAT1_4-4',
  '30_TUNER_E3_IN_TUNE',
];

export const MOTION_REVIEW_IDS = [
  '09_PULSE_ORIGIN',
  '10_PULSE_25_PERCENT',
  '11_PULSE_50_PERCENT',
  '12_PULSE_75_PERCENT',
  '13_PULSE_MULTIPLE_WAVES',
  '15_PENDULUM_LEFT',
  '14_PENDULUM_CENTER',
  '16_PENDULUM_RIGHT',
  '17_PENDULUM_GRABBED',
  '03_RHYTHM_STOPPED_4-4',
  '04_RHYTHM_BEAT1_4-4',
  '05_RHYTHM_BEAT3_4-4',
  '22_BEATLINE_STOPPED_4-4',
  '23_BEATLINE_BEAT1_4-4',
  '24_BEATLINE_BEAT3_4-4',
  '28_TUNER_E3_MINUS25',
  '30_TUNER_E3_IN_TUNE',
  '32_TUNER_E3_PLUS25',
];

export function proofShot(id: string): ProofFrame | undefined {
  return PROOF_SHOTS.find((shot) => shot.id === id);
}

export function proofBackdrop(rail: ProofRail): 'dial' | 'ring' | 'smart' | 'pro' | 'beatline' {
  if (rail === 'pulse') return 'ring';
  if (rail === 'smart-pendulum') return 'smart';
  if (rail === 'pro') return 'pro';
  if (rail === 'beatline') return 'beatline';
  return 'dial';
}
