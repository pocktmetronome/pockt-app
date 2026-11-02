import { Asset } from 'expo-asset';

import { SKIN_ORDER } from '@/constants/skins';
import { BRAND_LOGO, BRAND_OPENING, BRAND_OPENING_LIGHT, POCKT_2_MARK } from '@/lib/brand-assets';
import type { SkinId } from '@/lib/types';

/**
 * Central visual registry.
 * Production filenames are mapped once. Components never hardcode paths.
 *
 * Heavy / Roots / Sundown:
 *   opening → cinematic enter plate
 *   landing → home / browser preview
 *   world   → in-room environment (no baked chrome)
 * Titanium:
 *   background is cover, dial is contain. Background never rotates.
 */
export type SkinAssetPack = {
  hero?: number;
  background?: number;
  opening?: number;
  landing?: number;
  dial?: number;
  light?: number;
  foreground?: number;
  emitter?: number;
  focal?: number;
  fx?: number;
  dust?: number;
  burst?: number;
  ribbon?: number;
  heroPosition?: 'top' | 'center';
  portalTitleInArt?: boolean;
};

export type SkinAssetKey =
  | 'hero'
  | 'background'
  | 'opening'
  | 'landing'
  | 'dial'
  | 'light'
  | 'foreground'
  | 'emitter'
  | 'focal'
  | 'fx'
  | 'dust'
  | 'burst'
  | 'ribbon';

export const SKIN_ASSET_PATHS: Record<SkinId, Record<SkinAssetKey, string | undefined>> = {
  classic: {
    hero: 'assets/classic/landing_classic_v89.png',
    background: undefined,
    opening: undefined,
    landing: 'assets/classic/landing_classic_v89.png',
    dial: undefined,
    light: undefined,
    foreground: undefined,
    focal: undefined,
    emitter: undefined,
    fx: undefined,
    dust: undefined,
    burst: undefined,
    ribbon: undefined,
  },
  titanium: {
    hero: 'assets/skins/classic/titanium/classic_titanium_background.png',
    background: 'assets/skins/classic/titanium/classic_titanium_background.png',
    opening: undefined,
    landing: 'assets/skins/classic/titanium/classic_titanium_background.png',
    dial: 'assets/skins/classic/titanium/titanium_receiver_dial.png',
    light: undefined,
    foreground: undefined,
    focal: undefined,
    emitter: undefined,
    fx: undefined,
    dust: undefined,
    burst: undefined,
    ribbon: undefined,
  },
  studio: {
    hero: 'assets/skins/studio/hero-v84.webp',
    background: 'assets/skins/studio/background-v84.webp',
    opening: undefined,
    landing: 'assets/skins/studio/hero-v84.webp',
    dial: undefined,
    light: 'assets/skins/studio/light-v84.png',
    foreground: 'assets/skins/studio/foreground-v84.png',
    focal: 'assets/skins/studio/focal-v84.png',
    emitter: undefined,
    fx: undefined,
    dust: undefined,
    burst: undefined,
    ribbon: undefined,
  },
  altered: {
    hero: 'assets/skins/altered/hero.webp',
    background: 'assets/skins/altered/background.webp',
    opening: undefined,
    landing: 'assets/skins/altered/hero.webp',
    dial: undefined,
    emitter: 'assets/skins/altered/emitter.png',
    light: 'assets/skins/altered/light.png',
    foreground: 'assets/skins/altered/foreground.png',
    focal: undefined,
    fx: undefined,
    dust: undefined,
    burst: undefined,
    ribbon: undefined,
  },
  'after-dark': {
    hero: 'assets/skins/after-dark/hero-v84.webp',
    background: 'assets/skins/after-dark/background-v84.webp',
    opening: undefined,
    landing: 'assets/skins/after-dark/hero-v84.webp',
    dial: undefined,
    light: 'assets/skins/after-dark/light-v84.png',
    foreground: 'assets/skins/after-dark/foreground-v84.png',
    focal: 'assets/skins/after-dark/focal-v84.png',
    emitter: undefined,
    fx: undefined,
    dust: undefined,
    burst: undefined,
    ribbon: undefined,
  },
  bar: {
    hero: 'assets/skins/bar/background-v1.png',
    background: 'assets/skins/bar/background-v1.png',
    opening: undefined,
    landing: 'assets/skins/bar/background-v1.png',
    dial: undefined,
    light: undefined,
    foreground: undefined,
    focal: undefined,
    emitter: undefined,
    fx: undefined,
    dust: undefined,
    burst: undefined,
    ribbon: undefined,
  },
  heavy: {
    hero: 'assets/skins/immersive/heavy/heavy_landing.png',
    landing: 'assets/skins/immersive/heavy/heavy_landing.png',
    opening: 'assets/skins/immersive/heavy/heavy_opening.png',
    background: 'assets/heavy/heavy_world_v126.png',
    fx: 'assets/heavy/heavy_pulse_v126.png',
    ribbon: 'assets/heavy/heavy_downbeat_v126.png',
    dial: undefined,
    light: undefined,
    foreground: undefined,
    focal: undefined,
    emitter: undefined,
    dust: undefined,
    burst: undefined,
  },
  roots: {
    hero: 'assets/skins/immersive/roots/roots_landing.png',
    landing: 'assets/skins/immersive/roots/roots_landing.png',
    opening: 'assets/skins/immersive/roots/roots_opening.png',
    background: 'assets/roots/roots_world_v126.png',
    fx: 'assets/roots/roots_pulse_v126.png',
    ribbon: 'assets/roots/roots_downbeat_v126.png',
    dial: undefined,
    dust: undefined,
    burst: undefined,
    light: undefined,
    foreground: undefined,
    focal: undefined,
    emitter: undefined,
  },
  sundown: {
    hero: 'assets/skins/immersive/sundown/sundown_landing.png',
    landing: 'assets/skins/immersive/sundown/sundown_landing.png',
    opening: 'assets/skins/immersive/sundown/sundown_opening.png',
    background: 'assets/sundown/sundown_world_v126.png',
    fx: 'assets/sundown/sundown_pulse_v126.png',
    ribbon: 'assets/sundown/sundown_downbeat_v126.png',
    dial: undefined,
    dust: undefined,
    burst: undefined,
    light: undefined,
    foreground: undefined,
    focal: undefined,
    emitter: undefined,
  },
  heart: {
    hero: 'assets/immersive/heart/immersive_heart_background.png',
    landing: 'assets/immersive/heart/immersive_heart_background.png',
    opening: undefined,
    background: 'assets/immersive/heart/immersive_heart_background.png',
    focal: undefined,
    dial: undefined,
    light: undefined,
    foreground: undefined,
    emitter: undefined,
    fx: undefined,
    dust: undefined,
    burst: undefined,
    ribbon: undefined,
  },
};

