import * as Haptics from 'expo-haptics';

import PocktTiming from '@/modules/pockt-timing';
import type { SkinId, SoundId, TickEvent } from '@/lib/types';

export type HapticSemantic =
  | 'detent'
  | 'controlPress'
  | 'playCommit'
  | 'tap'
  | 'selector'
  | 'shutter'
  | 'record'
  | 'inTune';

/** One map from a physical action to a haptic. Beat haptics stay on the optional musical preference. */
export async function hapticEvent(kind: HapticSemantic): Promise<void> {
  switch (kind) {
    case 'detent':
      await hapticSoft();
      return;
    case 'controlPress':
      await hapticLight();
      return;
    case 'playCommit':
      await hapticMedium();
      return;
    case 'tap':
      await hapticTap();
      return;
    case 'selector':
    case 'shutter':
      await hapticSelection();
      return;
    case 'record':
      await hapticRigid();
      return;
    case 'inTune':
      await hapticConfirm();
      return;
    default:
      return;
  }
}

export async function hapticSelection(): Promise<void> {
  try {
    await Haptics.selectionAsync();
  } catch {
    /* ignore */
  }
}

export async function hapticLight(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* ignore */
  }
}

export async function hapticSoft(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
  } catch {
    /* ignore */
  }
}

export async function hapticMedium(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    /* ignore */
  }
}

export async function hapticRigid(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
  } catch {
    /* ignore */
  }
}

export async function hapticHeavy(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {
    /* ignore */
  }
}

/** Strongest opening bass: mass, then a second heavy body hit. */
export async function hapticIdentBass(): Promise<void> {
  await hapticSoft();
}

export async function hapticIdentBassFollow(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {
    /* ignore */
  }
}

export async function hapticIdentSecond(): Promise<void> {
  await hapticMedium();
}

export async function hapticIdentFinal(): Promise<void> {
  try {
    if (PocktTiming?.playIdentFinalRumble) {
      PocktTiming.playIdentFinalRumble();
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise((resolve) => setTimeout(resolve, 36));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
  } catch {
    /* ignore */
  }
}

export async function hapticPlayTick(
  event: TickEvent,
  bpm: number,
  skin?: SkinId,
  sound?: SoundId
): Promise<void> {
  if (!event.isPrimaryBeat) return;
  if (event.silentMeasure) return;
  if (event.accentLevel === 'mute') return;
  if (bpm > 200 && event.accentLevel !== 'strong') return;

  try {
    if (event.accentLevel === 'strong') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (skin === 'after-dark' && event.isDownbeat) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      } else if (skin === 'studio' && event.isDownbeat) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (sound === 'subkick' && event.isDownbeat) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      }
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    /* ignore */
  }
}

export async function hapticTap(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
  } catch {
    /* ignore */
  }
}

let lastDialTick = 0;

/** Tiny tactile tick. Rate-limited so rapid dial movement cannot flood Taptic. */
export function hapticDialTick(): void {
  const now = Date.now();
  if (now - lastDialTick < 42) return;
  lastDialTick = now;
  void hapticEvent('detent');
}

let lastPulseTick = 0;

/** Pulse BPM detent. Haptic only — no rotary click. Coalesces fast spins. */
export function hapticPulseTick(): void {
  const now = Date.now();
  if (now - lastPulseTick < 48) return;
  lastPulseTick = now;
  void hapticSoft();
}

export async function hapticConfirm(): Promise<void> {
  await hapticMedium();
}
