import type { SkinId, SoundBankId, SoundId } from '@/lib/types';

export type SoundDef = {
  id: SoundId;
  bank: SoundBankId;
  label: string;
  hint: string;
};

export const SOUND_FAMILIES: { id: SoundBankId; label: string }[] = [
  { id: 'pockt', label: 'POCKT' },
  { id: 'classic', label: 'CLASSIC' },
  { id: 'modern', label: 'MODERN' },
];

export const SOUNDS: Record<SoundId, SoundDef> = {
  'marimba': { id: 'marimba', bank: 'classic', label: 'MARIMBA', hint: 'Rosewood bar, round and musical.' },
  'side-stick': { id: 'side-stick', bank: 'classic', label: 'SIDE STICK', hint: 'Cross-stick on the snare rim.' },
  'conga': { id: 'conga', bank: 'classic', label: 'CONGA', hint: 'Open conga tone.' },
  'cajon': { id: 'cajon', bank: 'classic', label: 'CAJÓN', hint: 'Box drum: low thump, wire snap.' },
  'tambourine': { id: 'tambourine', bank: 'classic', label: 'TAMBOURINE', hint: 'Jingles that sit on top.' },
  'shaker': { id: 'shaker', bank: 'modern', label: 'SHAKER', hint: 'Soft shaker, great for subdivisions.' },
  'triangle': { id: 'triangle', bank: 'classic', label: 'TRIANGLE', hint: 'Bright ring for downbeats.' },
  'analog-blip': { id: 'analog-blip', bank: 'modern', label: 'ANALOG BLIP', hint: 'Vintage synth blip.' },
  'snap': { id: 'snap', bank: 'modern', label: 'FINGER SNAP', hint: 'Dry finger snap.' },
  'sticks': { id: 'sticks', bank: 'classic', label: 'STICKS', hint: 'Drumsticks clicked together.' },
  'kalimba': { id: 'kalimba', bank: 'modern', label: 'KALIMBA', hint: 'Thumb piano pluck.' },
  'tick-tock': { id: 'tick-tock', bank: 'classic', label: 'TICK TOCK', hint: 'Escapement tick, clock-shop clean.' },
  click: {
    id: 'click',
    bank: 'classic',
    label: 'CLASSIC CLICK',
    hint: 'Crisp timeless metronome click.',
  },
  wood: {
    id: 'wood',
    bank: 'classic',
    label: 'WOOD',
    hint: 'Warm wooden metronome.',
  },
  stick: {
    id: 'stick',
    bank: 'classic',
    label: 'STICK',
    hint: 'Dry studio stick.',
  },
  clave: {
    id: 'clave',
    bank: 'classic',
    label: 'CLAVE',
    hint: 'Sharp wooden attack.',
  },
  mechanical: {
    id: 'mechanical',
    bank: 'classic',
    label: 'MECHANICAL',
    hint: 'Clockwork escapement tick.',
  },
  woodblock: {
    id: 'woodblock',
    bank: 'classic',
    label: 'WOOD BLOCK',
    hint: 'Hollow studio wood block.',
  },
  rim: {
    id: 'rim',
    bank: 'classic',
    label: 'RIM',
    hint: 'Tight rim click.',
  },
  cowbell: {
    id: 'cowbell',
    bank: 'classic',
    label: 'COWBELL',
    hint: 'Percussive accent bell.',
  },
  pulse: {
    id: 'pulse',
    bank: 'modern',
    label: 'SOFT PULSE',
    hint: 'Soft analog pulse. Low-impact click.',
  },
  'digital-click': {
    id: 'digital-click',
    bank: 'modern',
    label: 'DIGITAL',
    hint: 'Clean digital metronome click.',
  },
  beep: {
    id: 'beep',
    bank: 'modern',
    label: 'BEEP',
    hint: 'Electronic studio beep.',
  },
  'soft-click': {
    id: 'soft-click',
    bank: 'modern',
    label: 'SOFT CLICK',
    hint: 'Low-fatigue practice click.',
  },
  'hard-click': {
    id: 'hard-click',
    bank: 'modern',
    label: 'HARD CLICK',
    hint: 'Bright, decisive attack.',
  },
  'high-click': {
    id: 'high-click',
    bank: 'modern',
    label: 'HIGH CLICK',
    hint: 'High, cutting click.',
  },
  'low-click': {
    id: 'low-click',
    bank: 'modern',
    label: 'LOW CLICK',
    hint: 'Low, body-forward click.',
  },
  'studio-click': {
    id: 'studio-click',
    bank: 'modern',
    label: 'STUDIO',
    hint: 'Neutral recording-session click.',
  },
  'plain-tick': {
    id: 'plain-tick',
    bank: 'classic',
    label: 'PLAIN TICK',
    hint: 'Simple dry metronome tick.',
  },
  'blend-tick': {
    id: 'blend-tick',
    bank: 'classic',
    label: 'BLEND TICK',
    hint: 'Warm blended practice tick.',
  },
  bell: {
    id: 'bell',
    bank: 'classic',
    label: 'BELL',
    hint: 'Short accent bell.',
  },
  'electronic-tick': {
    id: 'electronic-tick',
    bank: 'modern',
    label: 'SQUARE TICK',
    hint: 'Electronic square-wave tick.',
  },
  snare: {
    id: 'snare',
    bank: 'classic',
    label: 'SNARE',
    hint: 'Tight snare-side click.',
  },
  kick: {
    id: 'kick',
    bank: 'classic',
    label: 'PUNCH KICK',
    hint: 'Short kick attack.',
  },
  hihat: {
    id: 'hihat',
    bank: 'classic',
    label: 'HI-HAT',
    hint: 'Closed hat tick.',
  },
  temple: {
    id: 'temple',
    bank: 'classic',
    label: 'TEMPLE',
    hint: 'Temple-block wood hit.',
  },
  'dry-stick': {
    id: 'dry-stick',
    bank: 'classic',
    label: 'DRY STICK',
    hint: 'Dry stick click.',
  },
  'soft-wood': {
    id: 'soft-wood',
    bank: 'classic',
    label: 'SOFT WOOD',
    hint: 'Soft wooden tap.',
  },
  subkick: {
    id: 'subkick',
    bank: 'pockt',
    label: 'SUBKICK',
    hint: 'Deep low-frequency physical hit.',
  },
  'pockt-default': {
    id: 'pockt-default',
    bank: 'pockt',
    label: 'CLASSIC',
    hint: 'POCKT Classic. The native room click.',
  },
  'pockt-studio': {
    id: 'pockt-studio',
    bank: 'pockt',
    label: 'STUDIO',
    hint: 'Silky, warm, expensive recording-room transient.',
  },
  'pockt-altered': {
    id: 'pockt-altered',
    bank: 'pockt',
    label: 'ALTERED',
    hint: 'Soft, enveloping, rounded. Very low fatigue.',
  },
  'pockt-after-dark': {
    id: 'pockt-after-dark',
    bank: 'pockt',
    label: 'AFTER DARK',
    hint: 'Deep, warm, late-night lounge pulse.',
  },
  pocket: {
    id: 'pocket',
    bank: 'pockt',
    label: 'POCKET',
    hint: 'Balanced signature POCKT tone.',
  },
  'pockt-heavy': {
    id: 'pockt-heavy',
    bank: 'pockt',
    label: 'HEAVY',
    hint: 'Punchy industrial click. Precise, not a drum.',
  },
  'pockt-heart': {
    id: 'pockt-heart',
    bank: 'pockt',
    label: 'POCKET',
    hint: 'Retired. Maps to Pocket.',
  },
  brass: {
    id: 'brass',
    bank: 'pockt',
    label: 'BRASS',
    hint: 'Bright metallic extra click.',
  },
  tight: {
    id: 'tight',
    bank: 'pockt',
    label: 'TIGHT',
    hint: 'Short tight extra click.',
  },
  clap: {
    id: 'clap',
    bank: 'pockt',
    label: 'CLAP',
    hint: 'Dry clap extra.',
  },
  sharp: {
    id: 'sharp',
    bank: 'pockt',
    label: 'SHARP',
    hint: 'Cutting extra attack.',
  },
  'pockt-roots': {
    id: 'pockt-roots',
    bank: 'classic',
    label: 'WOOD',
    hint: 'Legacy alias. Maps to Wood.',
  },
  'pockt-sundown': {
    id: 'pockt-sundown',
    bank: 'classic',
    label: 'SOFT CLICK',
    hint: 'Legacy alias. Maps to a safe generic click.',
  },
  'stage-cut': {
    id: 'stage-cut',
    bank: 'pockt',
    label: 'STAGE CUT',
    hint: 'Bright high-mid click that cuts through a band.',
  },
  precision: {
    id: 'precision',
    bank: 'pockt',
    label: 'PRECISION',
    hint: 'Balanced short default click.',
  },
  'lib-wood': {
    id: 'lib-wood',
    bank: 'classic',
    label: 'CLEAN WOOD',
    hint: 'Short licensed wood block. Clean metronome wood.',
  },
  'lib-jam': {
    id: 'lib-jam',
    bank: 'classic',
    label: 'JAM BLOCK',
    hint: 'Bright plastic jam block.',
  },
  'lib-kick-deep': {
    id: 'lib-kick-deep',
    bank: 'classic',
    label: 'DEEP KICK',
    hint: 'Tight low-frequency kick attack.',
  },
  'lib-kick': {
    id: 'lib-kick',
    bank: 'classic',
    label: 'KICK',
    hint: 'Short drum kick for downbeats.',
  },
  'lib-snare': {
    id: 'lib-snare',
    bank: 'classic',
    label: 'SNARE',
    hint: 'Dry snare crack. Fast-tempo safe.',
  },
  'lib-hat': {
    id: 'lib-hat',
    bank: 'classic',
    label: 'CLOSED HAT',
    hint: 'Closed hi-hat tick for subdivisions.',
  },
  'lib-djembe': {
    id: 'lib-djembe',
    bank: 'classic',
    label: 'DJEMBE',
    hint: 'Muted djembe slap.',
  },
  'lib-doumbek': {
    id: 'lib-doumbek',
    bank: 'classic',
    label: 'DOUMBEK',
    hint: 'Muted doumbek. Hand percussion.',
  },
  'lib-bell': {
    id: 'lib-bell',
    bank: 'classic',
    label: 'BELL',
    hint: 'Short waiter bell. Downbeat accent.',
  },
  'lib-tom': {
    id: 'lib-tom',
    bank: 'classic',
    label: 'TOM',
    hint: 'Short tom body hit.',
  },
  'lib-timpani': {
    id: 'lib-timpani',
    bank: 'classic',
    label: 'TIMPANI',
    hint: 'Short timpani attack. Use as accent.',
  },
  'lib-click': {
    id: 'lib-click',
    bank: 'modern',
    label: 'ANALOG CLICK',
    hint: 'Clean analog synth click. Tight metronome edge.',
  },
  'lib-click-tight': {
    id: 'lib-click-tight',
    bank: 'modern',
    label: 'TIGHT SYNTH',
    hint: 'Very short analog tick. Fast tempos.',
  },
  'lib-blip': {
    id: 'lib-blip',
    bank: 'modern',
    label: 'BRIGHT BLIP',
    hint: 'Percussive analog blip. Bright accent.',
  },
  'lib-digital': {
    id: 'lib-digital',
    bank: 'modern',
    label: 'COLOR BLIP',
    hint: 'Bright digital synth blip.',
  },
  'lib-synth': {
    id: 'lib-synth',
    bank: 'modern',
    label: 'ANALOG DRUM',
    hint: 'Resonant analog drum. Body for the downbeat.',
  },
  'lib-vocal-hit': {
    id: 'lib-vocal-hit',
    bank: 'pockt',
    label: 'FEMALE HIT',
    hint: 'Short female attack. Useful as a downbeat vocal.',
  },
  'lib-vocal-male': {
    id: 'lib-vocal-male',
    bank: 'pockt',
    label: 'MALE HIT',
    hint: 'Short male attack. Distinct from the female hit.',
  },
  'lib-vocal-female': {
    id: 'lib-vocal-female',
    bank: 'pockt',
    label: 'FEMALE CALL',
    hint: 'Second female attack. Brighter timbre.',
  },
  'lib-vocal-shout': {
    id: 'lib-vocal-shout',
    bank: 'pockt',
    label: 'SHOUT',
    hint: 'Short female shout. Accent, not dialogue.',
  },
  'lib-vocal-call': {
    id: 'lib-vocal-call',
    bank: 'pockt',
    label: 'MALE CALL',
    hint: 'Short male shout. Rhythmic accent.',
  },
  'lib-vocal-ahh': {
    id: 'lib-vocal-ahh',
    bank: 'pockt',
    label: 'AHH',
    hint: 'Character vocal hit. One syllable.',
  },
  'lib-vocal-character': {
    id: 'lib-vocal-character',
    bank: 'pockt',
    label: 'CHARACTER',
    hint: 'Different character vocal hit.',
  },
  'lib-vocal-chamber': {
    id: 'lib-vocal-chamber',
    bank: 'pockt',
    label: 'CHAMBER',
    hint: 'Reverb vocal attack. Atmospheric accent.',
  },
  'lib-vocal-hit-b': {
    id: 'lib-vocal-hit-b',
    bank: 'pockt',
    label: 'FEMALE HIT B',
    hint: 'Related female attack. Pair with Female Hit.',
  },
  'lib-vocal-male-b': {
    id: 'lib-vocal-male-b',
    bank: 'pockt',
    label: 'MALE HIT B',
    hint: 'Related male attack. Pair with Male Hit.',
  },
  'lib-vocal-effort': {
    id: 'lib-vocal-effort',
    bank: 'pockt',
    label: 'EFFORT',
    hint: 'Short rhythmic vocal effort.',
  },
  'lib-vocal-effort-m': {
    id: 'lib-vocal-effort-m',
    bank: 'pockt',
    label: 'EFFORT M',
    hint: 'Related male effort. Accent for Effort.',
  },
  'lib-vocal-emote': {
    id: 'lib-vocal-emote',
    bank: 'pockt',
    label: 'EMOTE',
    hint: 'Sung-like vocal syllable.',
  },
  'lib-vocal-emote-b': {
    id: 'lib-vocal-emote-b',
    bank: 'pockt',
    label: 'EMOTE B',
    hint: 'Related sung syllable. Accent for Emote.',
  },
  'lib-vocal-ooh': {
    id: 'lib-vocal-ooh',
    bank: 'pockt',
    label: 'OOH',
    hint: 'Sung vowel. Related to Ahh.',
  },
  'lib-vocal-ahh-deep': {
    id: 'lib-vocal-ahh-deep',
    bank: 'pockt',
    label: 'AHH DEEP',
    hint: 'Deeper character vowel. Accent for Character.',
  },
  'lib-vocal-chorus': {
    id: 'lib-vocal-chorus',
    bank: 'pockt',
    label: 'CHORUS',
    hint: 'Layered chamber vocal. Ensemble texture.',
  },
  'lib-vocal-chorus-b': {
    id: 'lib-vocal-chorus-b',
    bank: 'pockt',
    label: 'CHORUS B',
    hint: 'Related layered vocal. Accent for Chorus.',
  },
  'lib-vocal-ensemble': {
    id: 'lib-vocal-ensemble',
    bank: 'pockt',
    label: 'ENSEMBLE',
    hint: 'Layered group vocal wash. People singing.',
  },
  'lib-vocal-ensemble-b': {
    id: 'lib-vocal-ensemble-b',
    bank: 'pockt',
    label: 'ENSEMBLE B',
    hint: 'Related layered group vocal. Accent for Ensemble.',
  },
  'lib-choir-a': {
    id: 'lib-choir-a',
    bank: 'pockt',
    label: 'CHOIR A',
    hint: 'Sung choir attack. People singing.',
  },
  'lib-choir-b': {
    id: 'lib-choir-b',
    bank: 'pockt',
    label: 'CHOIR B',
    hint: 'Sung choir phrase. People singing.',
  },
  'lib-choir-c': {
    id: 'lib-choir-c',
    bank: 'pockt',
    label: 'CHOIR C',
    hint: 'Choir harmonic stab with sung body.',
  },
  'lib-choir-d': {
    id: 'lib-choir-d',
    bank: 'pockt',
    label: 'CHOIR D',
    hint: 'Sustained choir tone with a clear attack.',
  },
  'lib-choir-e': {
    id: 'lib-choir-e',
    bank: 'pockt',
    label: 'CHOIR E',
    hint: 'Choir ensemble hit. People singing.',
  },
  'lib-choir-f': {
    id: 'lib-choir-f',
    bank: 'pockt',
    label: 'CHOIR A2',
    hint: 'Related choir attack. Accent for Choir A.',
  },
  'lib-choir-g': {
    id: 'lib-choir-g',
    bank: 'pockt',
    label: 'CHOIR B2',
    hint: 'Related choir phrase. Accent for Choir B.',
  },
  'lib-choir-h': {
    id: 'lib-choir-h',
    bank: 'pockt',
    label: 'CHOIR C2',
    hint: 'Related choir stab. Accent for Choir C.',
  },
  count: {
    id: 'count',
    bank: 'pockt',
    label: 'COUNT',
    hint: 'Spoken 1–12 following the meter. Clean count voice.',
  },
  'count-1': { id: 'count-1', bank: 'pockt', label: 'ONE', hint: 'Spoken one. Clean count voice.' },
  'count-2': { id: 'count-2', bank: 'pockt', label: 'TWO', hint: 'Spoken two. Clean count voice.' },
  'count-3': { id: 'count-3', bank: 'pockt', label: 'THREE', hint: 'Spoken three. Clean count voice.' },
  'count-4': { id: 'count-4', bank: 'pockt', label: 'FOUR', hint: 'Spoken four. Clean count voice.' },
  'count-5': { id: 'count-5', bank: 'pockt', label: 'FIVE', hint: 'Spoken five. Clean count voice.' },
  'count-6': { id: 'count-6', bank: 'pockt', label: 'SIX', hint: 'Spoken six. Clean count voice.' },
  'count-7': { id: 'count-7', bank: 'pockt', label: 'SEVEN', hint: 'Spoken seven. Clean count voice.' },
  'count-8': { id: 'count-8', bank: 'pockt', label: 'EIGHT', hint: 'Spoken eight. Clean count voice.' },
  'count-9': { id: 'count-9', bank: 'pockt', label: 'NINE', hint: 'Spoken nine. Clean count voice.' },
  'count-10': { id: 'count-10', bank: 'pockt', label: 'TEN', hint: 'Spoken ten. Clean count voice.' },
  'count-11': { id: 'count-11', bank: 'pockt', label: 'ELEVEN', hint: 'Spoken eleven. Clean count voice.' },
  'count-12': { id: 'count-12', bank: 'pockt', label: 'TWELVE', hint: 'Spoken twelve. Clean count voice.' },
  'voice-count': {
    id: 'voice-count',
    bank: 'pockt',
    label: 'VOICE COUNT',
    hint: 'Legacy id. Migrates to COUNT.',
  },
  'bar-tap': { id: 'bar-tap', bank: 'pockt', label: 'TAP', hint: 'Dry bar-surface tap.' },
  'bar-metal-tap': { id: 'bar-metal-tap', bank: 'pockt', label: 'METAL TAP', hint: 'Short metallic click.' },
  'bar-jigger': { id: 'bar-jigger', bank: 'pockt', label: 'JIGGER', hint: 'Compact metal jigger strike.' },
  'bar-shaker': { id: 'bar-shaker', bank: 'pockt', label: 'SHAKER', hint: 'Light cocktail-shaker stroke.' },
  'bar-ice': { id: 'bar-ice', bank: 'pockt', label: 'ICE', hint: 'Single ice crack.' },
  'bar-wood-tap': { id: 'bar-wood-tap', bank: 'pockt', label: 'WOOD TAP', hint: 'Light wooden knock.' },
  'bar-glass': { id: 'bar-glass', bank: 'pockt', label: 'GLASS', hint: 'Thick rocks-glass tick.' },
  'bar-spoon': { id: 'bar-spoon', bank: 'pockt', label: 'SPOON', hint: 'Bright cutlery tick.' },
  'bar-thud': { id: 'bar-thud', bank: 'pockt', label: 'THUD', hint: 'Medium wood knock.' },
  'bar-shake': { id: 'bar-shake', bank: 'pockt', label: 'SHAKE', hint: 'Punchier two-stroke shake.' },
  'bar-bottle': { id: 'bar-bottle', bank: 'pockt', label: 'BOTTLE', hint: 'Short bottle knock.' },
  'bar-knock': { id: 'bar-knock', bank: 'pockt', label: 'BAR KNOCK', hint: 'Hard wood accent knock.' },
  'bar-clink': { id: 'bar-clink', bank: 'pockt', label: 'CLINK', hint: 'Bright whiskey-glass clink.' },
  'bar-crate': { id: 'bar-crate', bank: 'pockt', label: 'CRATE', hint: 'Bottle against wood.' },
};

