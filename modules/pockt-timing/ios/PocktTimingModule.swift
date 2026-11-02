import ExpoModulesCore
import Foundation

struct PocktTimingConfigRecord: Record {
  @Field
  var bpm: Double = 120

  @Field
  var timeSignature: String = "4/4"

  @Field
  var subdivision: String = "quarter"

  @Field
  var feel: String = "straight"

  @Field
  var feelDial: Double = 0

  @Field
  var sound: String = "pockt-studio"

  @Field
  var soundDownbeat: String = ""

  @Field
  var soundBeat: String = ""

  @Field
  var soundSub: String = ""

  @Field
  var voiceCount: Bool = false

  @Field
  var volume: Double = 0.8

  @Field
  var haptic: Bool = true

  @Field
  var hapticSyncMs: Double = 0

  /// Beat haptic strength: 0.6 light, 1 standard, 1.3 heavy, 2 maximum.
  @Field
  var hapticStrength: Double = 1

  @Field
  var accentPattern: [String] = ["accent", "normal", "normal", "normal"]

  @Field
  var lockIn: String = "full"

  @Field
  var skin: String = "studio"

  @Field
  var countInBars: Int = 0

  @Field
  var clickShift: Int = 0

  @Field
  var sparseMode: String = "all"

  @Field
  var pan: Double = 0

  @Field
  var accentVolume: Double = 1

  @Field
  var subVolume: Double = 0.72

  @Field
  var swing: String = "straight"

  @Field
  var polyA: Int = 0

  @Field
  var polyB: Int = 0

  @Field
  var mixWithOthers: Bool = true

  @Field
  var headphoneStop: Bool = false
}

public class PocktTimingModule: Module {
  private let engine = PocktTimingEngine()
  private var lastConfig = PocktEngineConfig.default
  private var nowPlayingArmed = false

