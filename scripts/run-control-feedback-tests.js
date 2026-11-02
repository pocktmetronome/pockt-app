'use strict';

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

function shouldEmitControlDetent(input) {
  const minGapMs = input.minGapMs ?? 0;
  if (!input.dragging) return { emit: false, lastEmitAt: input.lastEmitAt };
  if (input.previousBpm == null) return { emit: false, lastEmitAt: input.lastEmitAt };
  if (input.nextBpm === input.previousBpm) return { emit: false, lastEmitAt: input.lastEmitAt };
  if (minGapMs > 0 && input.now - input.lastEmitAt < minGapMs) return { emit: false, lastEmitAt: input.lastEmitAt };
  return { emit: true, lastEmitAt: input.now };
}

function resolveSmartPendulumCenterHaptic(saved) {
  return saved === true;
}

function resolveRigBeatLight(saved) {
  return saved !== false;
}

function lockPendulumAxis(dx, dy, threshold = 10) {
  if (Math.hypot(dx, dy) < threshold) return 'none';
  return Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
}

function horizontalAngleFromDrag(dx, width, maxDeg = 26, origin = 0) {
  const span = Math.max(64, width * 0.42);
  const next = origin + (dx / span) * maxDeg;
  return Math.min(maxDeg, Math.max(-maxDeg, next));
}

function releaseShouldStart(axis, dx, threshold = 18) {
  return axis === 'horizontal' && Math.abs(dx) >= threshold;
}

function tapShouldStop(playing, axis) {
  return playing && axis === 'none';
}

function shouldPulseTorch(now, lastPulseAt, minGapMs = 90) {
  return now - lastPulseAt >= minGapMs;
}

