'use strict';

/**
 * Isolated photographic hardware for the shell.
 * Each file is one physical piece. Labels, glyphs, and neighboring controls stay out.
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const phonePath = path.join(root, 'artifacts', '_shell-inspect', 'phone-wide.png');
const outDir = path.join(root, 'assets', 'shell-v2');

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function luma(r, g, b) {
  return (r + g + b) / 3;
}
function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}
function writePng(file, png) {
  fs.writeFileSync(file, PNG.sync.write(png));
}
function blank(w, h) {
  return new PNG({ width: w, height: h });
}
function idx(png, x, y) {
  return (y * png.width + x) * 4;
}
function get(png, x, y) {
  const xx = clamp(Math.round(x), 0, png.width - 1);
  const yy = clamp(Math.round(y), 0, png.height - 1);
  const i = idx(png, xx, yy);
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}
function set(png, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = idx(png, x, y);
  png.data[i] = clamp(Math.round(r), 0, 255);
  png.data[i + 1] = clamp(Math.round(g), 0, 255);
  png.data[i + 2] = clamp(Math.round(b), 0, 255);
  png.data[i + 3] = clamp(Math.round(a), 0, 255);
}

function refineCenter(phone) {
  let best = { cx: 404, cy: 688, score: -1 };
  for (let cy = 670; cy <= 710; cy += 2) {
    for (let cx = 386; cx <= 424; cx += 2) {
      let gold = 0;
      let dark = 0;
      for (let a = 0; a < 48; a += 1) {
        const t = (a / 48) * Math.PI * 2;
        const outer = get(phone, cx + Math.cos(t) * 304, cy + Math.sin(t) * 304);
        const inner = get(phone, cx + Math.cos(t) * 180, cy + Math.sin(t) * 180);
        if (outer[0] > 90 && outer[0] > outer[2] + 18) gold += 1;
        if (luma(inner[0], inner[1], inner[2]) < 48) dark += 1;
      }
      const score = gold + dark;
      if (score > best.score) best = { cx, cy, score };
    }
  }
  return best;
}

function pruneBezel(png, mid) {
  const w = png.width;
  const h = png.height;
  const on = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i += 1) if (png.data[i * 4 + 3] > 40) on[i] = 1;
  const seen = new Uint8Array(w * h);
  let best = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const id = y * w + x;
      if (!on[id] || seen[id]) continue;
      const stack = [x, y];
      seen[id] = 1;
      const pts = [];
      while (stack.length) {
        const py = stack.pop();
        const px = stack.pop();
        pts.push(px, py);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const nid = ny * w + nx;
          if (!on[nid] || seen[nid]) continue;
          seen[nid] = 1;
          stack.push(nx, ny);
        }
      }
      if (pts.length > best.length) best = pts;
    }
  }
  const keep = new Uint8Array(w * h);
  for (let i = 0; i < best.length; i += 2) keep[best[i + 1] * w + best[i]] = 1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const id = y * w + x;
      if (!on[id]) continue;
      if (!keep[id]) {
        png.data[id * 4 + 3] = 0;
        continue;
      }
      const i = id * 4;
      const L = (png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3;
      if (L > 150 && png.data[i] < png.data[i + 2] + 28) png.data[i + 3] = 0;
    }
  }
}

function sealBezel(png, mid) {
  const radii = [];
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[(y * png.width + x) * 4 + 3] < 30) continue;
      radii.push(Math.hypot(x - mid, y - mid));
    }
  }
  radii.sort((a, b) => a - b);
  const inner = radii[Math.floor(radii.length * 0.22)] || 320;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (Math.hypot(x - mid, y - mid) < inner) png.data[(y * png.width + x) * 4 + 3] = 0;
    }
  }
  const count = [];
  for (let a = 0; a < 360; a += 1) {
    const t = (a * Math.PI) / 180;
    let n = 0;
    for (let r = 300; r < 400; r += 1) {
      if (get(png, mid + Math.sin(t) * r, mid - Math.cos(t) * r)[3] > 30) n += 1;
    }
    count[a] = n;
  }
  for (let a = 0; a < 360; a += 1) {
    if (count[a] > 12) continue;
    let source = a;
    for (let d = 1; d < 40; d += 1) {
      if (count[(a + d) % 360] > 18) {
        source = (a + d) % 360;
        break;
      }
      if (count[(a - d + 360) % 360] > 18) {
        source = (a - d + 360) % 360;
        break;
      }
    }
    if (source === a) continue;
    const ts = (source * Math.PI) / 180;
    const td = (a * Math.PI) / 180;
    for (let r = 300; r < 400; r += 1) {
      const src = get(png, mid + Math.sin(ts) * r, mid - Math.cos(ts) * r);
      if (src[3] < 30) continue;
      const x = Math.round(mid + Math.sin(td) * r);
      const y = Math.round(mid - Math.cos(td) * r);
      if (get(png, x, y)[3] > 30) continue;
      set(png, x, y, src[0], src[1], src[2], src[3]);
    }
  }
}

function goldish(c) {
  return c[0] > 96 && c[0] > c[2] + 16 && c[1] > 58;
}

function dialLayers(phone, cx, cy) {
  const size = 860;
  const ox = Math.round(cx - size / 2);
  const oy = Math.round(cy - size / 2);
  const bezel = blank(size, size);
  const face = blank(size, size);
  const scale = blank(size, size);
  const bearing = blank(size, size);
  const pointer = blank(size, size);
  const shadow = blank(size, size);
  const mid = size / 2;
  const bezelInner = 286;
  const bezelOuter = 378;
  const faceR = 280;
  const bearingR = 62;
  const tickInner = 236;
  const tickOuter = 274;

  const radial = [];
  for (let r = 0; r <= faceR; r += 1) {
    const samples = [];
    for (let a = 0; a < 240; a += 1) {
      const t = (a / 240) * Math.PI * 2;
      const c = get(phone, ox + mid + Math.sin(t) * r, oy + mid - Math.cos(t) * r);
      samples.push(c);
    }
    samples.sort((p, q) => luma(p[0], p[1], p[2]) - luma(q[0], q[1], q[2]));
    radial[r] = samples[Math.floor(samples.length * 0.42)];
  }
  const smooth = radial.map((c) => c.slice());
  for (let r = 0; r <= faceR; r += 1) {
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let n = 0;
    for (let k = -3; k <= 3; k += 1) {
      const c = radial[clamp(r + k, 0, faceR)];
      sr += c[0];
      sg += c[1];
      sb += c[2];
      n += 1;
    }
    smooth[r] = [sr / n, sg / n, sb / n];
  }
  for (let r = 0; r <= faceR; r += 1) radial[r] = smooth[r];

  const gold = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const r = Math.hypot(x - mid, y - mid);
      if (r < bezelInner - 8 || r > bezelOuter + 2) continue;
      if (goldish(get(phone, ox + x, oy + y))) gold[y * size + x] = 1;
    }
  }
  const nearGold = new Uint8Array(size * size);
  for (let y = 2; y < size - 2; y += 1) {
    for (let x = 2; x < size - 2; x += 1) {
      if (!gold[y * size + x]) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          if (dx * dx + dy * dy <= 4) nearGold[(y + dy) * size + (x + dx)] = 1;
        }
      }
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - mid;
      const dy = y - mid;
      const r = Math.hypot(dx, dy);
      const north = Math.atan2(dx, -dy);
      const src = get(phone, ox + x, oy + y);
      const L = luma(src[0], src[1], src[2]);
      if (nearGold[y * size + x] && r <= bezelOuter + 2 && r >= bezelInner - 4 && L < 210) {
        const edge = r > bezelOuter - 2 ? clamp((bezelOuter + 2 - r) / 4, 0, 1) : r < bezelInner ? clamp((r - (bezelInner - 6)) / 6, 0, 1) : 1;
        set(bezel, x, y, src[0], src[1], src[2], edge * 255);
      }
      if (r <= faceR) {
        const grain = radial[Math.round(r)];
        const edge = r > faceR - 2 ? (faceR - r) / 2 : 1;
        set(face, x, y, grain[0], grain[1], grain[2], edge * 255);
      }
      if (r <= bearingR + 1.5) {
        const edge = r > bearingR ? clamp(bearingR + 1.5 - r, 0, 1) : 1;
        set(bearing, x, y, src[0], src[1], src[2], edge * 255);
      }
      if (r > bearingR + 2 && r < 188 && L > 120) {
        const left = get(phone, ox + x - 8, oy + y);
        const right = get(phone, ox + x + 8, oy + y);
        if (L > luma(left[0], left[1], left[2]) + 45 && L > luma(right[0], right[1], right[2]) + 45) {
          set(pointer, x, y, src[0], src[1], src[2], 255);
        }
      }
      if (r > bezelOuter - 4 && r < bezelOuter + 26 && L < 36) {
        const fall = 1 - (r - (bezelOuter - 4)) / 30;
        set(shadow, x, y, 0, 0, 0, clamp(fall, 0, 1) * 120);
      }
    }
  }

  pruneBezel(bezel, mid);

  const majors = new Set([20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400]);
  const ticks = [];
  for (let bpm = 20; bpm <= 400; bpm += 10) {
    const safe = bpm;
    let ang;
    if (safe <= 120) ang = ((-130 * Math.PI) / 180) * (1 - (safe - 20) / 100);
    else ang = ((140 * Math.PI) / 180) * ((safe - 120) / 280);
    ticks.push({ ang, major: majors.has(bpm) });
  }
  let tr = 0;
  let tg = 0;
  let tb = 0;
  let tn = 0;
  for (const tick of ticks) {
    const [r0, g0, b0] = get(
      phone,
      ox + mid + Math.sin(tick.ang) * 262,
      oy + mid - Math.cos(tick.ang) * 262
    );
    if (luma(r0, g0, b0) > 70) {
      tr += r0;
      tg += g0;
      tb += b0;
      tn += 1;
    }
  }
  const ink = tn ? [tr / tn, tg / tn, tb / tn] : [186, 170, 142];
  for (const tick of ticks) {
    const inner = tick.major ? tickInner - 10 : tickInner;
    const outer = tickOuter;
    const half = tick.major ? 1.35 : 0.7;
    for (let r = inner; r <= outer; r += 0.5) {
      for (let side = -half; side <= half; side += 0.5) {
        const a = tick.ang + side / r;
        const x = Math.round(mid + Math.sin(a) * r);
        const y = Math.round(mid - Math.cos(a) * r);
        const src = get(phone, ox + x, oy + y);
        const mix = luma(src[0], src[1], src[2]) > 60 ? src : ink;
        set(scale, x, y, mix[0], mix[1], mix[2], tick.major ? 230 : 180);
      }
    }
  }

  return { bezel, face, scale, bearing, pointer, shadow };
}

function disk(phone, cx, cy, radius) {
  const size = Math.ceil(radius * 2 + 8);
  const png = blank(size, size);
  const mid = size / 2;
  const samples = [];
  for (let a = 0; a < 72; a += 1) {
    const t = (a / 72) * Math.PI * 2;
    const c = get(phone, cx + Math.cos(t) * radius * 0.62, cy + Math.sin(t) * radius * 0.62);
    if (luma(c[0], c[1], c[2]) < 90) samples.push(c);
  }
  samples.sort((p, q) => luma(p[0], p[1], p[2]) - luma(q[0], q[1], q[2]));
  const fill = samples[Math.floor(samples.length * 0.5)] || [40, 34, 28];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - mid;
      const dy = y - mid;
      const r = Math.hypot(dx, dy);
      if (r > radius + 1.2) continue;
      const src = get(phone, cx + dx, cy + dy);
      const edge = r > radius - 1 ? clamp(radius + 1.2 - r, 0, 1) : 1;
      const inner = r < radius * 0.5;
      const bright = luma(src[0], src[1], src[2]) > luma(fill[0], fill[1], fill[2]) + 16;
      const rgb = inner && bright ? fill : src;
      set(png, x, y, rgb[0], rgb[1], rgb[2], edge * 255);
    }
  }
  return png;
}

function connected(phone, x0, y0, x1, y1, pred) {
  const W = phone.width;
  const seen = new Uint8Array(W * phone.height);
  const comps = [];
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const id = y * W + x;
      if (seen[id]) continue;
      if (!pred(x, y, get(phone, x, y))) continue;
      const stack = [[x, y]];
      seen[id] = 1;
      const pts = [];
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      while (stack.length) {
        const [sx, sy] = stack.pop();
        pts.push(sx, sy);
        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = sx + dx;
          const ny = sy + dy;
          if (nx < x0 || ny < y0 || nx >= x1 || ny >= y1) continue;
          const nid = ny * W + nx;
          if (seen[nid]) continue;
          if (!pred(nx, ny, get(phone, nx, ny))) continue;
          seen[nid] = 1;
          stack.push([nx, ny]);
        }
      }
      comps.push({ pts, minX, minY, maxX, maxY, n: pts.length / 2 });
    }
  }
  return comps;
}

function maskFrom(phone, comp, pad = 2) {
  const w = comp.maxX - comp.minX + 1 + pad * 2;
  const h = comp.maxY - comp.minY + 1 + pad * 2;
  const png = blank(w, h);
  const on = new Uint8Array(w * h);
  for (let i = 0; i < comp.pts.length; i += 2) {
    const x = comp.pts[i] - comp.minX + pad;
    const y = comp.pts[i + 1] - comp.minY + pad;
    on[y * w + x] = 1;
  }
  const grown = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!on[y * w + x]) continue;
      for (let dy = -3; dy <= 3; dy += 1) {
        for (let dx = -3; dx <= 3; dx += 1) {
          if (dx * dx + dy * dy > 10) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          grown[ny * w + nx] = 1;
        }
      }
    }
  }
  for (let i = 0; i < on.length; i += 1) on[i] = grown[i];
  fillHoles(on, w, h);
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!on[y * w + x]) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const bw = maxX - minX;
  const bh = maxY - minY;
  const radius = Math.round(Math.min(bw, bh) * 0.2);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let dx = 0;
      let dy = 0;
      if (x < minX + radius) dx = minX + radius - x;
      else if (x > maxX - radius) dx = x - (maxX - radius);
      if (y < minY + radius) dy = minY + radius - y;
      else if (y > maxY - radius) dy = y - (maxY - radius);
      if (Math.hypot(dx, dy) > radius + 0.6) continue;
      const src = get(phone, comp.minX - pad + x, comp.minY - pad + y);
      set(png, x, y, src[0], src[1], src[2], 255);
    }
  }
  return png;
}

function fillHoles(on, w, h) {
  const outside = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const id = y * w + x;
    if (outside[id] || on[id]) return;
    outside[id] = 1;
    stack.push(x, y);
  };
  for (let x = 0; x < w; x += 1) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  for (let i = 0; i < on.length; i += 1) {
    if (!outside[i]) on[i] = 1;
  }
}

function clearCenterGlyph(png, fracX, fracY) {
  const out = blank(png.width, png.height);
  for (let i = 0; i < png.data.length; i += 1) out.data[i] = png.data[i];
  const cx = (png.width - 1) / 2;
  const cy = (png.height - 1) / 2;
  const donors = [];
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const c = get(out, x, y);
      if (c[3] < 200) continue;
      const nx = (x - cx) / png.width;
      const ny = (y - cy) / png.height;
      if (ny < -0.18 && ny > -0.34 && Math.abs(nx) < 0.12) donors.push(c);
    }
  }
  if (!donors.length) return out;
  donors.sort((a, b) => luma(a[0], a[1], a[2]) - luma(b[0], b[1], b[2]));
  const donor = donors[Math.floor(donors.length * 0.35)];
  const limit = luma(donor[0], donor[1], donor[2]) + 22;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const c = get(out, x, y);
      if (c[3] < 40) continue;
      const nx = Math.abs(x - cx) / (png.width * fracX);
      const ny = Math.abs(y - cy) / (png.height * fracY);
      if (nx > 1 || ny > 1) continue;
      const grain = ((x * 17 + y * 31) % 5) - 2;
      const fade = clamp((Math.max(nx, ny) - 0.72) / 0.28, 0, 1);
      set(
        out,
        x,
        y,
        donor[0] * (1 - fade) + c[0] * fade + grain,
        donor[1] * (1 - fade) + c[1] * fade + grain,
        donor[2] * (1 - fade) + c[2] * fade + grain,
        c[3]
      );
    }
  }
  return out;
}

function shiftDark(png, dy, gain) {
  const out = blank(png.width, png.height);
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const c = get(png, x, y - dy);
      if (c[3] < 8) continue;
      set(out, x, y, c[0] * gain, c[1] * gain, c[2] * gain, c[3]);
    }
  }
  return out;
}

function chassisFrom(phone, cx, cy) {
  const samples = [];
  for (let y = 620; y < 900; y += 3) {
    for (let x of [28, 36, 44, 800, 808]) {
      if (Math.hypot(x - cx, y - cy) < 430) continue;
      samples.push(get(phone, x, y));
    }
  }
  let sr = 0;
  let sg = 0;
  let sb = 0;
  for (const c of samples) {
    sr += c[0];
    sg += c[1];
    sb += c[2];
  }
  const n = samples.length || 1;
  const base = [sr / n, sg / n, sb / n];
  const w = 390;
  const h = 844;
  const png = blank(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const fall = Math.hypot((x - w * 0.5) / w, (y - h * 0.42) / h);
      const light = clamp(1.08 - fall * 0.55, 0.72, 1.12);
      const grain = ((x * 13 + y * 7) % 5) - 2;
      set(png, x, y, base[0] * light + grain, base[1] * light + grain, base[2] * light + grain, 255);
    }
  }
  return png;
}

function roundedWell(sample, w, h, radius) {
  const png = blank(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let dx = 0;
      let dy = 0;
      if (x < radius) dx = radius - x;
      else if (x > w - 1 - radius) dx = x - (w - 1 - radius);
      if (y < radius) dy = radius - y;
      else if (y > h - 1 - radius) dy = y - (h - 1 - radius);
      const dist = Math.hypot(dx, dy);
      if (dist > radius + 1) continue;
      const edge = dist > radius ? clamp(radius + 1 - dist, 0, 1) : 1;
      const inset = Math.min(x, y, w - 1 - x, h - 1 - y);
      const shade = inset < 5 ? 0.55 + inset * 0.08 : 0.92;
      const lip = y < 3 ? 1.35 : 1;
      const sx = (x * 3) % sample.width;
      const sy = (y * 2) % sample.height;
      const c = get(sample, sx, sy);
      set(png, x, y, c[0] * shade * lip, c[1] * shade * lip, c[2] * shade * lip, edge * 255);
    }
  }
  return png;
}

function navRail(phone) {
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  for (let x = 120; x < 720; x += 4) {
    const c = get(phone, x, 1246);
    if (luma(c[0], c[1], c[2]) > 40) continue;
    sr += c[0];
    sg += c[1];
    sb += c[2];
    n += 1;
  }
  const base = n ? [sr / n, sg / n, sb / n] : [12, 11, 10];
  const w = 720;
  const h = 92;
  const png = blank(w, h);
  const radius = 26;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let dx = 0;
      let dy = 0;
      if (x < radius) dx = radius - x;
      else if (x > w - 1 - radius) dx = x - (w - 1 - radius);
      if (y < radius) dy = radius - y;
      else if (y > h - 1 - radius) dy = y - (h - 1 - radius);
      const dist = Math.hypot(dx, dy);
      if (dist > radius + 1) continue;
      const edge = dist > radius ? clamp(radius + 1 - dist, 0, 1) : 1;
      const lip = y < 4 ? 1.55 : y > h - 8 ? 0.7 : 1;
      const grain = ((x * 3 + y * 5) % 5) - 2;
      set(png, x, y, base[0] * lip + grain, base[1] * lip + grain, base[2] * lip + grain, edge * 255);
    }
  }
  return png;
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const phone = readPng(phonePath);
  const center = refineCenter(phone);
  console.log('dial center', center);
  const dial = dialLayers(phone, center.cx, center.cy);
  writePng(path.join(outDir, 'dial-bezel.png'), dial.bezel);
  writePng(path.join(outDir, 'dial-face-blank.png'), dial.face);
  writePng(path.join(outDir, 'dial-scale-ring-blank.png'), dial.scale);
  writePng(path.join(outDir, 'dial-bearing.png'), dial.bearing);
  writePng(path.join(outDir, 'dial-pointer.png'), dial.pointer);
  writePng(path.join(outDir, 'dial-shadow.png'), dial.shadow);

  const cap = clearCenterGlyph(disk(phone, 190, 346, 50), 0.46, 0.28);
  writePng(path.join(outDir, 'sound-cap.png'), cap);
  writePng(path.join(outDir, 'tuner-cap.png'), cap);
  writePng(path.join(outDir, 'step-cap.png'), cap);

  const seeds = [
    ['tap', 160, 1155, 10, 70, 1096, 250, 1235],
    ['play', 350, 1160, 18, 240, 1088, 470, 1240],
    ['meter', 534, 1155, 12, 460, 1088, 610, 1230],
    ['p', 700, 1148, 12, 610, 1088, 760, 1230],
  ];
  const keys = seeds.map(([name, sx, sy, thr, x0, y0, x1, y1]) => {
    const comp = connected(phone, x0, y0, x1, y1, (x, y, c) => luma(c[0], c[1], c[2]) > thr)
      .filter((item) => item.minX <= sx && sx <= item.maxX && item.minY <= sy && sy <= item.maxY)
      .sort((a, b) => b.n - a.n)[0];
    if (!comp) throw new Error(`missing ${name}`);
    console.log(name, comp.minX, comp.minY, comp.maxX - comp.minX, comp.maxY - comp.minY, comp.n);
    return clearCenterGlyph(maskFrom(phone, comp), 0.42, 0.42);
  });
  const [tap, play, meter, pockt] = keys;
  writePng(path.join(outDir, 'tap-key-blank.png'), tap);
  writePng(path.join(outDir, 'play-key-rest-blank.png'), play);
  writePng(path.join(outDir, 'play-key-pressed-blank.png'), shiftDark(play, 7, 0.72));
  writePng(path.join(outDir, 'meter-key-blank.png'), meter);
  writePng(path.join(outDir, 'p-key-blank.png'), pockt);
  writePng(path.join(outDir, 'beat-cell.png'), meter);
  writePng(path.join(outDir, 'beat-well.png'), roundedWell(tap, 640, 150, 28));
  writePng(path.join(outDir, 'nav-rail.png'), navRail(phone));
  writePng(path.join(outDir, 'chassis.png'), chassisFrom(phone, center.cx, center.cy));
  console.log('wrote', outDir);
}

main();
