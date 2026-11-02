/**
 * Offline stress for the JS mirror of the sample timeline and the audio lane.
 * This does not play audio and does not prove device timing.
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');

async function load(rel) {
  const file = path.join(__dirname, '..', rel);
  return import(pathToFileURL(file).href);
}

async function main() {
  const math = await load('lib/native-transport-math.ts');
  const lane = await load('lib/audio-ownership.ts');
  const phrase = await load('lib/phrase-deck.ts');
  const rate = 48000;
  const bpms = [20, 30, 40, 60, 96, 120, 160, 200, 260, 320, 400];
  const meters = [1, 2, 3, 4, 5, 6, 7, 8, 12];
  const failures = [];
  const tempoRows = [];

  for (const bpm of bpms) {
    for (const ticks of meters) {
      const report = math.constantTempoReport({
        bpm,
        sampleRate: rate,
        beatCount: 2400,
        ticksPerBeat: ticks,
      });
      if (!report.passed) failures.push(`constant ${bpm} x${ticks}`);
      if (ticks === 1) tempoRows.push(report);
    }
  }

  let segments = [math.initialSegment(20)];
  let last = 0;
  for (let i = 0; i < 1000; i += 1) {
    const bpm = i % 2 === 0 ? 400 : 20;
    segments = math.applyTempo(segments, last, bpm, 1, rate);
    last += 1;
    const before = math.sampleForTick(last, segments, rate);
    const after = math.sampleForTick(last + 1, segments, rate);
    if (after <= before) failures.push(`mutation ${i}`);
  }
  const swing = math.phaseChangeReport({
    fromBpm: 20,
    toBpm: 400,
    changeAfterBeats: 8,
    sampleRate: rate,
  });
  const back = math.phaseChangeReport({
    fromBpm: 400,
    toBpm: 20,
    changeAfterBeats: 8,
    sampleRate: rate,
  });
  if (!swing.passed) failures.push('20->400');
  if (!back.passed) failures.push('400->20');

  let mode = 'IDLE';
  let token = lane.audioGeneration();
  for (let i = 0; i < 1000; i += 1) {
    mode = lane.nextAudioMode(mode, 'play');
    token = lane.commitAudioMode(mode);
    mode = lane.nextAudioMode(mode, 'stop');
    if (!lane.commitAudioModeIf(token, mode)) failures.push(`stale stop ${i}`);
    token = lane.audioGeneration();
    if (lane.audioMode() !== 'IDLE') failures.push(`play-stop ${i}`);
  }
  for (let i = 0; i < 200; i += 1) {
    mode = lane.nextAudioMode(lane.audioMode(), 'enterTuner');
    lane.commitAudioMode(mode);
    mode = lane.nextAudioMode(lane.audioMode(), 'exitTuner');
    lane.commitAudioMode(mode);
    mode = lane.nextAudioMode(lane.audioMode(), 'enterRecorder');
    lane.commitAudioMode(mode);
    mode = lane.nextAudioMode(lane.audioMode(), 'exitRecorder');
    lane.commitAudioMode(mode);
    if (lane.audioMode() !== 'IDLE') failures.push(`capture loop ${i}`);
  }
  const stale = lane.audioGeneration();
  lane.commitAudioMode('PLAYBACK');
  if (lane.commitAudioModeIf(stale, 'IDLE')) failures.push('stale token overwrote playback');

  let deck = phrase.createPhraseDeck();
  for (let i = 0; i < 1000; i += 1) {
    deck = phrase.phrasePress(deck, 'tap').deck;
    deck = phrase.phrasePress(deck, 'tap').deck;
    deck = phrase.phrasePress(deck, 'clear').deck;
    if (deck.phase !== 'idle' || deck.hasTake) failures.push(`phrase ${i}`);
  }

  const out = {
    passed: failures.length === 0,
    failures: failures.slice(0, 20),
    failureCount: failures.length,
    sampleRate: rate,
    architecture: math.TRANSPORT_ARCHITECTURE,
    tempo: tempoRows.map((row) => ({
      bpm: row.bpm,
      intervalMs: Number(row.theoreticalIntervalMs.toFixed(4)),
      maxErrorMs: Number((row.maxErrorSeconds * 1000).toFixed(6)),
      driftMs: Number((row.cumulativeDriftSeconds * 1000).toFixed(6)),
      events: row.scheduledEventCount,
      passed: row.passed,
    })),
    mutations: 1000,
    playStop: 1000,
    phraseLoops: 1000,
    note: 'Scheduled sample positions only. Rendered audio, host time, and device drift were not measured.',
  };
  const dir = path.join(__dirname, '..', 'artifacts', 'quality-9');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'stress-results.json'), JSON.stringify(out, null, 2));
  console.log(out.passed ? 'quality-9 stress passed' : `quality-9 stress failed ${out.failureCount}`);
  if (!out.passed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
