/**
 * The window every face sits in: a spun-metal dish sunk into the dial, its rim casting a soft shadow
 * onto the floor, smoked glass over it with the studio softbox in it, and a dark seat where the window
 * meets the dial's polished outer bezel (which stays in the faceplate art, so every face is framed by
 * the same machined ring). Master units on the 600 px ring box (centre 300, 300); the light comes from
 * the upper left, like everywhere else on the instrument.
 */
import { BlurMask, Group, LinearGradient, Path, RadialGradient, Skia, SweepGradient, vec, type SkPath } from '@shopify/react-native-skia';
import { useMemo } from 'react';

export const C = 300;
export const W = { pin: 148, pout: 296, kin: 281 };
export const DEG = Math.PI / 180;

export function sector(r0: number, r1: number, a0: number, a1: number): SkPath {
  'worklet';
  const p = Skia.Path.Make();
  const sweep = (a1 - a0) / DEG;
  p.arcToOval(Skia.XYWHRect(C - r1, C - r1, r1 * 2, r1 * 2), a0 / DEG, sweep, true);
  if (r0 > 0) p.arcToOval(Skia.XYWHRect(C - r0, C - r0, r0 * 2, r0 * 2), a1 / DEG, -sweep, false);
  else p.lineTo(C, C);
  p.close();
  return p;
}

const disc = (r: number) => {
  const p = Skia.Path.Make();
  p.addCircle(C, C, r);
  return p;
};

/** Spun metal: brightness changes with the angle of the turning marks to the light. */
const SPUN = Array.from({ length: 25 }, (_, i) => {
  const a = (i / 24) * 2 * Math.PI;
  // two broad lobes facing the light (upper left) and its opposite, as on a real spun dish
  const lobe = Math.pow(Math.abs(Math.cos(a - 225 * DEG)), 6);
  const ripple = 0.5 + 0.5 * Math.sin(a * 7.0 + 0.6);
  const v = 0.012 + 0.07 * lobe + 0.012 * ripple;
  return `rgba(255,226,186,${v.toFixed(3)})`;
});

export function GlassUnder() {
  const floor = useMemo(() => disc(W.kin), []);
  const lathe = useMemo(() => {
    const p = Skia.Path.Make();
    for (let r = 10; r < W.kin; r += 2.6) p.addCircle(C, C, r);
    return p;
  }, []);
  return (
    <>
      <Path path={floor}>
        <RadialGradient c={vec(C - 80, C - 110)} r={W.kin + 90} colors={['#2b231b', '#1a1510', '#0d0a08', '#060504']} positions={[0, 0.35, 0.72, 1]} />
      </Path>
      <Path path={floor} blendMode="screen">
        <SweepGradient c={vec(C, C)} colors={SPUN} />
      </Path>
      <Path path={lathe} style="stroke" strokeWidth={0.6} color="rgba(255,222,180,0.022)" />
      {/* the rim's shadow on the floor: deepest under the upper-left wall, where the light comes over it */}
      <Group clip={floor}>
        <Path path={floor}>
          <RadialGradient c={vec(C + 14, C + 18)} r={W.kin + 6} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.85)']} positions={[0, 0.78, 0.93, 1]} />
        </Path>
      </Group>
    </>
  );
}

export function GlassOver() {
  const inner = useMemo(() => disc(W.kin - 0.5), []);
  const softbox = useMemo(() => {
    const p = Skia.Path.Make();
    p.addOval(Skia.XYWHRect(-230, -92, 460, 184));
    const m = Skia.Matrix();
    m.translate(C - 70, C - 158);
    m.rotate(-0.5);
    p.transform(m);
    return p;
  }, []);
  const fresnel = useMemo(() => {
    const p = Skia.Path.Make();
    const r = W.kin - 7;
    p.addArc(Skia.XYWHRect(C - r, C - r, r * 2, r * 2), 186, 76);
    return p;
  }, []);
  const farLip = useMemo(() => {
    const p = Skia.Path.Make();
    const r = W.kin - 2;
    p.addArc(Skia.XYWHRect(C - r, C - r, r * 2, r * 2), 12, 70);
    return p;
  }, []);
  return (
    <Group clip={inner}>
      {/* the glass darkens toward its edge (it is thicker there, and the rim shades it) */}
      <Path path={inner}>
        <RadialGradient c={vec(C, C)} r={W.kin} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']} positions={[0, (W.kin - 54) / W.kin, 1]} />
      </Path>
      {/* the studio softbox, seen in the glass */}
      <Path path={softbox} blendMode="screen">
        <RadialGradient c={vec(C - 70, C - 158)} r={240} colors={['rgba(255,238,214,0.085)', 'rgba(255,238,214,0.035)', 'rgba(255,238,214,0)']} positions={[0, 0.55, 1]} />
      </Path>
      <Path path={fresnel} style="stroke" strokeWidth={9} strokeCap="round" color="rgba(255,236,210,0.05)" blendMode="screen">
        <BlurMask blur={5} style="normal" />
      </Path>
      <Path path={fresnel} style="stroke" strokeWidth={1.6} strokeCap="round" color="rgba(255,240,222,0.16)" blendMode="screen" />
      <Path path={farLip} style="stroke" strokeWidth={2.4} strokeCap="round" color="rgba(255,196,128,0.10)" blendMode="screen">
        <BlurMask blur={1.5} style="normal" />
      </Path>
    </Group>
  );
}

/**
 * The seat: the dark groove where the window sits under the dial's outer bezel. The far (lower-right)
 * wall of the groove catches the light; the near wall is in shadow.
 */
export function Seat() {
  const ring = useMemo(() => sector(W.kin - 0.5, W.pout, 0, 2 * Math.PI - 0.0001), []);
  const wall = useMemo(() => sector(W.pout - 4, W.pout, 0, 2 * Math.PI - 0.0001), []);
  return (
    <>
      <Path path={ring}>
        <RadialGradient c={vec(C, C)} r={W.pout} colors={['#0c0907', '#050403', '#020101']} positions={[W.kin / W.pout, (W.kin + 8) / W.pout, 1]} />
      </Path>
      <Path path={wall}>
        <LinearGradient start={vec(C - 210, C - 210)} end={vec(C + 210, C + 210)} colors={['rgba(0,0,0,0.6)', 'rgba(70,46,24,0.4)', 'rgba(190,130,70,0.55)']} positions={[0, 0.55, 1]} />
      </Path>
    </>
  );
}
/** @deprecated the knurl is the instrument's own; window faces sit in a seat. */
export const Knurl = (_: { bpm?: unknown }) => <Seat />;
