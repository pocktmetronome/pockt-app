import { NativeModule, requireOptionalNativeModule } from 'expo';

import type {
  NativeEngineInfo,
  NativeTickEvent,
  NativeTimingConfig,
  NativeTunerPitchEvent,
  TimingDiagnostics,
} from './PocktTiming.types';

type PocktTimingEvents = {
  onTick: (event: NativeTickEvent) => void;
  onEngineState: (event: NativeEngineInfo) => void;
  onTunerPitch: (event: NativeTunerPitchEvent) => void;
};

declare class PocktTimingNativeModule extends NativeModule<PocktTimingEvents> {
  isNativeEngine: boolean;
  lookAheadSeconds: number;
  isAvailable(): boolean;
  isRunning(): boolean;
  engineInfo(): NativeEngineInfo;
  prepare(uris?: Record<string, string>): Promise<Record<string, unknown>>;
  start(config: NativeTimingConfig): Promise<Record<string, unknown>>;
  stop(): void;
  setConfig(config: NativeTimingConfig): void;
  setMasterGain(volume: number): void;
  preview(sound: string, volume: number): void;
  resetDiagnostics(): void;
  getDiagnostics(): TimingDiagnostics;
  audioProbe(): Record<string, unknown>;
  reclaimSession(): Promise<Record<string, unknown>>;
  restorePlaybackGraph(): Promise<Record<string, unknown>>;
  armPendulumStart(pickupBeats: number): void;
  armPendulumStartSilent(pickupBeats: number): void;
  audioLifecycleStress(): Promise<Record<string, unknown>>;
  audioSanityTest(): Promise<Record<string, unknown>>;
  metronomeSelfTest120(): Promise<Record<string, unknown>>;
  runAudioSanityTest(sound: string, volume: number): Promise<Record<string, unknown>>;
  runMathSelfTest(durationSeconds: number, sampleRate: number): Promise<TimingDiagnostics>;
  runPrecisionSuite(): Promise<Record<string, unknown>>;
  hapticLimitationNote(): string;
  playIdentFinalRumble(): void;
  stopIdentHaptics(): void;
  playUiDetent(kind: string, playAudio: boolean, playHaptic: boolean): boolean;
  prepareUiDetent(): void;
  playReferenceTone(frequency: number): void;
  playTuneConfirm(): void;
  setInputCapture(enabled: boolean): Promise<boolean>;
  startTuner(): Promise<Record<string, unknown> | boolean>;
  stopTuner(): Promise<boolean>;
  loopPrepare?(): Promise<boolean>;
  loopArm?(startMeasure: number): Promise<boolean>;
  loopFinalize?(endMeasure: number, jsStartHost: number, jsEndHost: number): Promise<{ ok: boolean; reason: string; bars?: number; layers?: number }>;
  loopArmLayer?(): Promise<boolean>;
  loopFinalizeLayer?(passStartMeasure: number, jsStartHost: number, jsEndHost: number): Promise<{ ok: boolean; reason: string; layers?: number }>;
  loopCancelLayer?(): Promise<boolean>;
  loopUndo?(): Promise<{ ok: boolean; layers: number; canRedo?: boolean }>;
  loopRedo?(): Promise<{ ok: boolean; layers: number; canRedo?: boolean }>;
  loopSetLayerMuted?(index: number, muted: boolean): Promise<boolean>;
  loopDeleteLayer?(index: number): Promise<{ ok: boolean; layers: number }>;
  loopPlay?(fromMeasure: number): Promise<boolean>;
  loopHalt?(): Promise<boolean>;
  loopClear?(): Promise<boolean>;
  loopRelease?(): Promise<boolean>;
  loopInfo?(): Promise<Record<string, unknown>>;
  logBreadcrumb?(identity: string, extra?: Record<string, unknown>): void;
  visualHostSeconds?(): number;
}

const PocktTiming = requireOptionalNativeModule<PocktTimingNativeModule>('PocktTiming');

export default PocktTiming;
export type { PocktTimingNativeModule };