  public func definition() -> ModuleDefinition {
    Name("PocktTiming")

    Events("onTick", "onEngineState", "onTunerPitch")

    Constant("isNativeEngine") { () -> Bool in
      return true
    }

    Constant("lookAheadSeconds") { () -> Double in
      return self.lookAheadSecondsValue()
    }

    OnCreate {
      self.bindEngineCallbacks()
      self.bindNowPlaying()
    }

    OnDestroy {
      self.handleDestroy()
    }

    Function("isAvailable") { () -> Bool in
      return self.handleIsAvailable()
    }

    Function("isRunning") { () -> Bool in
      return self.handleIsRunning()
    }

    Function("visualHostSeconds") { () -> Double in
      return self.engine.visualHostSeconds()
    }

    Function("engineInfo") { () -> [String: Any] in
      return self.handleEngineInfo()
    }

    AsyncFunction("prepare") { (uris: [String: String]?) -> [String: Any] in
      return try self.handlePrepare(uris ?? [:])
    }.runOnQueue(.main)

    AsyncFunction("start") { (config: PocktTimingConfigRecord) -> [String: Any] in
      return try self.handleStart(config)
    }.runOnQueue(.main)

    Function("stop") { () -> Void in
      self.handleStop()
    }

    Function("setConfig") { (config: PocktTimingConfigRecord) -> Void in
      self.handleSetConfig(config)
    }

    Function("setMasterGain") { (volume: Double) -> Void in
      self.runOnMain {
        self.engine.setMasterGain(volume)
      }
    }

    Function("preview") { (sound: String, volume: Double) -> Void in
      self.handlePreview(sound: sound, volume: volume)
    }

    Function("resetDiagnostics") { () -> Void in
      self.handleResetDiagnostics()
    }

    Function("getDiagnostics") { () -> [String: Any] in
      return self.handleGetDiagnostics()
    }

    Function("audioProbe") { () -> [String: Any] in
      return self.engine.audioProbe()
    }

    AsyncFunction("reclaimSession") { () -> [String: Any] in
      return try self.engine.reclaimSession()
    }.runOnQueue(.main)

    AsyncFunction("restorePlaybackGraph") { () -> [String: Any] in
      return try self.engine.restorePlaybackGraph(reloadClicks: false)
    }.runOnQueue(.main)

    Function("armPendulumStart") { (pickupBeats: Double) -> Void in
      self.engine.armPendulumStart(pickupBeats: pickupBeats, playCue: true)
    }

    Function("armPendulumStartSilent") { (pickupBeats: Double) -> Void in
      self.engine.armPendulumStart(pickupBeats: pickupBeats, playCue: false)
    }

    AsyncFunction("audioLifecycleStress") { () -> [String: Any] in
      return try self.engine.audioLifecycleStress()
    }.runOnQueue(.main)

    AsyncFunction("audioSanityTest") { () -> [String: Any] in
      return try self.engine.audioSanityTest()
    }.runOnQueue(.main)

    AsyncFunction("metronomeSelfTest120") { () -> [String: Any] in
      return try self.engine.metronomeSelfTest120()
    }.runOnQueue(.main)

    AsyncFunction("runAudioSanityTest") { (sound: String, volume: Double) -> [String: Any] in
      return try self.engine.runAudioSanityTest(sound: sound, volume: volume)
    }.runOnQueue(.main)

    AsyncFunction("runMathSelfTest") { (durationSeconds: Double, sampleRate: Double) -> [String: Any] in
      return self.handleMathSelfTest(durationSeconds: durationSeconds, sampleRate: sampleRate)
    }

    AsyncFunction("runPrecisionSuite") { () -> [String: Any] in
      return self.engine.precisionDiagnosticSuite()
    }

    Function("hapticLimitationNote") { () -> String in
      return self.handleHapticLimitationNote()
    }

    Function("logBreadcrumb") { (identity: String, extra: [String: Any]?) in
      var payload = ""
      if let extra, !extra.isEmpty {
        payload = " \(extra)"
      }
      NSLog("[POCKT CRASH] %@%@", identity, payload)
    }

    Function("playIdentFinalRumble") { () -> Void in
      PocktIdentHaptics.playFinalRumble()
    }

    Function("stopIdentHaptics") { () -> Void in
      PocktIdentHaptics.stop()
    }

    Function("playUiDetent") { (kind: String, playAudio: Bool, playHaptic: Bool) -> Bool in
      if Thread.isMainThread {
        return self.engine.playUiDetent(kind: kind, playAudio: playAudio, playHaptic: playHaptic)
      }
      NSLog("[POCKT CRASH] detent-off-main")
      DispatchQueue.main.async { [weak self] in
        _ = self?.engine.playUiDetent(kind: kind, playAudio: playAudio, playHaptic: playHaptic)
      }
      return true
    }

    Function("prepareUiDetent") { () -> Void in
      self.runOnMain {
        self.engine.prepareUiDetent()
      }
    }

    Function("playReferenceTone") { (frequency: Double) -> Void in
      self.runOnMain {
        self.engine.playReferenceTone(frequency: frequency)
      }
    }

    Function("playTuneConfirm") { () -> Void in
      self.runOnMain {
        self.engine.playTuneConfirm()
      }
    }

    AsyncFunction("setInputCapture") { (enabled: Bool) -> Bool in
      try self.engine.setInputCapture(enabled)
      return enabled
    }.runOnQueue(.main)

    AsyncFunction("loopPrepare") { () -> Bool in
      return try self.engine.loopPrepare()
    }.runOnQueue(.main)

    AsyncFunction("loopArm") { (startMeasure: Int) -> Bool in
      return try self.engine.loopArm(startMeasure: startMeasure)
    }.runOnQueue(.main)

    AsyncFunction("loopFinalize") { (endMeasure: Int, jsStartHost: Double, jsEndHost: Double) -> [String: Any] in
      return self.engine.loopFinalize(endMeasure: endMeasure, jsStartHost: jsStartHost, jsEndHost: jsEndHost)
    }.runOnQueue(.main)

    AsyncFunction("loopArmLayer") { () -> Bool in
      return try self.engine.loopArmLayer()
    }.runOnQueue(.main)

    AsyncFunction("loopFinalizeLayer") { (passStartMeasure: Int, jsStartHost: Double, jsEndHost: Double) -> [String: Any] in
      return self.engine.loopFinalizeLayer(passStartMeasure: passStartMeasure, jsStartHost: jsStartHost, jsEndHost: jsEndHost)
    }.runOnQueue(.main)

    AsyncFunction("loopCancelLayer") { () -> Bool in
      self.engine.loopCancelLayer()
      return true
    }.runOnQueue(.main)

    AsyncFunction("loopUndo") { () -> [String: Any] in
      return self.engine.loopUndo()
    }.runOnQueue(.main)

    AsyncFunction("loopRedo") { () -> [String: Any] in
      return self.engine.loopRedo()
    }.runOnQueue(.main)

    AsyncFunction("loopSetLayerMuted") { (index: Int, muted: Bool) -> Bool in
      return self.engine.loopSetLayerMuted(index, muted)
    }.runOnQueue(.main)

    AsyncFunction("loopDeleteLayer") { (index: Int) -> [String: Any] in
      return self.engine.loopDeleteLayer(index)
    }.runOnQueue(.main)

    AsyncFunction("loopPlay") { (fromMeasure: Int) -> Bool in
      return self.engine.loopPlay(fromMeasure: fromMeasure)
    }.runOnQueue(.main)

    AsyncFunction("loopHalt") { () -> Bool in
      self.engine.loopHalt()
      return true
    }.runOnQueue(.main)

    AsyncFunction("loopClear") { () -> Bool in
      self.engine.loopClear()
      return true
    }.runOnQueue(.main)

    AsyncFunction("loopRelease") { () -> Bool in
      self.engine.loopReleaseInput()
      return true
    }.runOnQueue(.main)

    AsyncFunction("loopInfo") { () -> [String: Any] in
      return self.engine.loopInfo()
    }.runOnQueue(.main)

    AsyncFunction("startTuner") { () -> [String: Any] in
      return try self.engine.startTuner()
    }.runOnQueue(.main)

    AsyncFunction("stopTuner") { () -> Bool in
      self.engine.stopTuner()
      return true
    }.runOnQueue(.main)
  }

