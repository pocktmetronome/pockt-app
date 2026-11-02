import { TIME_SIGNATURES } from '@/constants/meter';
import { categoryForSkin } from '@/constants/skins';
import { roomIdFromConfig } from '@/constants/rooms';
import { sanitizeBpm } from '@/constants/timing';
import {
  SOUNDS_BY_FAMILY,
  defaultSoundForFamily,
  familyForSound,
  pocketSoundForSkin,
  resolvePlayableSound,
} from '@/constants/sounds';
import { resolveAccentPatch } from '@/lib/accent-sound';
import type { AccentLevel, MetronomeConfig, TimeSignatureId } from '@/lib/types';

export const ACCENT_LEVELS: AccentLevel[] = ['mute', 'soft', 'normal', 'strong'];

export const BACKBEAT_PATTERN: AccentLevel[] = ['mute', 'strong', 'mute', 'strong'];

export function accentStrength(level: AccentLevel): 0 | 1 | 2 | 3 {
  if (level === 'mute') return 0;
  if (level === 'soft') return 1;
  if (level === 'normal') return 2;
  return 3;
}

export function cycleAccent(level: AccentLevel): AccentLevel {
  const current = level === 'accent' ? 'strong' : level;
  const index = ACCENT_LEVELS.indexOf(current);
  return ACCENT_LEVELS[(index + 1) % ACCENT_LEVELS.length] ?? 'normal';
}

/** Shared beat-block cycle: mute → soft → normal → strong → mute (0 → 1 → 2 → 3 → 0). */
export function cycleBeatBlock(level: AccentLevel): AccentLevel {
  return cycleAccent(level);
}

export function beatBlockKind(level: AccentLevel): 'mute' | 'soft' | 'normal' | 'strong' {
  const strength = accentStrength(level);
  if (strength === 0) return 'mute';
  if (strength === 1) return 'soft';
  if (strength === 2) return 'normal';
  return 'strong';
}

export function defaultAccentPattern(timeSignature: TimeSignatureId): AccentLevel[] {
  const def = TIME_SIGNATURES[timeSignature] ?? TIME_SIGNATURES['4/4'];
  return Array.from({ length: def.beatsPerMeasure }, (_, index) => {
    if (index === 0 || def.accentBeats.includes(index)) return 'strong';
    return 'normal';
  });
}

/** Meter-only reset. Does not touch sound, volume, room, or custom layout. */
export function restoreDefaultMeter(): Pick<MetronomeConfig, 'timeSignature' | 'subdivision' | 'accentPattern' | 'backbeat'> {
  return {
    timeSignature: '4/4',
    subdivision: 'quarter',
    accentPattern: defaultAccentPattern('4/4'),
    backbeat: false,
  };
}

export function isBackbeatPattern(
  pattern: AccentLevel[] | undefined,
  timeSignature: TimeSignatureId
): boolean {
  if (timeSignature !== '4/4' || !pattern || pattern.length !== 4) return false;
  return (
    pattern[0] === 'mute' &&
    pattern[1] === 'strong' &&
    pattern[2] === 'mute' &&
    pattern[3] === 'strong'
  );
}

export function isDefaultAccentPattern(
  pattern: AccentLevel[] | undefined,
  timeSignature: TimeSignatureId
): boolean {
  const expected = defaultAccentPattern(timeSignature);
  if (!pattern || pattern.length !== expected.length) return false;
  return pattern.every((level, index) => level === expected[index]);
}

function asAccentLevel(value: unknown, fallback: AccentLevel): AccentLevel {
  if (value === 'accent') return 'strong';
  if (value === 'mute' || value === 'soft' || value === 'normal' || value === 'strong') {
    return value;
  }
  return fallback;
}

export function sanitizeAccentPattern(
  pattern: unknown,
  timeSignature: TimeSignatureId
): AccentLevel[] {
  const fallback = defaultAccentPattern(timeSignature);
  if (!Array.isArray(pattern) || pattern.length !== fallback.length) return fallback;
  return pattern.map((level, index) => asAccentLevel(level, fallback[index] ?? 'normal'));
}

/** Shared level → tint. State 0 is never an accent color. */
export function levelTint(
  strength: number,
  colors: { mute?: string; normal: string; secondary: string; strong: string }
): string {
  'worklet';
  if (strength < 0.5) return colors.mute ?? 'transparent';
  if (strength < 1.5) return colors.normal;
  if (strength < 2.5) return colors.secondary;
  return colors.strong;
}

