import { BeatlineRoom } from '@/components/classic/BeatlineRoom';
import { CustomizedRoom } from '@/components/classic/CustomizedRoom';
import { FoundationDialRoom } from '@/components/classic/FoundationDialRoom';
import { LedgearRoom } from '@/components/classic/LedgearRoom';
import { RigRoom } from '@/components/classic/RigRoom';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { roomIdFromConfig } from '@/constants/rooms';
import { isPrimaryInstrumentFace } from '@/lib/instrument-faces';

export function ClassicInstrumentHost(props: ClassicInstrumentProps) {
  const room = roomIdFromConfig(props.config);
  if (isPrimaryInstrumentFace(room)) return <FoundationDialRoom {...props} />;
  if (room === 'ledgear') return <LedgearRoom {...props} />;
  if (room === 'rig') return <RigRoom {...props} />;
  if (room === 'customized') return <CustomizedRoom {...props} />;
  return <BeatlineRoom {...props} />;
}
