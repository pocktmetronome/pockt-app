import PocktTiming from '@/modules/pockt-timing';

import { hapticRigid, hapticSelection, hapticSoft } from '@/lib/haptics';

export type DetentKind = 'dial' | 'pro' | 'roller' | 'step' | 'face';

const lastAt: Record<DetentKind, number> = {
  dial: 0,
  pro: 0,
  roller: 0,
  step: 0,
  face: 0,
};

const MIN_GAP: Record<DetentKind, number> = {
  dial: 48,
  pro: 32,
  roller: 24,
  step: 20,
  face: 240,
};

let preparedAt = 0;

function nativeKind(kind: DetentKind): 'dial' | 'pro' | 'roller' {
  if (kind === 'step') return 'dial';
  if (kind === 'face') return 'roller';
  return kind;
}

/**
 * Rotary / stepped detent feedback. Independent of metronome scheduling.
 * Each kind has its own limiter so one control cannot starve another.
 * JS limiter is the only rate gate. Native play must not drop an accepted detent.
 * Timestamp is stamped only after native scheduling succeeds (or the expo fallback runs).
 */
export function rotaryDetent(kind: DetentKind, audio: boolean, haptic = true): void {
  if (!audio && !haptic) return;
  const now = Date.now();
  if (lastAt[kind] > now) lastAt[kind] = 0;
  if (lastAt[kind] > 0 && now - lastAt[kind] < MIN_GAP[kind]) return;
  const played = emitDetent(nativeKind(kind), audio, haptic);
  if (!played) return;
  lastAt[kind] = Date.now();
}

/** One clean click + haptic for a genuine plus/minus/button press. */
export function controlStepDetent(audio: boolean, haptic = true): void {
  rotaryDetent('step', audio, haptic);
}

/** Short instrument-mode click. A 240 ms limiter drops repeats while the finger is still moving. */
export function faceSwitchDetent(audio: boolean): void {
  rotaryDetent('face', audio, true);
}

function emitDetent(kind: 'dial' | 'pro' | 'roller', audio: boolean, haptic: boolean): boolean {
  if (PocktTiming?.isNativeEngine && typeof PocktTiming.playUiDetent === 'function') {
    try {
      const ok = PocktTiming.playUiDetent(kind, audio, haptic);
      if (ok === false) {
        reviveUiDetent();
        return PocktTiming.playUiDetent(kind, audio, haptic) !== false;
      }
      return true;
    } catch {
      reviveUiDetent();
      try {
        return PocktTiming.playUiDetent(kind, audio, haptic) !== false;
      } catch {
        return false;
      }
    }
  }
  if (haptic) fireExpoHaptic(kind);
  return true;
}

function fireExpoHaptic(kind: 'dial' | 'pro' | 'roller'): void {
  if (kind === 'pro') void hapticRigid();
  else if (kind === 'roller') void hapticSelection();
  else void hapticSoft();
}

/** Reconnect native UI-click nodes after graph restore, navigation, or foreground. */
export function reviveUiDetent(): void {
  lastAt.dial = 0;
  lastAt.pro = 0;
  lastAt.roller = 0;
  lastAt.step = 0;
  lastAt.face = 0;
  const now = Date.now();
  if (now - preparedAt < 80) {
    try {
      PocktTiming?.prepareUiDetent?.();
    } catch {
      /* optional */
    }
    return;
  }
  preparedAt = now;
  try {
    PocktTiming?.prepareUiDetent?.();
  } catch {
    /* optional */
  }
}

export function resetRotaryDetentForTests(): void {
  lastAt.dial = 0;
  lastAt.pro = 0;
  lastAt.roller = 0;
  lastAt.step = 0;
  lastAt.face = 0;
  preparedAt = 0;
}

export function detentLimiterWouldEmit(
  kind: DetentKind,
  now: number,
  last: number,
  minGap = MIN_GAP[kind]
): boolean {
  if (last > now) return true;
  if (last <= 0) return true;
  return now - last >= minGap;
}
