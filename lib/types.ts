import type { CustomLayout } from '@/lib/custom-layout';

export type FeelId = 'straight' | 'push' | 'pocket' | 'laid-back' | 'swampy';

export type TimeSignatureId =
  | '1/4'
  | '2/4'
  | '3/4'
  | '4/4'
  | '5/4'
  | '5/4-23'
  | '5/4-32'
  | '6/4'
  | '7/4'
  | '8/4'
  | '9/4'
  | '10/4'
  | '11/4'
  | '12/4'
  | '13/4'
  | '14/4'
  | '15/4'
  | '16/4'
  | '1/2'
  | '2/2'
  | '3/2'
  | '4/2'
  | '5/2'
  | '6/2'
  | '8/2'
  | '1/8'
  | '2/8'
  | '3/8'
  | '4/8'
  | '5/8'
  | '5/8-23'
  | '5/8-32'
  | '6/8'
  | '7/8'
  | '7/8-223'
  | '7/8-232'
  | '7/8-322'
  | '8/8'
  | '9/8'
  | '9/8-333'
  | '9/8-2223'
  | '9/8-3222'
  | '10/8'
  | '11/8'
  | '12/8'
  | '13/8'
  | '14/8'
  | '15/8'
  | '16/8'
  | '1/16'
  | '2/16'
  | '3/16'
  | '4/16'
  | '5/16'
  | '6/16'
  | '7/16'
  | '8/16'
  | '9/16'
  | '10/16'
  | '11/16'
  | '12/16'
  | '13/16'
  | '14/16'
  | '15/16'
  | '16/16';

export type SubdivisionId = 'quarter' | 'eighths' | 'triplet' | 'sixteenths' | 'dotted';

export type SoundBankId = 'pockt' | 'classic' | 'modern';

export type SoundId =
  | 'click'
  | 'wood'
  | 'stick'
  | 'clave'
  | 'pulse'
  | 'subkick'
  | 'pockt-default'
  | 'pockt-studio'
  | 'pockt-altered'
  | 'pockt-after-dark'
  | 'pocket'
  | 'pockt-heavy'
  | 'pockt-heart'
  | 'pockt-roots'
  | 'pockt-sundown'
  | 'brass'
  | 'tight'
  | 'clap'
  | 'sharp'
  | 'digital-click'
  | 'mechanical'
  | 'woodblock'
  | 'rim'
  | 'cowbell'
  | 'beep'
  | 'soft-click'
  | 'hard-click'
  | 'high-click'
  | 'low-click'
  | 'studio-click'
  | 'plain-tick'
  | 'blend-tick'
  | 'bell'
  | 'electronic-tick'
  | 'snare'
  | 'kick'
  | 'hihat'
  | 'temple'
  | 'dry-stick'
  | 'soft-wood'
  | 'stage-cut'
  | 'precision'
  | 'lib-wood'
  | 'lib-jam'
  | 'lib-kick-deep'
  | 'lib-kick'
  | 'lib-snare'
  | 'lib-hat'
  | 'lib-djembe'
  | 'lib-doumbek'
  | 'lib-bell'
  | 'lib-tom'
  | 'lib-timpani'
  | 'lib-click'
  | 'lib-click-tight'
  | 'lib-blip'
  | 'lib-digital'
  | 'lib-synth'
  | 'lib-vocal-hit'
  | 'lib-vocal-male'
  | 'lib-vocal-female'
  | 'lib-vocal-shout'
  | 'lib-vocal-call'
  | 'lib-vocal-ahh'
  | 'lib-vocal-character'
  | 'lib-vocal-chamber'
  | 'lib-vocal-hit-b'
  | 'lib-vocal-male-b'
  | 'lib-vocal-effort'
  | 'lib-vocal-effort-m'
  | 'lib-vocal-emote'
  | 'lib-vocal-emote-b'
  | 'lib-vocal-ooh'
  | 'lib-vocal-ahh-deep'
  | 'lib-vocal-chorus'
  | 'lib-vocal-chorus-b'
  | 'lib-vocal-ensemble'
  | 'lib-vocal-ensemble-b'
  | 'lib-choir-a'
  | 'lib-choir-b'
  | 'lib-choir-c'
  | 'lib-choir-d'
  | 'lib-choir-e'
  | 'lib-choir-f'
  | 'lib-choir-g'
  | 'lib-choir-h'
  | 'count'
  | 'count-1'
  | 'count-2'
  | 'count-3'
  | 'count-4'
  | 'count-5'
  | 'count-6'
  | 'count-7'
  | 'count-8'
  | 'count-9'
  | 'count-10'
  | 'count-11'
  | 'count-12'
  | 'voice-count'
  | 'bar-tap'
  | 'bar-metal-tap'
  | 'bar-jigger'
  | 'bar-shaker'
  | 'bar-ice'
  | 'bar-wood-tap'
  | 'bar-glass'
  | 'bar-spoon'
  | 'bar-thud'
  | 'bar-shake'
  | 'bar-bottle'
  | 'bar-knock'
  | 'bar-clink'
  | 'bar-crate'
  | 'marimba'
  | 'side-stick'
  | 'conga'
  | 'cajon'
  | 'tambourine'
  | 'shaker'
  | 'triangle'
  | 'analog-blip'
  | 'snap'
  | 'sticks'
  | 'kalimba'
  | 'tick-tock';

