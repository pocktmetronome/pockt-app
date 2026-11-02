/**
 * The glass readout, drawn in the instrument's own canvas so the digits sit in the glass, lit from
 * behind: a warm gradient fill, a soft bloom, letter-spaced captions. In tuner mode the same glass
 * shows the note, its octave, the frequency, the error in cents and a three-second pitch trace.
 */
import { BlurMask, Group, LinearGradient, Path, Rect, Skia, Text as SkText, useFont, vec, type SkFont } from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import type { InstrumentState } from '@/components/front/v9/Instrument';
import type { BeatClock } from '@/lib/front-clock';
import { DIAL_C, type Ns9 } from '@/lib/ns9';

const LIGHT = require('../../../assets/fonts/Barlow_300Light.ttf');
const MED = require('../../../assets/fonts/Barlow_500Medium.ttf');
const SEMI = require('../../../assets/fonts/Barlow_600SemiBold.ttf');

/** Width of a string drawn with extra tracking between glyphs. */
function widthOf(font: SkFont | null, text: string, track = 0) {
  if (!font || !text) return 0;
  return font.getTextWidth(text) + track * Math.max(0, text.length - 1);
}

/** Letter-spaced text, centred on x. Skia has no tracking, so each glyph is placed on its own. */
function Tracked({ font, text, x, y, track, color, glow, maxW }: { font: SkFont | null; text: string; x: number; y: number; track: number; color: string; glow?: string; maxW?: number }) {
  if (!font || !text) return null;
  const w = widthOf(font, text, track);
  // a long message is narrowed to fit the glass rather than running off its edge
  const fit = maxW && w > maxW ? maxW / w : 1;
  if (fit < 1) {
    return (
      <Group transform={[{ translateX: x }, { translateY: y }, { scale: fit }, { translateX: -x }, { translateY: -y }]}>
        <Tracked font={font} text={text} x={x} y={y} track={track} color={color} glow={glow} />
      </Group>
    );
  }
  let cx = x - w / 2;
  const glyphs: { ch: string; x: number }[] = [];
  for (const ch of text) {
    glyphs.push({ ch, x: cx });
    cx += font.getTextWidth(ch) + track;
  }
  return (
    <Group>
      {glow ? (
        <Group blendMode="plus">
          {glyphs.map((g, i) => (
            <SkText key={`g${i}`} x={g.x} y={y} text={g.ch} font={font} color={glow}>
              <BlurMask blur={font.getSize() * 0.28} style="normal" />
            </SkText>
          ))}
        </Group>
      ) : null}
      {glyphs.map((g, i) => (
        <SkText key={i} x={g.x} y={y} text={g.ch} font={font} color={color} />
      ))}
    </Group>
  );
}

export type TempoReadoutProps = {
  mode: 'tempo';
  /** A word shown big in place of the tempo for a moment (an accent change). */
  word?: string | null;
  /** The line over the word: which beat it is about. */
  wordSub?: string | null;
  /** The loop's count-in: shown big, in red, in place of the tempo. */
  count?: string | null;
  big: string;
  small: string;
  smallColor: string;
  unit: string;
  meter: string | null;
};
export type TunerReadoutProps = {
  mode: 'tuner';
  heard: boolean;
  locked: boolean;
  note: string;
  octave: string;
  hz: string;
  cents: number;
  idleTop: string;
  idleBottom: string;
};