export const SKIN_ASSETS: Record<SkinId, SkinAssetPack> = {
  classic: {
    hero: require('@/assets/classic/landing_classic_v89.png'),
    landing: require('@/assets/classic/landing_classic_v89.png'),
    heroPosition: 'center',
  },
  titanium: {
    hero: require('@/assets/skins/classic/titanium/classic_titanium_background.png'),
    landing: require('@/assets/skins/classic/titanium/classic_titanium_background.png'),
    background: require('@/assets/skins/classic/titanium/classic_titanium_background.png'),
    dial: require('@/assets/skins/classic/titanium/titanium_receiver_dial.png'),
    heroPosition: 'center',
  },
  studio: {
    hero: require('@/assets/skins/studio/hero-v84.webp'),
    landing: require('@/assets/skins/studio/hero-v84.webp'),
    background: require('@/assets/skins/studio/background-v84.webp'),
    light: require('@/assets/skins/studio/light-v84.png'),
    foreground: require('@/assets/skins/studio/foreground-v84.png'),
    focal: require('@/assets/skins/studio/focal-v84.png'),
  },
  altered: {
    hero: require('@/assets/skins/altered/hero.webp'),
    landing: require('@/assets/skins/altered/hero.webp'),
    background: require('@/assets/skins/altered/background.webp'),
    emitter: require('@/assets/skins/altered/emitter.png'),
    light: require('@/assets/skins/altered/light.png'),
    foreground: require('@/assets/skins/altered/foreground.png'),
  },
  'after-dark': {
    hero: require('@/assets/skins/after-dark/hero-v84.webp'),
    landing: require('@/assets/skins/after-dark/hero-v84.webp'),
    background: require('@/assets/skins/after-dark/background-v84.webp'),
    light: require('@/assets/skins/after-dark/light-v84.png'),
    foreground: require('@/assets/skins/after-dark/foreground-v84.png'),
    focal: require('@/assets/skins/after-dark/focal-v84.png'),
  },
  bar: {
    hero: require('@/assets/skins/bar/background-v1.png'),
    landing: require('@/assets/skins/bar/background-v1.png'),
    background: require('@/assets/skins/bar/background-v1.png'),
  },
  heavy: {
    hero: require('@/assets/skins/immersive/heavy/heavy_landing.png'),
    landing: require('@/assets/skins/immersive/heavy/heavy_landing.png'),
    opening: require('@/assets/skins/immersive/heavy/heavy_opening.png'),
    background: require('@/assets/heavy/heavy_world_v126.png'),
    fx: require('@/assets/heavy/heavy_pulse_v126.png'),
    ribbon: require('@/assets/heavy/heavy_downbeat_v126.png'),
    heroPosition: 'center',
  },
  roots: {
    hero: require('@/assets/skins/immersive/roots/roots_landing.png'),
    landing: require('@/assets/skins/immersive/roots/roots_landing.png'),
    opening: require('@/assets/skins/immersive/roots/roots_opening.png'),
    background: require('@/assets/roots/roots_world_v126.png'),
    fx: require('@/assets/roots/roots_pulse_v126.png'),
    ribbon: require('@/assets/roots/roots_downbeat_v126.png'),
    heroPosition: 'center',
  },
  sundown: {
    hero: require('@/assets/skins/immersive/sundown/sundown_landing.png'),
    landing: require('@/assets/skins/immersive/sundown/sundown_landing.png'),
    opening: require('@/assets/skins/immersive/sundown/sundown_opening.png'),
    background: require('@/assets/sundown/sundown_world_v126.png'),
    fx: require('@/assets/sundown/sundown_pulse_v126.png'),
    ribbon: require('@/assets/sundown/sundown_downbeat_v126.png'),
    heroPosition: 'center',
  },
  heart: {
    hero: require('@/assets/immersive/heart/immersive_heart_background.png'),
    landing: require('@/assets/immersive/heart/immersive_heart_background.png'),
    background: require('@/assets/immersive/heart/immersive_heart_background.png'),
    heroPosition: 'center',
  },
};