export const POCKT_SOUND_ORDER: SoundId[] = [
  'pocket',
  'precision',
  'stage-cut',
  'tight',
  'pockt-studio',
  'subkick',
  'pockt-altered',
  'pockt-after-dark',
  'pockt-default',
  'pockt-heavy',
  'wood',
  'brass',
  'digital-click',
  'clap',
  'sharp',
  'soft-click',
  'lib-vocal-hit',
  'lib-vocal-male',
  'lib-vocal-female',
  'lib-vocal-shout',
  'lib-vocal-call',
  'lib-vocal-ahh',
  'lib-vocal-character',
  'lib-vocal-chamber',
  'lib-vocal-hit-b',
  'lib-vocal-male-b',
  'lib-vocal-effort',
  'lib-vocal-effort-m',
  'lib-vocal-emote',
  'lib-vocal-emote-b',
  'lib-vocal-ooh',
  'lib-vocal-ahh-deep',
  'lib-vocal-chorus',
  'lib-vocal-chorus-b',
  'lib-vocal-ensemble',
  'lib-vocal-ensemble-b',
  'lib-choir-a',
  'lib-choir-b',
  'lib-choir-c',
  'lib-choir-d',
  'lib-choir-e',
  'lib-choir-f',
  'lib-choir-g',
  'lib-choir-h',
  'count',
  'count-1',
  'count-2',
  'count-3',
  'count-4',
  'count-5',
  'count-6',
  'count-7',
  'count-8',
  'count-9',
  'count-10',
  'count-11',
  'count-12',
  'bar-tap',
  'bar-metal-tap',
  'bar-jigger',
  'bar-shaker',
  'bar-ice',
  'bar-wood-tap',
  'bar-glass',
  'bar-spoon',
  'bar-thud',
  'bar-shake',
  'bar-bottle',
  'bar-knock',
  'bar-clink',
  'bar-crate',
];
export const CLASSIC_SOUND_ORDER: SoundId[] = [
  'plain-tick',
  'click',
  'blend-tick',
  'bell',
  'mechanical',
  'wood',
  'stick',
  'clave',
  'woodblock',
  'rim',
  'cowbell',
  'snare',
  'kick',
  'hihat',
  'temple',
  'dry-stick',
  'soft-wood',
  'lib-wood',
  'lib-jam',
  'lib-kick-deep',
  'lib-kick',
  'lib-snare',
  'lib-hat',
  'lib-djembe',
  'lib-doumbek',
  'lib-bell',
  'lib-tom',
  'lib-timpani',
];
export const MODERN_SOUND_ORDER: SoundId[] = [
  'digital-click',
  'electronic-tick',
  'pulse',
  'beep',
  'studio-click',
  'high-click',
  'low-click',
  'soft-click',
  'hard-click',
  'lib-click',
  'lib-click-tight',
  'lib-blip',
  'lib-digital',
  'lib-synth',
];