  private func lookAheadSecondsValue() -> Double {
    return PocktTimingEngine.lookAheadSeconds
  }

  private func bindNowPlaying() {
    if nowPlayingArmed { return }
    nowPlayingArmed = true
    PocktNowPlaying.shared.onPlay = { [weak self] in
      guard let self else { return false }
      do {
        _ = try self.engine.start(with: self.lastConfig)
        self.publishNowPlaying(playing: true)
        return true
      } catch {
        return false
      }
    }
    PocktNowPlaying.shared.onPause = { [weak self] in
      self?.engine.stop()
      self?.publishNowPlaying(playing: false)
    }
  }

  private func publishNowPlaying(playing: Bool) {
    PocktNowPlaying.shared.publish(
      playing: playing,
      bpm: lastConfig.bpm,
      soundLabel: lastConfig.sound
    )
  }

  private func bindEngineCallbacks() {
    engine.onTick = { [weak self] payload in
      guard let self else { return }
      self.emitTick(payload)
    }
    engine.onState = { [weak self] payload in
      self?.emitEngineState(payload)
    }
    engine.onTunerPitch = { [weak self] payload in
      self?.emitTunerPitch(payload)
    }
  }

  private func emitTick(_ payload: [String: Any]) {
    if Thread.isMainThread {
      sendEvent("onTick", payload)
      return
    }
    NSLog("[POCKT CRASH] tick-off-main")
    DispatchQueue.main.async { [weak self] in
      self?.sendEvent("onTick", payload)
    }
  }

  private func emitEngineState(_ payload: [String: Any]) {
    if Thread.isMainThread {
      sendEvent("onEngineState", payload)
      return
    }
    NSLog("[POCKT CRASH] engine-state-off-main")
    DispatchQueue.main.async { [weak self] in
      self?.sendEvent("onEngineState", payload)
    }
  }

  private func emitTunerPitch(_ payload: [String: Any]) {
    if Thread.isMainThread {
      sendEvent("onTunerPitch", payload)
      return
    }
    NSLog("[POCKT CRASH] tuner-pitch-off-main")
    DispatchQueue.main.async { [weak self] in
      self?.sendEvent("onTunerPitch", payload)
    }
  }

  private func handleDestroy() {
    // Process/runtime teardown only. Room and HOME navigation must never reach here.
    engine.teardown()
  }

