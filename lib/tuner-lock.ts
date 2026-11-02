/** A stylus is meaningful only for a finite cents value inside the playable window. */
export function tunerPitchIsTrustworthy(cents: number | null | undefined): boolean {
  return typeof cents === 'number' && Number.isFinite(cents) && cents >= -50 && cents <= 50;
}

/** Stable in-tune latch. Fires once per entry and re-arms only after leaving. */

export type InTuneLatch = {
  armed: boolean;
  fired: boolean;
  since: number;
};

export function tunerCue(cents: number, state: string): { trace: string; target: string; word: string } {
  if (state === 'in-tune') return { trace: '#3DDC7A', target: '#B6F3C4', word: '#D8FFE6' };
  const magnitude = Math.min(1, Math.abs(cents) / 40);
  if (cents < 0 || state === 'flat') {
    return {
      trace: magnitude > 0.45 ? '#E2A04A' : '#F0C36A',
      target: '#E7C98A',
      word: '#F3E2B0',
    };
  }
  if (cents > 0 || state === 'sharp') {
    return {
      trace: magnitude > 0.45 ? '#E23B3B' : '#FF7A72',
      target: '#E7C98A',
      word: '#F6D2CC',
    };
  }
  return { trace: '#FF2430', target: '#E7C98A', word: 'rgba(243, 237, 226, 0.78)' };
}

export function createInTuneLatch(): InTuneLatch {
  return { armed: true, fired: false, since: 0 };
}

export function advanceInTuneLatch(
  latch: InTuneLatch,
  inTune: boolean,
  now: number,
  dwellMs = 280
): { latch: InTuneLatch; fire: boolean } {
  if (!inTune) {
    return { latch: createInTuneLatch(), fire: false };
  }
  if (!latch.armed || latch.fired) {
    return { latch, fire: false };
  }
  const since = latch.since > 0 ? latch.since : now;
  if (now - since < dwellMs) {
    return { latch: { armed: true, fired: false, since }, fire: false };
  }
  return { latch: { armed: false, fired: true, since }, fire: true };
}
