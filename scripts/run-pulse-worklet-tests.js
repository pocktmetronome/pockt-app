'use strict';

/**
 * Fails if a Pulse UI-runtime worklet synchronously calls a helper that is
 * not marked `'worklet'`. That is the Build 97 SIGABRT class:
 * Hermes throwPendingError on the main-thread gesture path.
 */

const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const failures = [];
function check(name, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

const BUILTIN_CALLEES = new Set([
  'Math',
  'Number',
  'String',
  'Boolean',
  'parseInt',
  'parseFloat',
  'isFinite',
  'isNaN',
  'performance',
  'Date',
  'Object',
  'Array',
  'Error',
  'Promise',
  'JSON',
  'console',
  'runOnJS',
  'withTiming',
  'interpolate',
  'Easing',
  'reportPulseWorkletError',
]);

const RUNTIME_MODULES = new Set(['react-native-reanimated', 'react-native-gesture-handler', 'react-native-worklets']);

function parseImports(source) {
  const map = new Map();
  const re =
    /import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = re.exec(source))) {
    const spec = match[3];
    if (match[1]) {
      for (const raw of match[1].split(',')) {
        const part = raw.trim();
        if (!part || part.startsWith('type ')) continue;
        const alias = part.split(/\s+as\s+/);
        const imported = (alias[0] || '').trim();
        const local = (alias[1] || alias[0] || '').trim();
        if (imported && local) map.set(local, { imported, spec });
      }
    } else if (match[2]) {
      map.set(match[2], { imported: match[2], spec });
    }
  }
  return map;
}

function specToRel(spec) {
  if (spec.startsWith('@/')) return spec.slice(2);
  return null;
}

function extractParens(source, openIndex) {
  if (source[openIndex] !== '(') return '';
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, i);
    }
  }
  throw new Error('unbalanced parens');
}

function extractBalanced(source, openIndex) {
  if (source[openIndex] !== '{') return '';
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, i);
    }
  }
  throw new Error('unbalanced braces');
}

function findBlockArrowsInCalls(source, label) {
  const bodies = [];
  const needle = `${label}(`;
  let from = 0;
  while (from < source.length) {
    const at = source.indexOf(needle, from);
    if (at < 0) break;
    const open = at + needle.length - 1;
    const call = extractParens(source, open);
    let innerFrom = 0;
    while (innerFrom < call.length) {
      const arrow = call.indexOf('=>', innerFrom);
      if (arrow < 0) break;
      let i = arrow + 2;
      while (i < call.length && /\s/.test(call[i])) i += 1;
      if (call[i] === '{') bodies.push(extractBalanced(call, i));
      innerFrom = arrow + 2;
    }
    from = at + needle.length;
  }
  return bodies;
}

