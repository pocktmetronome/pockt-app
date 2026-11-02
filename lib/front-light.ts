/** Beat light: the colours and styles the faces light with. Remembered across launches. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type RippleStyle = 'calm' | 'flow' | 'splash';
export type ProFlash = 'every' | 'accents' | 'downbeat';
export type BeatLight = {
  down: string;
  up: string;
  ripple: RippleStyle;
  proFlash: ProFlash;
  proPend: boolean;
  /** Pro's light bar: a sweeping pendulum, a flash on every beat, a flash on accents only, or off. */
  proBar?: ProBar;
};
export const PALETTE: [string, string][] = [
  ['Amber', '#ff9a2e'], ['Gold', '#ffd25e'], ['White', '#fff4e2'], ['Red', '#ff3b30'], ['Rose', '#ff2d78'], ['Magenta', '#e040fb'],
  ['Violet', '#8e5cff'], ['Blue', '#2f7bff'], ['Cyan', '#22e4ff'], ['Mint', '#3dffb0'], ['Green', '#5cff3d'], ['Rainbow', 'rainbow'],
];
export type ProBar = 'pendulum' | 'beat' | 'accents' | 'off';
export const PRO_BAR_ORDER: ProBar[] = ['pendulum', 'beat', 'accents', 'off'];
export const PRO_BAR_NAME: Record<ProBar, string> = { pendulum: 'PENDULUM', beat: 'EVERY BEAT', accents: 'ACCENTS ONLY', off: 'OFF' };
export const proBarOf = (l: BeatLight): ProBar => l.proBar ?? (l.proPend ? 'pendulum' : 'off');
export const DEFAULT_LIGHT: BeatLight = { down: '#fff4e2', up: '#ff9a2e', ripple: 'flow', proFlash: 'every', proPend: true, proBar: 'pendulum' };
const KEY = 'pockt.front.beatLight.v1';

export function rgbOf(hex: string, step = 0): [number, number, number] {
  'worklet';
  if (hex === 'rainbow') {
    // a new hue every beat, walking the colour wheel
    const H = (((step * 47) % 360) + 360) % 360 / 60;
    const i = Math.floor(H);
    const f = H - i;
    const sat = 0.72;
    const p = 1 - sat, q = 1 - sat * f, t = 1 - sat * (1 - f);
    if (i === 0) return [1, t, p];
    if (i === 1) return [q, 1, p];
    if (i === 2) return [p, 1, t];
    if (i === 3) return [p, q, 1];
    if (i === 4) return [t, p, 1];
    return [1, p, q];
  }
  const v = parseInt(hex.slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

export function cssOf(hex: string): string {
  return hex === 'rainbow' ? '#ffb347' : hex;
}

export function useBeatLight(): [BeatLight, (patch: Partial<BeatLight>) => void] {
  const [light, setLight] = useState<BeatLight>(DEFAULT_LIGHT);
  useEffect(() => {
    void AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const v = JSON.parse(raw) as Partial<BeatLight>;
        setLight((l) => ({ ...l, ...v }));
      })
      .catch(() => undefined);
  }, []);
  const update = useCallback((patch: Partial<BeatLight>) => {
    setLight((l) => {
      const next = { ...l, ...patch };
      void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);
  return [light, update];
}