export function accentFill(level: AccentLevel): number {
  const strength = accentStrength(level);
  if (strength === 0) return 0;
  if (strength === 1) return 0.34;
  if (strength === 2) return 0.68;
  return 1;
}

export function accentFromFill(ratio: number): AccentLevel {
  if (ratio < 0.16) return 'mute';
  if (ratio < 0.5) return 'soft';
  if (ratio < 0.84) return 'normal';
  return 'strong';
}

export function accentLabel(level: AccentLevel): string {
  if (level === 'strong' || level === 'accent') return 'STRONG / F';
  if (level === 'soft') return 'SOFT / P';
  if (level === 'mute') return 'MUTE';
  return 'NORMAL / MF';
}

export function applyConfigPatch(
  prev: MetronomeConfig,
  patch: Partial<MetronomeConfig>
): MetronomeConfig {
  const next: MetronomeConfig = { ...prev, ...patch };
  if (next.accentMode !== 'custom') next.accentMode = 'auto';
  if (patch.bpm != null) {
    next.bpm = sanitizeBpm(patch.bpm, prev.bpm);
  }

  if (patch.soundBank && patch.soundBank !== prev.soundBank && !patch.sound) {
    if (!SOUNDS_BY_FAMILY[next.soundBank].includes(next.sound)) {
      next.sound = defaultSoundForFamily(next.soundBank);
    }
  }

  if (patch.sound && !patch.soundBank) {
    next.sound = resolvePlayableSound(patch.sound, prev.sound);
    next.soundBank = familyForSound(next.sound);
  }

  const faceTransform = patch.classicBackdrop != null || patch.skinCategory === 'classic';
  if (patch.skin && patch.skin !== prev.skin && patch.sound == null && !faceTransform) {
    const remembered = next.roomSounds?.[patch.skin];
    const requested = remembered ?? pocketSoundForSkin(patch.skin);
    next.sound = resolvePlayableSound(requested, 'click');
    next.soundBank = familyForSound(next.sound);
  }

  if (patch.skin && patch.skinCategory == null) {
    next.skinCategory = categoryForSkin(patch.skin);
  }

  if (patch.sound != null && !patch.skin) {
    next.roomSounds = { ...prev.roomSounds, [next.skin]: next.sound };
    const room = roomIdFromConfig(next);
    next.roomVoice = { ...prev.roomVoice, [room]: next.sound };
    if (patch.hasUserChosenSound === undefined) {
      next.hasUserChosenSound = true;
    }
  }

  if (
    (patch.sound != null || patch.accentMode != null || patch.customAccentSoundId !== undefined) &&
    patch.soundDownbeat === undefined
  ) {
    const roles = resolveAccentPatch(next.sound, next.accentMode, next.customAccentSoundId);
    next.soundBeat = roles.soundBeat;
    next.soundDownbeat = roles.soundDownbeat;
    next.voiceCount = roles.voiceCount;
  }

  if (patch.roomVoice) {
    next.roomVoice = { ...prev.roomVoice, ...patch.roomVoice };
  }

  if (patch.timeSignature && patch.timeSignature !== prev.timeSignature && !patch.accentPattern) {
    next.accentPattern = defaultAccentPattern(next.timeSignature);
    next.backbeat = false;
  }

  if (patch.backbeat === true) {
    if (next.timeSignature === '4/4') {
      next.accentPattern = [...BACKBEAT_PATTERN];
      next.backbeat = true;
    } else {
      next.backbeat = false;
    }
  } else if (patch.backbeat === false && !patch.accentPattern) {
    if (isBackbeatPattern(prev.accentPattern, prev.timeSignature)) {
      next.accentPattern = defaultAccentPattern(next.timeSignature);
    }
  }

  if (patch.accentPattern) {
    next.accentPattern = sanitizeAccentPattern(patch.accentPattern, next.timeSignature);
    next.backbeat = isBackbeatPattern(next.accentPattern, next.timeSignature);
  } else {
    next.accentPattern = sanitizeAccentPattern(next.accentPattern, next.timeSignature);
    next.backbeat = isBackbeatPattern(next.accentPattern, next.timeSignature);
  }

  return next;
}
