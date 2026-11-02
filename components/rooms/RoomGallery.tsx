import { RoomBrowser } from '@/components/rooms/RoomBrowser';
import type { CustomLayout } from '@/lib/custom-layout';
import type { LibraryState } from '@/lib/library';
import type { RoomId } from '@/lib/types';

type Props = {
  roomId: RoomId;
  customPhotoUri: string | null;
  customLayout?: CustomLayout | null;
  library?: LibraryState;
  onLibraryChange?: (next: LibraryState) => void;
  onSelect: (id: RoomId) => void;
  onClose: () => void;
  bpm?: number;
};

/** MIX room picker shares the Home living browser. One grid. */
export function RoomGallery({
  roomId,
  customPhotoUri,
  customLayout,
  library,
  onLibraryChange,
  onSelect,
  onClose,
  bpm,
}: Props) {
  return (
    <RoomBrowser
      roomId={roomId}
      customPhotoUri={customPhotoUri}
      customLayout={customLayout}
      library={library}
      onLibraryChange={onLibraryChange}
      onEnter={onSelect}
      onRoomFocused={() => undefined}
      onCustomPhotoChange={() => undefined}
      showChromeBack
      onBack={onClose}
      bpm={bpm}
    />
  );
}
