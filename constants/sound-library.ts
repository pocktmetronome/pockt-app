import { ROOM_DEFAULT_SOUND } from '@/lib/room-voice';
import type { RoomId, SoundId } from '@/lib/types';

export type SoundCategoryId =
  | 'favorites'
  | 'mixes'
  | 'picks'
  | 'classic'
  | 'wood'
  | 'drums'
  | 'percussion'
  | 'bar'
  | 'digital'
  | 'synth'
  | 'count'
  | 'choir'
  | 'voice'
  | 'vocal'
  | 'rhythm'
  | 'metal'
  | 'more';

export type SoundMixPreset = {
  id: string;
  label: string;
  sound: SoundId;
  soundDownbeat?: SoundId | null;
  soundBeat?: SoundId | null;
  soundSub?: SoundId | null;
};

export const SOUND_CATEGORIES: { id: SoundCategoryId; label: string; icon: string; sounds: SoundId[] }[] = [
  {
    id: 'favorites',
    label: 'FAVORITES',
    icon: 'star',
    sounds: [],
  },
  {
    id: 'mixes',
    label: 'POCKT MIXES',
    icon: 'layers',
    sounds: [],
  },
  {
    id: 'picks',
    label: 'POCKT PICKS',
    icon: 'sparkles',
    sounds: ['pocket', 'precision', 'pockt-studio', 'tick-tock', 'lib-wood', 'clave', 'side-stick', 'mechanical', 'cajon', 'lib-bell'],
  },
  {
    id: 'classic',
    label: 'METRONOME',
    icon: 'metronome',
    sounds: ['precision', 'tick-tock', 'mechanical', 'click', 'plain-tick', 'blend-tick', 'soft-click', 'low-click'],
  },
  {
    id: 'wood',
    label: 'WOOD',
    icon: 'leaf',
    sounds: ['lib-wood', 'clave', 'lib-jam', 'temple', 'wood', 'sticks', 'marimba'],
  },
  {
    id: 'drums',
    label: 'DRUMS',
    icon: 'disc',
    sounds: ['lib-kick', 'lib-snare', 'lib-hat', 'side-stick', 'rim', 'kick', 'subkick', 'cajon', 'lib-tom', 'lib-timpani'],
  },
  {
    id: 'percussion',
    label: 'HAND PERCUSSION',
    icon: 'musical-notes',
    sounds: ['lib-djembe', 'lib-doumbek', 'clap', 'snap', 'stick', 'shaker', 'conga', 'cowbell'],
  },
  {
    id: 'bar',
    label: 'BAR',
    icon: 'wine',
    sounds: ['bar-thud', 'bar-knock', 'bar-glass', 'bar-clink', 'bar-tap', 'bar-ice', 'bar-wood-tap', 'bar-shake'],
  },
  {
    id: 'digital',
    label: 'ELECTRONIC',
    icon: 'pulse',
    sounds: ['lib-click', 'lib-click-tight', 'digital-click', 'stage-cut', 'sharp', 'tight', 'analog-blip', 'lib-blip', 'pulse'],
  },
  {
    id: 'synth',
    label: 'SYNTH & KEYS',
    icon: 'hardware-chip',
    sounds: ['pockt-after-dark', 'pockt-altered', 'analog-blip', 'lib-blip', 'kalimba'],
  },
  {
    id: 'count',
    label: 'COUNT',
    icon: 'list',
    sounds: ['count', 'count-1', 'count-2', 'count-3', 'count-4', 'count-5', 'count-6', 'count-7', 'count-8', 'count-9', 'count-10', 'count-11', 'count-12'],
  },
  {
    id: 'choir',
    label: 'CHOIR',
    icon: 'people',
    sounds: ['lib-choir-e', 'lib-choir-c', 'lib-choir-h', 'lib-choir-f'],
  },
  {
    id: 'vocal',
    label: 'VOCAL',
    icon: 'mic',
    sounds: ['lib-vocal-ooh', 'lib-vocal-emote', 'lib-vocal-emote-b', 'lib-vocal-ahh-deep', 'lib-vocal-ahh'],
  },
  {
    id: 'rhythm',
    label: 'RHYTHMIC VOICE',
    icon: 'pulse',
    sounds: ['lib-vocal-effort', 'lib-vocal-hit', 'lib-vocal-male-b', 'lib-vocal-hit-b', 'lib-vocal-effort-m', 'lib-vocal-female'],
  },
  {
    id: 'metal',
    label: 'BELLS & METAL',
    icon: 'notifications',
    sounds: ['lib-bell', 'triangle', 'brass', 'cowbell'],
  },
  {
    id: 'more',
    label: 'MORE',
    icon: 'ellipsis-horizontal',
    sounds: ['pockt-default', 'pockt-heavy', 'pockt-altered', 'pockt-after-dark', 'clap', 'sharp'],
  },
];

