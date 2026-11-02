/**
 * Photographic 2.5D dial proof.
 * Hardware plate stays. Engraving annulus is reconstructed. Scale is redrawn.
 */
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { PNG } = require('pngjs');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const scale = require(path.join(root, 'lib', 'pockt-dial-scale.ts'));
const refPath = path.join(root, 'artifacts', '_visual-contract-refs', '01_Dial.png');
const assetDir = path.join(root, 'assets', 'dial-photo-v3');
const outDir = path.join(root, 'artifacts', 'dial-photo-v3-final3');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const fontFile = 'C:\\Windows\\Fonts\\ARIALNB.TTF';
const DIAL_OUTER_RADIUS = 375.5;

const SOURCE = { cx: 470, cy: 802, half: 385 };

function photoConstants() {
  const text = fs.readFileSync(path.join(root, 'lib', 'dial-photo-v3.ts'), 'utf8');
  const constants = {};
  for (const match of text.matchAll(/export const (DIAL_PHOTO_[A-Z_]+) = ([0-9.]+)/g)) {
    constants[match[1]] = Number(match[2]);
  }
  return constants;
}

const PHOTO = photoConstants();

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function extractDial() {
  const src = PNG.sync.read(fs.readFileSync(refPath));
  const size = SOURCE.half * 2;
  const image = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = SOURCE.cx - SOURCE.half + x;
      const sy = SOURCE.cy - SOURCE.half + y;
      const di = (y * size + x) * 4;
      const si = (sy * src.width + sx) * 4;
      image.data[di] = src.data[si];
      image.data[di + 1] = src.data[si + 1];
      image.data[di + 2] = src.data[si + 2];
      image.data[di + 3] = 255;
    }
  }
  return image;
}

function sample(image, x, y) {
  const cx = Math.max(0, Math.min(image.width - 1, Math.round(x)));
  const cy = Math.max(0, Math.min(image.height - 1, Math.round(y)));
  const i = (cy * image.width + cx) * 4;
  return [image.data[i], image.data[i + 1], image.data[i + 2], image.data[i + 3]];
}

function lum(rgb) {
  return rgb[0] * 0.36 + rgb[1] * 0.45 + rgb[2] * 0.19;
}