export const EXPECTED_SKIN_FILES: string[] = SKIN_ORDER.flatMap((id) =>
  Object.values(SKIN_ASSET_PATHS[id]).filter((value): value is string => Boolean(value))
);

const warned = new Set<string>();

export function warnMissingAsset(path: string): void {
  if (warned.has(path)) return;
  warned.add(path);
}

export function uniqueModules(modules: number[]): number[] {
  return [...new Set(modules.filter((value) => typeof value === 'number'))];
}

function packModules(pack: SkinAssetPack): number[] {
  return uniqueModules(
    [
      pack.hero,
      pack.background,
      pack.opening,
      pack.landing,
      pack.dial,
      pack.light,
      pack.foreground,
      pack.emitter,
      pack.focal,
      pack.fx,
      pack.dust,
      pack.burst,
      pack.ribbon,
    ].filter((value): value is number => typeof value === 'number')
  );
}

export function collectSkinModules(): number[] {
  return uniqueModules(SKIN_ORDER.flatMap((id) => packModules(SKIN_ASSETS[id])));
}

async function loadModules(modules: number[]): Promise<void> {
  const list = uniqueModules(modules);
  if (list.length === 0) return;
  try {
    await Asset.loadAsync(list);
  } catch {
    /* Expo Go / missing native prefetch is non-fatal */
  }
}

export async function preloadOpeningAssets(currentSkin: SkinId): Promise<void> {
  const pack = SKIN_ASSETS[currentSkin];
  const modules = [BRAND_OPENING, BRAND_OPENING_LIGHT, BRAND_LOGO, POCKT_2_MARK, ...packModules(pack)];
  for (const id of SKIN_ORDER) {
    const hero = SKIN_ASSETS[id].landing ?? SKIN_ASSETS[id].hero;
    if (hero) modules.push(hero);
    if (SKIN_ASSETS[id].opening) modules.push(SKIN_ASSETS[id].opening);
  }
  await loadModules(modules);
}

export async function preloadRemainingSkinWorlds(currentSkin: SkinId): Promise<void> {
  const modules: number[] = [];
  for (const id of SKIN_ORDER) {
    if (id === currentSkin) continue;
    modules.push(...packModules(SKIN_ASSETS[id]));
  }
  await loadModules(modules);
}

export async function preloadSkinAssets(): Promise<void> {
  await loadModules(collectSkinModules());
}

export async function preloadSkinPreview(id: SkinId, neighbor?: SkinId): Promise<void> {
  const modules = packModules(SKIN_ASSETS[id]);
  if (neighbor) modules.push(...packModules(SKIN_ASSETS[neighbor]));
  await loadModules(modules);
}

export function skinPreviewAsset(id: SkinId): number | undefined {
  return SKIN_ASSETS[id].landing ?? SKIN_ASSETS[id].hero;
}

export function skinPreviewPath(id: SkinId): string {
  return SKIN_ASSET_PATHS[id].landing ?? SKIN_ASSET_PATHS[id].hero ?? '';
}

export function skinOpeningAsset(id: SkinId): number | undefined {
  return SKIN_ASSETS[id].opening;
}
