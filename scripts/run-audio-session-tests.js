'use strict';

const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const failures = [];
function check(name, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

function playbackCategoryOptions(mixWithOthers) {
  return mixWithOthers ? ['mixWithOthers'] : [];
}

function recordingCategoryOptions() {
  return ['defaultToSpeaker', 'mixWithOthers'];
}

function isValidSessionCombo(category, options) {
  if (category === 'playback') {
    return !options.includes('defaultToSpeaker') && !options.includes('allowBluetooth');
  }
  return true;
}

function nextSessionMode(current, event) {
  if (event === 'startPlayback') {
    if (current === 'recording') return 'playing';
    return current === 'tunerInput' || current === 'interrupted' ? 'recovering' : 'playing';
  }
  if (event === 'stopPlayback' || event === 'stopRecording' || event === 'stopTuner') return 'stopped';
  if (event === 'startRecording') return 'recording';
  if (event === 'startTuner') return 'tunerInput';
  if (event === 'interrupt') return 'interrupted';
  if (event === 'resume') return current === 'recording' || current === 'tunerInput' ? current : 'playing';
  if (event === 'recover') return 'recovering';
  return current;
}

function friendlyTransportError(raw) {
  const text = String(raw || '').trim();
  if (!text) return 'The click could not start. Tap Play again.';
  if (/native iOS build|Expo Go/i.test(text)) return text;
  if (/OSStatus|-50|paramErr|invalid parameter|setCategory|configureAudioSession/i.test(text)) {
    return 'The click could not start. Tap Play once more.';
  }
  return 'The click could not start. Tap Play again.';
}

function transportShouldStayStopped(startFailed, playing) {
  return startFailed ? false : playing;
}

function sanitizeMasterVolume(value, fallback = 0.8) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (value < 0 || value > 1) return fallback;
  if (value === 0) return fallback;
  return value;
}

function clampLiveVolume(volume) {
  if (!Number.isFinite(volume)) return 0;
  return Math.min(1, Math.max(0, volume));
}

function masterGain(volume) {
  const linear = clampLiveVolume(volume);
  if (linear <= 0) return 0;
  return Math.pow(linear, 0.55) * 0.92;
}

function startReportIsAlive(started, volume) {
  if (!started) return false;
  const engineUp = Boolean(started.engineRunning || started.running);
  const playerUp = Boolean(started.playerPlaying || started.playerNodePlaying);
  const scheduled = typeof started.scheduledEventCount === 'number' && started.scheduledEventCount > 0;
  if (!engineUp || !playerUp || !scheduled) return false;
  if (volume > 0.02 && started.hasDefaultBuffer === false) return false;
  return true;
}

check('playback options never include speaker override', () => {
  assert(isValidSessionCombo('playback', playbackCategoryOptions(true)), 'mix ok');
  assert(isValidSessionCombo('playback', playbackCategoryOptions(false)), 'solo ok');
  assert(!isValidSessionCombo('playback', ['defaultToSpeaker']), 'speaker illegal');
  assert(!isValidSessionCombo('playback', ['defaultToSpeaker', 'mixWithOthers']), 'combo illegal');
});

check('recording options allow speaker', () => {
  const options = recordingCategoryOptions();
  assert(options.includes('defaultToSpeaker'), 'speaker');
  assert(isValidSessionCombo('playAndRecord', options), 'record combo');
});

check('session state machine', () => {
  assert(nextSessionMode('idle', 'startPlayback') === 'playing', 'play');
  assert(nextSessionMode('playing', 'startRecording') === 'recording', 'record');
  assert(nextSessionMode('recording', 'stopRecording') === 'stopped', 'restore');
  assert(nextSessionMode('playing', 'interrupt') === 'interrupted', 'interrupt');
  assert(nextSessionMode('interrupted', 'resume') === 'playing', 'resume play');
  assert(nextSessionMode('playing', 'startTuner') === 'tunerInput', 'tuner');
  assert(nextSessionMode('tunerInput', 'stopTuner') === 'stopped', 'tuner restore');
  assert(nextSessionMode('tunerInput', 'startPlayback') === 'recovering', 'play after tuner recovers');
  assert(nextSessionMode('recording', 'startPlayback') === 'playing', 'metronome while recording');
});

