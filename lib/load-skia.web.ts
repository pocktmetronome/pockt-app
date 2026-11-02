import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

export async function loadSkia(): Promise<void> {
  await LoadSkiaWeb({
    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`,
  });
}
