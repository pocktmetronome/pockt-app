import { FEEL_DIAL_MAX_MS_AT_120, FEEL_PRESETS, MAX_FEEL_OFFSET_MS, MAX_FEEL_OFFSET_RATIO } from '@/constants/feel';
import { SUBDIVISIONS, TIME_SIGNATURES } from '@/constants/meter';
import type { MetronomeConfig } from '@/lib/types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function beatDurationMs(bpm: number): number {
  return 60000 / bpm;
}

export function ticksPerBeat(config: MetronomeConfig): number {
  return SUBDIVISIONS[config.subdivision].ticksPerBeat;
}

export function beatsPerMeasure(config: MetronomeConfig): number {
  return TIME_SIGNATURES[config.timeSignature].beatsPerMeasure;
}

export function ticksPerMeasure(config: MetronomeConfig): number {
  return ticksPerBeat(config) * beatsPerMeasure(config);
}

export function measureDurationMs(config: MetronomeConfig): number {
  return beatDurationMs(config.bpm) * beatsPerMeasure(config);
}

export function tempoScale(bpm: number): number {
  return 120 / bpm;
}

export function maxOffsetMs(bpm: number): number {
  return Math.min(MAX_FEEL_OFFSET_MS, beatDurationMs(bpm) * MAX_FEEL_OFFSET_RATIO);
}

/**
 * Position of a subdivision within a beat, in milliseconds, including swing.
 * The next beat still begins on the master grid.
 */
export function subdivisionOffsetInBeatMs(
  subdivisionIndex: number,
  config: MetronomeConfig
): number {
  const ticks = ticksPerBeat(config);
  const beatMs = beatDurationMs(config.bpm);
  if (ticks <= 1 || subdivisionIndex <= 0) return 0;

  const straight = (subdivisionIndex / ticks) * beatMs;
  const swing = FEEL_PRESETS[config.feel].swing;
  if (Math.abs(swing - 0.5) < 0.0001) return straight;

  if (ticks === 3) {
    const delay = (swing - 0.5) * beatMs * 0.22 * subdivisionIndex;
    return straight + delay;
  }

  const phase = subdivisionIndex / ticks;
  if (phase < 0.5) return straight;
  return straight + (swing - 0.5) * beatMs;
}

export function gridTimeMs(
  originMs: number,
  tickIndex: number,
  config: MetronomeConfig
): number {
  const tpm = ticksPerMeasure(config);
  const tpb = ticksPerBeat(config);
  const measureIndex = Math.floor(tickIndex / tpm);
  const tickInMeasure = ((tickIndex % tpm) + tpm) % tpm;
  const beatIndex = Math.floor(tickInMeasure / tpb);
  const subdivisionIndex = tickInMeasure % tpb;
  const beatMs = beatDurationMs(config.bpm);

  return (
    originMs +
    measureIndex * measureDurationMs(config) +
    beatIndex * beatMs +
    subdivisionOffsetInBeatMs(subdivisionIndex, config)
  );
}

/**
 * Intentional feel offset relative to the master grid.
 * Downbeats stay locked. Offsets never accumulate across beats.
 */
export function feelOffsetMs(
  beatIndex: number,
  subdivisionIndex: number,
  config: MetronomeConfig
): number {
  const meter = TIME_SIGNATURES[config.timeSignature];
  const preset = FEEL_PRESETS[config.feel];
  const scale = tempoScale(config.bpm);
  const isDownbeat = beatIndex === 0 && subdivisionIndex === 0;
  if (isDownbeat) return 0;

  const isPrimary = subdivisionIndex === 0;
  const isBackbeat = isPrimary && meter.backbeatBeats.includes(beatIndex);
  const dialMs = config.feelDial * FEEL_DIAL_MAX_MS_AT_120 * scale;
  const presetBias = preset.eventBiasMsAt120 * scale;
  const backbeatBias = preset.backbeatOffsetMsAt120 * scale;

  let offset = 0;

  if (isBackbeat) {
    offset += backbeatBias + presetBias + dialMs;
  } else if (isPrimary) {
    offset += presetBias * 0.28 + dialMs * 0.22;
  } else {
    offset += dialMs * 0.4;
    if (preset.id === 'swampy' || preset.id === 'pocket' || preset.id === 'laid-back') {
      offset += presetBias * 0.18;
    }
  }

  const limit = maxOffsetMs(config.bpm);
  return clamp(offset, -limit, limit);
}

export function eventTimeMs(
  originMs: number,
  tickIndex: number,
  config: MetronomeConfig
): number {
  const tpm = ticksPerMeasure(config);
  const tpb = ticksPerBeat(config);
  const tickInMeasure = ((tickIndex % tpm) + tpm) % tpm;
  const beatIndex = Math.floor(tickInMeasure / tpb);
  const subdivisionIndex = tickInMeasure % tpb;
  return gridTimeMs(originMs, tickIndex, config) + feelOffsetMs(beatIndex, subdivisionIndex, config);
}

export function musicalPositionFromTick(tickIndex: number, config: MetronomeConfig) {
  const tpm = ticksPerMeasure(config);
  const tpb = ticksPerBeat(config);
  const measureIndex = Math.floor(tickIndex / tpm);
  const tickInMeasure = ((tickIndex % tpm) + tpm) % tpm;
  return {
    measureIndex,
    beatIndex: Math.floor(tickInMeasure / tpb),
    subdivisionIndex: tickInMeasure % tpb,
    ticksPerBeat: tpb,
    ticksPerMeasure: tpm,
  };
}

export function tickIndexFromElapsed(elapsedMs: number, config: MetronomeConfig): number {
  const beatMs = beatDurationMs(config.bpm);
  const tpb = ticksPerBeat(config);
  const beats = elapsedMs / beatMs;
  const wholeBeats = Math.floor(beats);
  const frac = beats - wholeBeats;
  const sub = Math.round(frac * tpb);
  return wholeBeats * tpb + sub;
}
