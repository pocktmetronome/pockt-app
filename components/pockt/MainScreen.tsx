import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { HomeScreen } from '@/components/home/HomeScreen';
import { InstrumentViewport } from '@/components/pockt/InstrumentViewport';
import { FacePicker } from '@/components/instrument/FacePicker';
import { ViewSelectorSheet } from '@/components/pockt/ViewSelectorSheet';
import { ControlDeck } from '@/components/pockt2/ControlDeck';
import { ShellBezel } from '@/components/pockt2/ShellBezel';
import { BeatAccentStrip } from '@/components/controls/BeatAccentStrip';
import { BarControlsSheet } from '@/components/modals/BarControlsSheet';
import { BpmPadSheet } from '@/components/modals/BpmPadSheet';
import { PrivacyCurtain } from '@/components/curtain/PrivacyCurtain';
import { FeelDial } from '@/components/controls/FeelDial';
import { KnownGoodHomeSoundHost } from '@/components/audio/KnownGoodHomeSoundHost';
import { MeterSheet } from '@/components/modals/MeterSheet';
import { GrainOverlay } from '@/components/pockt/GrainOverlay';
import { ScreenFlashOverlay } from '@/components/outputs/ScreenFlashOverlay';
import { TorchHost } from '@/components/outputs/TorchHost';
import { AccentsScreen } from '@/components/screens/AccentsScreen';
import { ClassicLabScreen } from '@/components/screens/ClassicLabScreen';
import { DrumMachineScreen } from '@/components/screens/DrumMachineScreen';
import { PresetsScreen } from '@/components/screens/PresetsScreen';
import { SetlistsScreen } from '@/components/screens/SetlistsScreen';
import { StageScreen } from '@/components/screens/StageScreen';
import { BpmLookScreen } from '@/components/screens/BpmLookScreen';
import { LockInScreen } from '@/components/screens/LockInScreen';
import { AboutScreen } from '@/components/screens/AboutScreen';
import { LibraryScreen } from '@/components/screens/LibraryScreen';
import { PracticeScreen } from '@/components/screens/PracticeScreen';
import { SettingsScreen } from '@/components/screens/SettingsScreen';
import { TunerScreen } from '@/components/tuner/TunerScreen';
import { FeelReelScreen } from '@/components/selectors/FeelReelScreen';
import { SoundLibrarySheet } from '@/components/modals/SoundLibrarySheet';
import { SkinContext, useSkin } from '@/components/skins/SkinContext';
import { RoomReveal } from '@/components/skins/RoomReveal';
import { SkinBackdrop } from '@/components/skins/SkinWorld';
import { CORE_ROOMS, isCoreRoom } from '@/constants/core-rooms';
import { roomGeometry } from '@/constants/room-geometry';
import {
  FALLBACK_ROOM,
  isActiveRoomId,
  isClassicExperience,
  ROOMS,
  roomIdFromConfig,
} from '@/constants/rooms';
import { migrateCustomLayout, sanitizePhotoFit } from '@/lib/custom-layout';
import { flushActiveRecorder } from '@/lib/recorder-lifecycle';
import { subdivisionCaption } from '@/constants/meter';
import { NORTH_STAR_THEME, SKINS } from '@/constants/skins';
import { SOUNDS, familyForSound, resolvePlayableSound } from '@/constants/sounds';
import { isCountSample, resolveAccentPatch } from '@/lib/accent-sound';
import { pocketStepPatch, resolvePocketStep, type PocketStepId } from '@/constants/feel';
import { DEFAULT_CONFIG, SMART_MAX_BPM, SMART_MIN_BPM } from '@/constants/timing';
import { DIAL_MAX_BPM, DIAL_MIN_BPM } from '@/lib/pockt-dial-scale';
import { useDisplayPrefs } from '@/hooks/use-display-prefs';
import { useMetronome } from '@/hooks/use-metronome';
import { usePractice } from '@/hooks/use-practice';
import { beatTorch } from '@/lib/beat-torch';
import { hapticSelection, hapticTap } from '@/lib/haptics';
import { bindPocktControls } from '@/lib/pockt-control-contract';
import { crashBreadcrumb } from '@/lib/crash-trace';
import { beginSession, markSessionHealthy, SESSION_HEALTHY_AFTER_MS } from '@/lib/session-health';
import { instrumentFaceShort, isInstrumentFace, isPrimaryInstrumentFace } from '@/lib/instrument-faces';
import {
  migrateDisabledExperience,
  resolveLaunchView,
  shouldRestorePlaybackOnLaunch,
  viewSwitchPatch,
} from '@/lib/pockt-experience';
import { markPocketChosen, migratePocketDiscovery, needsFirstPocketChoice } from '@/lib/pockt-pockets';
import { DEFAULT_LIBRARY, rememberRecent, toggleFavorite, type LibraryState } from '@/lib/library';
import { DEFAULT_PRACTICE, type PracticeConfig } from '@/lib/practice';
import { resetPersistedSettings } from '@/lib/reset-all';
import { faceSwitchDetent, reviveUiDetent } from '@/lib/rotary-feedback';
import { sensoryFlags } from '@/lib/sensory';
import type { PracticePreset } from '@/lib/practice-presets';
import { restoreDefaultMeter } from '@/lib/accents';
import { roomSoundCaption } from '@/lib/room-voice';
import { loadLibrary, saveLibrary } from '@/storage/library';
import { loadPracticePresets, savePracticePresets } from '@/storage/practice-presets';
import type { MetronomeConfig, RoomId, SkinId } from '@/lib/types';
import { motionGain } from '@/lib/visual-pulse';

