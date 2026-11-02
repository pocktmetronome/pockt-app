import { requireNativeViewManager } from 'expo-modules-core';

import type { PocktDialViewProps } from './types';

export type { PocktDialViewProps };

const NativeView = requireNativeViewManager<PocktDialViewProps>('PocktDial');

export default function PocktDialView(props: PocktDialViewProps) {
  return <NativeView {...props} />;
}