function collectDirectCalls(body) {
  const names = new Set();
  const re = /(?<![.\w])([A-Za-z_$][\w$]*)\s*\(/g;
  let match;
  while ((match = re.exec(body))) names.add(match[1]);
  return names;
}

function runOnJsTargets(body) {
  const names = new Set();
  const re = /runOnJS\(\s*([A-Za-z_$][\w$]*)\s*\)/g;
  let match;
  while ((match = re.exec(body))) names.add(match[1]);
  return names;
}

function functionHasWorklet(source, functionName) {
  const start = source.search(new RegExp(`(?:export\\s+)?function\\s+${functionName}\\s*\\(`));
  if (start < 0) return false;
  const window = source.slice(start, start + 600);
  return /\{\s*['"]worklet['"]\s*;/.test(window);
}

const pulseRoom = read('components/classic/PulseRoom.tsx');
const pulseCommit = read('lib/pulse-commit.ts');
const pulseMath = read('lib/pulse-math.ts');
const pulseVisual = read('lib/pulse-visual.ts');
const imports = parseImports(pulseRoom);

const tempoStart = pulseRoom.indexOf('function TempoDot');
const tempoEnd = pulseRoom.search(/\n(?:export\s+)?function PulseCore/);
assert(tempoStart >= 0 && tempoEnd > tempoStart, 'TempoDot block exists');
const tempoDot = pulseRoom.slice(tempoStart, tempoEnd);

check('Build 97 illegal pulse-commit helpers are now worklets', () => {
  for (const name of ['pulseShouldCommitStep', 'pulseDetentDue', 'pulseFlushDue']) {
    assert(functionHasWorklet(pulseCommit, name), `${name} must start with 'worklet'`);
  }
  assert(!functionHasWorklet(pulseCommit, 'pulseFinalBpm'), 'pulseFinalBpm stays on JS; it is not a gesture helper');
  assert(!functionHasWorklet(pulseCommit, 'simulatePulseRapidRotation'), 'simulation stays on JS');
});

check('Build 69 pulse gesture hops BPM and play to JS', () => {
  assert(tempoDot.includes('runOnJS(commit)'), 'tempo commits stay on JS');
  assert(tempoDot.includes('runOnJS(onToggle)'), 'play stays on JS');
  assert(!tempoDot.includes('PocktTiming.'), 'gesture worklets must not call the timing engine');
  assert(!tempoDot.includes('setInterval'), 'no Pulse JS musical timer');
});

const gestureLabels = ['.onTouchesDown', '.onBegin', '.onUpdate', '.onFinalize', '.onEnd'];
const extraLabels = ['useAnimatedStyle', 'useAnimatedReaction'];
const bodies = [];
for (const label of [...gestureLabels, ...extraLabels]) {
  bodies.push(...findBlockArrowsInCalls(pulseRoom, label));
}

check('PulseRoom UI-runtime callbacks were found', () => {
  assert(findBlockArrowsInCalls(tempoDot, '.onTouchesDown').length === 1, 'onTouchesDown');
  assert(findBlockArrowsInCalls(tempoDot, '.onBegin').length === 1, 'onBegin');
  assert(findBlockArrowsInCalls(tempoDot, '.onUpdate').length === 1, 'onUpdate');
  assert(findBlockArrowsInCalls(tempoDot, '.onFinalize').length === 1, 'onFinalize');
  assert(findBlockArrowsInCalls(tempoDot, '.onEnd').length === 1, 'tap onEnd');
  assert(findBlockArrowsInCalls(pulseRoom, 'useAnimatedReaction').length >= 1, 'wave reaction');
  assert(bodies.length >= 6, `expected gesture + animated callbacks, got ${bodies.length}`);
});

check('every synchronous Pulse UI-runtime helper is worklet-safe', () => {
  const cache = new Map();
  cache.set('reportPulseWorkletError', { ok: functionHasWorklet(pulseRoom, 'reportPulseWorkletError'), from: 'PulseRoom' });
  const illegal = [];
  for (const body of bodies) {
    const hops = runOnJsTargets(body);
    for (const name of collectDirectCalls(body)) {
      if (BUILTIN_CALLEES.has(name)) continue;
      if (hops.has(name)) continue;
      if (name === 'try' || name === 'catch' || name === 'if' || name === 'for' || name === 'while' || name === 'switch') continue;
      const imported = imports.get(name);
      if (!imported) {
        if (name === 'reportPulseWorkletError') {
          if (!cache.get(name).ok) illegal.push(`${name} in PulseRoom lacks 'worklet'`);
          continue;
        }
        continue;
      }
      if (RUNTIME_MODULES.has(imported.spec) || imported.spec.startsWith('react-native')) continue;
      const rel = specToRel(imported.spec);
      if (!rel) {
        illegal.push(`${name} from ${imported.spec} is not a worklet-safe runtime import`);
        continue;
      }
      const key = `${rel}#${imported.imported}`;
      if (!cache.has(key)) {
        const file = `${rel}.ts`;
        const tsx = `${rel}.tsx`;
        const source = fs.existsSync(path.join(__dirname, '..', file))
          ? read(file)
          : fs.existsSync(path.join(__dirname, '..', tsx))
            ? read(tsx)
            : '';
        cache.set(key, {
          ok: source ? functionHasWorklet(source, imported.imported) : false,
          from: rel,
        });
      }
      if (!cache.get(key).ok) illegal.push(`${name} from ${imported.spec} is called on the UI runtime without 'worklet'`);
    }
  }
  assert(illegal.length === 0, illegal.join('; ') || 'illegal calls');
});

check('known Pulse math helpers used on UI runtime stay worklets', () => {
  for (const name of [
    'wrapDelta',
    'pulseBpmToTurns',
    'pulseTurnsToBpm',
    'pulseTurnsToAngle',
    'isPulseTrackHit',
    'isPulseDotHit',
    'pulseTrackRadii',
  ]) {
    assert(functionHasWorklet(pulseMath, name), `${name} must remain a worklet`);
  }
  assert(functionHasWorklet(pulseVisual, 'pulseRingStrength'), 'pulseRingStrength must remain a worklet');
});

if (failures.length) {
  console.error('PULSE WORKLET TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('PULSE WORKLET TESTS PASSED');
console.log('gesture helpers are worklet-safe; runOnJS owns native BPM/detent/play; UI throws are logged');