type Overlay =
  | 'settings'
  | 'sound'
  | 'time'
  | 'division'
  | 'feel'
  | 'accents'
  | 'lockin'
  | 'practice'
  | 'presets'
  | 'rhythm'
  | 'look'
  | 'display'
  | 'setlists'
  | 'stage'
  | 'lab'
  | 'drum'
  | 'library'
  | 'about'
  | 'tuner'
  | 'bar-controls'
  | 'views'
  | 'faces';
type AppView = 'home' | 'metronome';
type LaunchGate = 'blocked' | 'discover' | 'resume' | 'recover';

let processColdLaunch = true;

function practiceMixValue(draft: PracticeConfig): string {
  if (draft.rampEnabled) return `${draft.startBpm}→${draft.targetBpm}`;
  if (draft.sessionLimit === 'time') return 'TIMED';
  if (draft.sessionLimit === 'bars') return 'BY BARS';
  if (draft.sessionLimit === 'single') return 'SINGLE';
  return 'SESSION';
}

export function MainScreen() {
  const {
    config,
    update,
    setBpm,
    playing,
    transport,
    pulse,
    returnPulse,
    glow,
    pulseRole,
    pulseAccent,
    pulseBeat,
    pulseBeatHost,
    pulseSpb,
    pulseHostOffset,
    pulseCount,
    pulseLatency,
    tapFlash,
    hydrated,
    toggle,
    stop,
    tapTempo,
    pendingChange,
    previewSound,
    resetToDefaults,
    nativeAvailable,
    engineReady,
    engineError,
    runMathSelfTest,
    getDiagnostics,
    audioProbe,
    runAudioSanityTest,
    reclaimAudio,
    testKnownGoodHomeSound,
    restoredFromDisk,
  } = useMetronome();

  const [identVisible, setIdentVisible] = useState(false);
  const [identDone, setIdentDone] = useState(true);
  const [view, setView] = useState<AppView>('metronome');
  const [tunerOpen, setTunerOpen] = useState(false);
  const homeOpened = useRef(false);
  const [galleryRoomId, setGalleryRoomId] = useState<RoomId>(FALLBACK_ROOM);
  const [library, setLibrary] = useState<LibraryState>(DEFAULT_LIBRARY);
  const [discoverPockets, setDiscoverPockets] = useState(false);
  const [launchGate, setLaunchGate] = useState<LaunchGate>('blocked');
  const [enteredPocket, setEnteredPocket] = useState<RoomId | null>(null);
  const liveConfig = hydrated ? config : DEFAULT_CONFIG;
  const liveRoom = roomIdFromConfig(liveConfig);
  const galleryRoom = processColdLaunch ? FALLBACK_ROOM : galleryRoomId;
  const roomCaughtUp = enteredPocket == null || liveRoom === enteredPocket;
  const showInstrument = !identVisible && hydrated && launchGate === 'resume' && roomCaughtUp;

  useEffect(() => {
    if (!hydrated || !processColdLaunch) return;
    processColdLaunch = false;
    const migrated = migrateDisabledExperience(config);
    if (migrated) update(migrated);
    const launchConfig = migrated ? { ...config, ...migrated } : config;
    const launchView = resolveLaunchView(launchConfig);
    const foundationView: RoomId = 'dial';
    if (launchView !== foundationView) update(viewSwitchPatch(foundationView));
    setGalleryRoomId(foundationView);
    setView('metronome');
    void (async () => {
      const session = await beginSession(foundationView);
      try {
        const saved = await loadLibrary();
        const migratedLib = migratePocketDiscovery({ ...saved, launchBehavior: 'last' }, restoredFromDisk);
        setLibrary(migratedLib);
        if (needsFirstPocketChoice(migratedLib)) {
          setDiscoverPockets(false);
          setLaunchGate('resume');
          crashBreadcrumb('first-use-selector');
        } else if (session.recover) {
          setDiscoverPockets(false);
          setLaunchGate('resume');
          crashBreadcrumb('session-recover', { room: foundationView });
        } else {
          setLaunchGate('resume');
          crashBreadcrumb('resume-pocket', { room: foundationView });
        }
        if (migratedLib.pocketDiscoveryComplete !== saved.pocketDiscoveryComplete) {
          void saveLibrary(migratedLib);
        }
      } catch {
        setDiscoverPockets(false);
        setLaunchGate('resume');
        crashBreadcrumb('resume-pocket', { library: 'failed', room: foundationView });
      }
    })();
    if (shouldRestorePlaybackOnLaunch()) {
      /* Open → Play restores configuration only. Never auto-start. */
    }
  }, [hydrated, restoredFromDisk]);

  useEffect(() => {
    if (identDone && launchGate !== 'blocked') setIdentVisible(false);
  }, [identDone, launchGate]);

  useEffect(() => {
    if (!showInstrument) return;
    void SplashScreen.hideAsync();
  }, [showInstrument]);

  useEffect(() => {
    if (!showInstrument) return;
    const timer = setTimeout(() => {
      void markSessionHealthy(galleryRoomId);
      crashBreadcrumb('session-healthy', { room: galleryRoomId, gate: launchGate });
    }, SESSION_HEALTHY_AFTER_MS);
    return () => clearTimeout(timer);
  }, [galleryRoomId, launchGate, showInstrument]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void markSessionHealthy(galleryRoomId);
      }
    });
    return () => sub.remove();
  }, [galleryRoomId]);

  const goHome = () => {
    void (async () => {
      await flushActiveRecorder();
    })();
  };

  const switchInstrumentView = (id: RoomId) => {
    const next = isActiveRoomId(id) ? id : FALLBACK_ROOM;
    if (next !== liveRoom) faceSwitchDetent(sensoryFlags(liveConfig.sensoryMode).audio);
    homeOpened.current = true;
    crashBreadcrumb('pocket-enter', { room: next });
    setGalleryRoomId(next);
    setEnteredPocket(next);
    update(viewSwitchPatch(next));
    setLibrary((prev) => {
      const saved = markPocketChosen(rememberRecent(prev, next), next);
      void saveLibrary(saved);
      return saved;
    });
    setDiscoverPockets(false);
    setLaunchGate('resume');
    setView('metronome');
    reviveUiDetent();
  };

  return (
    <SkinContext.Provider value={NORTH_STAR_THEME}>
      <View style={styles.root}>
        {!identVisible ? <KnownGoodHomeSoundHost /> : null}
        {!identVisible && hydrated && view === 'home' ? (
          <View style={StyleSheet.absoluteFill}>
            <HomeScreen
              roomId={galleryRoom}
              customPhotoUri={liveConfig.customPhotoUri}
              customLayout={liveConfig.customLayout}
              onOpenTuner={() => {
                stop();
                setTunerOpen(true);
              }}
              library={library}
              onToggleFavorite={(id) => {
                setLibrary((prev) => {
                  const next = toggleFavorite(prev, id);
                  void saveLibrary(next);
                  return next;
                });
              }}
              onLibraryChange={(next) => {
                setLibrary(next);
                void saveLibrary(next);
              }}
              onEnter={(id) => switchInstrumentView(id)}
              onRoomFocused={(id) => {
                setGalleryRoomId(id);
              }}
              onCustomPhotoChange={(customPhotoUri) =>
                update({
                  customPhotoUri,
                  customLayout: applyCustomPhoto(liveConfig.customLayout, customPhotoUri),
                })
              }
              bpm={liveConfig.bpm}
            />
          </View>
        ) : null}

        {showInstrument && view === 'metronome' ? (
          <View style={styles.metronomeLayer}>
            <PocktExperienceShell
            config={config}
            update={update}
            setBpm={setBpm}
            playing={playing}
            transport={transport}
            pulse={pulse}
            returnPulse={returnPulse}
            glow={glow}
            pulseRole={pulseRole}
            pulseAccent={pulseAccent}
            pulseBeat={pulseBeat}
            pulseBeatHost={pulseBeatHost}
            pulseSpb={pulseSpb}
            pulseHostOffset={pulseHostOffset}
            pulseCount={pulseCount}
            pulseLatency={pulseLatency}
            tapFlash={tapFlash}
            toggle={toggle}
            stop={stop}
            tapTempo={tapTempo}
            pendingChange={pendingChange}
            previewSound={previewSound}
            resetToDefaults={resetToDefaults}
            nativeAvailable={nativeAvailable}
            engineReady={engineReady}
            engineError={engineError}
            runMathSelfTest={runMathSelfTest}
            getDiagnostics={getDiagnostics}
            audioProbe={audioProbe}
            runAudioSanityTest={runAudioSanityTest}
            testKnownGoodHomeSound={testKnownGoodHomeSound}
            onGoHome={goHome}
            onSwitchView={switchInstrumentView}
            library={library}
            onLibraryChange={(next) => {
              setLibrary(next);
              void saveLibrary(next);
            }}
            onOpenTuner={() => {
              crashBreadcrumb('tuner-enter');
              stop();
              setTunerOpen(true);
            }}
            discoverPockets={false}
            onPocketChosen={() => setDiscoverPockets(false)}
          />
          </View>
        ) : null}

        {tunerOpen ? (
          <TunerScreen
            visible
            a4={liveConfig.pitchPipeHz}
            onClose={() => {
              crashBreadcrumb('tuner-exit');
              setTunerOpen(false);
              reviveUiDetent();
            }}
          />
        ) : null}

      </View>
    </SkinContext.Provider>
  );
}