  private func handleIsAvailable() -> Bool {
    return true
  }

  private func handleIsRunning() -> Bool {
    return engine.isRunning
  }

  private func handleEngineInfo() -> [String: Any] {
    var info: [String: Any] = engine.nativeState()
    info["isNativeEngine"] = true
    info["hapticHardwareMinIntervalMs"] = 45
    info["hapticLimitation"] =
      "Core Haptics / Taptic Engine cannot reliably render a distinct transient for every event at extreme 16th-note rates. Audio scheduling is never thinned to match haptic hardware."
    return info
  }

  private func handlePrepare(_ uris: [String: String]) throws -> [String: Any] {
    try engine.prepare(uris: uris)
    return engine.audioProbe()
  }

  private func handleStart(_ record: PocktTimingConfigRecord) throws -> [String: Any] {
    lastConfig = engineConfig(from: record)
    let report = try engine.start(with: lastConfig)
    publishNowPlaying(playing: true)
    return report
  }

  private func handleStop() {
    runOnMain {
      self.engine.stop()
      self.publishNowPlaying(playing: false)
    }
  }

  private func handleSetConfig(_ record: PocktTimingConfigRecord) {
    runOnMain {
      self.lastConfig = self.engineConfig(from: record)
      self.engine.applyConfig(self.lastConfig)
      if self.engine.isRunning {
        self.publishNowPlaying(playing: true)
      }
    }
  }

  private func handlePreview(sound: String, volume: Double) {
    runOnMain {
      self.engine.preview(sound: sound, volume: volume)
    }
  }

  private func handleResetDiagnostics() {
    engine.diagnostics.reset()
  }

  private func handleGetDiagnostics() -> [String: Any] {
    return engine.liveDiagnostics()
  }

  private func handleMathSelfTest(durationSeconds: Double, sampleRate: Double) -> [String: Any] {
    let safeDuration: Double = durationSeconds > 0 ? durationSeconds : 60
    let safeRate: Double = sampleRate > 0 ? sampleRate : 48000
    return PocktMathSelfTest.run(
      durationSeconds: safeDuration,
      sampleRate: safeRate
    )
  }

  private func handleHapticLimitationNote() -> String {
    return "Audio remains sample-accurate at 1–900 BPM including 900 BPM 16ths. Core Haptics is scheduled natively from the same musical timeline, but the Taptic Engine cannot cleanly distinguish transients closer than about 45 ms. At high event rates POCKT keeps audio intact and drops surplus haptic transients."
  }

  private func engineConfig(from record: PocktTimingConfigRecord) -> PocktEngineConfig {
    var config = PocktEngineConfig.default
    config.bpm = min(900, max(1, record.bpm))
    config.timeSignature = record.timeSignature
    config.subdivision = record.subdivision
    config.feel = record.feel
    config.feelDial = min(1, max(-1, record.feelDial))
    config.sound = record.sound
    config.soundDownbeat = record.soundDownbeat
    config.soundBeat = record.soundBeat
    config.soundSub = record.soundSub
    config.voiceCount = record.voiceCount
    config.volume = min(1, max(0, record.volume))
    config.haptic = record.haptic
    config.hapticSyncMs = min(60, max(-60, record.hapticSyncMs))
    config.hapticStrength = min(2, max(0.3, record.hapticStrength))
    config.accentPattern = record.accentPattern
    config.lockIn = record.lockIn
    config.skin = record.skin
    config.countInBars = min(4, max(0, record.countInBars))
    config.clickShift = min(3, max(0, record.clickShift))
    config.sparseMode = record.sparseMode
    config.pan = min(1, max(-1, record.pan))
    config.accentVolume = min(1, max(0, record.accentVolume))
    config.subVolume = min(1, max(0, record.subVolume))
    config.swing = record.swing
    config.polyA = min(12, max(0, record.polyA))
    config.polyB = min(12, max(0, record.polyB))
    config.mixWithOthers = record.mixWithOthers
    config.headphoneStop = record.headphoneStop
    return config
  }

  private func runOnMain(_ work: @escaping () -> Void) {
    if Thread.isMainThread {
      work()
      return
    }
    DispatchQueue.main.async(execute: work)
  }
}