function buildBlank(source) {
  const size = source.width;
  const cx = size / 2;
  const cy = size / 2;
  const image = new PNG({ width: size, height: size });
  image.data.set(source.data);

  let tip = 120;
  let gap = 0;
  for (let radius = 80; radius < 320; radius++) {
    let bright = false;
    for (let ox = -6; ox <= 6; ox++) {
      if (lum(sample(image, cx + ox, cy - radius)) > 120) bright = true;
    }
    if (bright) {
      tip = radius;
      gap = 0;
    } else if (tip > 150) {
      gap++;
      if (gap >= 3) break;
    }
  }

  const inner = 196;
  const outer = 319;

  function isPointerPixel(x, y, radius) {
    if (radius > tip + 2) return false;
    const dx = x - cx;
    const theta = Math.atan2(dx, cy - y);
    if (Math.abs(theta) > 0.22) return false;
    const half = 5 + Math.max(0, tip + 2 - radius) * 0.15;
    return Math.abs(dx) <= half;
  }
  const steps = 2160;
  const rows = outer - inner + 1;
  const color = new Float32Array(rows * steps * 3);
  const level = new Float32Array(rows * steps);
  const mask = new Uint8Array(rows * steps);

  function polarIndex(radius, step) {
    const wrapped = ((step % steps) + steps) % steps;
    return (radius - inner) * steps + wrapped;
  }

  for (let radius = inner; radius <= outer; radius++) {
    for (let step = 0; step < steps; step++) {
      const theta = (step / steps) * Math.PI * 2;
      const rgb = sample(image, cx + Math.sin(theta) * radius, cy - Math.cos(theta) * radius);
      const index = polarIndex(radius, step);
      color[index * 3] = rgb[0];
      color[index * 3 + 1] = rgb[1];
      color[index * 3 + 2] = rgb[2];
      level[index] = lum(rgb);
    }
  }

  const window = 180;
  for (let radius = inner; radius <= outer; radius++) {
    const hist = new Uint32Array(256);
    let count = 0;
    const push = (step) => {
      hist[Math.max(0, Math.min(255, Math.round(level[polarIndex(radius, step)])))] += 1;
      count++;
    };
    const pull = (step) => {
      hist[Math.max(0, Math.min(255, Math.round(level[polarIndex(radius, step)])))] -= 1;
      count--;
    };
    for (let step = -window; step <= window; step++) push(step);
    for (let step = 0; step < steps; step++) {
      let need = Math.max(1, Math.round(count * 0.4));
      let acc = 0;
      let baseline = 0;
      for (let bin = 0; bin < 256; bin++) {
        acc += hist[bin];
        if (acc >= need) {
          baseline = bin;
          break;
        }
      }
      const index = polarIndex(radius, step);
      const value = level[index];
      const red = color[index * 3];
      const blue = color[index * 3 + 2];
      const warm = red > 42 && red > blue + 12 && value > baseline + 2;
      if (value > baseline + 8 || warm) mask[index] = 1;
      pull(step - window);
      push(step + window + 1);
    }
  }

  const grown = new Uint8Array(mask);
  for (let pass = 0; pass < 2; pass++) {
    const next = new Uint8Array(grown);
    for (let radius = inner; radius <= outer; radius++) {
      for (let step = 0; step < steps; step++) {
        if (grown[polarIndex(radius, step)]) continue;
        let near = 0;
        for (let oy = -2; oy <= 2; oy++) {
          const rr = radius + oy;
          if (rr < inner || rr > outer) continue;
          for (let ox = -5; ox <= 5; ox++) if (grown[polarIndex(rr, step + ox)]) near++;
        }
        if (near >= 3) next[polarIndex(radius, step)] = 1;
      }
    }
    grown.set(next);
  }

  function nearestClean(radius, step, direction) {
    for (let delta = 1; delta < steps / 2; delta++) {
      const index = polarIndex(radius, step + direction * delta);
      if (!grown[index]) return { index, delta };
    }
    return null;
  }

  const donorFor = new Int16Array(rows);
  const donorScore = [];
  for (let radius = inner; radius <= outer; radius++) {
    let dirty = 0;
    for (let step = 0; step < steps; step++) if (grown[polarIndex(radius, step)]) dirty++;
    donorScore[radius] = dirty / steps;
  }
  for (let radius = inner; radius <= outer; radius++) {
    let best = -1;
    let bestDist = 999;
    for (let other = inner; other <= outer; other++) {
      if (donorScore[other] > 0.04) continue;
      const dist = Math.abs(other - radius);
      if (dist < bestDist) {
        bestDist = dist;
        best = other;
      }
    }
    donorFor[radius - inner] = best;
  }

  for (let radius = inner; radius <= outer; radius++) {
    const donor = donorFor[radius - inner];
    for (let step = 0; step < steps; step++) {
      const index = polarIndex(radius, step);
      if (!grown[index]) continue;
      const left = nearestClean(radius, step, -1);
      const right = nearestClean(radius, step, 1);
      let fill = left ? color.slice(left.index * 3, left.index * 3 + 3) : [18, 16, 14];
      if (left && right) {
        const total = left.delta + right.delta || 1;
        fill = [
          (color[left.index * 3] * right.delta + color[right.index * 3] * left.delta) / total,
          (color[left.index * 3 + 1] * right.delta + color[right.index * 3 + 1] * left.delta) / total,
          (color[left.index * 3 + 2] * right.delta + color[right.index * 3 + 2] * left.delta) / total,
        ];
      } else if (right) {
        fill = color.slice(right.index * 3, right.index * 3 + 3);
      }
      if (donor > 0 && !grown[polarIndex(donor, step)]) {
        const donorIndex = polarIndex(donor, step);
        let average = [0, 0, 0];
        let count = 0;
        const span = 4;
        let blocked = false;
        for (let ox = -span; ox <= span; ox++) {
          const di = polarIndex(donor, step + ox);
          if (grown[di]) blocked = true;
          average[0] += color[di * 3];
          average[1] += color[di * 3 + 1];
          average[2] += color[di * 3 + 2];
          count++;
        }
        if (!blocked) {
          fill = [
            fill[0] + (color[donorIndex * 3] - average[0] / count) * 0.8,
            fill[1] + (color[donorIndex * 3 + 1] - average[1] / count) * 0.8,
            fill[2] + (color[donorIndex * 3 + 2] - average[2] / count) * 0.8,
          ];
        }
      }
      color[index * 3] = fill[0];
      color[index * 3 + 1] = fill[1];
      color[index * 3 + 2] = fill[2];
    }
  }

  let painted = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = cy - y;
      const radius = Math.hypot(dx, dy);
      if (radius < inner || radius > outer) continue;
      const theta = Math.atan2(dx, dy);
      if (isPointerPixel(x, y, radius)) continue;
      const step = Math.round(((theta < 0 ? theta + Math.PI * 2 : theta) / (Math.PI * 2)) * steps) % steps;
      const radiusIndex = Math.max(inner, Math.min(outer, Math.round(radius)));
      if (!grown[polarIndex(radiusIndex, step)]) continue;
      const index = polarIndex(radiusIndex, step);
      const i = (y * size + x) * 4;
      image.data[i] = clampByte(color[index * 3]);
      image.data[i + 1] = clampByte(color[index * 3 + 1]);
      image.data[i + 2] = clampByte(color[index * 3 + 2]);
      painted++;
    }
  }

  let remnants = 0;
  for (let y = 2; y < size - 2; y++) {
    for (let x = 2; x < size - 2; x++) {
      const dx = x - cx;
      const dy = cy - y;
      const radius = Math.hypot(dx, dy);
      if (radius < inner || radius > outer) continue;
      const theta = Math.atan2(dx, dy);
      if (isPointerPixel(x, y, radius)) continue;
      const i = (y * size + x) * 4;
      const rgb = [image.data[i], image.data[i + 1], image.data[i + 2]];
      const value = lum(rgb);
      const neighbors = [];
      for (let ox = -3; ox <= 3; ox++) {
        const nx = Math.round(cx + Math.sin(theta + ox * 0.012) * radius);
        const ny = Math.round(cy - Math.cos(theta + ox * 0.012) * radius);
        neighbors.push(lum(sample(image, nx, ny)));
      }
      neighbors.sort((a, b) => a - b);
      const baseline = neighbors[1];
      const warm = rgb[0] > 48 && rgb[0] > rgb[2] + 14;
      if (value > baseline + 9 || (warm && value > baseline + 4)) {
        let left = null;
        let right = null;
        for (let step = 4; step < 80; step++) {
          const delta = step * 0.008;
          if (!left) {
            const candidate = sample(image, cx + Math.sin(theta - delta) * radius, cy - Math.cos(theta - delta) * radius);
            if (lum(candidate) < baseline + 6) left = candidate;
          }
          if (!right) {
            const candidate = sample(image, cx + Math.sin(theta + delta) * radius, cy - Math.cos(theta + delta) * radius);
            if (lum(candidate) < baseline + 6) right = candidate;
          }
          if (left && right) break;
        }
        const fill = left && right ? left.map((channel, index) => (channel + right[index]) / 2) : left || right;
        if (!fill) continue;
        image.data[i] = clampByte(fill[0]);
        image.data[i + 1] = clampByte(fill[1]);
        image.data[i + 2] = clampByte(fill[2]);
        remnants++;
      }
    }
  }

  const edge0 = DIAL_OUTER_RADIUS;
  const edge1 = DIAL_OUTER_RADIUS + 1.8;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const radius = Math.hypot(x - cx, cy - y);
      const t = Math.max(0, Math.min(1, (edge1 - radius) / (edge1 - edge0)));
      const coverage = t * t * (3 - 2 * t);
      const i = (y * size + x) * 4;
      image.data[i + 3] = clampByte(coverage * 255);
    }
  }

  let rgbDrift = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const radius = Math.hypot(x - cx, cy - y);
      if (radius >= inner && radius <= outer) continue;
      const i = (y * size + x) * 4;
      if (
        image.data[i] !== source.data[i] ||
        image.data[i + 1] !== source.data[i + 1] ||
        image.data[i + 2] !== source.data[i + 2]
      ) {
        rgbDrift++;
      }
    }
  }

  console.log('pointer tip', tip, 'annulus', inner, outer, 'painted', painted, 'speck-pass', remnants, 'rgb drift outside annulus', rgbDrift);
  return image;
}

