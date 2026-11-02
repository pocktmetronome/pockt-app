/**
 * Audio / visual / haptic alignment probes.
 * Native scheduled beat remains the authority. These helpers only compare samples.
 */

import {
  pendulumIsCenter,
  pendulumIsExtreme,
  pendulumPhaseFromDisplayAge,
  pendulumTravelSign,
  pendulumVisualFromPhase,
} from '@/lib/pendulum-reference';

export type PendulumAlignSample = {
  nativeBeatIndex: number;
  ageMs: number;
  periodMs: number;
  visualAngle: number;
  amplitude: number;
  isPrimaryBeat: boolean;
};

export type PendulumAlignReport = {
  phase: number;
  expectedAngle: number;
  errorDeg: number;
  expectedCenter: boolean;
  visualCenter: boolean;
  expectedExtreme: boolean;
  visualExtreme: boolean;
  direction: 1 | -1;
  primaryDrivesPendulum: boolean;
};

export function pendulumAlignReport(sample: PendulumAlignSample): PendulumAlignReport {
  const phase = pendulumPhaseFromDisplayAge(sample.ageMs, sample.periodMs);
  const expectedAngle = pendulumVisualFromPhase(sample.nativeBeatIndex, phase, sample.amplitude);
  const visual = Number.isFinite(sample.visualAngle) ? sample.visualAngle : 0;
  return {
    phase,
    expectedAngle,
    errorDeg: Math.abs(visual - expectedAngle),
    expectedCenter: pendulumIsCenter(phase),
    visualCenter: Math.abs(visual) <= Math.max(0.35, sample.amplitude * 0.04),
    expectedExtreme: pendulumIsExtreme(phase),
    visualExtreme: Math.abs(Math.abs(visual) - Math.abs(sample.amplitude)) <= Math.max(0.35, sample.amplitude * 0.04),
    direction: pendulumTravelSign(sample.nativeBeatIndex),
    primaryDrivesPendulum: sample.isPrimaryBeat === true,
  };
}

/** Same musical event: native beat, visual center, and (conceptually) native haptic. */
export function pendulumBeatEventAgrees(report: PendulumAlignReport): boolean {
  if (!report.primaryDrivesPendulum) return true;
  if (!report.expectedCenter) return true;
  return report.visualCenter && report.errorDeg < 1.5;
}

export function subdivisionMustNotAdvancePrimaryBeat(
  isPrimaryBeat: boolean,
  previousBeatIndex: number,
  nextBeatIndex: number
): boolean {
  if (isPrimaryBeat) return true;
  return previousBeatIndex === nextBeatIndex;
}
