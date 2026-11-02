'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const deck = require('../lib/phrase-deck.ts');
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

let state = deck.createPhraseDeck();
assert(state.phase === 'idle' && state.hasTake === false && state.loop === false, 'a new deck is idle');

let step = deck.phrasePress(state, 'tap');
assert(step.command === 'start-record' && step.deck.phase === 'recording', 'tap from idle records');
state = step.deck;

step = deck.phrasePress(state, 'tap');
assert(step.command === 'stop-record' && step.deck.phase === 'ready' && step.deck.hasTake, 'tap stops into a take');
state = step.deck;

step = deck.phrasePress(state, 'tap');
assert(step.command === 'play' && step.deck.phase === 'playing', 'tap plays the take');
state = step.deck;

step = deck.phrasePress(state, 'tap');
assert(step.command === 'pause' && step.deck.phase === 'paused', 'tap pauses playback');
state = step.deck;

step = deck.phrasePress(state, 'loop');
assert(step.command === 'toggle-loop' && step.deck.loop === true, 'loop turns on');
state = step.deck;
step = deck.phrasePress(state, 'loop');
assert(step.command === 'toggle-loop' && step.deck.loop === false, 'loop turns off');
state = step.deck;

step = deck.phrasePress(state, 'long');
assert(step.command === 'replace' && step.deck.phase === 'recording' && step.deck.hasTake === false, 'hold replaces the take');
state = step.deck;

const suspended = deck.phraseSuspend(state);
assert(suspended.phase === 'idle', 'suspending a live record leaves the tuner a clear microphone');

const ready = deck.phraseSuspend({ phase: 'playing', loop: true, hasTake: true });
assert(ready.phase === 'ready' && ready.hasTake && ready.loop, 'suspending playback keeps the take');

const idleLoop = deck.phrasePress(deck.createPhraseDeck(), 'loop');
assert(idleLoop.command === null, 'loop does nothing before a take exists');

const cleared = deck.phrasePress({ phase: 'recording', loop: false, hasTake: false }, 'clear');
assert(cleared.command === 'clear' && cleared.deck.phase === 'idle' && cleared.deck.hasTake === false, 'clear stops a live recording');
let phraseMode = 'beats';
for (let i = 0; i < 1000; i += 1) {
  const next = deck.nextBeatPhraseMode(phraseMode);
  assert(next === (phraseMode === 'beats' ? 'deck' : 'beats'), 'every selector tap flips');
  phraseMode = next;
}
assert(phraseMode === 'beats', 'one thousand flips return to beats');
assert(deck.phraseScrub({ phase: 'playing', loop: false, hasTake: true }, 0.25).ratio === 0.25, 'scrub moves to a quarter');
assert(deck.phraseScrub({ phase: 'playing', loop: true, hasTake: true }, 0.5).resume === true, 'a playing scrub resumes');
assert(deck.phraseScrub({ phase: 'paused', loop: false, hasTake: true }, 0.75).resume === false, 'a paused scrub stays paused');
assert(deck.phraseScrub({ phase: 'recording', loop: false, hasTake: false }, 0.5).ratio === 0, 'recording does not scrub');
assert(deck.phraseScrubRatio(40, 160) === 0.25, 'the finger maps across the timeline');
assert(deck.phraseClock(65.2) === '1:05.2', 'the transport clock shows minutes');
const release = require('../lib/audio-release.ts');
assert(release.playbackReady({ engineRunning: 1 }) === true, 'a restored graph is ready');
assert(release.playbackReady({ engineRunning: false }) === false, 'a dead graph must be reclaimed');
assert(release.playbackReady(null) === false, 'a missing probe is not ready');

const hook = read('hooks/use-phrase-recorder.ts');
const room = read('components/classic/FoundationDialRoom.tsx');
const tuner = read('hooks/use-tuner.ts');
assert(hook.includes('setInputCapture') && hook.includes('restorePlaybackGraph'), 'phrase recording borrows and restores the native graph');
assert(hook.includes('stopTuner'), 'recording does not share the tuner tap');
assert(!hook.includes('recorder.isRecording'), 'unmount does not query the native recorder');
assert(!room.includes('ClassicDialPhraseControl'), 'the phrase control is not beside Play');
assert(!room.includes('layout.phrase'), 'the transport row has no recorder slot');
assert(room.includes('beat-row-deck') === false, 'the deck toggle lives on the beat row');
assert(read('components/classic/ClassicDialBeats.tsx').includes('testID="beat-row-deck"'), 'the beat row owns phrase entry');
assert(!read('components/classic/ClassicDialBeats.tsx').includes('rotateX'), 'the beat row no longer flips');
assert(read('components/classic/PhraseFace.tsx').includes('CLEAR'), 'clear is labeled');
assert(!read('components/classic/ClassicDialBeats.tsx').includes('clearMark'), 'the mystery minus control is gone');
assert(read('components/classic/PhraseFace.tsx').includes('deck-timeline'), 'the timeline sits on the phrase face');
assert(read('components/classic/PhraseFace.tsx').includes('testID="phrase-return"'), 'phrase has an obvious beats return');
assert(read('hooks/use-phrase-recorder.ts').includes('phraseScrub'), 'scrubbing seeks the take');
assert(read('hooks/use-phrase-recorder.ts').includes('playbackReady'), 'releasing the phrase checks the playback graph');
assert(read('modules/pockt-timing/ios/PocktTimingEngine.swift').includes('leftover input capture'), 'play drops a leftover capture before it sounds');
assert(room.includes('phrase.suspend'), 'opening the tuner suspends the phrase deck');
assert(tuner.includes("audioClaim() === 'phrase'"), 'tuner restore yields when a phrase handoff owns the session');
assert(read('components/classic/faces/VinylTunerFace.tsx').includes('LP_DEGREES_PER_SECOND'), 'vinyl rotation stays a visual rate');

console.log('phrase deck tests passed');