export const BEATLINE_SOUND_GROUPS: { id: string; label: string; sounds: SoundId[] }[] = [
  { id: 'classic', label: 'CLASSIC', sounds: ['plain-tick', 'click', 'blend-tick', 'bell', 'mechanical'] },
  { id: 'digital', label: 'DIGITAL', sounds: ['digital-click', 'electronic-tick', 'pulse', 'studio-click', 'high-click', 'low-click'] },
  { id: 'drum', label: 'DRUM', sounds: ['rim', 'stick', 'snare', 'kick', 'cowbell', 'hihat'] },
  { id: 'wood', label: 'WOOD', sounds: ['woodblock', 'clave', 'temple', 'dry-stick', 'soft-wood'] },
];

export const LIBRARY_SOUND_ORDER: SoundId[] = [
  'lib-wood',
  'lib-jam',
  'lib-kick-deep',
  'lib-kick',
  'lib-snare',
  'lib-hat',
  'lib-djembe',
  'lib-doumbek',
  'lib-bell',
  'lib-tom',
  'lib-timpani',
  'lib-click',
  'lib-click-tight',
  'lib-blip',
  'lib-digital',
  'lib-synth',
  'lib-vocal-hit',
  'lib-vocal-male',
  'lib-vocal-female',
  'lib-vocal-shout',
  'lib-vocal-call',
  'lib-vocal-ahh',
  'lib-vocal-character',
  'lib-vocal-chamber',
  'lib-vocal-hit-b',
  'lib-vocal-male-b',
  'lib-vocal-effort',
  'lib-vocal-effort-m',
  'lib-vocal-emote',
  'lib-vocal-emote-b',
  'lib-vocal-ooh',
  'lib-vocal-ahh-deep',
  'lib-vocal-chorus',
  'lib-vocal-chorus-b',
  'lib-vocal-ensemble',
  'lib-vocal-ensemble-b',
  'lib-choir-a',
  'lib-choir-b',
  'lib-choir-c',
  'lib-choir-d',
  'lib-choir-e',
  'lib-choir-f',
  'lib-choir-g',
  'lib-choir-h',
  'bar-tap',
  'bar-metal-tap',
  'bar-jigger',
  'bar-shaker',
  'bar-ice',
  'bar-wood-tap',
  'bar-glass',
  'bar-spoon',
  'bar-thud',
  'bar-shake',
  'bar-bottle',
  'bar-knock',
  'bar-clink',
  'bar-crate',
];

