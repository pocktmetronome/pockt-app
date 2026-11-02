import { RoomGallery } from '@/components/rooms/RoomGallery';
import type { CustomLayout } from '@/lib/custom-layout';
import type { LibraryState } from '@/lib/library';
import type { RoomId } from '@/lib/types';

type Props = {
  visible: boolean;
  roomId: RoomId;
  customPhotoUri: string | null;
  customLayout?: CustomLayout | null;
  library?: LibraryState;
  onLibraryChange?: (next: LibraryState) => void;
  onEnter: (id: RoomId) => void;
  onClose: () => void;
};

export function LookScreen({
  visible,
  roomId,
  customPhotoUri,
  customLayout,
  library,
  onLibraryChange,
  onEnter,
  onClose,
}: Props) {
  if (!visible) return null;
  return (
    <RoomGallery
      roomId={roomId}
      customPhotoUri={customPhotoUri}
      customLayout={customLayout}
      library={library}
      onLibraryChange={onLibraryChange}
      onSelect={onEnter}
      onClose={onClose}
    />
  );
}
