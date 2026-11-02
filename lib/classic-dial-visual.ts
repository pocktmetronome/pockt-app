/** Dial chassis materials sampled from the reference facade. Teal stays signal-only. */

export const CLASSIC_DIAL = {
  bg: '#141311',
  nav: '#1A1916',
  well: '#1C1B19',
  metal: '#2A2824',
  metalHi: '#3A3832',
  metalLo: '#0E0D0C',
  bronze: '#B08A58',
  bronzeHi: '#E8D3A8',
  bronzeLo: '#6E5430',
  gold: '#C4A15A',
  ivory: '#E4E0D6',
  ivoryMute: 'rgba(228,224,214,0.46)',
  ivoryDim: 'rgba(228,224,214,0.32)',
  silver: '#C8C6C0',
  amber: '#C4A15A',
  green: '#3CB371',
  red: '#A33B34',
  teal: '#3EE6D8',
  tealSoft: 'rgba(62,230,216,0.22)',
  line: 'rgba(176,138,88,0.38)',
} as const;

export const CLASSIC_DIAL_SCALE_LABELS = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400] as const;

export const CLASSIC_DIAL_HOME_BPM = 120;
