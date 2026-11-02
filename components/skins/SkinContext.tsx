import { createContext, useContext } from 'react';

import { SKINS, type SkinTheme } from '@/constants/skins';

export const SkinContext = createContext<SkinTheme>(SKINS.classic);

export function useSkin(): SkinTheme {
  return useContext(SkinContext);
}
