import type { MetronomeConfig, SensoryMode } from '@/lib/types';

export const SENSORY_OPTIONS: { id: SensoryMode; label: string; hint: string }[] = [
  { id: 'audio', label: 'AUDIO', hint: 'Click only. Visuals stay quiet.' },
  { id: 'visual', label: 'VISUAL', hint: 'See the beat. No click.' },
  { id: 'haptic', label: 'HAPTIC', hint: 'Feel the beat. No click.' },
  { id: 'audio-visual', label: 'AUDIO + VISUAL', hint: 'Hear and see. No haptics.' },
  { id: 'audio-haptic', label: 'AUDIO + HAPTIC', hint: 'Hear and feel. Quiet visuals.' },
  { id: 'all', label: 'ALL', hint: 'Click, motion, and haptics together.' },
];

export function sensoryFlags(mode: SensoryMode): { audio: boolean; visual: boolean; haptic: boolean } {
  return {
    audio: mode === 'audio' || mode === 'audio-visual' || mode === 'audio-haptic' || mode === 'all',
    visual: mode === 'visual' || mode === 'audio-visual' || mode === 'all',
    haptic: mode === 'haptic' || mode === 'audio-haptic' || mode === 'all',
  };
}

export function effectiveVolume(config: Pick<MetronomeConfig, 'volume' | 'sensoryMode'>): number {
  return sensoryFlags(config.sensoryMode).audio ? config.volume : 0;
}

export function effectiveHaptic(config: Pick<MetronomeConfig, 'haptic' | 'sensoryMode'>): boolean {
  return sensoryFlags(config.sensoryMode).haptic && config.haptic;
}

export function effectiveVisual(config: Pick<MetronomeConfig, 'visualPulse' | 'sensoryMode'>): boolean {
  return sensoryFlags(config.sensoryMode).visual && config.visualPulse;
}

export function sensoryBackgroundNote(mode: SensoryMode): string | null {
  const flags = sensoryFlags(mode);
  if (!flags.audio) {
    return 'Visual and haptic followers can stop in the background or when the screen locks. The native click stays available only in Audio modes.';
  }
  if (flags.haptic) {
    return 'Haptics are not guaranteed in the background or on a locked screen.';
  }
  return null;
}
