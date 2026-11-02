export type PocktHelpTopic = {
  title: string;
  body: string;
};

export const POCKT_HELP = {
  liveMode: {
    title: 'Large Controls',
    body: 'Makes Play and BPM easier to hit while performing. Timing does not change.',
  },
  feel: {
    title: 'Feel',
    body: 'Shifts where the click sits in the beat — straight, pocket, or laid back. Tempo stays the same.',
  },
  lockIn: {
    title: 'Lock In',
    body: 'Masks some beats so you keep time in the gaps. Useful for practice. The native clock still runs.',
  },
  sensory: {
    title: 'Sensory',
    body: 'Chooses whether POCKT uses click, haptics, visuals, or a mix. It does not change BPM.',
  },
  hapticSync: {
    title: 'Haptic Sync',
    body: 'Nudges haptic timing relative to the click. Leave at zero unless the tap feels early or late.',
  },
  visualOffset: {
    title: 'Visual Offset',
    body: 'Delays or advances visuals only. Audio and haptics stay on the native musical clock.',
  },
  privacyShade: {
    title: 'Privacy shade',
    body: 'Pull down from the top-center mark to dim the screen. Swipe up to restore. Timing is unchanged.',
  },
} as const satisfies Record<string, PocktHelpTopic>;
