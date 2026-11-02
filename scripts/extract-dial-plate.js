const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const src = PNG.sync.read(fs.readFileSync(path.join(root, 'artifacts/dial-targeted-fidelity/_reference.png')));
const SW = src.width;

function pix(x, y) {
  const i = (y * SW + x) * 4;
  return [src.data[i], src.data[i + 1], src.data[i + 2]];
}

const cx = 234;
const cy = 450;
const R = 224;
const size = R * 2 + 1;
const plate = new PNG({ width: size, height: size });

function atRadius(dist, ang) {
  const x = Math.round(cx + Math.cos(ang) * dist);
  const y = Math.round(cy + Math.sin(ang) * dist);
  if (x < 0 || y < 0 || x >= SW || y >= src.height) return [20, 20, 22];
  return pix(x, y);
}

for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const dx = x - R;
    const dy = y - R;
    const dist = Math.hypot(dx, dy);
    const i = (y * size + x) * 4;
    if (dist > R) {
      plate.data[i + 3] = 0;
      continue;
    }
    const ang = Math.atan2(dy, dx);
    let color;
    const source = dist <= R ? pix(cx + dx, cy + dy) : [0, 0, 0];
    const warm = source[0] > source[2] + 16 && source[0] + source[1] + source[2] > 280;
    if (dist < 28) {
      color = atRadius(46, ang);
    } else if (warm && Math.abs(dx) <= 8 && dy < -16 && dy > -194) {
      const left = pix(cx - 14, cy + dy);
      const right = pix(cx + 14, cy + dy);
      color = left.map((v, k) => (v + right[k]) >> 1);
    } else if (warm && Math.abs(dx) <= 8 && dy > 14 && dy < 60) {
      const left = pix(cx - 14, cy + dy);
      const right = pix(cx + 14, cy + dy);
      color = left.map((v, k) => (v + right[k]) >> 1);
    } else {
      const [r, g, b] = pix(cx + dx, cy + dy);
      const sum = r + g + b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (dist > 145 && dist < 214 && sum > 430 && chroma < 55) {
        let donor = null;
        for (const step of [0.08, -0.08, 0.14, -0.14, 0.2, -0.2]) {
          const sample = atRadius(dist, ang + step);
          const sl = sample[0] + sample[1] + sample[2];
          const sc = Math.max(...sample) - Math.min(...sample);
          if (sl < 280 && sc < 40) {
            donor = sample;
            break;
          }
        }
        color = donor || [r, g, b];
      } else {
        color = [r, g, b];
      }
    }
    plate.data[i] = color[0];
    plate.data[i + 1] = color[1];
    plate.data[i + 2] = color[2];
    plate.data[i + 3] = 255;
  }
}

const center = R;
for (let pass = 0; pass < 3; pass++) {
  const next = Buffer.from(plate.data);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.hypot(dx, dy);
      if (dist < 148 || dist > 216) continue;
      const i = (y * size + x) * 4;
      const sum = plate.data[i] + plate.data[i + 1] + plate.data[i + 2];
      const ang = Math.atan2(dy, dx);
      const samples = [];
      for (const step of [-0.16, -0.1, 0.1, 0.16]) {
        const sx = Math.round(center + Math.cos(ang + step) * dist);
        const sy = Math.round(center + Math.sin(ang + step) * dist);
        if (sx < 0 || sy < 0 || sx >= size || sy >= size) continue;
        const j = (sy * size + sx) * 4;
        samples.push([plate.data[j], plate.data[j + 1], plate.data[j + 2]]);
      }
      if (samples.length < 3) continue;
      samples.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
      const mid = samples[Math.floor(samples.length / 2)];
      const midSum = mid[0] + mid[1] + mid[2];
      if (sum > midSum + 18) {
        next[i] = mid[0];
        next[i + 1] = mid[1];
        next[i + 2] = mid[2];
      }
    }
  }
  plate.data = next;
}

const MARKS = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400];
function markAngle(bpm) {
  if (bpm <= 120) {
    const t = (bpm - 20) / 100;
    return (-130 * Math.PI) / 180 + t * ((130 * Math.PI) / 180);
  }
  const t = (bpm - 120) / 280;
  return t * ((140 * Math.PI) / 180);
}
for (const mark of MARKS) {
  const theta = markAngle(mark);
  for (let dist = 166; dist <= 208; dist++) {
    for (let da = -0.16; da <= 0.16; da += 0.012) {
      const x = Math.round(center + Math.sin(theta + da) * dist);
      const y = Math.round(center - Math.cos(theta + da) * dist);
      if (x < 1 || y < 1 || x >= size - 1 || y >= size - 1) continue;
      const ang = Math.atan2(y - center, x - center);
      const sx = Math.round(center + Math.cos(ang) * 146);
      const sy = Math.round(center + Math.sin(ang) * 146);
      const i = (y * size + x) * 4;
      const j = (sy * size + sx) * 4;
      plate.data[i] = plate.data[j];
      plate.data[i + 1] = plate.data[j + 1];
      plate.data[i + 2] = plate.data[j + 2];
    }
  }
}

const outDir = path.join(root, 'artifacts/dial-targeted-fidelity');
fs.writeFileSync(path.join(outDir, '_plate.png'), PNG.sync.write(plate));

const hubR = 22;
const hub = new PNG({ width: hubR * 2 + 1, height: hubR * 2 + 1 });
for (let y = 0; y < hub.height; y++) {
  for (let x = 0; x < hub.width; x++) {
    const dx = x - hubR;
    const dy = y - hubR;
    const dist = Math.hypot(dx, dy);
    const i = (y * hub.width + x) * 4;
    if (dist > hubR) {
      hub.data[i + 3] = 0;
      continue;
    }
    let [r, g, b] = pix(cx + dx, cy + dy);
    const onShaft = Math.abs(dx) <= 2 && Math.abs(dy) > 12 && r > b + 18;
    if (onShaft) {
      const side = pix(cx + dx + (dx >= 0 ? 5 : -5), cy + dy);
      r = side[0];
      g = side[1];
      b = side[2];
    }
    hub.data[i] = r;
    hub.data[i + 1] = g;
    hub.data[i + 2] = b;
    hub.data[i + 3] = 255;
  }
}
fs.writeFileSync(path.join(outDir, '_hub.png'), PNG.sync.write(hub));

const tx = 386;
const ty = 692;
const tw = 52;
const th = 42;
const toggle = new PNG({ width: tw, height: th });
const rad = 10;
for (let y = 0; y < th; y++) {
  for (let x = 0; x < tw; x++) {
    const insetX = x < rad ? rad : x > tw - rad ? tw - rad : x;
    const insetY = y < rad ? rad : y > th - rad ? th - rad : y;
    const inside = (x - insetX) ** 2 + (y - insetY) ** 2 <= rad * rad;
    const i = (y * tw + x) * 4;
    if (!inside) {
      toggle.data[i + 3] = 0;
      continue;
    }
    const [r, g, b] = pix(tx + x, ty + y);
    const amber = r > 150 && r > b + 40 && g > 70 && g < 200;
    if (amber) {
      toggle.data[i] = 18;
      toggle.data[i + 1] = 16;
      toggle.data[i + 2] = 14;
    } else {
      toggle.data[i] = r;
      toggle.data[i + 1] = g;
      toggle.data[i + 2] = b;
    }
    toggle.data[i + 3] = 255;
  }
}
fs.writeFileSync(path.join(outDir, '_toggle.png'), PNG.sync.write(toggle));
console.log('plate', size, 'hub', hub.width, 'toggle', tw, th);