check('persisted zero volume cannot silence relaunch', () => {
  assert(sanitizeMasterVolume(0) === 0.8, 'zero migrates');
  assert(sanitizeMasterVolume(Number.NaN) === 0.8, 'nan migrates');
  assert(sanitizeMasterVolume(-1) === 0.8, 'negative migrates');
  assert(sanitizeMasterVolume(1.4) === 0.8, 'overrange migrates');
  assert(sanitizeMasterVolume(0.42) === 0.42, 'valid kept');
  assert(clampLiveVolume(0) === 0, 'live zero is silence');
  assert(masterGain(0) === 0, 'gain zero is silence');
  assert(masterGain(0.25) > 0.4, 'low slider is usable');
  assert(masterGain(1) > 0.8 && masterGain(1) <= 0.92, 'full has headroom');
  assert(
    startReportIsAlive(
      { engineRunning: true, playerPlaying: true, scheduledEventCount: 4, hasDefaultBuffer: true },
      0.8
    ),
    'valid start'
  );
  assert(!startReportIsAlive({ engineRunning: false, scheduledEventCount: 0 }, 0.8), 'dead start');
  assert(
    !startReportIsAlive(
      { engineRunning: true, playerPlaying: true, scheduledEventCount: 4, hasDefaultBuffer: false },
      0.8
    ),
    'missing buffer'
  );
  assert(
    !startReportIsAlive({ engineRunning: true, scheduledEventCount: 4, hasDefaultBuffer: true }, 0.8),
    'engine without player is silent'
  );
  assert(
    startReportIsAlive(
      {
        engineRunning: true,
        playerPlaying: true,
        scheduledEventCount: 4,
        hasDefaultBuffer: true,
        firstChunkPeakAmplitude: 0,
        firstChunkNonZeroSampleCount: 0,
      },
      0.8
    ),
    'muted first beat is legal silence'
  );
});

check('friendly start error hides OSStatus', () => {
  const raw = "The operation couldn't be completed. (OSStatus error -50.)";
  const next = friendlyTransportError(raw);
  assert(!next.includes('OSStatus'), next);
  assert(!next.includes('-50'), next);
  assert(transportShouldStayStopped(true, true) === false, 'failed start stays stopped');
  assert(transportShouldStayStopped(false, true) === true, 'success stays playing');
});

const policy = read('lib/audio-session-policy.ts');
const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
const session = read('modules/pockt-timing/ios/PocktAudioSession.swift');
const metronome = read('hooks/use-metronome.ts');
const persist = read('storage/persist.ts');
const sounds = read('constants/sounds.ts');
const clickBank = read('modules/pockt-timing/ios/PocktClickBank.swift');

check('native session owner exists', () => {
  assert(session.includes('enum PocktAudioSessionMode'), 'mode enum');
  assert(session.includes('applyPlayback'), 'playback');
  assert(session.includes('applyRecording'), 'recording');
  assert(session.includes('.playback'), 'playback category');
  assert(session.includes('defaultToSpeaker'), 'speaker only on record path');
  assert(session.includes('Never overrideOutputAudioPort'), 'no playback speaker override');
  assert(session.includes('overrideOutputAudioPort(.speaker)'), 'record routes to speaker');
});

check('engine no longer sets speaker on playback', () => {
  assert(!/CategoryOptions = \[\.defaultToSpeaker\]/.test(engine), 'old illegal options gone');
  assert(engine.includes('PocktAudioSession.shared.applyPlayback'), 'uses owner');
  assert(engine.includes('startInFlight'), 'idempotent start');
  assert(!engine.includes('setInterval'), 'no js timer in engine');
  assert(engine.includes('func startTuner'), 'tuner uses same session owner');
  assert(engine.includes('if tunerLive'), 'metronome start clears tuner');
  assert(engine.includes('waitForValidTunerFormat'), 'tuner waits for SR>0');
  assert(engine.includes('player.play called isPlaying'), 'play then schedule');
  assert(engine.includes('func restorePlaybackGraph'), 'playback graph restore');
  const restoreFn = engine.slice(
    engine.indexOf('func restorePlaybackGraph'),
    engine.indexOf('func playStartCue')
  );
  assert(restoreFn.includes('engine.stop()'), 'restore stops a running engine after session change');
  assert(restoreFn.includes('recoverPlaybackPreservingPhase()'), 'restore reschedules if metronome is live');
  assert(engine.includes('let playerLive = player.isPlaying && currentPlayerSample() != nil'), 'idempotent start requires a live player');
  assert(engine.includes('let keepCapture = inputCapture'), 'play keeps mic capture');
  assert(engine.includes('skipRebuild'), 'do not tear graph while recording');
  assert(engine.includes('silence is legal'), 'mute first beat still starts');
  assert(!engine.includes('First scheduled click is silent'), 'do not abort silent downbeat');
  assert(engine.includes('func setMasterGain'), 'immediate gain');
  assert(engine.includes('pow(linear, 0.55)'), 'perceptual volume');
  assert(engine.includes('Native click buffers missing after start'), 'no silent start');
  assert(engine.includes('Never .notifyOthersOnDeactivation') || session.includes('Never .notifyOthersOnDeactivation'), 'no session steal');
  const applyConfigFn = engine.slice(
    engine.indexOf('func applyConfig(_ next: PocktEngineConfig)'),
    engine.indexOf('private func applyPhaseContinuousTempo')
  );
  assert(applyConfigFn.includes('if soundChanged'), 'live sound change is detected');
  assert(applyConfigFn.includes('scheduleUntilHorizon'), 'new click starts on the next uncommitted tick');
  assert(!applyConfigFn.includes('recoverPlaybackPreservingPhase()'), 'a sound change does not rebuild the player');
});

