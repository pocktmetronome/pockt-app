/**
 * Meter and subdivision changes while playing wait for the next bar.
 * Beat index wraps inside the bar, so the bar counter is the authority.
 */
export function structuralCommitReady(bar: number, armedBar: number): boolean {
  return bar > armedBar;
}

export function isStructuralPatch(patch: { timeSignature?: unknown; subdivision?: unknown }): boolean {
  return patch.timeSignature != null || patch.subdivision != null;
}