type StageProps = Omit<
  ReturnType<typeof useMetronome>,
  'hydrated' | 'start' | 'returnFlash' | 'runJsStress' | 'reclaimAudio' | 'runMetronomeSelfTest120' | 'restoredFromDisk'
> & {
  onGoHome: () => void;
  onSwitchView: (id: RoomId) => void;
  library: LibraryState;
  onLibraryChange: (next: LibraryState) => void;
  onOpenTuner: () => void;
  discoverPockets?: boolean;
  onPocketChosen?: () => void;
};

/**
 * Persistent POCKT 2.0 experience shell.
 * The View is the scene (InstrumentViewport). The controls are the system.
 */
function PocktExperienceShell({
  config,
  update,
  setBpm,
  playing,
  transport,
  pulse,
  returnPulse,
  glow,
  pulseRole,
  pulseAccent,
  pulseBeat,
  pulseBeatHost,
  pulseSpb,
  pulseHostOffset,
  tapFlash,
  toggle,
  stop,
  tapTempo,
  pendingChange,
  previewSound,
  resetToDefaults,
  nativeAvailable,
  engineReady,
  engineError,
  runMathSelfTest,
  getDiagnostics,
  audioProbe,
  runAudioSanityTest,
  testKnownGoodHomeSound,
  onSwitchView,
  library,
  onLibraryChange,
  onOpenTuner,
  discoverPockets = false,
  onPocketChosen,
}: StageProps) {
  const theme = useSkin();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const geo = roomGeometry(insets.top);
  const usable = height - insets.top - Math.max(insets.bottom, 10);
  const compact = usable < 700;
  const classicExperience = isClassicExperience(config);
  const roomId = roomIdFromConfig(config);
  const rigFace = roomId === 'rig';
  const instrumentShell = isPrimaryInstrumentFace(roomId);
  const mechanicalFace = roomId === 'pendula-classic';
  const beatlineFace = roomId === 'beatline';
  const fullBleedFace = instrumentShell;
  const whiskeyBar = roomId === 'bar' && ROOMS.bar.enabled === true;
  const [barVideoReady, setBarVideoReady] = useState(false);
  const barPendingStart = useRef(false);
  const coreSpec = !classicExperience && isCoreRoom(config.skin) ? CORE_ROOMS[config.skin] : null;
  const coreRoom = coreSpec != null;
  const [stack, setStack] = useState<Overlay[]>([]);
  const overlay = stack[stack.length - 1];
  const { prefs, updatePrefs, resetPrefs } = useDisplayPrefs();
  const [padOpen, setPadOpen] = useState(false);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const practice = usePractice({
    bpm: config.bpm,
    playing,
    transport,
    timeSignature: config.timeSignature,
    subdivision: config.subdivision,
    setBpm,
    ensurePlaying: () => {
      if (!playingRef.current) toggle();
    },
    liveMasks: {
      countInBars: config.countInBars,
      lockIn: config.lockIn,
      gapOnBars: config.gapOnBars,
      gapOffBars: config.gapOffBars,
      clickShift: config.clickShift,
      sparseMode: config.sparseMode,
    },
    onEnginePatch: update,
    onSessionEnd: () => stop(),
  });
  const [practicePresets, setPracticePresets] = useState<PracticePreset[]>([]);
  useEffect(() => {
    void loadPracticePresets().then(setPracticePresets);
  }, []);
  const [stageRef, setStageRef] = useState<{ setlistId: string | null; songId: string | null }>({
    setlistId: null,
    songId: null,
  });
  const [curtainClosed, setCurtainClosed] = useState(false);
  const [curtainCovering, setCurtainCovering] = useState(false);
  const [customEditing, setCustomEditing] = useState(false);
  const oneHandedChrome = config.oneHanded && !classicExperience && !customEditing;
  const gain = motionGain(config.visualPulse, config.visualMotion);
  const [roomReady, setRoomReady] = useState(!coreRoom);
  const stageOpacity = useSharedValue(coreRoom ? 0 : 1);
  const hintVisible =
    !overlay &&
    roomReady &&
    !pocketTutorialSeen(config) &&
    config.skin !== 'studio' &&
    config.skin !== 'altered' &&
    config.skin !== 'after-dark' &&
    config.skin !== 'bar';
  const dismissHint = useCallback(() => {
    markPocketTutorialSeen(config.skin, update);
  }, [config.skin, update]);

  useEffect(() => {
    if (!coreRoom || !coreSpec) {
      setRoomReady(true);
      stageOpacity.value = 1;
      return;
    }
    setRoomReady(false);
    stageOpacity.value = 0;
    stageOpacity.value = withDelay(
      Math.round(coreSpec.enterMs * 0.62),
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) })
    );
    const timer = setTimeout(() => {
      setRoomReady(true);
      reviveUiDetent();
    }, coreSpec.enterMs);
    return () => clearTimeout(timer);
  }, [config.skin, coreRoom, coreSpec, stageOpacity]);

  const stageStyle = useAnimatedStyle(() => ({
    opacity: stageOpacity.value,
  }));

  useEffect(() => {
    if (!discoverPockets) return;
    setStack((prev) => (prev[prev.length - 1] === 'views' ? prev : ['views']));
  }, [discoverPockets]);
  const open = (id: Overlay) => setStack((prev) => [...prev, id]);
  const close = () => setStack((prev) => prev.slice(0, -1));
  const closeMix = () => setStack([]);
  const setFeel = (step: PocketStepId) => update(pocketStepPatch(step));
  const pocketStep = resolvePocketStep(config.feel, config.feelDial);
  const controls = bindPocktControls({
    config,
    playing,
    toggle,
    stop,
    setBpm,
    tapTempo,
    update,
    activeViewId: roomId,
    switchView: onSwitchView,
    openViewSelector: () => open('views'),
    openHome: () => open('views'),
    openTuner: onOpenTuner,
    openSound: () => open('sound'),
    openMeter: () => open('time'),
    openMix: () => open('settings'),
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <SkinBackdrop
        skin={config.skin}
        glow={glow}
        pulse={pulse}
        pulseRole={pulseRole}
        pulseAccent={pulseAccent}
        pulseBeat={pulseBeat}
        playing={playing}
        visualPulse={config.visualPulse}
        motionGain={gain}
        feel={config.feel}
        skinCategory={config.skinCategory}
        classicBackdrop={config.classicBackdrop}
        customPhotoUri={config.customPhotoUri}
        customLayout={config.customLayout}
        photoMotion={config.photoMotion}
        bpm={config.bpm}
        accentPattern={config.accentPattern}
        onBarBpmPress={() => setPadOpen(true)}
        onBarAccentChange={(accentPattern) => update({ accentPattern })}
        onBarTapTempo={tapTempo}
        onBarOpenControls={() => {
          void hapticSelection();
          open('bar-controls');
        }}
        onBarTogglePlay={() => {
          if (!ROOMS.bar.enabled || !whiskeyBar) {
            toggle();
            return;
          }
          if (playing) {
            barPendingStart.current = false;
            toggle();
            return;
          }
          if (barVideoReady) {
            toggle();
            return;
          }
          barPendingStart.current = true;
        }}
        onBarVideoReady={(ready) => {
          if (!ROOMS.bar.enabled || !whiskeyBar) return;
          setBarVideoReady(ready);
          if (ready && barPendingStart.current && !playing) {
            barPendingStart.current = false;
            toggle();
          }
        }}
        barSafeBottom={Math.max(insets.bottom, 16)}
      />
      {whiskeyBar ? null : (
      <LinearGradient
        pointerEvents="none"
        colors={coreRoom ? ['rgba(0,0,0,0.16)', 'rgba(0,0,0,0)'] : ['rgba(0,0,0,0.28)', 'rgba(0,0,0,0)']}
        style={styles.topShade}
      />
      )}
      {coreRoom || whiskeyBar ? null : (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.32)']}
          style={styles.bottomShade}
        />
      )}
      <GrainOverlay opacity={theme.grain} />
      <RoomReveal
        key={config.skin}
        active={coreRoom}
        skin={config.skin}
      />
      {customEditing || overlay || whiskeyBar || instrumentShell ? null : (
        <ShellBezel
          onOpenViews={controls.openViewSelector}
          onOpenMix={controls.openMix}
          onOpenTuner={onOpenTuner}
          hideMix={false}
          faceLabel={isInstrumentFace(roomId) ? instrumentFaceShort(roomId) : undefined}
          onOpenFaces={() => open('faces')}
        />
      )}
      <Animated.View
        pointerEvents={overlay ? 'none' : whiskeyBar ? 'box-none' : 'auto'}
        style={[
          styles.stage,
          stageStyle,
          {
            paddingTop:
              customEditing || roomId === 'customized' || rigFace || fullBleedFace
                ? 0
                : mechanicalFace
                  ? geo.chromeTop + geo.navHeight
                  : whiskeyBar
                    ? geo.chromeTop + geo.navHeight + 6
                    : classicExperience
                      ? geo.bpmTop
                      : geo.chromeTop + 58,
            paddingBottom:
              customEditing || roomId === 'customized' || rigFace || fullBleedFace
                ? 0
                : Math.max(insets.bottom, whiskeyBar ? 16 : 18) + (whiskeyBar ? 6 : 14) + (oneHandedChrome ? 72 : 0),
            paddingHorizontal: customEditing || roomId === 'customized' || instrumentShell || rigFace || mechanicalFace || beatlineFace ? 0 : 20,
            justifyContent: whiskeyBar ? 'flex-end' : undefined,
          },
        ]}>
        {classicExperience ? (
          <InstrumentViewport
            config={config}
            prefs={prefs}
            compact={compact}
            playing={playing}
            transport={transport}
            pulse={pulse}
            pulseRole={pulseRole}
            pulseAccent={pulseAccent}
            pulseBeat={pulseBeat}
            pulseBeatHost={pulseBeatHost}
            pulseSpb={pulseSpb}
            pulseHostOffset={pulseHostOffset}
            tapFlash={tapFlash}
            setBpm={setBpm}
            toggle={toggle}
            stop={stop}
            tapTempo={tapTempo}
            pendingTimeSignature={pendingChange?.timeSignature ?? null}
            pendingSubdivision={pendingChange?.subdivision ?? null}
            previewSound={previewSound}
            onOpenPad={() => setPadOpen(true)}
            onOpenTime={() => open('time')}
            onOpenDivision={() => open('division')}
            onOpenSound={() => open('sound')}
            onOpenAccents={() => open('accents')}
            onOpenPractice={() => open('practice')}
            onOpenPresets={() => open('presets')}
            onOpenRhythm={() => open('rhythm')}
            onOpenSettings={() => open('settings')}
            onOpenSetlists={() => open('setlists')}
            onOpenStage={() => open('stage')}
            onOpenLab={() => open('lab')}
            onOpenDrum={() => open('drum')}
            onOpenTuner={onOpenTuner}
            onChangeAccents={(accentPattern) => update({ accentPattern })}
            onUpdate={update}
            onDisplayPrefsChange={updatePrefs}
            onHapticToggle={() => {
              void hapticSelection();
              update({ haptic: !config.haptic });
            }}
            onFlashToggle={() => {
              void hapticSelection();
              update({ flashOnBeat: !config.flashOnBeat });
            }}
            onCustomPhotoChange={(customPhotoUri) =>
              update({
                customPhotoUri,
                customLayout: applyCustomPhoto(config.customLayout, customPhotoUri),
              })
            }
            onGoHome={controls.openViewSelector}
            onOpenFaces={() => open('faces')}
            onSwitchFace={onSwitchView}
            onCustomEditingChange={setCustomEditing}
            glow={glow}
            returnPulse={returnPulse}
            motionGain={gain}
            hintVisible={hintVisible}
            onDismissHint={dismissHint}
          />
        ) : (
          <>
            {whiskeyBar ? null : (
            <InstrumentViewport
              config={config}
              prefs={prefs}
              compact={compact}
              playing={playing}
              transport={transport}
              pulse={pulse}
              pulseRole={pulseRole}
              pulseAccent={pulseAccent}
              pulseBeat={pulseBeat}
              pulseBeatHost={pulseBeatHost}
              pulseSpb={pulseSpb}
              pulseHostOffset={pulseHostOffset}
              tapFlash={tapFlash}
              setBpm={setBpm}
              toggle={toggle}
              stop={stop}
              tapTempo={tapTempo}
              pendingTimeSignature={pendingChange?.timeSignature ?? null}
              pendingSubdivision={pendingChange?.subdivision ?? null}
              previewSound={previewSound}
              onOpenPad={() => setPadOpen(true)}
              onOpenTime={() => open('time')}
              onOpenDivision={() => open('division')}
              onOpenSound={() => open('sound')}
              onOpenAccents={() => open('accents')}
              onOpenPractice={() => open('practice')}
              onOpenPresets={() => open('presets')}
              onOpenRhythm={() => open('rhythm')}
              onOpenSettings={() => open('settings')}
              onOpenSetlists={() => open('setlists')}
              onOpenStage={() => open('stage')}
              onOpenLab={() => open('lab')}
              onOpenDrum={() => open('drum')}
              onOpenTuner={onOpenTuner}
              onChangeAccents={(accentPattern) => update({ accentPattern })}
              onUpdate={update}
              onDisplayPrefsChange={updatePrefs}
              onHapticToggle={() => {
                void hapticSelection();
                update({ haptic: !config.haptic });
              }}
              onFlashToggle={() => {
                void hapticSelection();
                update({ flashOnBeat: !config.flashOnBeat });
              }}
              glow={glow}
              returnPulse={returnPulse}
              motionGain={gain}
              hintVisible={hintVisible}
              onDismissHint={dismissHint}
            />
            )}
            {whiskeyBar ? null : (
            <View>
              <BeatAccentStrip
                timeSignature={config.timeSignature}
                beatIndex={transport.beatIndex}
                playing={playing}
                silent={transport.silentMeasure}
                accentPattern={config.accentPattern}
                onChange={(accentPattern) => update({ accentPattern })}
                variant="room"
                compact={compact}
              />
            </View>
            )}
            {whiskeyBar ? null : (
              <ControlDeck
                compact
                bpm={config.bpm}
                playing={playing}
                prefs={prefs}
                invert={config.wheelInvert}
                tapFlash={tapFlash}
                meter={config.timeSignature}
                subdivision={subdivisionCaption(config.subdivision)}
                sound={SOUNDS[resolvePlayableSound(config.sound)].label}
                pulse={pulse}
                onOpenPad={() => setPadOpen(true)}
                onChangeBpm={setBpm}
                onToggle={toggle}
                onTap={() => {
                  void hapticTap();
                  tapTempo();
                }}
                onOpenMeter={() => open('time')}
                onOpenSubdivision={() => open('division')}
                onOpenSound={() => open('sound')}
              />
            )}
            {whiskeyBar ? null : (
              <FeelDial value={pocketStep} onChange={setFeel} />
            )}
          </>
        )}
      </Animated.View>

      <ScreenFlashOverlay
        enabled={config.flashScreenOnBeat}
        playing={playing}
        pulse={pulse}
        pulseRole={pulseRole}
      />
      <TorchHost
        enabled={config.flashOnBeat}
        playing={playing}
        explained={prefs.torchHintSeen}
        onExplained={() => updatePrefs({ torchHintSeen: true })}
      />

      {/* Privacy pull disabled this recovery pass: stationary P + zipper + overlapping nav targets. */}
      {false && (customEditing || rigFace ? null : (
        <PrivacyCurtain
          compact={compact}
          closed={curtainClosed}
          settleKey={roomId}
          onClosedChange={setCurtainClosed}
          onCoveringChange={setCurtainCovering}
          hintSeen={prefs.privacyHintSeen}
          onHintSeen={() => updatePrefs({ privacyHintSeen: true })}
        />
      ))}

      {overlay === 'bar-controls' ? (
        <BarControlsSheet
          visible
          timeValue={config.timeSignature}
          divisionValue={subdivisionCaption(config.subdivision)}
          soundValue={roomSoundCaption(config)}
          onOpenTime={() => open('time')}
          onOpenDivision={() => open('division')}
          onOpenSound={() => open('sound')}
          onClose={close}
        />
      ) : null}

      <BpmPadSheet
        visible={padOpen}
        bpm={config.bpm}
        minBpm={roomId === 'smart-pendulum' ? SMART_MIN_BPM : DIAL_MIN_BPM}
        maxBpm={roomId === 'smart-pendulum' ? SMART_MAX_BPM : DIAL_MAX_BPM}
        onChange={setBpm}
        onClose={() => setPadOpen(false)}
      />

      {overlay === 'settings' ? (
        <SettingsScreen
          visible
          config={config}
          onChange={update}
          onOpenSound={() => open('sound')}
          onOpenAccents={() => open('accents')}
          onOpenLockIn={() => open('lockin')}
          onOpenPractice={() => open('practice')}
          onOpenSetlists={() => open('setlists')}
          onOpenLab={() => open('lab')}
          onOpenDrum={() => open('drum')}
          onOpenStage={() => open('stage')}
          onOpenLibrary={() => open('library')}
          onOpenAbout={() => open('about')}
          onOpenTuner={() => {
            closeMix();
            onOpenTuner();
          }}
          practiceValue={practiceMixValue(practice.draft)}
          onOpenLook={() => setStack(['views'])}
          onOpenTime={() => open('time')}
          onOpenDivision={() => open('division')}
          onOpenFeel={() => open('feel')}
          onOpenBpmLook={() => open('display')}
          onCustomPhotoChange={(customPhotoUri) =>
            update({
              customPhotoUri,
              customLayout: applyCustomPhoto(config.customLayout, customPhotoUri),
            })
          }
          onResetDefaults={() => {
            resetToDefaults();
            resetPrefs();
          }}
          onResetAllSettings={() => {
            resetToDefaults();
            resetPrefs();
            onLibraryChange(DEFAULT_LIBRARY);
            practice.updateDraft(DEFAULT_PRACTICE);
            void resetPersistedSettings();
            reviveUiDetent();
          }}
          onClose={close}
          displayPrefs={prefs}
          onDisplayPrefsChange={updatePrefs}
          nativeAvailable={nativeAvailable}
          engineReady={engineReady}
          engineError={engineError}
          playing={playing}
          onMathSelfTest={runMathSelfTest}
          onLiveDiagnostics={getDiagnostics}
          onAudioProbe={audioProbe}
          onAudioSanityTest={runAudioSanityTest}
          onTestKnownGoodHomeSound={testKnownGoodHomeSound}
        />
      ) : null}
      {overlay === 'time' || overlay === 'division' || overlay === 'rhythm' ? (
        <MeterSheet
          visible
          value={config.timeSignature}
          subdivision={config.subdivision}
          focusSection={overlay === 'division' ? 'subdivision' : 'meter'}
          onChange={(timeSignature) => {
            update({ timeSignature });
          }}
          onSubdivisionChange={(subdivision) => {
            update({ subdivision });
          }}
          playing={playing}
          onRestore={() => update(restoreDefaultMeter())}
          onClose={close}
        />
      ) : null}
      {overlay === 'feel' ? (
        <FeelReelScreen
          visible
          value={pocketStep}
          onChange={setFeel}
          onSettled={(step) => {
            setFeel(step);
            closeMix();
          }}
          onClose={closeMix}
        />
      ) : null}
      {overlay === 'sound' ? (
        <SoundLibrarySheet
          visible
          roomId={roomId}
          sound={config.sound}
          recentSounds={config.recentSounds}
          favoriteSounds={config.favoriteSounds ?? []}
          soundDownbeat={config.soundDownbeat}
          soundBeat={config.soundBeat}
          soundSub={config.soundSub}
          accentMode={config.accentMode}
          customAccentSoundId={config.customAccentSoundId}
          onSound={(next) => {
            const selected = isCountSample(next) ? 'count' : next;
            const roles = resolveAccentPatch(selected, config.accentMode, config.customAccentSoundId);
            update({
              sound: selected,
              soundBank: familyForSound(next),
              hasUserChosenSound: true,
              ...roles,
              soundSub: null,
              recentSounds: [next, ...config.recentSounds.filter((id) => id !== next)].slice(0, 8),
              roomVoice: { ...config.roomVoice, [roomId]: next },
            });
          }}
          onFavorite={(id) => {
            const favs = config.favoriteSounds ?? [];
            update({
              favoriteSounds: favs.includes(id) ? favs.filter((item) => item !== id) : [id, ...favs].slice(0, 24),
            });
          }}
          onRoles={(patch) => update(patch)}
          onPreview={previewSound}
          playing={playing}
          onClose={closeMix}
        />
      ) : null}
      {overlay === 'accents' ? (
        <AccentsScreen
          visible
          timeSignature={config.timeSignature}
          pattern={config.accentPattern}
          config={config}
          onChange={(accentPattern) => update({ accentPattern })}
          onChangeConfig={update}
          accentColor={prefs.accentColor}
          accentSecondaryColor={prefs.accentSecondaryColor}
          accentStrongColor={prefs.accentStrongColor}
          onChangeAccentColor={(accentColor) => updatePrefs({ accentColor })}
          onChangeAccentSecondary={(accentSecondaryColor) => updatePrefs({ accentSecondaryColor })}
          onChangeAccentStrong={(accentStrongColor) => updatePrefs({ accentStrongColor })}
          onPreview={previewSound}
          onClose={close}
        />
      ) : null}
      {overlay === 'presets' ? (
        <PresetsScreen
          visible
          config={config}
          accentColor={prefs.accentColor}
          onLoad={(patch, nextPrefs) => {
            update(patch);
            if (nextPrefs) updatePrefs(nextPrefs);
          }}
          onClose={close}
        />
      ) : null}
      {overlay === 'setlists' ? (
        <SetlistsScreen
          visible
          config={config}
          onLoad={update}
          onOpenStage={(setlistId, songId) => {
            setStageRef({ setlistId, songId });
            open('stage');
          }}
          onClose={close}
        />
      ) : null}
      {overlay === 'stage' ? (
        <StageScreen
          visible
          setlistId={stageRef.setlistId}
          songId={stageRef.songId}
          playing={playing}
          bpm={config.bpm}
          countInBars={config.countInBars}
          keepAwake={config.keepAwake}
          onKeepAwake={(keepAwake) => update({ keepAwake })}
          onLoad={update}
          onToggle={toggle}
          onClose={close}
        />
      ) : null}
      {overlay === 'lab' ? (
        <ClassicLabScreen visible config={config} onChange={update} onClose={close} />
      ) : null}
      {overlay === 'drum' ? (
        <DrumMachineScreen
          visible
          timeSignature={config.timeSignature}
          pattern={config.accentPattern}
          onChange={(accentPattern) => update({ accentPattern })}
          onChangeConfig={update}
          onClose={close}
        />
      ) : null}
      {overlay === 'lockin' ? (
        <LockInScreen
          visible
          value={config.lockIn}
          onChange={(lockIn) => update({ lockIn })}
          onClose={close}
        />
      ) : null}
      {overlay === 'practice' ? (
        <PracticeScreen
          visible
          bpm={config.bpm}
          subdivision={config.subdivision}
          draft={practice.draft}
          active={practice.active}
          progress={practice.progress}
          barsLeft={practice.barsLeft}
          secondsLeft={practice.secondsLeft}
          sessionBarsLeft={practice.sessionBarsLeft}
          sessionSecondsLeft={practice.sessionSecondsLeft}
          presets={practicePresets}
          onChange={practice.updateDraft}
          onSavePreset={(preset) => {
            const next = [preset, ...practicePresets].slice(0, 40);
            setPracticePresets(next);
            void savePracticePresets(next);
          }}
          onLoadPreset={(preset) => practice.updateDraft(preset.config)}
          onStart={practice.startPractice}
          onStop={practice.stopPractice}
          onClose={close}
        />
      ) : null}
      {overlay === 'library' ? (
        <LibraryScreen
          visible
          library={library}
          config={config}
          onLibraryChange={onLibraryChange}
          onOpenRoom={(id) => {
            onSwitchView(id);
            closeMix();
          }}
          onOpenPresets={() => open('presets')}
          onOpenSetlists={() => open('setlists')}
          onOpenPractice={() => open('practice')}
          onClose={close}
        />
      ) : null}
      {overlay === 'about' ? (
        <AboutScreen
          visible
          onClose={close}
          onPrivacyShade={() => {
            closeMix();
            setCurtainClosed(true);
          }}
        />
      ) : null}
      {overlay === 'look' ? (
        <ViewSelectorSheet
          visible
          activeViewId={roomId}
          customPhotoUri={config.customPhotoUri}
          customLayout={config.customLayout}
          library={library}
          bpm={config.bpm}
          onSelect={(id) => {
            onSwitchView(id);
            closeMix();
          }}
          onClose={close}
        />
      ) : null}
      {overlay === 'display' ? (
        <BpmLookScreen
          visible
          bpm={config.bpm}
          prefs={prefs}
          onChange={updatePrefs}
          onClose={close}
        />
      ) : null}
      {overlay === 'views' ? (
        <ViewSelectorSheet
          visible
          activeViewId={roomId}
          customPhotoUri={config.customPhotoUri}
          customLayout={config.customLayout}
          library={library}
          bpm={config.bpm}
          discover={discoverPockets}
          onSelect={(id) => {
            onSwitchView(id);
            onPocketChosen?.();
            closeMix();
          }}
          onClose={discoverPockets ? () => {} : close}
        />
      ) : null}
      {overlay === 'faces' ? (
        <FacePicker
          visible
          activeId={roomId}
          onSelect={(id) => {
            onSwitchView(id);
            close();
          }}
          onClose={close}
        />
      ) : null}
    </View>
  );
}