function writePng(file, image) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(image));
}

function scaleCover(image, size) {
  const out = new PNG({ width: size, height: size });
  const scaleX = image.width / size;
  const scaleY = image.height / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const x0 = x * scaleX;
      const y0 = y * scaleY;
      const x1 = (x + 1) * scaleX;
      const y1 = (y + 1) * scaleY;
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      let count = 0;
      for (let sy = Math.floor(y0); sy < y1; sy++) {
        for (let sx = Math.floor(x0); sx < x1; sx++) {
          const rgb = sample(image, sx, sy);
          red += rgb[0];
          green += rgb[1];
          blue += rgb[2];
          alpha += rgb[3];
          count++;
        }
      }
      const i = (y * size + x) * 4;
      out.data[i] = clampByte(red / count);
      out.data[i + 1] = clampByte(green / count);
      out.data[i + 2] = clampByte(blue / count);
      out.data[i + 3] = clampByte(alpha / count);
    }
  }
  return out;
}

function cropZoom(image, originX, originY, width, height, factor) {
  const out = new PNG({ width: width * factor, height: height * factor });
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const rgb = sample(image, originX + Math.floor(x / factor), originY + Math.floor(y / factor));
      const i = (y * out.width + x) * 4;
      out.data[i] = rgb[0];
      out.data[i + 1] = rgb[1];
      out.data[i + 2] = rgb[2];
      out.data[i + 3] = rgb[3];
    }
  }
  return out;
}

