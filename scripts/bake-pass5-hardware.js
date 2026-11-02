/**
 * Baked component plates for pass 5. No surrounding UI.
 * Lighting is fixed from the upper left so every piece shares one world.
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT = path.join(__dirname, '..', 'assets', 'pass5-hardware');
fs.mkdirSync(OUT, { recursive: true });

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function mix(a, b, t) { return a + (b - a) * t; }
function smooth(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function png(w, h) { return new PNG({ width: w, height: h }); }
function put(image, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const i = (image.width * y + x) << 2;
  image.data[i] = clamp(r, 0, 255);
  image.data[i + 1] = clamp(g, 0, 255);
  image.data[i + 2] = clamp(b, 0, 255);
  image.data[i + 3] = clamp(a, 0, 255);
}
function save(image, name) {
  fs.writeFileSync(path.join(OUT, name), PNG.sync.write(image));
  console.log(name, image.width, image.height);
}
function shade(base, light, spec) {
  const n = hash(Math.floor(light * 400), Math.floor(spec * 400));
  const g = (n - 0.5) * 8;
  return [
    base[0] * light + spec * 210 + g,
    base[1] * light + spec * 196 + g,
    base[2] * light + spec * 170 + g,
  ];
}

const STEEL = [168, 176, 184];
const GRAPHITE = [42, 48, 54];
const BRASS = [212, 184, 132];
const BLACK = [16, 18, 20];

function bakeArm(name, kind) {
  const W = 240;
  const H = 960;
  const image = png(W, H);
  const cx = W / 2;
  for (let y = 0; y < H; y += 1) {
    const t = y / (H - 1);
    const belly = Math.sin(Math.pow(t, 0.9) * Math.PI);
    const half = kind === 'blade'
      ? mix(26, 92, Math.pow(t, 0.72))
      : mix(20, 100, Math.pow(belly, 0.55));
    for (let x = 0; x < W; x += 1) {
      const u = (x - cx) / half;
      if (Math.abs(u) > 1) continue;
      const edge = Math.pow(1 - Math.abs(u), 0.45);
      const spine = Math.exp(-Math.pow((u - 0.08) * 3.2, 2));
      const light = 0.28 + edge * 0.55 + (u < 0 ? 0.22 : 0) * edge - spine * 0.16;
      const spec = Math.pow(clamp(0.15 - u, 0, 1), 5) * edge * 0.55;
      const [r, g, b] = shade(STEEL, light, spec);
      const alpha = smooth(1, 0.9, Math.abs(u)) * 255;
      put(image, x, y, r, g, b, alpha);
    }
  }
  save(image, name);
}

function bakeMass(name, kind) {
  const W = 420;
  const H = 180;
  const image = png(W, H);
  const cx = W / 2;
  const cy = H / 2;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const nx = (x - cx) / (W * 0.46);
      const ny = (y - cy) / (H * 0.42);
      const e = nx * nx + ny * ny;
      if (kind === 'lens') {
        if (e > 1) continue;
        if (Math.abs(nx) < 0.16 && Math.abs(ny) < 0.92) continue;
      } else {
        const ear = Math.abs(nx) < 0.72 && Math.abs(ny) < 0.55;
        const cheek = Math.abs(nx) > 0.55 && Math.abs(nx) < 0.95 && Math.abs(ny) < 0.78;
        if (!ear && !cheek) continue;
        if (Math.abs(nx) < 0.12 && Math.abs(ny) < 0.7) continue;
      }
      const light = 0.34 + (1 - ny) * 0.28 + (nx < 0 ? 0.12 : 0);
      const spec = Math.pow(clamp(0.2 - ny - Math.abs(nx) * 0.2, 0, 1), 4) * 0.7;
      const [r, g, b] = shade(BRASS, light, spec);
      put(image, x, y, r, g, b, 255);
    }
  }
  save(image, name);
}

function bakeYoke(name) {
  const W = 560;
  const H = 260;
  const image = png(W, H);
  const cx = W / 2;
  const cy = 118;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const left = Math.hypot(dx + 150, dy) < 78;
      const right = Math.hypot(dx - 150, dy) < 78;
      const saddle = Math.hypot(dx / 210, (dy + 10) / 70) < 1 && dy > -20;
      const jewel = Math.hypot(dx, dy);
      const pin = jewel < 16;
      const race = jewel < 48;
      if (pin) {
        put(image, x, y, 18, 16, 12, 255);
        continue;
      }
      if (!left && !right && !saddle && !race) continue;
      const light = race ? 0.62 + (dx < 0 ? 0.22 : -0.08) : 0.3 + (dy < 0 ? 0.16 : 0);
      const [r, g, b] = shade(race ? STEEL : GRAPHITE, light, race && dx < -6 ? 0.4 : 0.04);
      put(image, x, y, r, g, b, 255);
    }
  }
  save(image, name);
}

function bakeDrum(name) {
  const S = 1024;
  const image = png(S, S);
  const c = S / 2;
  const R = S * 0.48;
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const dx = x - c;
      const dy = y - c;
      const d = Math.hypot(dx, dy);
      if (d > R) continue;
      const rn = d / R;
      const rim = smooth(0.86, 1, rn);
      const hub = smooth(0.22, 0.05, rn);
      const wall = smooth(0.93, 1, rn);
      const grain = (hash(x, y) - 0.5) * 10;
      const light = 0.42 + (1 - rim) * 0.2 + hub * 0.5 + (dx < 0 ? 0.08 : -0.05) - wall * 0.35;
      const [r, g, b] = shade(GRAPHITE, light, hub * 0.22);
      put(image, x, y, r + grain * 0.15, g + grain * 0.15, b + grain * 0.15, smooth(1, 0.97, rn) * 255);
      if (rn < 0.045) put(image, x, y, 28, 24, 18, 255);
    }
  }
  save(image, name);
}

function bakePocket(name, raised) {
  const S = 160;
  const image = png(S, S);
  const c = S / 2;
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const d = Math.hypot(x - c, y - c) / (S * 0.42);
      if (d > 1) continue;
      const well = smooth(0.72, 0.4, d);
      const lip = smooth(0.78, 0.95, d) * (1 - smooth(0.95, 1, d));
      const light = raised ? 0.45 + well * 0.35 : 0.12 + lip * 0.55 + (1 - well) * 0.08;
      const base = raised ? BRASS : BLACK;
      const [r, g, b] = shade(base, light, lip * 0.4);
      put(image, x, y, r, g, b, 255);
    }
  }
  save(image, name);
}

function bakeLeaf(name, tone) {
  const W = 1000;
  const H = 180;
  const image = png(W, H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const v = y / H;
      const edge = x < 18 || x > W - 18;
      const light = edge ? 0.25 : 0.55 + (1 - v) * 0.7 - (v > 0.78 ? 0.4 : 0);
      const spec = v < 0.14 ? 0.7 : 0;
      const [r, g, b] = shade(tone, light, spec);
      put(image, x, y, r, g, b, 255);
    }
  }
  save(image, name);
}

function bakeTrack(name) {
  const W = 48;
  const H = 400;
  const image = png(W, H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const u = Math.abs(x - W / 2) / (W / 2);
      const groove = u < 0.35;
      const [r, g, b] = shade(groove ? BLACK : GRAPHITE, groove ? 0.15 : 0.4 + (x < 8 ? 0.2 : 0), 0);
      put(image, x, y, r, g, b, 255);
    }
  }
  save(image, name);
}

function bakeRail(name) {
  const W = 1200;
  const H = 200;
  const image = png(W, H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const v = y / H;
      const lip = v < 0.18;
      const wall = v > 0.78;
      const light = lip ? 0.42 : wall ? 0.08 : 0.18;
      const [r, g, b] = shade(lip ? STEEL : [36, 40, 44], light, lip ? 0.12 : 0);
      put(image, x, y, r, g, b, 255);
    }
  }
  save(image, name);
}

function bakeCylinder(name) {
  const W = 1600;
  const H = 980;
  const image = png(W, H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const bearing = (x < W * 0.15 || x > W * 0.85) && y > H * 0.18 && y < H * 0.84;
      const hood = y < H * 0.3;
      const floor = y > H * 0.74;
      const drum = y > H * 0.24 && y < H * 0.78 && x > W * 0.1 && x < W * 0.9;
      let light = 0.12;
      let base = [16, 18, 20];
      let spec = 0;
      if (bearing) {
        const axle = Math.abs(y - H * 0.5) < H * 0.04 && x > 18 && x < W - 18;
        base = axle ? [6, 7, 8] : STEEL;
        const edge = x < W * 0.15 ? x / (W * 0.15) : (W - x) / (W * 0.15);
        light = axle ? 0.05 : 0.34 + edge * 0.4 + (y < H * 0.36 ? 0.16 : 0);
        spec = y < H * 0.26 ? 0.14 : 0;
      } else if (hood) {
        base = GRAPHITE;
        light = 0.2 + (1 - y / (H * 0.3)) * 0.34;
        if (y > H * 0.24) light *= 0.55;
        spec = y < 22 ? 0.18 : 0;
      } else if (floor) {
        const pedestal = x < W * 0.2 || x > W * 0.8;
        const plinth = y > H * 0.9;
        const stringer = y > H * 0.755 && y < H * 0.84;
        const bolt =
          plinth &&
          (Math.abs(x - W * 0.3) < 14 || Math.abs(x - W * 0.7) < 14) &&
          Math.abs(y - H * 0.945) < 12;
        if (bolt) {
          base = [12, 12, 13];
          light = 0.55;
        } else if (pedestal) {
          base = STEEL;
          const edge = x < W * 0.2 ? x / (W * 0.2) : (W - x) / (W * 0.2);
          light = 0.3 + edge * 0.28;
        } else if (plinth) {
          base = [150, 156, 162];
          light = y < H * 0.93 ? 0.72 : 0.34;
          spec = y < H * 0.915 ? 0.16 : 0;
        } else if (stringer) {
          base = [120, 126, 132];
          light = 0.7;
        } else {
          base = [58, 62, 66];
          light = 0.45;
        }
      } else if (drum) {
        const ny = (y - H * 0.24) / (H * 0.54);
        const lobe = Math.exp(-Math.pow((ny - 0.22) / 0.16, 2));
        const axial = 1 - Math.abs(x - W / 2) / (W / 2) * 0.18;
        const terminator = ny > 0.62 ? 0.22 : 1;
        base = [78, 84, 90];
        light = (0.1 + lobe * 1.45) * axial * terminator;
      }
      const [r, g, b] = shade(base, light, spec);
      put(image, x, y, r, g, b, 255);
    }
  }
  save(image, name);
}

function bakePlate(name, tone) {
  const W = 1000;
  const H = 220;
  const image = png(W, H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const v = y / H;
      const face = v > 0.12 && v < 0.78;
      const light = v < 0.08 ? 0.92 : face ? 0.7 : 0.08;
      const spec = v < 0.06 ? 0.28 : 0;
      const [r, g, b] = shade(tone, light, spec);
      put(image, x, y, r, g, b, 255);
    }
  }
  save(image, name);
}

bakeCylinder('drum-cylinder.png');
bakePlate('leaf-face-a.png', [196, 168, 120]);
bakePlate('leaf-face-b.png', [150, 158, 166]);
bakePlate('leaf-face-c.png', [72, 68, 62]);
bakeArm('arm-blade.png', 'blade');
bakeArm('arm-cam.png', 'cam');
bakeMass('mass-lens.png', 'lens');
bakeMass('mass-collet.png', 'collet');
bakeYoke('yoke-bearing.png');
bakeDrum('drum-body.png');
bakePocket('pocket-recess.png', false);
bakePocket('pocket-cam.png', true);
bakeLeaf('leaf-a.png', [92, 86, 76]);
bakeLeaf('leaf-b.png', [74, 78, 84]);
bakeLeaf('leaf-c.png', [58, 54, 48]);
bakeLeaf('leaf-d.png', [110, 104, 94]);
bakeTrack('shutter-track.png');
bakeRail('beat-rail.png');