function applyCustomPhoto(
  current: import('@/lib/custom-layout').CustomLayout | undefined,
  uri: string | null
) {
  const next = migrateCustomLayout(current, uri);
  if (uri) {
    return {
      ...next,
      background: { type: 'photo' as const, uri },
      photoFit: sanitizePhotoFit(next.photoFit ?? current?.photoFit),
    };
  }
  if (next.background.type === 'photo') {
    return { ...next, background: { type: 'pockt' as const, id: 'graphite' as const } };
  }
  return next;
}

function markPocketTutorialSeen(skin: SkinId, update: (patch: Partial<MetronomeConfig>) => void) {
  if (skin === 'classic') update({ hasSeenClassicTutorial: true });
  else if (skin === 'titanium') update({ hasSeenTitaniumTutorial: true });
  else if (skin === 'studio') update({ hasSeenStudioTutorial: true });
  else if (skin === 'altered') update({ hasSeenAlteredTutorial: true });
  else if (skin === 'after-dark') update({ hasSeenAfterDarkTutorial: true });
  else if (skin === 'bar') return;
  else if (skin === 'heavy') update({ hasSeenHeavyTutorial: true });
  else if (skin === 'roots') update({ hasSeenRootsTutorial: true });
  else if (skin === 'sundown') update({ hasSeenSundownTutorial: true });
  else update({ hasSeenHeartTutorial: true });
}