function zoomNearest(image, cx, cy, half, factor) {
  const size = half * 2 * factor;
  const out = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const rgb = sample(image, cx - half + Math.floor(x / factor), cy - half + Math.floor(y / factor));
      const i = (y * size + x) * 4;
      out.data[i] = rgb[0];
      out.data[i + 1] = rgb[1];
      out.data[i + 2] = rgb[2];
      out.data[i + 3] = rgb[3];
    }
  }
  return out;
}

function checkerComposite(image) {
  const out = new PNG({ width: image.width, height: image.height });
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4;
      const alpha = image.data[i + 3] / 255;
      const check = ((x >> 3) ^ (y >> 3)) & 1 ? 236 : 28;
      const tint = ((x >> 3) ^ (y >> 3)) & 1 ? 228 : 36;
      out.data[i] = clampByte(image.data[i] * alpha + check * (1 - alpha));
      out.data[i + 1] = clampByte(image.data[i + 1] * alpha + tint * (1 - alpha));
      out.data[i + 2] = clampByte(image.data[i + 2] * alpha + (check === 236 ? 210 : 48) * (1 - alpha));
      out.data[i + 3] = 255;
    }
  }
  return out;
}

function worldTheta(mark, bpm) {
  return scale.angleFromDialBpm(mark) - scale.angleFromDialBpm(bpm);
}

function overlaySpec(bpm) {
  const markSet = new Set(scale.DIAL_MARKS);
  for (let mark = scale.DIAL_MIN_BPM; mark <= scale.DIAL_MAX_BPM; mark += 2) markSet.add(mark);
  const ticks = [...markSet].sort((left, right) => left - right).map((mark) => ({
    theta: worldTheta(mark, bpm),
    level: scale.DIAL_MARKS.includes(mark) ? 'major' : mark % 10 === 0 ? 'mid' : 'minor',
  }));
  const marks = scale.DIAL_MARKS.map((mark) => ({
    label: String(mark),
    theta: worldTheta(mark, bpm),
    primary: Math.abs(worldTheta(mark, bpm)) < 0.14,
  }));
  return { ticks, marks };
}