export type SkinCategoryId = 'classic' | 'immersive';

export type ClassicBackdropId =
  | 'ledgear'
  | 'pulse'
  | 'ring'
  | 'pendula'
  | 'smart'
  | 'pro'
  | 'tempo'
  | 'beats'
  | 'beatline'
  | 'custom'
  | 'dial'
  | 'rig';

export type RoomId =
  | 'ledgear'
  | 'pulse-circle'
  | 'pulse'
  | 'pendula-classic'
  | 'smart-pendulum'
  | 'pro'
  | 'tempo'
  | 'beats'
  | 'beatline'
  | 'dial'
  | 'rig'
  | 'customized'
  | 'studio'
  | 'altered'
  | 'after-dark'
  | 'bar'
  | 'heavy'
  | 'roots'
  | 'sundown'
  | 'heart';

export type SkinId =
  | 'classic'
  | 'titanium'
  | 'studio'
  | 'altered'
  | 'after-dark'
  | 'bar'
  | 'heavy'
  | 'roots'
  | 'sundown'
  | 'heart';

export type VisualMotion = 'low' | 'normal' | 'high';

/** 0 mute · 1 soft/P · 2 normal/MF · 3 strong/F. Legacy `accent` maps to strong. */
export type AccentLevel = 'mute' | 'soft' | 'normal' | 'accent' | 'strong';

export type GapPattern =
  | 'full'
  | 'one-on-one-off'
  | 'every-other'
  | 'two-on-one-off'
  | 'three-on-one-off'
  | 'two-on-two-off'
  | 'four-on-two-off'
  | 'four-on-four-off'
  | 'custom';

export type LockInPattern = GapPattern | 'two-and-four';

export type CountInBars = 0 | 1 | 2 | 3 | 4;
export type SensoryMode = 'audio' | 'visual' | 'haptic' | 'audio-visual' | 'audio-haptic' | 'all';
export type SparseMode = 'all' | 'downbeats' | 'every-2' | 'every-4';
export type LaunchBehavior = 'last' | 'favorite' | 'gallery';
export type AudioRouteClass = 'speaker' | 'wired' | 'bluetooth';
export type StereoPan = 'left' | 'center' | 'right';
export type SwingAmount = 'straight' | 'light' | 'medium' | 'heavy';
export type PolyrhythmId = 'off' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | 'custom';
export type HeadphoneDisconnect = 'continue' | 'stop';

export type SoundRole = 'downbeat' | 'beat' | 'sub';