export const WHISKEY_BAR_MIX: SoundMixPreset = {
  id: 'whiskey-bar',
  label: 'Whiskey Bar',
  sound: 'bar-thud',
  soundDownbeat: 'bar-shake',
  soundBeat: 'bar-thud',
  soundSub: 'bar-knock',
};

export const ROOM_SOUND_PRESETS: SoundMixPreset[] = [
  { id: 'classic', label: 'Classic', sound: 'pocket', soundDownbeat: 'lib-bell', soundBeat: 'pocket', soundSub: 'lib-click-tight' },
  { id: 'studio', label: 'Studio', sound: 'pockt-studio', soundDownbeat: 'precision', soundBeat: 'pockt-studio', soundSub: 'soft-click' },
  WHISKEY_BAR_MIX,
  { id: 'wood', label: 'Wood', sound: 'lib-wood', soundDownbeat: 'lib-jam', soundBeat: 'lib-wood', soundSub: 'lib-hat' },
  { id: 'drums', label: 'Drums', sound: 'lib-kick', soundDownbeat: 'lib-snare', soundBeat: 'lib-kick', soundSub: 'lib-hat' },
  { id: 'percussion', label: 'Percussion', sound: 'lib-djembe', soundDownbeat: 'lib-doumbek', soundBeat: 'lib-djembe', soundSub: 'lib-hat' },
  { id: 'synth', label: 'Synth', sound: 'analog-blip', soundDownbeat: 'lib-blip', soundBeat: 'analog-blip', soundSub: 'lib-click-tight' },
  { id: 'deep', label: 'Deep', sound: 'subkick', soundDownbeat: 'lib-kick', soundBeat: 'subkick', soundSub: 'lib-hat' },
  { id: 'count', label: 'Count', sound: 'count', soundDownbeat: null, soundBeat: 'count' },
];

export const PRO_SOUND_PRESETS: SoundMixPreset[] = ROOM_SOUND_PRESETS;
export const DIAL_SOUND_PRESETS: SoundMixPreset[] = ROOM_SOUND_PRESETS;

export function mixFamilyForPreset(id: string): SoundCategoryId {
  if (id === 'wood') return 'wood';
  if (id === 'drums' || id === 'deep') return 'drums';
  if (id === 'percussion') return 'percussion';
  if (id === 'synth') return 'synth';
  if (id === 'count') return 'count';
  if (id === 'studio') return 'picks';
  if (id === 'whiskey-bar') return 'bar';
  return 'classic';
}

export const PRIMARY_MIX_PRESETS = ROOM_SOUND_PRESETS;

/** Optional first-pick pairings. Only where the pair is musically complementary. */
export const FAMILY_RECOMMENDED: Partial<
  Record<SoundCategoryId, { label: string; sound: SoundId; hint: string }>
> = {
  count: { label: 'POCKT SETUP', sound: 'count', hint: 'Spoken 1–12. Auto accent stays in the count.' },
  percussion: { label: 'POCKT SETUP', sound: 'lib-djembe', hint: 'Djembe with complementary doumbek accent.' },
  wood: { label: 'POCKT SETUP', sound: 'lib-wood', hint: 'Wood with complementary jam-block accent.' },
  choir: { label: 'POCKT SETUP', sound: 'lib-choir-e', hint: 'Choir phrase with a related choir accent.' },
  bar: { label: 'POCKT SETUP', sound: 'bar-thud', hint: 'Thud primary, shake accent.' },
};

export function defaultSoundForRoom(roomId: RoomId): SoundId {
  return ROOM_DEFAULT_SOUND[roomId] ?? 'pocket';
}

export const PRODUCTION_LIBRARY_FILES = [
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
] as const;