function coverLayout(viewW, viewH, srcW = 576, srcH = 1024) {
  const scale = Math.max(viewW / srcW, viewH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  return { scale, drawW, drawH, originX: (viewW - drawW) / 2, originY: (viewH - drawH) / 2 };
}

function mapPlate(nx, ny, layout) {
  return { x: layout.originX + nx * layout.drawW, y: layout.originY + ny * layout.drawH };
}

function swingTipOffset(rodHeight, deg) {
  return Math.abs(Math.sin((deg * Math.PI) / 180) * rodHeight);
}

function shouldPromptPhoneFlash(accepted, enabling) {
  return enabling && accepted !== true;
}

function phoneFlashEnabledAfterPrompt(accepted, enabling) {
  if (!enabling) return false;
  return accepted === true;
}

function faceToastOffset(safeTop, headerHeight = 0, gap = 8) {
  return Math.max(0, safeTop) + Math.max(0, headerHeight) + gap;
}

function rollerMarkX(mark, liveBpm, wellWidth, px = 14) {
  return wellWidth / 2 + (mark - liveBpm) * px;
}

function rollerLabelForMark(mark, majorEvery = 10) {
  return mark % majorEvery === 0 ? mark : null;
}

function mechanicalBpmFromWeightT(t) {
  const unit = Math.min(1, Math.max(0, t));
  if (unit <= 0.78) {
    const local = Math.min(1, Math.max(0, (unit - 0.08) / 0.7));
    return Math.round(20 + local * (208 - 20));
  }
  const local = Math.min(1, Math.max(0, (unit - 0.78) / 0.14));
  return Math.round(208 + local * (400 - 208));
}

function mechanicalWeightT(bpm) {
  const safe = Math.min(400, Math.max(20, bpm));
  if (safe <= 208) return Math.min(1, Math.max(0, 0.08 + ((safe - 20) / (208 - 20)) * 0.7));
  return Math.min(1, Math.max(0, 0.78 + ((safe - 208) / (400 - 208)) * 0.14));
}

check('RIG display name is CONSOLE and internal id stays rig', () => {
  const rooms = read('constants/rooms.ts');
  const face = read('components/classic/RigRoom.tsx');
  const voice = read('lib/room-voice.ts');
  const types = read('lib/types.ts');
  assert(rooms.includes("id: 'rig'"), 'internal room id remains rig');
  assert(rooms.includes("label: 'CONSOLE'"), 'landing card uses CONSOLE');
  assert(rooms.includes("shortLabel: 'Console'"), 'a11y uses Console');
  assert(!rooms.includes("label: 'RIG'"), 'no leftover RIG label');
  assert(face.includes('>CONSOLE<'), 'face title is CONSOLE');
  assert(!face.includes('>RIG<'), 'face title is not RIG');
  assert(voice.includes("rig: 'digital-click'"), 'roomVoice.rig survives');
  assert(types.includes("| 'rig'"), 'RoomId still includes rig');
  assert(!face.toLowerCase().includes('accessibilitylabel="rig"'), 'VoiceOver does not read rig');
});

check('saved landing order still appends internal rig', () => {
  const order = read('scripts/run-room-order-tests.js');
  assert(order.includes("assert(next[next.length - 1] === 'rig'"), 'append test keeps rig id');
});

check('console roller detents rate-limit and ignore programmatic BPM', () => {
  const first = shouldEmitControlDetent({
    dragging: true,
    previousBpm: 120,
    nextBpm: 121,
    now: 1000,
    lastEmitAt: 0,
  });
  assert(first.emit, 'slow manual step emits');
  const rapid = shouldEmitControlDetent({
    dragging: true,
    previousBpm: 121,
    nextBpm: 130,
    now: 1020,
    lastEmitAt: first.lastEmitAt,
    minGapMs: 52,
  });
  assert(!rapid.emit, 'optional extra gap still coalesces');
  const later = shouldEmitControlDetent({
    dragging: true,
    previousBpm: 130,
    nextBpm: 131,
    now: 1080,
    lastEmitAt: first.lastEmitAt,
  });
  assert(later.emit, 'later step emits after the gap');
  const same = shouldEmitControlDetent({
    dragging: true,
    previousBpm: 120,
    nextBpm: 120,
    now: 2000,
    lastEmitAt: 0,
  });
  assert(!same.emit, 'no BPM boundary is silent');
  const restore = shouldEmitControlDetent({
    dragging: false,
    previousBpm: 88,
    nextBpm: 120,
    now: 3000,
    lastEmitAt: 0,
  });
  assert(!restore.emit, 'programmatic restore is silent');
  const initial = shouldEmitControlDetent({
    dragging: true,
    previousBpm: null,
    nextBpm: 120,
    now: 4000,
    lastEmitAt: 0,
  });
  assert(!initial.emit, 'initial render is silent');
  const roller = read('components/classic/TempoRoller.tsx');
  assert(roller.includes("rotaryDetent('roller'"), 'roller uses isolated UI detent');
  assert(roller.includes('dragging.value < 0.5'), 'no detent after finger up');
  const beatline = read('components/classic/BeatlineRoom.tsx');
  const ruler = read('components/classic/TempoRuler.tsx');
  const tempoDial = read('components/beatline/BeatlineTempoDial.tsx');
  assert(beatline.includes('setBpm('), 'Beatline tempo still commits through setBpm');
  assert(tempoDial.includes("rotaryDetent('dial'"), 'Beatline rotary detents remain audible');
  assert(ruler.includes('hapticDialTick()'), 'Build 69 ruler tick remains');
  const rotary = read('lib/rotary-feedback.ts');
  assert(rotary.includes("step:"), 'button clicks have their own limiter');
  assert(rotary.includes('lastAt[kind]'), 'one control cannot starve another');
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  const locked = engine.split('private func playUiDetentLocked')[1]?.split('private func scheduleUiClick')[0] ?? '';
  assert(!locked.includes('if startInFlight { return }'), 'Play start does not mute UI detents');
  assert(!engine.includes('if startInFlight || lifecycle == .starting { return }'), 'old start-lifecycle mute is gone');
});

check('smart pendulum center haptic is removed from the face', () => {
  assert(resolveSmartPendulumCenterHaptic(undefined) === false, 'absent is false');
  assert(resolveSmartPendulumCenterHaptic(null) === false, 'null is false');
  assert(resolveSmartPendulumCenterHaptic(false) === false, 'explicit false');
  const persist = read('storage/persist.ts');
  const timing = read('constants/timing.ts');
  const smart = read('components/classic/SmartPendulumRoom.tsx');
  assert(timing.includes('smartPendulumCenterHaptic: false'), 'factory default off');
  assert(persist.includes('source.smartPendulumCenterHaptic === true'), 'only explicit true survives persist');
  assert(!smart.includes('isCenterCrossing'), 'no visual-center haptic');
  assert(smart.includes('name="vibration"'), 'Build 69 haptics control remains on the face');
  assert(smart.includes('onHapticToggle'), 'haptics use the shared toggle');
  assert(smart.includes('name="play-arrow"'), 'play remains');
  assert(smart.includes('name="more-horiz"'), 'overflow remains');
});

check('mechanical pendulum mapping, plate, and layout', () => {
  assert(mechanicalWeightT(20) < mechanicalWeightT(120), 'slow sits higher');
  assert(mechanicalWeightT(400) > mechanicalWeightT(208), '400 uses the compressed lower band');
  assert(mechanicalWeightT(40) < 0.25, 'largo stays near the top');
  assert(mechanicalBpmFromWeightT(0.08) === 20, 'top of travel is 20');
  assert(mechanicalBpmFromWeightT(0.92) === 400, 'bottom of travel is 400');
  const face = read('components/classic/PendulaClassicRoom.tsx');
  const assets = read('lib/classic-assets.ts');
  const preview = read('components/classic/ClassicPreviewCard.tsx');
  const main = read('components/pockt/MainScreen.tsx');
  assert(face.includes("from '@/hooks/use-pendulum-phase'"), 'shared pendulum clock');
  assert(face.includes('SWING_DEG'), 'believable amplitude');
  assert(face.includes('LAYERS.pendulum'), 'explicit pendulum layer');
  assert(face.includes('zIndex: LAYERS.pendulum'), 'rod stacks above the plate');
  assert(face.includes('testID="mechanical-pendulum"'), 'rod exists while stopped or playing');
  assert(face.includes('mechanicalRodLayout'), 'shared cover mapping');
  assert(face.includes("overflow: 'visible'"), 'foreground pendulum is not clipped');
  assert(face.includes('MECHANICAL_WALNUT_STUDIO'), 'opaque studio plate');
  assert(assets.includes('walnut-studio.jpg'), 'studio plate is registered');
  assert(!assets.includes('walnut-aframe'), 'checkerboard aframe unregistered');
  assert(!assets.includes('scale-plate'), 'checkerboard scale unregistered');
  assert(!face.includes('MECHANICAL_WALNUT_AFRAME'), 'defective aframe unused');
  assert(!preview.includes('MECHANICAL_WALNUT_AFRAME'), 'gallery no longer uses aframe');
  assert(!face.includes('walnut-body-lid'), 'lid asset unused');
  assert(!face.includes('BeatCapsuleStrip'), 'instrument stays uncluttered');
  assert(face.includes("rotaryDetent('roller', sensoryFlags(config.sensoryMode).audio, effectiveHaptic(config))"), 'detent while stopped and playing');
  assert(face.includes('shouldEmitControlDetent'), 'weight drag is rate-limited');
  assert(!face.includes('audio && !playing'), 'playing no longer mutes control detents');
  assert(face.includes('Math.min(72, Math.max(56'), 'BPM is 56-72pt');
  assert(face.includes('width: 48'), 'minus/plus are 48pt');
  assert(face.includes('height: 48'), 'minus/plus height is 48pt');
  assert(face.includes("Math.max(16, insets.left, insets.right)"), 'steppers stay in the safe area');
  assert(face.includes('OPTIONS'), 'options is labeled');
  assert(face.includes('minHeight: 44'), 'options meets 44pt');
  assert(face.includes("contentFit=\"cover\""), 'studio plate aspect-fills');
  assert(main.includes("roomId === 'pendula-classic'"), 'mechanical gets a dedicated stage');
  assert(main.includes('rigFace || mechanicalFace || beatlineFace ? 0 : 20'), 'no side box padding');
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/classic/mechanical/walnut-studio.jpg')), 'studio plate present');
  assert(!fs.existsSync(path.join(__dirname, '..', 'assets/classic/mechanical/walnut-aframe.png')), 'checkerboard aframe deleted');
  assert(!fs.existsSync(path.join(__dirname, '..', 'assets/classic/mechanical/scale-plate.png')), 'checkerboard scale deleted');
});

check('mechanical direct pendulum gestures', () => {
  assert(lockPendulumAxis(3, 3) === 'none', 'tiny movement stays unlocked');
  assert(lockPendulumAxis(0, 20) === 'vertical', 'vertical lock');
  assert(lockPendulumAxis(20, 0) === 'horizontal', 'horizontal lock');
  assert(lockPendulumAxis(20, 8) === 'horizontal', 'dominant X wins');
  assert(lockPendulumAxis(8, 20) === 'vertical', 'dominant Y wins');
  assert(horizontalAngleFromDrag(100, 390) !== horizontalAngleFromDrag(40, 390), 'horizontal is continuous');
  assert(Math.abs(horizontalAngleFromDrag(400, 390)) === 26, 'angle is clamped');
  assert(releaseShouldStart('horizontal', 18), 'meaningful pull starts');
  assert(!releaseShouldStart('horizontal', 8), 'tiny pull does not start');
  assert(!releaseShouldStart('vertical', 40), 'vertical release never starts');
  assert(!releaseShouldStart('none', 40), 'unlocked axis does not start from release');
  assert(tapShouldStop(true, 'none'), 'tap while playing stops');
  assert(!tapShouldStop(false, 'none'), 'tap while stopped does not stop');
  assert(!tapShouldStop(true, 'horizontal'), 'grab is not a tap-stop');
  const face = read('components/classic/PendulaClassicRoom.tsx');
  assert(face.includes('lockPendulumAxis'), 'axis lock is used');
  assert(face.includes('releaseShouldStart'), 'release-to-start is used');
  assert(face.includes('handlePendulumTap'), 'playing tap stops / stopped tap starts');
  assert(face.includes('startArmed'), 'release start is single-flight');
  assert(face.includes('startFromRelease'), 'one start path from release');
  assert(face.includes('startFromButton'), 'button and tap share the centered start');
  assert(face.includes('classifyPendulumPointer'), 'tap vs drag is classified');
  assert(face.includes('Gesture.Exclusive'), 'tap does not fire after drag');
  assert(face.includes('PENDULUM_MODE'), 'one authoritative animation mode');
  assert(face.includes('haltPlayback'), 'grab/tap can stop audio');
  assert(face.includes('held'), 'held skips the clock while dragging');
  assert(!face.includes('setInterval'), 'no JS musical timer');
  assert(horizontalAngleFromDrag(-80, 390) < 0, 'negative X is a left angle');
  assert(horizontalAngleFromDrag(80, 390) > 0, 'positive X is a right angle');
});

check('console beat light and existing torch controls', () => {
  assert(resolveRigBeatLight(undefined) === true, 'absent beat light is on');
  assert(resolveRigBeatLight(null) === true, 'null beat light is on');
  assert(resolveRigBeatLight(false) === false, 'explicit beat light off');
  assert(resolveRigBeatLight(true) === true, 'explicit beat light on');
  const persist = read('storage/persist.ts');
  const timing = read('constants/timing.ts');
  const face = read('components/classic/RigRoom.tsx');
  const torch = read('lib/beat-torch.ts');
  const host = read('components/outputs/TorchHost.tsx');
  const hook = read('hooks/use-metronome.ts');
  assert(timing.includes('rigBeatLight: true'), 'factory beat light on');
  assert(persist.includes('source.rigBeatLight !== false'), 'beat light persists unless off');
  assert(face.includes("toast.show(next ? 'BEAT LIGHT ON' : 'BEAT LIGHT OFF')"), 'beat-light toast after tap');
  assert(face.includes("toast.show(next ? 'PHONE FLASH ON' : 'PHONE FLASH OFF')"), 'torch toast after tap');
  assert(face.includes('name="wb-incandescent"'), 'lamp icon is beat light');
  assert(face.includes('name="highlight"'), 'flashlight icon is torch');
  assert(face.includes('beatLightOn ? tapGlow : styles.lightOff'), 'off suppresses only the visual flash');
  assert(face.includes('flashOnBeat'), 'existing torch preference is reused');
  assert(timing.includes('flashOnBeat: false'), 'torch still defaults off');
  assert(torch.includes('shouldPulseTorch'), 'high BPM torch is rate-limited');
  assert(shouldPulseTorch(1000, 960) === false, 'rapid primary beats do not restrobe');
  assert(shouldPulseTorch(1000, 900) === true, 'later primary beat may flash');
  assert(host.includes("state !== 'active'"), 'background releases the torch');
  assert(host.includes('forceOff()'), 'host cleans up');
  assert(hook.includes('beatTorch.forceOff()'), 'stop and interruptions kill the torch');
  assert(hook.includes('event.isPrimaryBeat'), 'torch still follows primary beats only');
});

check('mechanical pivot mapping keeps a full swing on screen', () => {
  const phones = [
    [390, 680],
    [393, 720],
    [430, 800],
  ];
  for (const [w, h] of phones) {
    const cover = coverLayout(w, h);
    const pivot = mapPlate(0.5, 0.693, cover);
    const top = mapPlate(0.5, 0.228, cover);
    const rodH = pivot.y - top.y;
    const tip = swingTipOffset(rodH, 26);
    assert(rodH > 80, `${w}x${h} rod has height`);
    assert(pivot.x - tip > 4 && pivot.x + tip < w - 4, `${w}x${h} swing stays visible`);
  }
});

check('mechanical preview shows an open walnut arm and no cover', () => {
  const preview = read('components/classic/ClassicPreviewCard.tsx');
  const start = preview.indexOf('function PendulumPreview');
  const next = preview.indexOf('function LedgearPreview');
  const block = preview.slice(start, next);
  assert(block.includes('MECHANICAL_WALNUT_STUDIO'), 'preview uses the studio plate');
  assert(block.includes('mechanical-preview-arm'), 'preview has a visible arm');
  assert(!block.includes('styles.pyramid'), 'no brown cover overlay');
  assert(!block.includes('walnut-body-lid'), 'no lid');
  assert(!block.includes('MECHANICAL_WALNUT_AFRAME'), 'no checkerboard aframe');
});

check('mechanical beat haptics switch has distinct on/off tokens', () => {
  const sheet = read('components/classic/MechanicalOptionsSheet.tsx');
  assert(sheet.includes("accessibilityLabel=\"Beat Haptics\""), 'switch is labeled');
  assert(sheet.includes("accessibilityValue={{ text: haptic ? 'On' : 'Off' }}"), 'value is On/Off');
  assert(sheet.includes('hapticTrackOn'), 'on track token');
  assert(sheet.includes('hapticTrackOff'), 'off track token');
  assert(sheet.includes('#D4A24A'), 'gold on color');
  assert(sheet.includes('#2C2824'), 'neutral off color');
  assert(sheet.includes('minHeight: 44'), '44pt hit');
});

check('console roller center matches BPM and labels stay meaningful', () => {
  assert(rollerMarkX(120, 120, 280) === 140, 'center mark sits on the index');
  assert(rollerMarkX(20, 20, 280) === 140, '20 stays centered');
  assert(rollerMarkX(400, 400, 280) === 140, '400 stays centered');
  assert(rollerLabelForMark(120) === 120, 'major label is the BPM');
  assert(rollerLabelForMark(121) === null, 'minor ticks are unlabeled');
  assert(rollerLabelForMark(20) === 20, '20 can be labeled');
  assert(rollerLabelForMark(400) === 400, '400 can be labeled');
  const roller = read('components/classic/TempoRoller.tsx');
  assert(roller.includes('wellW.value / 2 - live.value * ROLLER_PX_PER_BPM'), 'live strip tracks BPM');
  assert(roller.includes('clampRollerBpm'), 'release snaps without leftover motion');
  assert(!roller.includes('withDecay'), 'no post-release spin');
  assert(roller.includes('minWidth: 32'), 'labels are wide enough to show 120');
});

check('face toast sits below the safe area and header', () => {
  const island = faceToastOffset(59, 48);
  const notch = faceToastOffset(47, 48);
  assert(island >= 59 + 48, 'Dynamic Island clearance');
  assert(notch >= 47 + 48, 'notch clearance');
  assert(island > 20, 'never uses the status-bar origin');
  const toast = read('components/classic/FaceToast.tsx');
  assert(toast.includes('useSafeAreaInsets'), 'toast reads safe area');
  assert(toast.includes('zIndex: 80'), 'toast stacks above the face');
  assert(toast.includes('position: \'absolute\''), 'toast does not shift layout');
  const face = read('components/classic/RigRoom.tsx');
  assert(face.includes('faceToastOffset(insets.top, 48)'), 'CONSOLE toast is below the header');
});

check('phone flash warning acceptance stays separate from the flash flag', () => {
  assert(shouldPromptPhoneFlash(false, true) === true, 'first enable prompts');
  assert(shouldPromptPhoneFlash(true, true) === false, 'accepted enable does not prompt');
  assert(shouldPromptPhoneFlash(false, false) === false, 'turning off never prompts');
  assert(phoneFlashEnabledAfterPrompt(false, true) === false, 'torch stays off before accept');
  assert(phoneFlashEnabledAfterPrompt(true, true) === true, 'accepted enable may turn on');
  const face = read('components/classic/RigRoom.tsx');
  const host = read('components/outputs/TorchHost.tsx');
  assert(face.includes('PHONE_FLASH_TITLE'), 'native flash warning');
  assert(face.includes('Not Now'), 'cancel keeps flash off');
  assert(face.includes("torchHintSeen: true"), 'accept is stored separately');
  assert(!host.includes('Alert.alert'), 'TorchHost no longer owns the first-use dialog');
  assert(host.includes('if (!explained) return'), 'torch stays off until acknowledgement');
});

check('console MIX control is labeled and tappable', () => {
  const face = read('components/classic/RigRoom.tsx');
  const mix = read('components/brand/MixButton.tsx');
  const bezel = read('components/pockt2/ShellBezel.tsx');
  assert(face.includes('>CONSOLE<'), 'CONSOLE remains the instrument title');
  assert(!face.includes('accessibilityLabel="MIX"'), 'duplicate Console MIX is gone');
  assert(bezel.includes('label="Settings"'), 'Settings lives on the global shell');
  assert(mix.includes('MIX'), 'Mechanical chrome MIX stays labeled');
  assert(mix.includes('minHeight: 48'), 'Mechanical MIX stays 48pt');
});

check('shared play recovery remains isolated from UI detents', () => {
  const hook = read('hooks/use-metronome.ts');
  const policy = read('lib/audio-session-policy.ts');
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  assert(hook.includes('restorePlaybackGraph'), 'play still restores');
  assert(policy.includes('scheduledEvents') || policy.includes('scheduled'), 'alive check still requires schedule');
  assert(engine.includes('Never touches metronome scheduling'), 'UI click node stays isolated');
  assert(engine.includes('uiClickPlayers'), 'UI detents ping-pong across two nodes');
});

check('long-run BPM detents cannot permanently mute', () => {
  const lastAt = { dial: 0, pro: 0, roller: 0, step: 0 };
  const gaps = { dial: 28, pro: 32, roller: 24, step: 20 };
  let audio = 0;
  let haptic = 0;
  let suppressed = 0;
  function emit(kind, now, dragging) {
    if (!dragging) return;
    if (lastAt[kind] > now) lastAt[kind] = 0;
    if (lastAt[kind] > 0 && now - lastAt[kind] < gaps[kind]) {
      suppressed += 1;
      return;
    }
    lastAt[kind] = now;
    audio += 1;
    haptic += 1;
  }
  let now = 1_000_000;
  for (let i = 0; i < 100; i += 1) {
    now += i % 7 === 0 ? 18 : 70;
    emit('dial', now, true);
    if (i % 11 === 0) now += 20;
    emit('roller', now, true);
    if (i === 40 || i === 70) {
      lastAt.dial = 0;
      lastAt.roller = 0;
    }
    if (i === 55) emit('dial', now, false);
  }
  emit('pro', now + 80, true);
  emit('step', now + 80, true);
  lastAt.dial = now + 10_000;
  emit('dial', now + 200, true);
  lastAt.dial = 0;
  lastAt.roller = 0;
  emit('dial', now + 400, true);
  emit('roller', now + 400, true);
  assert(audio >= 90, `long-run still emits (${audio})`);
  assert(haptic === audio, 'haptic follows audible emit');
  assert(suppressed > 0, 'rate limiting still coalesces rapid motion');
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  const hook = read('hooks/use-metronome.ts');
  const locked = engine.split('private func playUiDetentLocked')[1]?.split('private func scheduleUiClick')[0] ?? '';
  const scheduled = engine.split('private func scheduleUiClick')[1]?.split('private func nextIdleUiClickNode')[0] ?? '';
  assert(!locked.includes('connectUiClickPlayers'), 'play path does not rebuild the UI graph');
  assert(!scheduled.includes('.reset()'), 'play path does not reset a live UI node');
  assert(!/if node\.isPlaying \{\s*node\.stop\(\)/.test(scheduled), 'play path does not stop a live UI node');
  assert(!engine.includes('lastUiClickMs > 0 && now - lastUiClickMs < 8'), 'native 8ms skip gate is gone');
  assert(engine.includes('nextIdleUiClickNode'), 'idle-node ping-pong without teardown');
  assert(scheduled.includes('if node.engine == nil'), 'reconnect only if a node detached');
  assert(read('lib/rotary-feedback.ts').includes('if (!played) return'), 'JS stamps only after a successful detent');
  assert(read('lib/rotary-feedback.ts').includes('reviveUiDetent'), 'JS can revive after graph restore');
  assert(hook.includes('reviveUiDetent()'), 'stop and foreground revive the UI click graph');
  assert(hook.includes("state === 'active'"), 'foreground lifecycle revives detents');
});

if (failures.length) {
  console.error('CONTROL FEEDBACK TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('CONTROL FEEDBACK TESTS PASSED');
