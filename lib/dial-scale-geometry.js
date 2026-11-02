'use strict';

const { MARK_START_DEG, MARK_STEP_DEG, NORTH_STAR_MARKS, angleFromNorthStarBpm } = require('./native-interaction-math.ts');

/** Canvas the clean dial components are authored on. Swift and the proof use the same files. */
const DIAL_CANVAS = 456;
const DIAL_CENTER = DIAL_CANVAS / 2;

/** Inner black face ends here. The bezel annulus begins just inside this radius. */
const FACE_RADIUS = 196;
const BEZEL_INNER = 190;
const BEZEL_OUTER = 227;

const LABEL_R = 144;
const LABEL_TANGENT = 12;
const MAJOR_INNER = 178;
const MAJOR_OUTER = 190;
const MINOR_INNER = 184;
const MINOR_OUTER = 190;
const MID_INNER = 181;
/** Fraction of the dial diameter. Swift PocktDialControl uses the same value. */
const BOSS_SCALE = 0.18;
const SCALE_FONT = 13;

function dialAngleDeg(bpm) {
  return (angleFromNorthStarBpm(bpm) * 180) / Math.PI;
}

function polar(deg, radius) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: DIAL_CENTER + Math.sin(rad) * radius,
    y: DIAL_CENTER - Math.cos(rad) * radius,
  };
}

function dialTicks() {
  const ticks = [];
  const end = MARK_START_DEG + (NORTH_STAR_MARKS.length - 1) * MARK_STEP_DEG;
  for (let deg = MARK_START_DEG; deg <= end + 0.01; deg += MARK_STEP_DEG / 9) {
    const major = NORTH_STAR_MARKS.some((mark) => Math.abs(dialAngleDeg(mark) - deg) < 0.6);
    const mid = !major && Math.abs((deg - MARK_START_DEG) % 9) < 0.6;
    ticks.push({ deg, kind: major ? 'major' : mid ? 'mid' : 'minor' });
  }
  return ticks;
}

function dialLabels() {
  return NORTH_STAR_MARKS.map((bpm) => {
    const deg = dialAngleDeg(bpm);
    const rad = (deg * Math.PI) / 180;
    return {
      bpm,
      deg,
      x: DIAL_CENTER + Math.sin(rad) * LABEL_R + Math.cos(rad) * LABEL_TANGENT,
      y: DIAL_CENTER - Math.cos(rad) * LABEL_R + Math.sin(rad) * LABEL_TANGENT,
    };
  });
}

function tickSegment(deg, kind) {
  const inner = kind === 'major' ? MAJOR_INNER : kind === 'mid' ? MID_INNER : MINOR_INNER;
  const a = polar(deg, inner);
  const b = polar(deg, kind === 'minor' ? MINOR_OUTER : MAJOR_OUTER);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

module.exports = {
  DIAL_CANVAS,
  DIAL_CENTER,
  FACE_RADIUS,
  BEZEL_INNER,
  BEZEL_OUTER,
  BOSS_SCALE,
  SCALE_FONT,
  dialAngleDeg,
  polar,
  dialTicks,
  dialLabels,
  tickSegment,
  NORTH_STAR_MARKS,
};