export const SOUND_ORDER: SoundId[] = [
  ...POCKT_SOUND_ORDER,
  ...CLASSIC_SOUND_ORDER,
  ...MODERN_SOUND_ORDER,
];

export const SOUNDS_BY_FAMILY: Record<SoundBankId, SoundId[]> = {
  pockt: POCKT_SOUND_ORDER,
  classic: CLASSIC_SOUND_ORDER,
  modern: MODERN_SOUND_ORDER,
};

export const BASS_SOUNDS = new Set<SoundId>(['subkick', 'pockt-after-dark']);

export function soundsForFamily(bank: SoundBankId): SoundId[] {
  return SOUNDS_BY_FAMILY[bank];
}

export function defaultSoundForFamily(bank: SoundBankId): SoundId {
  return SOUNDS_BY_FAMILY[bank][0];
}

export function familyForSound(sound: SoundId): SoundBankId {
  return SOUNDS[sound].bank;
}

export function soundDisplay(sound: SoundId): string {
  const def = SOUNDS[sound];
  const bank = def.bank === 'pockt' ? 'POCKT' : def.bank === 'modern' ? 'MODERN' : 'CLASSIC';
  return `${bank}  ·  ${def.label}`;
}

export function soundStudioName(sound: SoundId): string {
  const raw = SOUNDS[sound]?.label ?? sound;
  return raw
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .replace(/\bPockt\b/g, 'POCKT');
}

