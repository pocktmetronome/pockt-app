/**
 * Dial facade spec measured from IMG_5373 (471×1024), including the status bar.
 * Fractions are of the full screenshot. The live layout treats them as the
 * design master and compresses only when a smaller iPhone would collide.
 */

export const DIAL_REFERENCE = {
  image: { width: 471, height: 1024 },
  /** Normalized y of major bands, top of the screenshot = 0. */
  band: {
    wordmark: 0.1,
    tagline: 0.118,
    tempoName: 0.128,
    bpmDigits: 0.148,
    bpmLabel: 0.178,
    dialTop: 0.208,
    dialCenter: 0.423,
    dialBottom: 0.638,
    beatsTop: 0.656,
    beatsBottom: 0.73,
    transportTop: 0.754,
    transportBottom: 0.824,
    navTop: 0.852,
    navBottom: 0.926,
  },
  dialDiameterOverWidth: 440 / 471,
} as const;

/** Sampled from the reference. Dial-only tokens live in CLASSIC_DIAL. */
export const DIAL_REFERENCE_PALETTE = {
  chassis: '#141311',
  graphite: '#1C1B19',
  raised: '#2A2824',
  recess: '#0A0908',
  bronzeDark: '#6E5430',
  bronzeMid: '#B08A58',
  bronzeHighlight: '#E8D3A8',
  silver: '#C8C6C0',
  ivory: '#E4E0D6',
  amber: '#C4A15A',
  green: '#3CB371',
  red: '#A33B34',
} as const;
