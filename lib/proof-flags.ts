/** Proof-only poses. Not a clock and not used in normal play. */
export const proofFlags = {
  playDown: false,
  tunerDown: false,
  soundDown: false,
  tapDown: false,
  meterDown: false,
  pDown: false,
  plusDown: false,
  minusDown: false,
  loopDown: false,
  beatCover: '' as '' | 'on' | 'mid' | 'off',
  reduceMotion: false,
  /** 'a' or 'b' while comparing reconstructions. Product uses the winner. */
  concept: 'a' as 'a' | 'b',
};
