import { requireNativeViewManager } from 'expo-modules-core';

import type { PocktGlassProofViewProps } from './types';

export type { PocktGlassProofViewProps };

const NativeView = requireNativeViewManager<PocktGlassProofViewProps>('PocktGlassProof');

export default function PocktGlassProofView(props: PocktGlassProofViewProps) {
  return <NativeView {...props} />;
}
