/**
 * Offline hardware plates for the Dial landing.
 * Live state (BPM, pointer, lamps, play, meter, nav selection) is not baked.
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT = path.join(__dirname, '..', 'assets', 'dial-hardware');

function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function noise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y) {
  return noise(x, y) * 0.55 + noise(x * 2.07, y * 2.07) * 0.3 + noise(x * 4.19, y * 4.19) * 0.15;
}

function fract(v) {
  return v - Math.floor(v);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function smooth(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function png(width, height) {
  return new PNG({ width, height });
}

function put(image, x, y, r, g, b, a) {
  const i = (image.width * y + x) << 2;
  image.data[i] = clamp(r, 0, 255);
  image.data[i + 1] = clamp(g, 0, 255);
  image.data[i + 2] = clamp(b, 0, 255);
  image.data[i + 3] = clamp(a, 0, 255);
}

function save(image, name) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, PNG.sync.write(image));
  console.log(name, image.width, image.height);
}

function knurlCartesian(x, y, scale) {
  const u = x * scale;
  const v = y * scale;
  const d1 = Math.abs(fract(u + v) - 0.5);
  const d2 = Math.abs(fract(u - v) - 0.5);
  const h = clamp(Math.min(d1, d2) * 4.2, 0, 1);
  return h * h * (3 - 2 * h);
}

function knurlHeight(ang, band) {
  const u = ((ang + Math.PI) / (Math.PI * 2)) * 280;
  const v = band * 3.1;
  const d1 = Math.abs(fract(u + v) - 0.5);
  const d2 = Math.abs(fract(u * 0.992 - v) - 0.5);
  const m = Math.min(d1, d2) * 4.15;
  const h = clamp(m, 0, 1);
  return h * h * (3 - 2 * h);
}

function bronze(ndot, spec, facing, grain) {
  const valley = [46, 34, 24];
  const mid = [124, 102, 76];
  const high = [186, 164, 138];
  const t = clamp(0.28 + ndot * 0.55, 0, 1);
  let r = mix(valley[0], mid[0], t);
  let g = mix(valley[1], mid[1], t);
  let b = mix(valley[2], mid[2], t);
  const crest = Math.pow(clamp(ndot, 0, 1), 2.4) * 0.18 + spec * 0.35;
  r = mix(r, high[0], crest);
  g = mix(g, high[1], crest);
  b = mix(b, high[2], crest);
  const tone = 0.82 + facing * 0.22 + (grain - 0.5) * 0.04;
  return [r * tone, g * tone, b * tone];
}

function lightNormal(nx, ny, nz) {
  const lx = -0.42;
  const ly = -0.62;
  const lz = 0.66;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len;
  ny /= len;
  nz /= len;
  const llen = Math.hypot(lx, ly, lz);
  const nd = nx * (lx / llen) + ny * (ly / llen) + nz * (lz / llen);
  const hx = lx / llen;
  const hy = ly / llen;
  const hz = lz / llen + 1;
  const hlen = Math.hypot(hx, hy, hz);
  const spec = Math.pow(clamp(nx * (hx / hlen) + ny * (hy / hlen) + nz * (hz / hlen), 0, 1), 28);
  return { nd: clamp(nd, 0, 1), spec };
}

function bakeDial() {
  const size = 1024;
  const image = png(size, size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const radius = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const qx = (x - cx) / radius;
      const qy = (y - cy) / radius;
      const r = Math.hypot(qx, qy);
      const ang = Math.atan2(qy, qx);
      if (r > 1.07) {
        put(image, x, y, 0, 0, 0, 0);
        continue;
      }
      if (r > 1) {
        const shadow = Math.pow(1 - (r - 1) / 0.07, 2);
        put(image, x, y, 0, 0, 0, shadow * 170);
        continue;
      }
      const facing = clamp(-qx * 0.55 - qy * 0.72, 0, 1);
      const grain = fbm(x * 0.02, y * 0.02);

      if (r > 0.9) {
        const band = (r - 0.9) / 0.1;
        const hL = knurlHeight(Math.atan2(qy, (x - 1 - cx) / radius), band);
        const hR = knurlHeight(Math.atan2(qy, (x + 1 - cx) / radius), band);
        const hU = knurlHeight(Math.atan2((y - 1 - cy) / radius, qx), band);
        const hD = knurlHeight(Math.atan2((y + 1 - cy) / radius, qx), band);
        const { nd, spec } = lightNormal(hL - hR, hU - hD, 0.62);
        let col = bronze(nd, spec, facing, grain);
        const bevel = smooth(0.9, 0.915, r) * (1 - smooth(0.975, 0.998, r));
        col = col.map((c) => c + bevel * facing * 40);
        const lip = smooth(0.985, 1, r);
        col = col.map((c) => c * (1 - lip * 0.45));
        put(image, x, y, col[0], col[1], col[2], 255);
        continue;
      }

      if (r > 0.875) {
        const col = bronze(0.35 + facing * 0.4, facing * 0.2, facing * 0.5, grain);
        const dark = smooth(0.875, 0.9, r);
        put(image, x, y, col[0] * dark * 0.55, col[1] * dark * 0.55, col[2] * dark * 0.55, 255);
        continue;
      }

      if (r > 0.64) {
        const micro = noise(x * 0.05, y * 0.05);
        let v = 23 + (micro - 0.5) * 3 + facing * 5;
        v *= 0.94 + facing * 0.1;
        if (r > 0.855 && r < 0.872) {
          const col = bronze(0.4 + facing * 0.35, 0.05, facing, grain);
          put(image, x, y, col[0] * 0.7, col[1] * 0.7, col[2] * 0.7, 255);
          continue;
        }
        put(image, x, y, v, v * 0.98, v * 0.94, 255);
        continue;
      }

      if (r > 0.618) {
        const col = bronze(0.45 + facing * 0.5, facing * 0.25, facing, grain);
        put(image, x, y, col[0] * 0.85, col[1] * 0.85, col[2] * 0.85, 255);
        continue;
      }

      const sweep = Math.exp(-((qx + 0.12) * (qx + 0.12) * 1.1 + (qy + 0.22) * (qy + 0.22) * 0.85));
      const brush = noise(ang * 220, 1.2);
      const brushW = smooth(0.16, 0.4, r);
      const rings = Math.sin(r * 210);
      const vig = smooth(0.36, 0.62, r);
      let v = 22 + sweep * 14 + (brush - 0.5) * 6 * brushW + rings * 0.35;
      v *= 1 - vig * 0.28;
      put(image, x, y, v, v * 0.985, v * 0.95, 255);
    }
  }

  const marks = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400];
  for (const mark of marks) {
    const theta = angleFromBpm(mark);
    const inner = radius * 0.745;
    const outer = radius * 0.785;
    const x1 = cx + Math.sin(theta) * inner;
    const y1 = cy - Math.cos(theta) * inner;
    const x2 = cx + Math.sin(theta) * outer;
    const y2 = cy - Math.cos(theta) * outer;
    stroke(image, x1, y1, x2, y2, mark === 120 ? 2.2 : 1.35, [176, 172, 164, 210]);
  }

  const tip = radius * 0.9;
  stroke(image, cx, cy - tip, cx - 7, cy - tip + 16, 2.4, [210, 170, 100, 255]);
  stroke(image, cx, cy - tip, cx + 7, cy - tip + 16, 2.4, [210, 170, 100, 255]);
  save(image, 'dial-plate.png');
}

function angleFromBpm(bpm) {
  const minA = (-130 * Math.PI) / 180;
  const maxA = (140 * Math.PI) / 180;
  if (bpm <= 120) {
    const t = (bpm - 20) / (120 - 20);
    return minA + t * (0 - minA);
  }
  const t = (bpm - 120) / (400 - 120);
  return 0 + t * maxA;
}

function stroke(image, x1, y1, x2, y2, width, color) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    disc(image, x, y, width / 2, color);
  }
}

function disc(image, cx, cy, radius, color) {
  const r = Math.ceil(radius);
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y > radius * radius) continue;
      const px = Math.round(cx + x);
      const py = Math.round(cy + y);
      if (px < 0 || py < 0 || px >= image.width || py >= image.height) continue;
      put(image, px, py, color[0], color[1], color[2], color[3]);
    }
  }
}

function turnedMetal(r, inner, outer, qx, qy, kind) {
  const span = outer - inner;
  const u = (r - inner) / span;
  const edge = Math.min(u, 1 - u) / 0.5;
  const bevel = smooth(0, 0.22, edge);
  const light = clamp(-qx * 0.85 - qy * 0.95, 0, 1);
  const shade = clamp(qx * 0.65 + qy * 0.8, 0, 1);
  const crescent = Math.pow(light, 1.4);
  if (kind === 'bronze') {
    const col = bronze(0.25 + crescent * 0.7, crescent * 0.5, light, 0.5);
    const occlude = 1 - shade * 0.35 - (1 - bevel) * 0.45;
    return [col[0] * occlude, col[1] * occlude, col[2] * occlude, 255];
  }
  const brush = noise(qx * 30, qy * 6);
  let v = 78 + crescent * 70 + (brush - 0.5) * 8 - shade * 28;
  v *= 0.72 + bevel * 0.28;
  return [v * 1.02, v, v * 0.94, 255];
}

function bakeHub() {
  const size = 512;
  const image = png(size, size);
  const c = (size - 1) / 2;
  const radius = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const qx = (x - c) / radius;
      const qy = (y - c) / radius;
      const r = Math.hypot(qx, qy);
      if (r > 1.08) {
        put(image, x, y, 0, 0, 0, 0);
        continue;
      }
      if (r > 0.96) {
        const a = Math.pow(1 - (r - 0.96) / 0.12, 2) * 150;
        put(image, x, y, 0, 0, 0, a);
        continue;
      }
      if (r > 0.78) {
        const col = turnedMetal(r, 0.78, 0.96, qx, qy, 'bronze');
        put(image, x, y, col[0], col[1], col[2], 255);
        continue;
      }
      if (r > 0.74) {
        put(image, x, y, 8, 7, 6, 255);
        continue;
      }
      if (r > 0.46) {
        const col = turnedMetal(r, 0.46, 0.74, qx, qy, 'steel');
        put(image, x, y, col[0], col[1], col[2], 255);
        continue;
      }
      if (r > 0.2) {
        const light = clamp(-qx * 0.8 - qy * 0.9, 0, 1);
        const v = 12 + light * 8;
        put(image, x, y, v, v * 0.96, v * 0.9, 255);
        continue;
      }
      const dx = qx + 0.04;
      const dy = qy + 0.05;
      const sphere = Math.sqrt(Math.max(0, 1 - (r / 0.2) * (r / 0.2)));
      const spec = Math.exp(-(dx * dx + dy * dy) * 900);
      const body = 28 + sphere * 36;
      put(image, x, y, body * 0.85 + spec * 180, body * 0.72 + spec * 160, body * 0.5 + spec * 120, 255);
    }
  }
  for (const ang of [0.7, 2.2, 3.6, 5.1]) {
    const sx = c + Math.cos(ang) * radius * 0.6;
    const sy = c + Math.sin(ang) * radius * 0.6;
    disc(image, sx + 1.5, sy + 1.5, 8, [12, 10, 8, 255]);
    disc(image, sx, sy, 7, [54, 48, 40, 255]);
    disc(image, sx - 1.6, sy - 1.8, 2.2, [168, 156, 136, 230]);
  }
  save(image, 'hub.png');
}

function bakeKnob(bronzeFace, name) {
  const size = 512;
  const image = png(size, size);
  const c = (size - 1) / 2;
  const radius = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const qx = (x - c) / radius;
      const qy = (y - c) / radius;
      const r = Math.hypot(qx, qy);
      if (r > 1.04) {
        put(image, x, y, 0, 0, 0, 0);
        continue;
      }
      if (r > 1) {
        put(image, x, y, 0, 0, 0, (1 - (r - 1) / 0.04) * 160);
        continue;
      }
      const facing = clamp(-qx * 0.7 - qy * 0.8, 0, 1);
      const ang = Math.atan2(qy, qx);
      if (r > 0.88 && !bronzeFace) {
        const band = (r - 0.88) / 0.12;
        const hC = knurlCartesian(x, y, 0.2);
        const hR = knurlCartesian(x + 1, y, 0.2);
        const hD = knurlCartesian(x, y + 1, 0.2);
        const { nd, spec } = lightNormal((hC - hR) * 2.2, (hC - hD) * 2.2, 0.32);
        const col = bronze(nd, spec * 0.65, facing * (0.4 + band), 0.5);
        const edge = smooth(0.94, 1, r);
        put(image, x, y, col[0] * (1 - edge * 0.3), col[1] * (1 - edge * 0.3), col[2] * (1 - edge * 0.3), 255);
        continue;
      }
      if (bronzeFace) {
        const hC = knurlCartesian(x, y, 0.16);
        const hR = knurlCartesian(x + 1, y, 0.16);
        const hD = knurlCartesian(x, y + 1, 0.16);
        const { nd, spec } = lightNormal((hC - hR) * 2.4, (hC - hD) * 2.4, 0.3);
        const col = bronze(nd, spec * 0.55, facing * (1.15 - r * 0.35), 0.5);
        const edge = smooth(0.9, 1, r);
        const wall = smooth(0.82, 0.96, r);
        put(
          image,
          x,
          y,
          col[0] * (1 - edge * 0.35) * (1 - wall * 0.15),
          col[1] * (1 - edge * 0.35) * (1 - wall * 0.15),
          col[2] * (1 - edge * 0.35) * (1 - wall * 0.15),
          255
        );
        continue;
      }
      const sphere = Math.sqrt(Math.max(0, 1 - (r / 0.88) * (r / 0.88)));
      const grain = noise(x * 0.12, y * 0.12);
      let v = 86 + sphere * 78 + facing * 18 + (grain - 0.5) * 5;
      v *= 0.86 + facing * 0.16;
      put(image, x, y, v, v * 0.99, v * 0.96, 255);
    }
  }
  save(image, name);
}

function bakeRim() {
  const size = 512;
  const image = png(size, size);
  const c = (size - 1) / 2;
  const radius = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const qx = (x - c) / radius;
      const qy = (y - c) / radius;
      const r = Math.hypot(qx, qy);
      if (r > 1 || r < 0.78) {
        put(image, x, y, 0, 0, 0, 0);
        continue;
      }
      const facing = clamp(-qx * 0.6 - qy * 0.75, 0, 1);
      const band = (r - 0.78) / 0.22;
      const hL = knurlHeight(Math.atan2(qy, (x - 1 - c) / radius), band);
      const hR = knurlHeight(Math.atan2(qy, (x + 1 - c) / radius), band);
      const { nd, spec } = lightNormal(hL - hR, 0.1, 0.4);
      const col = bronze(nd, spec * 0.5, facing, 0.5);
      put(image, x, y, col[0], col[1], col[2], 255);
    }
  }
  save(image, 'p-rim.png');
}

function bakeCap() {
  const size = 256;
  const image = png(size, size);
  const c = (size - 1) / 2;
  const radius = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const qx = (x - c) / radius;
      const qy = (y - c) / radius;
      const r = Math.hypot(qx, qy);
      if (r > 1) {
        put(image, x, y, 0, 0, 0, 0);
        continue;
      }
      const facing = clamp(-qx * 0.55 - qy * 0.7, 0, 1);
      const ang = Math.atan2(qy, qx);
      if (r > 0.84) {
        const col = bronze(0.3 + facing * 0.45, facing * 0.15, facing * 0.6, 0.5);
        put(image, x, y, col[0], col[1], col[2], 255);
        continue;
      }
      const sphere = Math.sqrt(Math.max(0, 1 - (r / 0.84) * (r / 0.84)));
      const grain = noise(x * 0.15, y * 0.08);
      let v = 88 + sphere * 62 + (grain - 0.5) * 6 + facing * 16;
      if (r < 0.2) v *= 0.9;
      put(image, x, y, v * 1.03, v * 0.99, v * 0.94, 255);
    }
  }
  save(image, 'beat-cap.png');
}

function bakeBar(name, lo, hi, bronzeTone) {
  const w = 800;
  const h = 220;
  const image = png(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const uy = y / (h - 1);
      const brush = noise(x * 0.035, y * 0.55);
      const fine = noise(x * 0.12, y * 1.7);
      const lift = Math.pow(1 - uy, 1.3);
      const shade = smooth(0.62, 1, uy);
      let t = 0.28 + lift * 0.62 + (brush - 0.5) * 0.16 + (fine - 0.5) * 0.05;
      t *= 1 - shade * (bronzeTone ? 0.55 : 0.34);
      if (uy < 0.06) t = mix(t, 1, (0.06 - uy) / 0.06);
      const r = mix(lo[0], hi[0], t);
      const g = mix(lo[1], hi[1], t);
      const b = mix(lo[2], hi[2], t);
      const warm = bronzeTone ? 1 : 0;
      put(image, x, y, r + warm * 8, g, b - warm * 6, 255);
    }
  }
  save(image, name);
}

function bakeChassis() {
  const w = 780;
  const h = 1688;
  const image = png(w, h);
  for (let y = 0; y < h; y++) {
    const row = noise(2.2, y * 0.01);
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      const v = y / (h - 1);
      const broad = Math.exp(-((u - 0.48) * (u - 0.48) * 1.4 + (v - 0.18) * (v - 0.18) * 3.2));
      const side = Math.abs(u - 0.5);
      const grain = fbm(x * 0.08, y * 0.08);
      const fine = noise(x * 0.45, y * 0.45);
      let tone = 0.075 + broad * 0.11 + grain * 0.028 + (fine - 0.5) * 0.016 + row * 0.012;
      tone -= side * side * 0.08;
      tone -= smooth(0.2, 1.1, Math.hypot(u - 0.5, (v - 0.32) * 0.8)) * 0.03;
      const value = tone * 255;
      put(image, x, y, value, value * 0.975, value * 0.93, 255);
    }
  }
  save(image, 'chassis.png');
}

fs.mkdirSync(OUT, { recursive: true });
bakeChassis();
bakeDial();
bakeHub();
bakeKnob(false, 'knob-steel.png');
bakeKnob(true, 'knob-bronze.png');
bakeRim();
bakeCap();
bakeBar('rail.png', [78, 76, 72], [186, 182, 174], false);
bakeBar('nav.png', [46, 44, 40], [112, 108, 100], false);
bakeBar('play.png', [78, 62, 44], [198, 178, 150], true);