export function Readout({ ns, st, clock, data, offsetY = 0, scale = 1 }: { ns: Ns9; st: InstrumentState; clock: BeatClock; data: TempoReadoutProps | TunerReadoutProps; offsetY?: number; scale?: number }) {
  const K = ns.sc('dial') * scale;
  const c = ns.T('dial', DIAL_C.x, DIAL_C.y);
  const X = c.x;
  const Y = c.y + offsetY;
  const big = useFont(LIGHT, 124 * K);
  const note = useFont(LIGHT, 112 * K);
  const oct = useFont(MED, 34 * K);
  const unit = useFont(SEMI, 25 * K);
  const small = useFont(SEMI, 21 * K);
  const tiny = useFont(SEMI, 18 * K);
  const cents = useFont(SEMI, 24 * K);
  const wordF = useFont(SEMI, 60 * K);

  // ---- the pitch trace, sampled on the UI thread -----------------------------------------------------------
  const trace = useSharedValue<number[]>([]); // flat: t, cents (NaN = silence)
  const lastSample = useSharedValue(0);
  const R0 = 138 * K;
  const Wd = R0 * 1.9;
  const x0 = X - Wd / 2;
  const ys = (R0 * 0.62) / 50;
  const yc = Y + 10 * K;
  useFrameCallback(() => {
    'worklet';
    if (st.tuner.value < 0.5) {
      if (trace.value.length) trace.value = [];
      return;
    }
    const now = clock.now.value;
    if (now - lastSample.value < 0.033) return;
    lastSample.value = now;
    const heard = st.heard.value > 0.5 || st.lockGlow.value > 0.3;
    const next = trace.value.slice();
    next.push(now, heard ? st.needle.value : NaN);
    let cut = 0;
    while (cut < next.length && now - next[cut] > 3.2) cut += 2;
    trace.value = cut ? next.slice(cut) : next;
  });
  const tracePath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const T = trace.value;
    const now = clock.now.value;
    let started = false;
    for (let i = 0; i < T.length; i += 2) {
      const cv = T[i + 1];
      if (cv !== cv) {
        started = false;
        continue;
      }
      const x = x0 + Wd * (1 - (now - T[i]) / 3.2);
      const y = yc - Math.max(-50, Math.min(50, cv)) * ys;
      if (started) p.lineTo(x, y);
      else p.moveTo(x, y);
      started = true;
    }
    return p;
  });

  if (data.mode === 'tempo' && data.count) {
    const cw = widthOf(big, data.count);
    return (
      <Group>
        {big ? (
          <>
            <Group blendMode="plus">
              <SkText x={X - cw / 2} y={Y + 42 * K} text={data.count} font={big} color="rgba(255,70,40,0.55)">
                <BlurMask blur={18 * K} style="normal" />
              </SkText>
            </Group>
            <SkText x={X - cw / 2} y={Y + 42 * K} text={data.count} font={big} color="#ffb09a" />
          </>
        ) : null}
        <Tracked font={small} text={data.small} x={X + 2 * K} y={Y - 74 * K} track={3 * K} color={data.smallColor} glow="rgba(255,60,30,0.5)" maxW={230 * K} />
      </Group>
    );
  }
  if (data.mode === 'tempo' && data.word) {
    return (
      <Group>
        {data.wordSub ? <Tracked font={small} text={data.wordSub} x={X + 2 * K} y={Y - 44 * K} track={4 * K} color="rgba(236,186,118,0.95)" maxW={226 * K} /> : null}
        <Tracked font={wordF} text={data.word} x={X + 3 * K} y={Y + 21 * K} track={6 * K} color="#ffe2b0" glow="rgba(255,150,50,0.6)" maxW={226 * K} />
      </Group>
    );
  }
  if (data.mode === 'tempo') {
    const bw = widthOf(big, data.big);
    return (
      <Group>
        {big ? (
          <>
            <Group blendMode="plus">
              <SkText x={X - bw / 2} y={Y + 42 * K} text={data.big} font={big} color="rgba(255,150,60,0.32)">
                <BlurMask blur={14 * K} style="normal" />
              </SkText>
            </Group>
            <SkText x={X - bw / 2} y={Y + 42 * K} text={data.big} font={big}>
              <LinearGradient start={vec(0, Y - 50 * K)} end={vec(0, Y + 42 * K)} colors={['#fff2da', '#ffd79c', '#ffc174']} positions={[0, 0.6, 1]} />
            </SkText>
          </>
        ) : null}
        <Tracked font={unit} text={data.unit} x={X + 4.5 * K} y={Y + 94 * K} track={9 * K} color="rgba(236,178,104,0.95)" maxW={226 * K} />
        <Tracked font={small} text={data.small} x={X + 2 * K} y={Y - 74 * K} track={4 * K} color={data.smallColor} glow="rgba(255,150,50,0.45)" maxW={226 * K} />
        {data.meter ? <Tracked font={tiny} text={data.meter} x={X + 2 * K} y={Y + 124 * K} track={4 * K} color="rgba(231,178,106,0.72)" maxW={226 * K} /> : null}
      </Group>
    );
  }

  // ---- tuner ---------------------------------------------------------------------------------------
  const live = data.heard || data.locked;
  const ink = data.locked ? '#bfffd2' : Math.abs(data.cents) < 6 && data.heard ? '#ffe7a8' : '#ffd394';
  const nw = widthOf(note, data.note);
  const ow = widthOf(oct, data.octave);
  const nx = X - (nw + ow + 4 * K) / 2;
  const centsText = data.locked ? 'IN TUNE' : `${data.cents >= 0 ? '+' : '−'}${Math.abs(data.cents).toFixed(1)} ¢`;
  const centsCol = data.locked ? '#9dffbe' : Math.abs(data.cents) < 6 ? '#ffe0a0' : '#ffb26a';
  const clip = Skia.Path.Make();
  clip.addCircle(X, Y, R0);
  return (
    <Group>
      <Group clip={clip}>
        <Rect x={x0} y={yc - 2 * ys} width={Wd} height={4 * ys} color="rgba(120,255,170,0.05)" />
        <Rect x={x0} y={yc - 0.5} width={Wd} height={1} color="rgba(255,214,160,0.10)" />
        <Path path={tracePath} style="stroke" strokeWidth={3.2 * K} strokeJoin="round" strokeCap="round">
          <LinearGradient
            start={vec(x0, 0)}
            end={vec(x0 + Wd, 0)}
            colors={data.locked ? ['rgba(120,255,170,0)', 'rgba(120,255,170,0.55)', 'rgba(160,255,190,0.95)'] : ['rgba(255,170,80,0)', 'rgba(255,180,90,0.45)', 'rgba(255,210,140,0.9)']}
            positions={[0, 0.7, 1]}
          />
        </Path>
      </Group>
      {live ? (
        <>
          {note ? (
            <>
              <Group blendMode="plus">
                <SkText x={nx} y={Y + 30 * K} text={data.note} font={note} color={data.locked ? 'rgba(80,255,140,0.55)' : 'rgba(255,140,40,0.4)'}>
                  <BlurMask blur={(data.locked ? 20 : 13) * K} style="normal" />
                </SkText>
              </Group>
              <SkText x={nx} y={Y + 30 * K} text={data.note} font={note} color={ink} />
            </>
          ) : null}
          {oct ? <SkText x={nx + nw + 4 * K} y={Y + 30 * K} text={data.octave} font={oct} color={ink} /> : null}
          <Tracked font={small} text={`${data.hz} HZ`} x={X + 2 * K} y={Y - 70 * K} track={3 * K} color="rgba(236,190,120,0.92)" maxW={226 * K} />
          <Tracked font={cents} text={centsText} x={X + 2 * K} y={Y + 82 * K} track={3 * K} color={centsCol} glow={data.locked ? 'rgba(80,255,140,0.6)' : undefined} maxW={226 * K} />
        </>
      ) : (
        <>
          {big ? <SkText x={X - widthOf(big, '—') / 2} y={Y + 30 * K} text="—" font={big} color="rgba(255,211,148,0.35)" /> : null}
          <Tracked font={small} text={data.idleTop} x={X + 2 * K} y={Y - 70 * K} track={3 * K} color="#e8b46e" maxW={226 * K} />
          <Tracked font={tiny} text={data.idleBottom} x={X + 2 * K} y={Y + 82 * K} track={3 * K} color="rgba(232,180,110,0.78)" maxW={226 * K} />
        </>
      )}
    </Group>
  );
}