function proofHtml(bpm, size, fontData) {
  const spec = overlaySpec(bpm);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @font-face { font-family: PocktDial; src: url(data:font/ttf;base64,${fontData}); }
  html, body { margin: 0; background: #000; }
  .row { width: ${size}px; height: ${size}px; position: relative; }
  #white { background: #fff; }
  canvas { width: ${size}px; height: ${size}px; display: block; }
</style></head>
<body>
<div class="row" id="black"><canvas id="ink-black" width="${size}" height="${size}"></canvas></div>
<div class="row" id="white"><canvas id="ink-white" width="${size}" height="${size}"></canvas></div>
<script>
const ticks = ${JSON.stringify(spec.ticks)};
const marks = ${JSON.stringify(spec.marks)};
const size = ${size};
const outer = size * ${PHOTO.DIAL_PHOTO_TICK_OUTER};
const lengths = { major: ${PHOTO.DIAL_PHOTO_MAJOR_LENGTH}, mid: ${PHOTO.DIAL_PHOTO_MID_LENGTH}, minor: ${PHOTO.DIAL_PHOTO_MINOR_LENGTH} };
const widths = { major: ${PHOTO.DIAL_PHOTO_MAJOR_WIDTH}, mid: ${PHOTO.DIAL_PHOTO_MID_WIDTH}, minor: ${PHOTO.DIAL_PHOTO_MINOR_WIDTH} };
const inks = {
  major: 'rgba(248,224,190,0.96)',
  mid: 'rgba(236,212,176,0.9)',
  minor: 'rgba(224,200,166,0.82)'
};
function draw(canvas) {
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  ctx.lineCap = 'butt';
  for (const tick of ticks) {
    const length = size * lengths[tick.level];
    const width = Math.max(0.6, size * widths[tick.level]);
    const inner = outer - length;
    const x0 = cx + Math.sin(tick.theta) * inner;
    const y0 = cy - Math.cos(tick.theta) * inner;
    const x1 = cx + Math.sin(tick.theta) * outer;
    const y1 = cy - Math.cos(tick.theta) * outer;
    ctx.strokeStyle = 'rgba(8,6,4,0.72)';
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0 + 0.35, y0 + 0.55);
    ctx.lineTo(x1 + 0.35, y1 + 0.55);
    ctx.stroke();
    ctx.strokeStyle = inks[tick.level];
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const numeralRadius = size * ${PHOTO.DIAL_PHOTO_NUMERAL_RADIUS};
  for (const mark of marks) {
    const x = cx + Math.sin(mark.theta) * numeralRadius;
    const y = cy - Math.cos(mark.theta) * numeralRadius;
    const fontSize = size * (mark.primary ? ${PHOTO.DIAL_PHOTO_PRIMARY_SIZE} : ${PHOTO.DIAL_PHOTO_NUMERAL_SIZE});
    ctx.font = '600 ' + fontSize + 'px PocktDial, "Arial Narrow", sans-serif';
    ctx.fillStyle = 'rgba(6,4,2,0.82)';
    ctx.fillText(mark.label, x + size * 0.0013, y + size * 0.0018);
    ctx.fillStyle = mark.primary ? 'rgba(252,232,198,0.98)' : 'rgba(236,214,180,0.86)';
    ctx.fillText(mark.label, x, y);
    ctx.fillStyle = mark.primary ? 'rgba(255,246,230,0.14)' : 'rgba(255,246,230,0.07)';
    ctx.fillText(mark.label, x, y - size * 0.0006);
  }
}
draw(document.getElementById('ink-black'));
draw(document.getElementById('ink-white'));
</script>
</body></html>`;
}

function startServer() {
  let html = '';
  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });
  server.setHtml = (value) => {
    html = value;
  };
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function shoot(server, file, width, height) {
  return new Promise((resolve, reject) => {
    const url = `http://127.0.0.1:${server.address().port}/`;
    const child = spawn(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${width},${height}`,
      `--screenshot=${file}`,
      url,
    ], { stdio: 'ignore' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('chrome ' + code))));
  });
}

function splitInk(sheet, size) {
  const black = new PNG({ width: size, height: size });
  const white = new PNG({ width: size, height: size });
  PNG.bitblt(sheet, black, 0, 0, size, size, 0, 0);
  PNG.bitblt(sheet, white, 0, size, size, size, 0, 0);
  const ink = new PNG({ width: size, height: size });
  for (let i = 0; i < ink.data.length; i += 4) {
    let alpha = 0;
    for (let channel = 0; channel < 3; channel++) {
      const recovered = 1 - (white.data[i + channel] - black.data[i + channel]) / 255;
      if (recovered > alpha) alpha = recovered;
    }
    alpha = Math.max(0, Math.min(1, alpha));
    ink.data[i + 3] = clampByte(alpha * 255);
    if (alpha > 0.004) {
      for (let channel = 0; channel < 3; channel++) {
        ink.data[i + channel] = clampByte(black.data[i + channel] / alpha);
      }
    }
  }
  return ink;
}

function composite(plate, ink) {
  const out = new PNG({ width: ink.width, height: ink.height });
  for (let i = 0; i < out.data.length; i += 4) {
    const inkAlpha = ink.data[i + 3] / 255;
    const plateAlpha = plate.data[i + 3] / 255;
    const alpha = inkAlpha + plateAlpha * (1 - inkAlpha);
    out.data[i + 3] = clampByte(alpha * 255);
    if (alpha < 0.004) continue;
    for (let channel = 0; channel < 3; channel++) {
      const mixed = ink.data[i + channel] * inkAlpha + plate.data[i + channel] * plateAlpha * (1 - inkAlpha);
      out.data[i + channel] = clampByte(mixed / alpha);
    }
  }
  return out;
}

function sideBySide(reference, proof) {
  const gap = 16;
  const canvas = new PNG({ width: reference.width + proof.width + gap, height: reference.height });
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      canvas.data[i] = 18;
      canvas.data[i + 1] = 16;
      canvas.data[i + 2] = 14;
      canvas.data[i + 3] = 255;
    }
  }
  function blit(src, dx) {
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const si = (y * src.width + x) * 4;
        const alpha = src.data[si + 3] / 255;
        const di = (y * canvas.width + dx + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          canvas.data[di + channel] = clampByte(src.data[si + channel] * alpha + canvas.data[di + channel] * (1 - alpha));
        }
      }
    }
  }
  blit(reference, 0);
  blit(proof, reference.width + gap);
  return canvas;
}

async function capture(server, plate, fontData, bpm, size) {
  server.setHtml(proofHtml(bpm, size, fontData));
  const sheetFile = path.join(os.tmpdir(), `pockt-dial-ink-${size}-${bpm}.png`);
  await shoot(server, sheetFile, size, size * 2);
  const sheet = PNG.sync.read(fs.readFileSync(sheetFile));
  if (sheet.width < size || sheet.height < size * 2) {
    throw new Error(`chrome sheet ${sheet.width}x${sheet.height} expected ${size}x${size * 2}`);
  }
  const trimmed = new PNG({ width: size, height: size * 2 });
  PNG.bitblt(sheet, trimmed, 0, 0, size, size * 2, 0, 0);
  return composite(scaleCover(plate, size), splitInk(trimmed, size));
}

function annulusStrip(image, r0, r1) {
  const steps = 2160;
  const scaleY = 2;
  const rows = r1 - r0 + 1;
  const out = new PNG({ width: steps, height: rows * scaleY });
  const cx = image.width / 2;
  const cy = image.height / 2;
  for (let radius = r0; radius <= r1; radius++) {
    for (let step = 0; step < steps; step++) {
      const theta = (step / steps) * Math.PI * 2;
      const rgb = sample(image, cx + Math.sin(theta) * radius, cy - Math.cos(theta) * radius);
      for (let repeat = 0; repeat < scaleY; repeat++) {
        const i = (((radius - r0) * scaleY + repeat) * steps + step) * 4;
        out.data[i] = rgb[0];
        out.data[i + 1] = rgb[1];
        out.data[i + 2] = rgb[2];
        out.data[i + 3] = 255;
      }
    }
  }
  return out;
}

async function main() {
  fs.mkdirSync(assetDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  const original = extractDial();
  const blank = buildBlank(original);
  const blankFile = path.join(assetDir, 'dial-base-blank.png');
  writePng(blankFile, blank);
  writePng(path.join(outDir, 'dial-base-blank.png'), blank);
  const blankDetail = zoomNearest(blank, 385, 150, 120, 3);
  writePng(path.join(outDir, 'blank-ring-detail.png'), blankDetail);
  writePng(path.join(outDir, 'ring-cleanliness-strip.png'), annulusStrip(blank, 196, 320));
  writePng(path.join(outDir, 'blank-dial-checker.png'), checkerComposite(blank));
  if (process.argv[2] === 'blank') return;

  const fontData = fs.readFileSync(fontFile).toString('base64');
  const server = await startServer();
  const shots = [
    ['dial-20-320.png', 20, 320],
    ['dial-40-320.png', 40, 320],
    ['dial-120-320.png', 120, 320],
    ['dial-260-320.png', 260, 320],
    ['dial-400-320.png', 400, 320],
    ['dial-120-390.png', 120, 390],
    ['midturn-a.png', 90, 320],
    ['midturn-b.png', 150, 320],
    ['midturn-c.png', 230, 320],
    ['engraving-source.png', 120, 640],
  ];
  const rendered = {};
  for (const [name, bpm, size] of shots) {
    rendered[name] = await capture(server, blank, fontData, bpm, size);
    writePng(path.join(outDir, name), rendered[name]);
    console.log('wrote', name);
  }
  writePng(path.join(outDir, 'proof-dial-320.png'), rendered['dial-120-320.png']);

  const motionNames = [];
  const motionImages = [];
  for (let index = 0; index < 12; index++) {
    const frame = await capture(server, blank, fontData, 40 + index * 28, 180);
    motionImages.push(frame);
    motionNames.push(index);
  }
  const strip = new PNG({ width: 180 * motionImages.length, height: 180 });
  motionImages.forEach((frame, index) => PNG.bitblt(frame, strip, 0, 0, 180, 180, index * 180, 0));
  writePng(path.join(outDir, 'dial-motion-strip.png'), strip);
  console.log('wrote dial-motion-strip.png', motionNames.length);

  const reference = scaleCover(original, 320);
  const referenceMasked = new PNG({ width: 320, height: 320 });
  const proof = rendered['dial-120-320.png'];
  for (let i = 0; i < referenceMasked.data.length; i += 4) {
    referenceMasked.data[i] = reference.data[i];
    referenceMasked.data[i + 1] = reference.data[i + 1];
    referenceMasked.data[i + 2] = reference.data[i + 2];
    referenceMasked.data[i + 3] = proof.data[i + 3] > 8 || reference.data[i + 3] ? proof.data[i + 3] : 0;
  }
  // The reference extract is opaque. Use the proof alpha so both dials share one diameter.
  for (let i = 3; i < referenceMasked.data.length; i += 4) referenceMasked.data[i] = proof.data[i];
  writePng(path.join(outDir, 'reference-dial-320.png'), referenceMasked);
  writePng(path.join(outDir, 'reference-vs-proof-320.png'), sideBySide(referenceMasked, proof));

  const engraving = rendered['engraving-source.png'];
  const engravingDetail = zoomNearest(engraving, 320, 118, 90, 2);
  writePng(path.join(outDir, 'engraving-detail.png'), engravingDetail);

  fs.unlinkSync(path.join(outDir, 'engraving-source.png'));
  server.close();
  console.log('proof complete');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
