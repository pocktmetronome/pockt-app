import { Asset } from 'expo-asset';

export const BRAND_OPENING = require('@/assets/branding/pockt-opening-v82.webp');
export const BRAND_OPENING_LIGHT = require('@/assets/branding/pockt-opening-light-v82.png');
export const BRAND_LOGO = require('@/assets/branding/pockt-logo.png');
/** Locked POCKT 2.0 P mark. Raster from Gregg's approved identity board. Do not redraw. */
export const POCKT_2_MARK = require('@/assets/branding/pockt-2-mark-approved.png');
export const POCKT_2_MARK_PREVIEW = require('@/assets/branding/pockt-2-mark-preview-256.png');
export const POCKT_2_APP_ICON = require('@/assets/branding/pockt-2-app-icon-approved.png');
export const BRAND_IDENT_AUDIO = require('@/assets/audio/pockt-ident-v94.wav');

export const BRAND_OPENING_PATH = 'assets/branding/pockt-opening-v82.webp';
export const BRAND_OPENING_LIGHT_PATH = 'assets/branding/pockt-opening-light-v82.png';
export const BRAND_LOGO_PATH = 'assets/branding/pockt-logo.png';
export const POCKT_2_MARK_PATH = 'assets/branding/pockt-2-mark-approved.png';
export const POCKT_2_APP_ICON_PATH = 'assets/branding/pockt-2-app-icon-approved.png';
export const BRAND_IDENT_AUDIO_PATH = 'assets/audio/pockt-ident-v94.wav';

export async function preloadBrandAssets(): Promise<void> {
  try {
    await Asset.loadAsync([BRAND_OPENING, BRAND_OPENING_LIGHT, BRAND_LOGO, POCKT_2_MARK, POCKT_2_MARK_PREVIEW]);
  } catch {
    /* Expo Go / missing native prefetch is non-fatal */
  }
}