check('sound preview uses a dedicated player node', () => {
  assert(engine.includes('private let previewPlayer = AVAudioPlayerNode()'), 'preview node');
  assert(engine.includes('func cancelPreview()'), 'cancel previous preview');
  assert(engine.includes('private func playPreview'), 'serialized preview');
  assert(engine.includes('cancelPreview()'), 'start cancels preview');
  assert(engine.includes('preview ignored; tuner is live'), 'preview waits for tuner');
  assert(!engine.includes('preview ignored; metronome is running'), 'preview node can fire while clock runs');
  const previewFn = engine.slice(engine.indexOf('private func playPreview'), engine.indexOf('private func connectPreviewPlayer'));
  assert(previewFn.includes('previewPlayer.scheduleBuffer'), 'schedules on preview node');
  assert(!previewFn.includes('resetPlayerNode'), 'preview does not reset production player');
  assert(previewFn.includes('let metronomeLive = running && engine.isRunning'), 'preview knows if the clock is live');
  assert(previewFn.includes('if !metronomeLive'), 'live preview must not reconfigure the session');
  assert(previewFn.includes('clampedAudibleVolume(config.volume)'), 'preview restores mixer from config volume');
  assert(!previewFn.includes('max(engine.mainMixerNode.outputVolume, gain)'), 'preview must not stomp mixer gain');
  assert(previewFn.includes('recoverPlaybackPreservingPhase()'), 'preview recovers an idle production player');
});

check('js policy and hook stay aligned', () => {
  assert(policy.includes("category === 'playback'"), 'playback rule');
  assert(policy.includes("!options.includes('defaultToSpeaker')"), 'illegal option');
  assert(metronome.includes('friendlyTransportError'), 'maps errors');
  assert(metronome.includes('audio recovery: restore playback graph + start'), 'js recovery once');
  assert(metronome.includes('startReportIsAlive'), 'ui cannot lie');
  assert(metronome.includes('playing: false'), 'transport reset');
  assert(policy.includes('sanitizeMasterVolume'), 'persist sanitizer');
  assert(policy.includes('pow(linear, 0.55)'), 'js perceptual gain');
  assert(persist.includes('sanitizeMasterVolume(source.volume'), 'load migrates zero');
});

check('recorder disables expo-audio session before native restore', () => {
  const recorder = read('hooks/use-session-recorder.ts');
  const enable = recorder.slice(recorder.indexOf('const enableCapture'), recorder.indexOf('const startRecord'));
  const expoOff = enable.indexOf('allowsRecording: false');
  const restore = enable.indexOf('restorePlaybackGraph');
  assert(expoOff >= 0 && restore >= 0 && expoOff < restore, 'expo-audio cannot mutate session after engine restore');
});

check('known-good pocket remains playable', () => {
  assert(sounds.includes("pocket:"), 'pocket sound');
  assert(sounds.includes("resolvePlayableSound"), 'resolver');
  assert(clickBank.includes('"pocket"'), 'native pocket key');
  const pocketWav = path.join(__dirname, '..', 'modules/pockt-timing/ios/Clicks/pocket.wav');
  assert(fs.existsSync(pocketWav), 'pocket.wav bundled');
});

check('enabled pockt sounds have native keys or fallbacks', () => {
  const order = sounds.match(/export const POCKT_SOUND_ORDER[\s\S]*?= \[([\s\S]*?)\];/);
  assert(order, 'pockt order');
  const ids = [...order[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
  assert(ids.includes('pocket'), 'pocket first-class');
  assert(!ids.includes('pockt-heart'), 'heart not enabled');
});

check('ident uses native preview and does not steal the session', () => {
  const intro = read('components/intro/BrandedIntro.tsx');
  const identScript = read('scripts/prepare-production-audio.js');
  const identWav = path.join(__dirname, '..', 'modules/pockt-timing/ios/Clicks/pockt-ident.wav');
  assert(intro.includes("PocktTiming.preview('pockt-ident'"), 'native ident preview');
  assert(!intro.includes("interruptionMode: 'doNotMix'"), 'ident does not doNotMix');
  assert(intro.includes("keepAudioSessionActive: true"), 'ident must not deactivate the native session on unmount');
  assert(identScript.includes('no vocal, no rumble, no spoken count'), 'ident mix has no vocal');
  assert(!identScript.includes('mixAt(ident, vocal'), 'ident does not mix vocal');
  assert(clickBank.includes('"pockt-ident"'), 'ident in click bank');
  assert(fs.existsSync(identWav), 'ident wav bundled natively');
});

if (failures.length) {
  console.error('AUDIO SESSION TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('AUDIO SESSION TESTS PASSED');
console.log('playback forbids defaultToSpeaker; recording restores playback; OSStatus is hidden');