export type MetronomeConfig = {
  bpm: number;
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  feel: FeelId;
  /**
   * Native feel offset, -1..+1.
   * -1 = PUSH (earlier than the grid), 0 = STRAIGHT, +1 = LAY BACK (later).
   * The on-screen slider is inverted so left = lay back and right = push.
   */
  feelDial: number;
  soundBank: SoundBankId;
  sound: SoundId;
  /** Independent role assignment. Null/undefined uses the selected sound family. */
  soundDownbeat: SoundId | null;
  soundBeat: SoundId | null;
  soundSub: SoundId | null;
  /** Count the meter with spoken numbers when assets exist. */
  voiceCount: boolean;
  /** AUTO uses the curated accent pair. CUSTOM uses customAccentSoundId on downbeats. */
  accentMode: 'auto' | 'custom';
  customAccentSoundId: SoundId | null;
  recentSounds: SoundId[];
  favoriteSounds: SoundId[];
  volume: number;
  haptic: boolean;
  /**
   * Smart Pendulum only: extra tactile click at the visual center crossing.
   * Independent of app-wide beat haptics. Absent/undefined resolves to false.
   */
  smartPendulumCenterHaptic: boolean;
  /** CONSOLE only: on-screen TAP/beat ring. Absent resolves to true. */
  rigBeatLight: boolean;
  /** User haptic timing trim in milliseconds. Negative fires earlier. */
  hapticSyncMs: number;
  /** Beat haptic strength: 0.6 light, 1 standard, 1.3 heavy, 2 maximum. */
  hapticStrength?: number;
  /** Visual follower trim in milliseconds. Does not move the audio clock. */
  visualOffsetMs: number;
  sensoryMode: SensoryMode;
  /** Audible click subdivision offset. 0 = on the beat. Measure stays stable. */
  clickShift: number;
  sparseMode: SparseMode;
  audioRouteClass: AudioRouteClass;
  audioOffsetSpeakerMs: number;
  audioOffsetWiredMs: number;
  audioOffsetBluetoothMs: number;
  accentPattern: AccentLevel[];
  /** Beatline per-meter pattern cache. Live native playback still uses accentPattern. */
  beatlinePatterns: Partial<Record<TimeSignatureId, AccentLevel[]>>;
  backbeat: boolean;
  lockIn: LockInPattern;
  skin: SkinId;
  skinCategory: SkinCategoryId;
  /** Classic hardware background. Ignored while an immersive room is active. */
  classicBackdrop: ClassicBackdropId;
  /** Durable file URI for the Classic Custom Photo backdrop. */
  customPhotoUri: string | null;
  /** Versioned Custom workspace. Migrates from customPhotoUri. */
  customLayout: CustomLayout;
  /** Last explicit click voice per room. Missing key = room default. */
  roomVoice: Partial<Record<RoomId, SoundId>>;
  /** Pulse the device rear torch with primary beats. Output follower only. */
  flashOnBeat: boolean;
  /** Pulse a screen wash with primary beats. Separate from the torch. */
  flashScreenOnBeat: boolean;
  launchSound: boolean;
  visualPulse: boolean;
  visualMotion: VisualMotion;
  countInBars: CountInBars;
  stereoPan: StereoPan;
  accentVolume: number;
  subVolume: number;
  swing: SwingAmount;
  gapOnBars: number;
  gapOffBars: number;
  polyrhythm: PolyrhythmId;
  polyA: number;
  polyB: number;
  largeControls: boolean;
  oneHanded: boolean;
  keepAwake: boolean;
  backgroundPlay: boolean;
  mixWithOthers: boolean;
  headphoneDisconnect: HeadphoneDisconnect;
  photoMotion: boolean;
  wheelInvert: boolean;
  pitchPipeHz: number;
  /** Once true, MIX reset still restores room defaults. Per-room memory lives in roomSounds. */
  hasUserChosenSound: boolean;
  /** Last explicit (or seeded) sound per room. Missing key = first-time room default. */
  roomSounds: Partial<Record<SkinId, SoundId>>;
  hasSeenClassicTutorial: boolean;
  hasSeenTitaniumTutorial: boolean;
  hasSeenStudioTutorial: boolean;
  hasSeenAlteredTutorial: boolean;
  hasSeenAfterDarkTutorial: boolean;
  hasSeenHeavyTutorial: boolean;
  hasSeenRootsTutorial: boolean;
  hasSeenSundownTutorial: boolean;
  hasSeenHeartTutorial: boolean;
};

/**
 * One master musical event. Audio, haptic, and visual dispatch
 * all derive from this object — never from independent clocks.
 */
export type TickEvent = {
  tickIndex: number;
  measureIndex: number;
  beatIndex: number;
  subdivisionIndex: number;
  isDownbeat: boolean;
  isPrimaryBeat: boolean;
  isBackbeat: boolean;
  isAccent: boolean;
  accentLevel: AccentLevel;
  audible: boolean;
  silentMeasure: boolean;
  clickReturned: boolean;
  volume: number;
  soundRole: SoundRole;
  /** Master-timeline due time in performance milliseconds. */
  expectedMs: number;
  /** Intentional Feel offset relative to the mathematical grid, in ms. */
  feelOffsetMs: number;
  /** 0–1 visual energy for this event. */
  visualIntensity: number;
};

/**
 * Reserved for a future microphone-based LOCK IN engine.
 * Version 1 does not populate these values.
 */
export type TimingFeedback = {
  status: 'unknown' | 'locked' | 'ahead' | 'behind';
  offsetMs: number | null;
  note?: string;
};
