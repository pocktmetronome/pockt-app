import { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { beatTorch } from '@/lib/beat-torch';

type CameraModule = {
  CameraView: typeof import('expo-camera').CameraView;
  useCameraPermissions: typeof import('expo-camera').useCameraPermissions;
};

let cameraMod: CameraModule | null | undefined;

function loadCamera(): CameraModule | null {
  if (cameraMod !== undefined) return cameraMod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cameraMod = require('expo-camera') as CameraModule;
  } catch {
    cameraMod = null;
  }
  return cameraMod;
}

type Props = {
  enabled: boolean;
  playing: boolean;
  explained: boolean;
  onExplained: () => void;
};

export function TorchHost({ enabled, playing, explained, onExplained }: Props) {
  const camera = loadCamera();
  if (!camera || Platform.OS === 'web') {
    return <TorchFallback enabled={enabled} />;
  }
  return (
    <TorchCamera
      CameraView={camera.CameraView}
      useCameraPermissions={camera.useCameraPermissions}
      enabled={enabled}
      playing={playing}
      explained={explained}
      onExplained={onExplained}
    />
  );
}

function TorchFallback({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    beatTorch.setEnabled(false);
    beatTorch.forceOff();
  }, [enabled]);
  return null;
}

function TorchCamera({
  CameraView,
  useCameraPermissions,
  enabled,
  playing,
  explained,
  onExplained,
}: Props & CameraModule) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    beatTorch.setListener(setTorchOn);
    return () => {
      beatTorch.setListener(null);
      beatTorch.forceOff();
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') beatTorch.forceOff();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enabled) {
      beatTorch.setEnabled(false);
      beatTorch.forceOff();
      setReady(false);
      return;
    }
    if (!permission) return;
    if (!permission.granted) {
      if (!explained) return;
      void requestPermission();
      return;
    }
    setReady(true);
    beatTorch.setEnabled(playing);
    if (!playing) beatTorch.forceOff();
  }, [enabled, explained, onExplained, permission, playing, requestPermission]);

  if (!enabled || !ready || !permission?.granted) return null;

  return (
    <View pointerEvents="none" style={styles.host} accessibilityElementsHidden>
      <CameraView facing="back" enableTorch={torchOn && playing} style={styles.camera} />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  camera: {
    width: 1,
    height: 1,
    opacity: 0,
  },
});
