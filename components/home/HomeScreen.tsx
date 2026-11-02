import { RoomBrowser } from '@/components/rooms/RoomBrowser';
import type { CustomLayout } from '@/lib/custom-layout';
import type { LibraryState } from '@/lib/library';
import type { RoomId } from '@/lib/types';

type Props = {
  roomId: RoomId;
  customPhotoUri: string | null;
  customLayout?: CustomLayout | null;
  onEnter: (id: RoomId) => void;
  onRoomFocused: (id: RoomId) => void;
  onCustomPhotoChange: (uri: string | null) => void;
  library?: LibraryState;
  onToggleFavorite?: (id: RoomId) => void;
  onOpenTuner?: () => void;
  onLibraryChange?: (next: LibraryState) => void;
  bpm?: number;
};

export function HomeScreen({
  roomId,
  customPhotoUri,
  customLayout,
  onEnter,
  onRoomFocused,
  onCustomPhotoChange,
  library,
  onToggleFavorite,
  onOpenTuner,
  onLibraryChange,
  bpm,
}: Props) {
  return (
    <RoomBrowser
      roomId={roomId}
      customPhotoUri={customPhotoUri}
      customLayout={customLayout}
      onEnter={onEnter}
      onRoomFocused={onRoomFocused}
      onCustomPhotoChange={onCustomPhotoChange}
      library={library}
      onToggleFavorite={onToggleFavorite}
      onOpenTuner={onOpenTuner}
      onLibraryChange={onLibraryChange}
      bpm={bpm}
    />
  );
}
