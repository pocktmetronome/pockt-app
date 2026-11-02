import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { ClassicInstrumentHost } from '@/components/classic/ClassicInstrumentHost';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { PocketHint } from '@/components/pockt/PocketHint';
import { SkinPulse } from '@/components/skins/SkinWorld';
import { isClassicExperience } from '@/constants/rooms';
import type { SkinId } from '@/lib/types';

/**
 * Swappable visual instrument scene.
 * The View is the scene. Transport / BPM / MIX remain the system (PocktExperienceShell).
 * Existing room implementations stay intact — this host only routes to them.
 */
export type InstrumentViewportProps = ClassicInstrumentProps & {
  glow: SharedValue<number>;
  returnPulse: SharedValue<number>;
  motionGain: number;
  hintVisible: boolean;
  onDismissHint: () => void;
};

export function InstrumentViewport({
  glow,
  returnPulse,
  motionGain: gain,
  hintVisible,
  onDismissHint,
  ...classic
}: InstrumentViewportProps) {
  if (isClassicExperience(classic.config)) {
    return <ClassicInstrumentHost {...classic} />;
  }

  return (
    <View style={styles.art}>
      <SkinPulse
        skin={classic.config.skin}
        pulse={classic.pulse}
        glow={glow}
        returnPulse={returnPulse}
        pulseRole={classic.pulseRole}
        feel={classic.config.feel}
        feelDial={classic.config.feelDial}
        bpm={classic.config.bpm}
        beatIndex={classic.transport.beatIndex}
        isDownbeat={classic.transport.isDownbeat}
        playing={classic.playing}
        silent={classic.transport.silentMeasure && classic.playing}
        sound={classic.config.sound}
        subdivision={classic.config.subdivision}
        visualPulse={classic.config.visualPulse}
        motionGain={gain}
      />
      <PocketHint skin={classic.config.skin as SkinId} visible={hintVisible} onDismiss={onDismissHint} />
    </View>
  );
}

const styles = StyleSheet.create({
  art: {
    flex: 1,
    minHeight: 120,
    marginTop: 4,
    marginBottom: 2,
    position: 'relative',
  },
});