export const POCKET_FIRST_SOUND: Record<SkinId, SoundId> = {
  classic: 'pockt-default',
  titanium: 'pocket',
  studio: 'pockt-studio',
  altered: 'pockt-altered',
  'after-dark': 'pockt-after-dark',
  bar: 'bar-thud',
  heavy: 'pocket',
  roots: 'pocket',
  sundown: 'pocket',
  heart: 'pocket',
};

export function pocketSoundForSkin(skin: SkinId): SoundId {
  return POCKET_FIRST_SOUND[skin];
}

export function isSoundId(value: unknown): value is SoundId {
  return typeof value === 'string' && value in SOUNDS;
}

export function isSoundBankId(value: unknown): value is SoundBankId {
  return value === 'pockt' || value === 'classic' || value === 'modern';
}

const STALE_SOUND: Record<string, SoundId> = {
  roots: 'pocket',
  sundown: 'pocket',
  happy: 'pocket',
  heart: 'pocket',
  ROOTS: 'pocket',
  SUNDOWN: 'pocket',
  HAPPY: 'pocket',
  HEART: 'pocket',
  'pockt-heart': 'pocket',
  'pockt-roots': 'wood',
  'pockt-sundown': 'pockt-after-dark',
  'voice-count': 'count',
};

export function isEnabledDisplaySound(value: unknown): value is SoundId {
  return isSoundId(value) && !(value in STALE_SOUND) && SOUND_ORDER.includes(value);
}

