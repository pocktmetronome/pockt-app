import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { BeatlineRoom } from '@/components/classic/BeatlineRoom';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { MechanicalInstrumentFace } from '@/components/classic/faces/MechanicalInstrumentFace';
import { ProRoom } from '@/components/classic/ProRoom';
import { PulseRoom } from '@/components/classic/PulseRoom';
import { SmartPendulumRoom } from '@/components/classic/SmartPendulumRoom';
import type { DisplayPrefs } from '@/constants/display';
import type { TransportState } from '@/hooks/use-metronome';
import type { PrimaryFaceId } from '@/lib/instrument-faces';
import type { ProofFrame } from '@/lib/visual-proof';
import type { AccentLevel, MetronomeConfig, SubdivisionId, TimeSignatureId } from '@/lib/types';

/**
 * Build 69 rooms mounted in the circular dial.
 * Mechanical stays the separate wooden interior.
 * Rhythm is not mounted here.
 */
type FaceProps = {
  face: Exclude<PrimaryFaceId, 'dial'> | 'pendula-classic';
  size: number;
  width?: number;
  height?: number;
  config: MetronomeConfig;
  prefs: DisplayPrefs;
  compact: boolean;
  playing: boolean;
  transport: TransportState;
  silent: boolean;
  beatIndex: number;
  bpm: number;
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  accentPattern: AccentLevel[];
  onChangeAccents: (pattern: AccentLevel[]) => void;
  setBpm: (bpm: number) => void;
  toggle: () => void;
  tapTempo: () => void;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  pulseAccent?: SharedValue<number>;
  pulseBeat?: SharedValue<number>;
  pulseBeatHost?: SharedValue<number>;
  pulseSpb?: SharedValue<number>;
  pulseHostOffset?: SharedValue<number>;
  onOpenPad: () => void;
  onOpenTime: () => void;
  onOpenDivision: () => void;
  onOpenSound: () => void;
  onOpenAccents: () => void;
  onOpenPractice: () => void;
  onOpenPresets: () => void;
  onOpenRhythm: () => void;
  onOpenSettings: () => void;
  onOpenSetlists: () => void;
  onOpenLab: () => void;
  onUpdate: ClassicInstrumentProps['onUpdate'];
  onDisplayPrefsChange: ClassicInstrumentProps['onDisplayPrefsChange'];
  onHapticToggle: () => void;
  onGoHome?: () => void;
  proof?: ProofFrame | null;
  proofDegrees?: number | null;
  proofWaves?: boolean | 'first' | 'young' | 'mid' | 'aged';
};

export function ConsoleInstrumentFace(props: FaceProps) {
  const wide = props.face === 'pro' || props.face === 'beatline';
  const frameW = wide ? (props.width ?? props.size) : props.size;
  const frameH = wide ? (props.height ?? props.size) : props.size;
  const frame = { width: frameW, height: frameH, pointerEvents: wide ? ('auto' as const) : ('box-none' as const) };
  const room = {
    tapFlash: 0,
    stop: () => undefined,
    previewSound: () => undefined,
    onOpenStage: () => undefined,
    onOpenDrum: () => undefined,
    onFlashToggle: () => undefined,
    ...props,
  } as ClassicInstrumentProps;
  if (props.face === 'pulse') {
    return (
      <View testID="console-face-pulse" style={frame}>
        <PulseRoom {...room} viewport={props.size} proofWaves={props.proofWaves} />
      </View>
    );
  }
  if (props.face === 'pro') {
    return (
      <View testID="console-face-pro" style={frame}>
        <ProRoom {...room} frame={{ width: frameW, height: frameH }} />
      </View>
    );
  }
  if (props.face === 'beatline') {
    return (
      <View testID="console-face-beatline" style={frame}>
        <BeatlineRoom {...room} frame={{ width: frameW, height: frameH }} />
      </View>
    );
  }
  if (props.face === 'pendula-classic') {
    return (
      <MechanicalInstrumentFace
        size={props.size}
        playing={props.playing}
        bpm={props.bpm}
        setBpm={props.setBpm}
        pulse={props.pulse}
        pulseBeat={props.pulseBeat}
        pulseBeatHost={props.pulseBeatHost}
        pulseSpb={props.pulseSpb}
        pulseHostOffset={props.pulseHostOffset}
      />
    );
  }
  return (
    <View testID="console-face-pendulum" style={frame}>
      <SmartPendulumRoom {...room} viewport={props.size} proofDegrees={props.proofDegrees ?? null} />
    </View>
  );
}
