/** One rigid cover. 0 leaves the beats open. 1 conceals them. */
export function beatCoverProgress(concealed: boolean, proof: number | null): number {
  if (proof != null && Number.isFinite(proof)) return Math.min(1, Math.max(0, proof));
  return concealed ? 1 : 0;
}

export function beatCoverShift(progress: number, cavityWidth: number): number {
  const travel = Math.min(1, Math.max(0, progress));
  return (1 - travel) * Math.max(0, cavityWidth);
}