/** Missing or stale room sound IDs must never crash lookup. */
export function resolvePlayableSound(value: unknown, fallback: SoundId = 'pocket'): SoundId {
  if (typeof value === 'string' && value in STALE_SOUND) return STALE_SOUND[value];
  if (isSoundId(value)) return value;
  if (isSoundId(fallback)) return fallback;
  return 'pocket';
}

/** Voices are words, not clicks: above this tempo a spoken word runs into the next one. */
export const VOICE_MAX_BPM: Partial<Record<SoundId, number>> = {
 "count-1": 130,
 "count-10": 130,
 "count-11": 130,
 "count-12": 130,
 "count-2": 130,
 "count-3": 130,
 "count-4": 130,
 "count-5": 130,
 "count-6": 130,
 "count-7": 130,
 "count-8": 130,
 "count-9": 130,
 "count": 130,
 "lib-choir-a": 90,
 "lib-choir-b": 90,
 "lib-choir-c": 90,
 "lib-choir-d": 90,
 "lib-choir-e": 90,
 "lib-choir-f": 90,
 "lib-choir-g": 90,
 "lib-choir-h": 90,
 "lib-vocal-ahh-deep": 240,
 "lib-vocal-ahh": 240,
 "lib-vocal-call": 240,
 "lib-vocal-chamber": 220,
 "lib-vocal-character": 240,
 "lib-vocal-chorus-b": 220,
 "lib-vocal-chorus": 210,
 "lib-vocal-effort-m": 240,
 "lib-vocal-effort": 240,
 "lib-vocal-emote-b": 240,
 "lib-vocal-emote": 240,
 "lib-vocal-ensemble-b": 210,
 "lib-vocal-ensemble": 220,
 "lib-vocal-female": 240,
 "lib-vocal-hit-b": 240,
 "lib-vocal-hit": 240,
 "lib-vocal-male-b": 240,
 "lib-vocal-male": 240,
 "lib-vocal-ooh": 240,
 "lib-vocal-shout": 240
};
