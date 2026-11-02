/**
 * The message window: a strip of smoked glass between the beat lamps and the transport keys, lit from
 * behind like an LED display. It carries every hint and status line the instrument has to say, large
 * enough to read at arm's length: what a face does, what the loop is doing, what a key just changed.
 * Text too long for the glass glides across it once, then rests at its start.
 */
import { BlurMask, Canvas, Group, Path, Rect, Skia, Text as SkText, useFont } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import type { Ns9 } from '@/lib/ns9';

const SEMI = require('../../../assets/fonts/Barlow_600SemiBold.ttf');

/** The glass inside the frame, in master px of the 'led' part (913 x 100 bay, 16 px frame). */
const GLASS = { x: 14 + 20, y: 17, w: 913 - 40, h: 100 - 34 };

export type LedTone = 'blue' | 'red' | 'white' | 'amber' | 'dim';
const INK: Record<LedTone, { core: string; glow: string }> = {
  blue: { core: '#bfeaff', glow: 'rgba(60,170,255,0.85)' },
  dim: { core: 'rgba(150,208,248,0.82)', glow: 'rgba(50,140,230,0.45)' },
  red: { core: '#ffd0c8', glow: 'rgba(255,40,20,0.9)' },
  white: { core: '#ffffff', glow: 'rgba(230,240,255,0.75)' },
  amber: { core: '#ffe2b0', glow: 'rgba(255,150,40,0.85)' },
};

export function LedPanel({ ns, text, tone = 'blue' }: { ns: Ns9; text: string; tone?: LedTone }) {
  const o = ns.T('led', GLASS.x, GLASS.y);
  const k = ns.sc('led');
  const W = GLASS.w * k;
  const H = GLASS.h * k;
  const size = Math.round(H * 0.7);
  const font = useFont(SEMI, size);
  const label = text.toUpperCase();
  const track = size * 0.12;
  const textW = useMemo(() => {
    if (!font || !label) return 0;
    return font.getTextWidth(label) + track * Math.max(0, label.length - 1);
  }, [font, label, track]);
  const pad = size * 0.5;
  // a line a little too long is narrowed (down to 86%) rather than scrolled
  const avail = W - pad * 2;
  const squeeze = textW > avail && textW * 0.86 <= avail ? avail / textW : 1;
  const fits = textW * squeeze <= avail;

  // long text glides once from its start to its end, holds, then returns
  const shift = useSharedValue(0);
  useEffect(() => {
    shift.value = 0;
    if (fits || !textW) return;
    const over = textW - (W - pad * 2);
    shift.value = withDelay(900, withTiming(over, { duration: Math.max(1200, over * 14), easing: Easing.inOut(Easing.quad) }));
  }, [label, fits, textW, W, pad, shift]);
  // a fresh message lands with a short brightening, like a display refreshing
  const flash = useSharedValue(0);
  useEffect(() => {
    flash.value = 1;
    flash.value = withTiming(0, { duration: 380 });
  }, [label, tone, flash]);

  const x0 = fits ? (W - textW * squeeze) / 2 : pad;
  const baseYc = H / 2;
  const tx = useDerivedValue(() => [{ translateX: x0 - shift.value }, { translateY: baseYc }, { scaleX: squeeze }, { translateY: -baseYc }]);
  const glowOp = useDerivedValue(() => 0.75 + 0.25 * flash.value);

  // the LED pitch: fine dark rows and columns over the lit text, so it reads as a matrix, not print
  const grid = useMemo(() => {
    const p = Skia.Path.Make();
    const pitch = Math.max(2, size / 9);
    for (let y = pitch * 0.5; y < H; y += pitch) p.addRect(Skia.XYWHRect(0, y, W, pitch * 0.28));
    for (let x = pitch * 0.5; x < W; x += pitch) p.addRect(Skia.XYWHRect(x, 0, pitch * 0.28, H));
    return p;
  }, [W, H, size]);
  const clip = useMemo(() => {
    const p = Skia.Path.Make();
    p.addRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, W, H), H * 0.32, H * 0.32));
    return p;
  }, [W, H]);

  const ink = INK[tone];
  const glyphs = useMemo(() => {
    if (!font) return [] as { ch: string; x: number }[];
    const out: { ch: string; x: number }[] = [];
    let x = 0;
    for (const ch of label) {
      out.push({ ch, x });
      x += font.getTextWidth(ch) + track;
    }
    return out;
  }, [font, label, track]);
  const baseY = H / 2 + size * 0.35;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { left: o.x, top: o.y, width: W, height: H }]}>
      <Canvas style={{ width: W, height: H }}>
        <Group clip={clip}>
          {/* the unlit matrix shows faintly through the smoked glass */}
          <Rect x={0} y={0} width={W} height={H} color="rgba(40,90,140,0.05)" />
          {font && label ? (
            <Group transform={tx}>
              <Group blendMode="plus" opacity={glowOp}>
                {glyphs.map((g, i) => (
                  <SkText key={`g${i}`} x={g.x} y={baseY} text={g.ch} font={font} color={ink.glow}>
                    <BlurMask blur={size * 0.32} style="normal" />
                  </SkText>
                ))}
              </Group>
              {glyphs.map((g, i) => (
                <SkText key={i} x={g.x} y={baseY} text={g.ch} font={font} color={ink.core} />
              ))}
            </Group>
          ) : null}
          <Path path={grid} color="rgba(4,6,9,0.42)" />
          {/* the glass's own reflection across its upper part */}
          <Rect x={0} y={0} width={W} height={H * 0.42} color="rgba(255,255,255,0.035)" />
        </Group>
      </Canvas>
    </View>
  );
}