function pocketTutorialSeen(config: MetronomeConfig): boolean {
  if (config.skin === 'classic') return config.hasSeenClassicTutorial;
  if (config.skin === 'titanium') return config.hasSeenTitaniumTutorial;
  if (config.skin === 'studio') return config.hasSeenStudioTutorial;
  if (config.skin === 'altered') return config.hasSeenAlteredTutorial;
  if (config.skin === 'after-dark') return config.hasSeenAfterDarkTutorial;
  if (config.skin === 'bar') return true;
  if (config.skin === 'heavy') return config.hasSeenHeavyTutorial;
  if (config.skin === 'roots') return config.hasSeenRootsTutorial;
  if (config.skin === 'sundown') return config.hasSeenSundownTutorial;
  return config.hasSeenHeartTutorial;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050608',
  },
  homeHidden: {
    opacity: 0,
    zIndex: 0,
  },
  metronomeLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  transitionField: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6,
    backgroundColor: '#050608',
  },
  chrome: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    elevation: 40,
  },
  chromeTop: {
    top: 0,
  },
  chromeBottom: {
    bottom: 0,
  },
  topShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  bottomShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  stage: {
    flex: 1,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  top: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLarge: {
    height: 60,
  },
  topMark: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.82,
  },
  art: {
    flex: 1,
    minHeight: 120,
    marginTop: 4,
    marginBottom: 2,
    position: 'relative',
  },
  dialSlot: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  tempoName: {
    marginTop: -6,
    marginBottom: 4,
    fontSize: 15,
    letterSpacing: 2.4,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  classicMeta: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 4,
    minHeight: 56,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,246,250,0.12)',
    backgroundColor: 'rgba(12,14,18,0.42)',
  },
  classicStrip: {
    flex: 1,
    minHeight: 140,
    justifyContent: 'center',
    marginVertical: 8,
  },
  transport: {
    marginTop: 4,
    marginBottom: 4,
  },
  barThumb: {
    marginTop: 4,
    marginBottom: 0,
    gap: 8,
    alignItems: 'center',
  },
  barThumbMeta: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barControlsBtn: {
    minWidth: 96,
    height: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barControlsLabel: {
    fontSize: 12,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  params: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 8,
    marginBottom: 2,
    minHeight: 68,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(8,6,5,0.48)',
  },
  param: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 60,
  },
  paramRule: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  paramLabel: {
    fontSize: 13,
    letterSpacing: 2.2,
    fontWeight: '800',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  paramValue: {
    fontSize: 16,
    letterSpacing: 0.6,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});