export const SOUND_ACCENT_PAIR: Partial<Record<SoundId, SoundId>> = {
  click: 'bell',
  'plain-tick': 'mechanical',
  'blend-tick': 'bell',
  mechanical: 'bell',
  wood: 'woodblock',
  stick: 'rim',
  clave: 'woodblock',
  woodblock: 'clave',
  'dry-stick': 'woodblock',
  'soft-wood': 'wood',
  temple: 'woodblock',
  'lib-wood': 'lib-jam',
  'lib-jam': 'lib-wood',
  'lib-kick': 'lib-kick-deep',
  'lib-kick-deep': 'lib-kick',
  'lib-snare': 'lib-hat',
  'lib-hat': 'lib-snare',
  'lib-djembe': 'lib-doumbek',
  'lib-doumbek': 'lib-djembe',
  'lib-click': 'lib-click-tight',
  'lib-click-tight': 'lib-click',
  'lib-digital': 'lib-blip',
  'lib-blip': 'analog-blip',
  'digital-click': 'beep',
  beep: 'electronic-tick',
  'electronic-tick': 'beep',
  pulse: 'beep',
  'soft-click': 'hard-click',
  'hard-click': 'high-click',
  'high-click': 'low-click',
  'studio-click': 'digital-click',
  pocket: 'precision',
  precision: 'pocket',
  'pockt-studio': 'precision',
  'pockt-default': 'pocket',
  'lib-bell': 'lib-timpani',
  bell: 'lib-bell',
  kick: 'snare',
  snare: 'kick',
  hihat: 'rim',
  cowbell: 'bell',
  'lib-vocal-hit': 'lib-vocal-hit-b',
  'lib-vocal-hit-b': 'lib-vocal-hit',
  'lib-vocal-female': 'lib-vocal-male-b',
  'lib-vocal-male': 'lib-vocal-male-b',
  'lib-vocal-male-b': 'lib-vocal-male',
  'lib-vocal-ahh': 'lib-vocal-ooh',
  'lib-vocal-ooh': 'lib-vocal-ahh',
  'lib-vocal-character': 'lib-vocal-ahh-deep',
  'lib-vocal-ahh-deep': 'lib-vocal-character',
  'lib-vocal-chamber': 'lib-vocal-chorus',
  'lib-vocal-chorus': 'lib-vocal-chorus-b',
  'lib-vocal-chorus-b': 'lib-vocal-chorus',
  'lib-vocal-ensemble': 'lib-vocal-ensemble-b',
  'lib-vocal-ensemble-b': 'lib-vocal-ensemble',
  'lib-choir-a': 'lib-choir-f',
  'lib-choir-f': 'lib-choir-e',
  'lib-choir-b': 'lib-choir-g',
  'lib-choir-g': 'lib-choir-b',
  'lib-choir-c': 'lib-choir-h',
  'lib-choir-h': 'lib-choir-c',
  'lib-choir-d': 'lib-choir-e',
  'lib-choir-e': 'lib-choir-f',
  count: 'count-1',
  'count-1': 'count-1',
  'lib-vocal-emote': 'lib-vocal-emote-b',
  'lib-vocal-emote-b': 'lib-vocal-emote',
  'lib-vocal-effort': 'lib-vocal-effort-m',
  'lib-vocal-effort-m': 'lib-vocal-effort',
  'lib-vocal-shout': 'lib-vocal-call',
  'lib-vocal-call': 'lib-vocal-shout',
  'bar-tap': 'bar-metal-tap',
  'bar-metal-tap': 'bar-glass',
  'bar-jigger': 'bar-metal-tap',
  'bar-shaker': 'bar-shake',
  'bar-shake': 'bar-shaker',
  'bar-ice': 'bar-glass',
  'bar-wood-tap': 'bar-thud',
  'bar-thud': 'bar-shake',
  'bar-knock': 'bar-thud',
  'bar-glass': 'bar-clink',
  'bar-clink': 'bar-glass',
  'bar-spoon': 'bar-jigger',
  'bar-bottle': 'bar-crate',
  'bar-crate': 'bar-bottle',
};

export function rolesForSelectedSound(sound: SoundId): { soundBeat: SoundId; soundDownbeat: SoundId } {
  const downbeat = SOUND_ACCENT_PAIR[sound];
  return {
    soundBeat: sound,
    soundDownbeat: downbeat && downbeat !== sound ? downbeat : sound,
  };
}
