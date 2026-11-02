import AVFoundation
import Foundation

enum PocktTransportLifecycle: String {
  case idle
  case starting
  case playing
  case stopped
  case previewing
  case tunerInput
  case recording
  case interrupted
  case recovering
}

final class PocktTimingEngine {
  static let chunkDurationSeconds = PocktAudioChunkRenderer.chunkDurationSeconds
  static let initialQueuedSeconds = PocktTransportMath.lookAheadSeconds
  static let minQueuedSeconds = PocktTransportMath.lookAheadSeconds
  static let targetQueuedSeconds = PocktTransportMath.lookAheadSeconds
  static let maxQueuedSeconds = 0.6
  static let refillIntervalMs = PocktTransportMath.refillIntervalMs
  static var lookAheadSeconds: Double { PocktTransportMath.lookAheadSeconds }

  func visualHostSeconds() -> Double {
    AVAudioTime.seconds(forHostTime: mach_absolute_time())
  }

  /// Replaced with a fresh engine whenever the microphone is released: an engine that has touched its
  /// input node keeps it in the graph, and after the tuner or a take that left Play dead until relaunch.
  private var engine = AVAudioEngine()
  private var engineConfigObserver: NSObjectProtocol?
  private let player = AVAudioPlayerNode()
  private let previewPlayer = AVAudioPlayerNode()
  /// Three dedicated UI-detent nodes. Rapid restarts on a single node
  /// leave AVAudioPlayerNode silently dead after a long adjustment.
  private let uiClickPlayers = [AVAudioPlayerNode(), AVAudioPlayerNode(), AVAudioPlayerNode()]
  private var uiClickIndex = 0
  private var previewGeneration: UInt64 = 0
  private var lastUiClickMs: Double = 0
  private var uiDialBuffer: AVAudioPCMBuffer?
  private var uiProBuffer: AVAudioPCMBuffer?
  private var uiRollerBuffer: AVAudioPCMBuffer?
  private var uiClickSampleRate: Double = 0
  private var uiClickChannels: AVAudioChannelCount = 0
  private let clicks = PocktClickBank()
  private let haptics = PocktHapticScheduler()
  let diagnostics = PocktDiagnostics()

  /// The click scheduler runs here, never on the main thread: a busy UI (a face mounting, a sheet opening)
  /// must not be able to starve it. Every read and write of the scheduler state holds `sched`.
  private let renderQueue = DispatchQueue(label: "com.pockt.timing.chunks", qos: .userInteractive)
  let sched = NSRecursiveLock()
  private var refillTimer: DispatchSourceTimer?
  private var recoverQueued = false
  // the beat grid in host time, so a graph restart (mic on, route change) resumes on the same grid
  private var gridAnchorTick: Int64 = -1
  private var gridAnchorHost: Double = 0
  private var gridAnchorSpt: Double = 0.5
  private var gridLostTicks: Int = 0
  private var missedTicks: Int = 0
  // the shared microphone tap (tuner and looper), and the clicks the tuner must not hear as notes
  private var micTap = false
  private var tunerMeasurement = false
  private var tunerAccum = [Float](repeating: 0, count: 4096)
  private var tunerAccumCount = 0
  private var tunerSinceAnalysis = 0
  private var tunerFeedBuffer: AVAudioPCMBuffer?
  private var clickHostRing = [Double](repeating: 0, count: 16)
  private var clickHostIdx = 0
  private var clickGuardActive = false

  private var config = PocktEngineConfig.default
  private var generation: UInt64 = 0
  private var running = false
  /// The looper: records the mic and plays it back locked to the click's own sample timeline.
  fileprivate let loop = PocktLoopState()
  private var prepared = false

  private var sampleRate: Double = 44100
  private var nextChunkStartSample: Int64 = 0
  private var scheduledThroughSample: Int64 = 0
  private var queuedChunkCount: Int = 0
  private var nextMusicalEventIndex: Int64 = 0
  private var nextControlEventIndex: Int64 = 0
  private var lastHapticSeconds: Double?
  private var visualOriginHostTime: UInt64 = 0
  private var interruptionObservers: [NSObjectProtocol] = []
  private var scheduledAudioCount: Int = 0
  private var scheduledEventCount: Int = 0
  private var beatEventsEmitted: Int = 0
  private var refillCount: Int = 0
  private var playerStartedThisGeneration = false
  private var playerPlayCalled = false
  private var missingSoundLogged: Set<String> = []
  private var lastPrepareReport: [String: Any] = [:]
  private var clickUris: [String: String] = [:]
  private var sessionActivated = false
  private var inputCapture = false
  private var tunerTapInstalled = false
  private var tunerConfirmMuteUntil: TimeInterval = 0
  private var tunerLive = false
  private var tunerBuffersReceived = 0
  private var tunerLastRms: Double = 0
  private var tunerInputSampleRate: Double = 0
  private var tunerInputChannels = 0
  private var startInFlight = false
  private var firstChunkFrameCount: Int = 0
  private var firstChunkPeakAmplitude: Float = 0
  private var firstChunkNonZeroSampleCount: Int = 0
  private var initialEventSamples: [Int64] = []
  private var initialEventIndexes: [Int64] = []
  private var initialEventAccents: [String] = []
  private var firstChunkBuffer: AVAudioPCMBuffer?
  private var hapticScheduleAttempts: Int = 0
  private var hapticScheduleFailures: Int = 0
  private var playerSampleAdvanced = false
  private var architecture = PocktTransportMath.architecture
  private var tempoSegments: [PocktTempoSegment] = [PocktTransportMath.initialSegment(bpm: 120, ticksPerBeat: 1)]
  private var lastScheduledTick: Int64?
  private var bpmChangeCount: Int = 0
  private var playerStopForTempoCount: Int = 0
  private var tempoRestartCount: Int = 0
  private var lastKnownPlayerSample: Int64 = 0
  private var originSample: Int64 = 0
  private var tunerLastFrequency: Double = 0
  private var tunerLastConfidence: Double = 0
  private var lifecycle = PocktTransportLifecycle.idle
  private var pendingPickupBeats: Double = 0
  private var pendingStartCue = false
  private var lastAudioLifecycleOp = "idle"

  var onTick: (([String: Any]) -> Void)?
  var onState: (([String: Any]) -> Void)?
  var onTunerPitch: (([String: Any]) -> Void)?

  var isRunning: Bool { running }
  var currentGeneration: UInt64 { generation }
  var hapticsSupported: Bool { haptics.supported }
  var currentSampleRate: Double { sampleRate }
  var currentConfig: PocktEngineConfig { config }

  deinit {
    teardown()
  }

  func prepare(uris: [String: String] = [:]) throws {
    sched.lock()
    defer { sched.unlock() }
    clickUris = uris
    lastPrepareReport = try bootAudioGraph(reloadClicks: true)
    safeHapticsPrepare()
    installObserversIfNeeded()
    prepared = true
    NSLog(
      "[POCKT] prepare complete engineRunning=%d playerPlaying=%d defaultBuffer=%d architecture=%@",
      engine.isRunning ? 1 : 0,
      player.isPlaying ? 1 : 0,
      clicks.defaultNormalBuffer != nil ? 1 : 0,
      architecture
    )
  }

  func reclaimSession() throws -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    _ = try restorePlaybackGraph(reloadClicks: !clicks.isLoaded)
    NSLog(
      "[POCKT] session reclaimed engineRunning=%d playerPlaying=%d lifecycle=%@",
      engine.isRunning ? 1 : 0,
      player.isPlaying ? 1 : 0,
      lifecycle.rawValue
    )
    return audioProbe()
  }

  /// One-shot pendulum start: optional cue, then first musical click at the first endpoint.
  func armPendulumStart(pickupBeats: Double, playCue: Bool = true) {
    sched.lock()
    defer { sched.unlock() }
    pendingPickupBeats = min(1, max(0, pickupBeats))
    pendingStartCue = playCue && pendingPickupBeats > 0
  }

  func applyConfig(_ next: PocktEngineConfig) {
    sched.lock()
    defer { sched.unlock() }
    let previous = config
    config = next
    guard running else { return }
    setMasterGain(next.volume)
    player.pan = Float(next.pan)
    let tempoChanged = previous.bpm != next.bpm
    let meterChanged =
      previous.timeSignature != next.timeSignature
      || previous.subdivision != next.subdivision
    let feelChanged =
      previous.feel != next.feel
      || previous.feelDial != next.feelDial
      || previous.swing != next.swing
    let soundChanged =
      previous.sound != next.sound
      || previous.soundDownbeat != next.soundDownbeat
      || previous.soundBeat != next.soundBeat
      || previous.soundSub != next.soundSub

    if soundChanged {
      NSLog("[POCKT] live sound %@ -> %@ after committed tick %@", previous.sound, next.sound, lastScheduledTick.map { String($0) } ?? "nil")
      // Already queued PCM keeps the previous click. The next uncommitted tick
      // reads config.sound. The player, origin, and beat index stay put.
      scheduleUntilHorizon(generation: generation)
    } else if tempoChanged || meterChanged || feelChanged {
      applyPhaseContinuousTempo()
    }
    if tempoChanged {
      bpmChangeCount += 1
      NSLog(
        "[POCKT] phase-continuous BPM %g -> %g lastTick=%@ stopCount=%d",
        previous.bpm,
        next.bpm,
        lastScheduledTick.map { String($0) } ?? "nil",
        playerStopForTempoCount
      )
    }
  }

  /// Live tempo/meter change. Never stops the player. Never resets beat/bar index.
  /// New spacing applies after the last already-committed click (inside the 220 ms horizon).
  private func applyPhaseContinuousTempo() {
    guard running else { return }
    let committed = lastScheduledTick
    PocktTransportMath.applyTempo(
      segments: &tempoSegments,
      lastScheduledTick: committed,
      newBpm: config.bpm,
      ticksPerBeat: config.ticksPerBeat,
      sampleRate: sampleRate
    )
    NSLog(
      "[POCKT] tempo segment applied bpm=%g committedTick=%@ queuedAhead=%.3fs",
      config.bpm,
      committed.map { String($0) } ?? "nil",
      queuedSecondsRemaining()
    )
    scheduleUntilHorizon(generation: generation)
  }

  @discardableResult
  func start(with next: PocktEngineConfig) throws -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    lifecycle = .starting
    // The tuner keeps listening when Play is pressed: the click joins the open graph.
    if inputCapture && !loop.wantsInput && !tunerLive {
      NSLog("[POCKT] start releasing leftover input capture before playback")
      inputCapture = false
      _ = try restorePlaybackGraph(reloadClicks: false)
    }
    cancelPreview()
    if startInFlight {
      NSLog("[POCKT] start rejected; start already in flight")
      throw NSError(
        domain: "PocktTiming",
        code: 31,
        userInfo: [NSLocalizedDescriptionKey: "Native start already in flight"]
      )
    }
    let playerLive = player.isPlaying && currentPlayerSample() != nil
    if running && engine.isRunning && playerLive && scheduledEventCount > 0 {
      if queuedSecondsRemaining() < 0.04 || clicks.defaultNormalBuffer == nil {
        NSLog("[POCKT] start recovered silent/stale player; rescheduling from live sample")
        lastAudioLifecycleOp = "start-recover-queue"
        lifecycle = .recovering
        try beginChunkPlayback()
        lifecycle = .playing
        return startReport()
      }
      applyConfig(next)
      lifecycle = .playing
      lastAudioLifecycleOp = "start-idempotent"
      NSLog("[POCKT] start idempotent; already running generation=%llu", generation)
      return startReport()
    }
    startInFlight = true
    defer { startInFlight = false }

    config = next
    NSLog("[POCKT] entering native metronome start")
    NSLog("[POCKT] architecture %@", architecture)
    NSLog("[POCKT] BPM %g", next.bpm)
    NSLog("[POCKT] subdivision %@", next.subdivision)
    NSLog("[POCKT] meter %@", next.timeSignature)
    NSLog("[POCKT] sound ID %@", next.sound)

    func enterPlayback() throws {
      _ = try restorePlaybackGraph(
        reloadClicks: !prepared || !clicks.isLoaded
          || clicks.needsReload(for: engine.mainMixerNode.outputFormat(forBus: 0))
      )
      engine.mainMixerNode.outputVolume = clampedAudibleVolume(next.volume)
      player.volume = 1
      player.pan = Float(next.pan)
      safeHapticsRestart()
      try beginChunkPlayback()
    }

    do {
      try enterPlayback()
    } catch {
      NSLog("[POCKT] first beginChunkPlayback failed (%@); restoring playback graph once", error.localizedDescription)
      lifecycle = .recovering
      prepared = false
      _ = try restorePlaybackGraph(reloadClicks: true)
      try beginChunkPlayback()
    }
    if clicks.defaultNormalBuffer == nil {
      invalidate(generationBump: true, emitState: false)
      lifecycle = .idle
      throw NSError(
        domain: "PocktTiming",
        code: 17,
        userInfo: [NSLocalizedDescriptionKey: "Native click buffers missing after start"]
      )
    }
    if !running || !engine.isRunning || scheduledEventCount < 1 {
      invalidate(generationBump: true, emitState: false)
      lifecycle = .idle
      throw NSError(
        domain: "PocktTiming",
        code: 16,
        userInfo: [
          NSLocalizedDescriptionKey:
            "Native metronome failed to enter sample scheduling (running=\(running) engine=\(engine.isRunning) events=\(scheduledEventCount) isPlaying=\(player.isPlaying))",
        ]
      )
    }
    if !player.isPlaying {
      try? PocktAudioSession.perform(.playerPlay) {
        self.player.play()
      }
    }
    lifecycle = .playing
    lastAudioLifecycleOp = "start"
    let report = startReport()
    NSLog("[POCKT] generation/session ID %llu", generation)
    NSLog("[POCKT] queued chunks %d", queuedChunkCount)
    NSLog("[POCKT] initial queued seconds %g", Double(scheduledThroughSample) / max(1, sampleRate))
    NSLog("[POCKT] first chunk frames %d peak=%g nonzero=%d", firstChunkFrameCount, firstChunkPeakAmplitude, firstChunkNonZeroSampleCount)
    NSLog("[POCKT] scheduled through sample %lld", scheduledThroughSample)
    NSLog("[POCKT] engine running %d", engine.isRunning ? 1 : 0)
    NSLog("[POCKT] player node playing %d", player.isPlaying ? 1 : 0)
    NSLog("[POCKT] player sample advanced %d", playerSampleAdvanced ? 1 : 0)
    return report
  }

  func stop() {
    sched.lock()
    defer { sched.unlock() }
    if loop.phase != .idle { loopReleaseCore() }
    NSLog("[POCKT] Stop requested running=%d generation=%llu", running ? 1 : 0, generation)
    guard running else {
      NSLog("[POCKT] Stop ignored; musical timeline is not running")
      lifecycle = .stopped
      return
    }
    invalidate(generationBump: true, emitState: true)
    lifecycle = tunerLive ? .tunerInput : .stopped
    if !tunerLive {
      loop.capturing = false
      removeMicTap(force: true)
    }
    if inputCapture && !tunerLive && !micTap {
      // nothing listens any more: hand the session back to playback so the mic indicator goes out
      inputCapture = false
      tunerMeasurement = false
      freshEngine()
      _ = try? restorePlaybackGraph(reloadClicks: true)
    }
  }

  func preview(sound: String, volume: Double) {
    sched.lock()
    defer { sched.unlock() }
    do {
      try playPreview(sound: sound, volume: volume)
    } catch {
      PocktAudioLog.error("Preview failed for '\(sound)': \(error.localizedDescription)")
    }
  }

  func cancelPreview() {
    sched.lock()
    defer { sched.unlock() }
    previewGeneration += 1
    guard previewPlayer.engine != nil else { return }
    if previewPlayer.isPlaying {
      previewPlayer.stop()
    }
    previewPlayer.reset()
  }

  private func playPreview(sound: String, volume: Double) throws {
    if tunerLive {
      NSLog("[POCKT] preview ignored; tuner is live")
      return
    }
    previewGeneration += 1
    let gen = previewGeneration
    let metronomeLive = running && engine.isRunning
    // Re-applying the session while the clock is live can leave AVAudioEngine
    // reporting isRunning with a silent production player until process restart.
    if !metronomeLive {
      try configureSession()
      if !prepared || !clicks.isLoaded {
        _ = try bootAudioGraph(reloadClicks: true)
        prepared = true
      }
    }
    connectPreviewPlayer()
    if previewPlayer.isPlaying {
      previewPlayer.stop()
    }
    previewPlayer.reset()
    let buffer =
      clicks.buffer(for: sound)
      ?? clicks.resolvedBuffer(sound: sound, accentLevel: "normal")
      ?? clicks.defaultNormalBuffer
    guard let buffer else {
      throw NSError(
        domain: "PocktTiming",
        code: 16,
        userInfo: [NSLocalizedDescriptionKey: "Preview has no PCM buffer"]
      )
    }
    try ensureEngineRunning()
    let gain = Float(min(1, max(0.35, volume)))
    previewPlayer.volume = 1
    let scaled = PocktClickBank.scaled(buffer, volume: gain)
    previewPlayer.scheduleBuffer(scaled, at: nil, options: []) { [weak self] in
      guard let self, self.previewGeneration == gen else { return }
    }
    if !previewPlayer.isPlaying {
      previewPlayer.play()
    }
    engine.mainMixerNode.outputVolume = clampedAudibleVolume(config.volume)
    if running && !player.isPlaying {
      NSLog("[POCKT] preview left metronome player idle; recovering phase")
      recoverPlaybackPreservingPhase()
    }
    NSLog("[POCKT] preview on dedicated node sound=%@ gen=%llu live=%d", sound, gen, metronomeLive ? 1 : 0)
  }

  private func connectPreviewPlayer() {
    if previewPlayer.engine == nil {
      engine.attach(previewPlayer)
    }
    let format = engine.mainMixerNode.outputFormat(forBus: 0)
    engine.disconnectNodeOutput(previewPlayer)
    if format.sampleRate > 0 && format.channelCount > 0 {
      engine.connect(previewPlayer, to: engine.mainMixerNode, format: format)
    } else {
      engine.connect(previewPlayer, to: engine.mainMixerNode, format: nil)
    }
    previewPlayer.volume = 1
  }

  private func connectUiClickPlayer() {
    connectUiClickPlayers(force: true)
  }

  /// Long-lived UI detent graph. `force` is for boot/restore only.
  /// Play/Stop and BPM drags must never disconnect these nodes.
  private func connectUiClickPlayers(force: Bool = false) {
    let format = engine.mainMixerNode.outputFormat(forBus: 0)
    var detached = false
    for node in uiClickPlayers {
      if node.engine == nil {
        engine.attach(node)
        detached = true
      }
    }
    let formatChanged =
      uiClickSampleRate != format.sampleRate
      || uiClickChannels != format.channelCount
      || uiDialBuffer == nil
      || uiProBuffer == nil
      || uiRollerBuffer == nil
    guard force || detached || formatChanged else {
      for node in uiClickPlayers {
        node.volume = 0.22
      }
      return
    }
    for node in uiClickPlayers {
      engine.disconnectNodeOutput(node)
      if format.sampleRate > 0 && format.channelCount > 0 {
        engine.connect(node, to: engine.mainMixerNode, format: format)
      } else {
        engine.connect(node, to: engine.mainMixerNode, format: nil)
      }
      node.volume = 0.22
    }
    rebuildUiDetentBuffers(format: format)
    uiClickSampleRate = format.sampleRate
    uiClickChannels = format.channelCount
  }

  private func rebuildUiDetentBuffers(format: AVAudioFormat) {
    uiDialBuffer = makeDetentBuffer(kind: "dial", format: format)
    uiProBuffer = makeDetentBuffer(kind: "pro", format: format)
    uiRollerBuffer = makeDetentBuffer(kind: "roller", format: format)
  }

  private func makeDetentBuffer(kind: String, format: AVAudioFormat) -> AVAudioPCMBuffer? {
    guard format.commonFormat == .pcmFormatFloat32, format.sampleRate > 0, format.channelCount > 0 else {
      return nil
    }
    let sr = format.sampleRate
    let seconds = kind == "pro" ? 0.015 : kind == "roller" ? 0.012 : 0.009
    let n = max(32, Int(sr * seconds))
    guard let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(n)) else { return nil }
    buf.frameLength = AVAudioFrameCount(n)
    guard let data = buf.floatChannelData else { return nil }
    let ch = Int(format.channelCount)
    let freq1 = kind == "pro" ? 1860.0 : kind == "roller" ? 1480.0 : 3180.0
    let freq2 = kind == "pro" ? 510.0 : kind == "roller" ? 360.0 : 6360.0
    let decay = kind == "pro" ? 0.0044 : kind == "roller" ? 0.0036 : 0.0026
    let peak = kind == "pro" ? 0.09 : kind == "roller" ? 0.048 : 0.12
    for i in 0..<n {
      let t = Double(i) / sr
      let env = exp(-t / decay)
      let sample = Float((sin(2 * Double.pi * freq1 * t) * 0.74 + sin(2 * Double.pi * freq2 * t) * 0.26) * env * peak)
      for c in 0..<ch {
        data[c][i] = sample
      }
    }
    return buf
  }

  /// Re-attach UI detent nodes after graph restore / foreground. Does not start the metronome.
  func prepareUiDetent() {
    let work: () -> Void = { [weak self] in
      guard let self else { return }
      do {
        try self.ensureEngineRunningForUiDetent()
        self.connectUiClickPlayers(force: false)
        self.safeHapticsRestart()
      } catch {
        NSLog("[POCKT] prepareUiDetent failed: %@", error.localizedDescription)
      }
    }
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.async { work() }
    }
  }

  /// Lightweight UI detent. Dedicated ping-pong nodes. Never touches metronome scheduling.
  @discardableResult
  func playUiDetent(kind: String, playAudio: Bool, playHaptic: Bool) -> Bool {
    if Thread.isMainThread {
      return playUiDetentLocked(kind: kind, playAudio: playAudio, playHaptic: playHaptic)
    }
    NSLog("[POCKT CRASH] detent-engine-off-main")
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      _ = self.playUiDetentLocked(kind: kind, playAudio: playAudio, playHaptic: playHaptic)
    }
    return true
  }

  private func playUiDetentLocked(kind: String, playAudio: Bool, playHaptic: Bool) -> Bool {
    sched.lock()
    defer { sched.unlock() }
    // Isolated from musical start(). A start-in-flight metronome must not mute BPM detents.
    let audioOk: Bool
    if playAudio {
      audioOk = scheduleUiClick(kind: kind)
    } else {
      audioOk = true
    }
    if playAudio && !audioOk {
      NSLog("[POCKT CRASH] detent-audio-fail kind=%@", kind)
      return false
    }
    if playHaptic {
      _ = haptics.playUiTransient(kind: kind)
    }
    if audioOk {
      lastUiClickMs = CACurrentMediaTime() * 1000
    }
    return audioOk
  }

  private func scheduleUiClick(kind: String) -> Bool {
    do {
      try ensureEngineRunningForUiDetent()
    } catch {
      NSLog("[POCKT] UI detent skipped; engine not running")
      return false
    }
    if uiDialBuffer == nil || uiProBuffer == nil || uiRollerBuffer == nil {
      rebuildUiDetentBuffers(format: engine.mainMixerNode.outputFormat(forBus: 0))
    }
    let buffer = kind == "pro" ? uiProBuffer : kind == "roller" ? uiRollerBuffer : uiDialBuffer
    guard let buffer else {
      NSLog("[POCKT] UI detent skipped; buffer missing for %@", kind)
      return false
    }
    let node = nextIdleUiClickNode()
    if node.engine == nil {
      connectUiClickPlayers(force: true)
    }
    guard node.engine != nil else {
      NSLog("[POCKT] UI detent skipped; node not attached")
      return false
    }
    node.scheduleBuffer(buffer, at: nil, options: [])
    if !node.isPlaying {
      node.play()
    }
    return true
  }

  private func nextIdleUiClickNode() -> AVAudioPlayerNode {
    let count = uiClickPlayers.count
    for step in 0..<count {
      let index = (uiClickIndex + step) % count
      let node = uiClickPlayers[index]
      if !node.isPlaying {
        uiClickIndex = (index + 1) % count
        return node
      }
    }
    let node = uiClickPlayers[uiClickIndex % count]
    uiClickIndex = (uiClickIndex + 1) % count
    return node
  }

  /// Start the engine for UI clicks without booting/tearing the musical player graph.
  private func ensureEngineRunningForUiDetent() throws {
    if !engine.isRunning {
      try configureSession()
      try PocktAudioSession.perform(.enginePrepare) {
        self.engine.prepare()
      }
      try PocktAudioSession.perform(.engineStart) {
        try self.engine.start()
      }
    }
    connectUiClickPlayers(force: false)
  }

  /// Short in-tune chime on the already-running tuner engine.
  /// Does not reconfigure the session. Pitch analysis ignores the tone window.
  func playTuneConfirm() {
    sched.lock()
    defer { sched.unlock() }
    guard tunerLive, engine.isRunning else { return }
      tunerConfirmMuteUntil = Date().timeIntervalSince1970 + 0.34
    let work: () -> Void = { [weak self] in
      guard let self, self.engine.isRunning else { return }
      self.connectPreviewPlayer()
      let format = self.engine.mainMixerNode.outputFormat(forBus: 0)
      guard format.sampleRate > 0, format.channelCount > 0 else { return }
      let seconds = 0.18
      let frames = max(32, Int(format.sampleRate * seconds))
      guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(frames)) else { return }
      buffer.frameLength = AVAudioFrameCount(frames)
      let channels = Int(format.channelCount)
      let rate = format.sampleRate
      for channel in 0..<channels {
        guard let data = buffer.floatChannelData?[channel] else { continue }
        for index in 0..<frames {
          let t = Double(index) / rate
          let attack = min(1.0, t / 0.014)
          let env = Float(attack * exp(-t * 16.0))
          let tone = sin(2.0 * Double.pi * 523.25 * t)
          data[index] = env * 0.11 * Float(tone)
        }
      }
      if self.previewPlayer.isPlaying {
        self.previewPlayer.stop()
      }
      self.previewPlayer.reset()
      self.previewPlayer.volume = 0.15
      self.previewPlayer.scheduleBuffer(buffer, at: nil, options: [])
      if !self.previewPlayer.isPlaying {
        self.previewPlayer.play()
      }
    }
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.async { work() }
    }
  }

  func playReferenceTone(frequency: Double, durationSeconds: Double = 0.9) {
    sched.lock()
    defer { sched.unlock() }
    let work: () -> Void = { [weak self] in
      guard let self else { return }
      do {
        try self.ensureEngineRunning()
        self.connectPreviewPlayer()
        let format = self.engine.mainMixerNode.outputFormat(forBus: 0)
        guard let buffer = self.makeSineBuffer(frequency: frequency, durationSeconds: durationSeconds, format: format) else {
          NSLog("[POCKT] reference tone buffer missing")
          return
        }
        if self.previewPlayer.isPlaying {
          self.previewPlayer.stop()
        }
        self.previewPlayer.reset()
        self.previewPlayer.volume = 0.42
        self.previewPlayer.scheduleBuffer(buffer, at: nil, options: [])
        self.previewPlayer.play()
      } catch {
        NSLog("[POCKT] reference tone failed: %@", error.localizedDescription)
      }
    }
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.async { work() }
    }
  }

  private func makeSineBuffer(frequency: Double, durationSeconds: Double, format: AVAudioFormat) -> AVAudioPCMBuffer? {
    let hz = min(2000, max(20, frequency))
    let seconds = min(2.4, max(0.2, durationSeconds))
    let frames = max(1, Int(format.sampleRate * seconds))
    guard let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(frames)) else { return nil }
    buf.frameLength = AVAudioFrameCount(frames)
    let channels = Int(format.channelCount)
    let rate = format.sampleRate
    for c in 0..<channels {
      guard let data = buf.floatChannelData?[c] else { continue }
      for i in 0..<frames {
        let t = Double(i) / rate
        let env: Float
        if t < 0.012 {
          env = Float(t / 0.012)
        } else if t > seconds - 0.08 {
          env = Float(max(0, (seconds - t) / 0.08))
        } else {
          env = 1
        }
        data[i] = env * 0.22 * sinf(Float(2 * Double.pi * hz * t))
      }
    }
    return buf
  }

  func audioSanityTest() throws -> [String: Any] {
    try runAudioSanityTest(sound: "pockt-default", volume: 0.85)
  }

  func metronomeSelfTest120() throws -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    NSLog("[POCKT] V13 sample-schedule self-test started")
    var test = PocktEngineConfig.default
    test.bpm = 120
    test.timeSignature = "4/4"
    test.subdivision = "quarter"
    test.feel = "straight"
    test.feelDial = 0
    test.sound = "pockt-default"
    test.volume = 0.85
    test.haptic = true
    test.hapticSyncMs = 0
    test.accentPattern = ["accent", "normal", "normal", "normal"]
    test.lockIn = "full"
    test.skin = "classic"

    beatEventsEmitted = 0
    refillCount = 0
    let report = try start(with: test)
    let rate = max(1, sampleRate)
    let math = PocktTransportMath.diagnosticSuite(sampleRate: rate)
    let mathPassed = (math["passed"] as? Bool) ?? false

    let startedAt = Date()
    var firstSample: Int64?
    var latestSample: Int64 = 0
    var sampleAdvanced = false
    var sampleBeforeTempo: Int64 = 0
    var tickBeforeTempo: Int64 = 0
    var tempoApplied = false
    while Date().timeIntervalSince(startedAt) < 2.4 {
      RunLoop.current.run(mode: .common, before: Date().addingTimeInterval(0.02))
      if let sample = currentPlayerSample() {
        if firstSample == nil { firstSample = sample }
        latestSample = sample
        if let first = firstSample, sample - first > Int64((0.2 * rate).rounded()) {
          sampleAdvanced = true
        }
      }
      if !tempoApplied, Date().timeIntervalSince(startedAt) > 1.1 {
        sampleBeforeTempo = latestSample
        tickBeforeTempo = lastScheduledTick ?? 0
        var faster = test
        faster.bpm = 100
        applyConfig(faster)
        tempoApplied = true
      }
    }

    let sampleAfterTempo = currentPlayerSample() ?? latestSample
    let tickAfterTempo = lastScheduledTick ?? 0
    let phaseContinuous =
      tempoApplied
      && playerStopForTempoCount == 0
      && tempoRestartCount == 0
      && tickAfterTempo >= tickBeforeTempo
      && sampleAfterTempo >= sampleBeforeTempo
      && (lastScheduledTick ?? 0) > 0

    let muteVerified = muteRenderProof()
    let firstIsAccent = initialEventAccents.first == "accent" || initialEventAccents.first == "strong"
    let energyPassed = firstChunkFrameCount > 0 && firstChunkPeakAmplitude > 0.02 && firstChunkNonZeroSampleCount > 0
    let playPassed = playerPlayCalled && player.isPlaying
    let visualPassed = beatEventsEmitted >= 3
    let refillPassed = refillCount >= 1
    let firstScheduled = initialEventSamples.first ?? 0
    let minOrigin = PocktTransportMath.safetySamples(sampleRate: rate)
    let positionsPassed = firstScheduled >= minOrigin && firstScheduled < Int64((0.25 * rate).rounded())

    var failures: [String] = []
    if !energyPassed { failures.append("first scheduled click is silent") }
    if !playPassed { failures.append("player.play() did not result in isPlaying") }
    if !sampleAdvanced { failures.append("player sample position did not advance") }
    if !refillPassed { failures.append("native lookahead refill did not run") }
    if !visualPassed { failures.append("beatEventsEmitted \(beatEventsEmitted) < 3") }
    if !positionsPassed { failures.append("first click was not scheduled ahead of the playhead") }
    if !firstIsAccent { failures.append("beat 1 did not use accent/strong replacement") }
    if !muteVerified { failures.append("muted beat was not silent") }
    if !mathPassed { failures.append("anchored timeline diagnostic suite failed") }
    if !phaseContinuous { failures.append("BPM change reset player timeline or beat index") }

    let emitted = beatEventsEmitted
    let playerPlaying = player.isPlaying
    invalidate(generationBump: true, emitState: false)
    NSLog("[POCKT] self-test stopped phaseContinuous=%d", phaseContinuous ? 1 : 0)

    if !failures.isEmpty {
      throw NSError(
        domain: "PocktTiming",
        code: 22,
        userInfo: [NSLocalizedDescriptionKey: "V13 self-test failed: \(failures.joined(separator: "; "))"]
      )
    }

    var out = report
    out["selfTest"] = true
    out["selfTestBpm"] = 120.0
    out["selfTestMeter"] = "4/4"
    out["selfTestSubdivision"] = "quarter"
    out["architecture"] = architecture
    out["lookAheadSeconds"] = Self.lookAheadSeconds
    out["firstChunkFrameCount"] = firstChunkFrameCount
    out["firstChunkPeakAmplitude"] = Double(firstChunkPeakAmplitude)
    out["firstChunkNonZeroSampleCount"] = firstChunkNonZeroSampleCount
    out["selfTestObservedEventSamples"] = initialEventSamples.prefix(8).map { Double($0) }
    out["selfTestAccentReplacement"] = firstIsAccent
    out["selfTestMuteVerified"] = muteVerified
    out["selfTestScheduledEvents"] = scheduledEventCount
    out["selfTestReady"] = true
    out["selfTestPlayerSampleAdvanced"] = sampleAdvanced
    out["selfTestFirstPlayerSample"] = Double(firstSample ?? 0)
    out["selfTestLatestPlayerSample"] = Double(latestSample)
    out["selfTestRefillCount"] = refillCount
    out["beatEventsEmitted"] = emitted
    out["engineRunning"] = engine.isRunning
    out["playerPlaying"] = playerPlaying
    out["playerPlayCalled"] = playerPlayCalled
    out["sampleRate"] = rate
    out["phaseContinuousBpmChange"] = phaseContinuous
    out["playerStopForTempoCount"] = playerStopForTempoCount
    out["tempoRestartCount"] = tempoRestartCount
    out["tickBeforeTempo"] = Double(tickBeforeTempo)
    out["tickAfterTempo"] = Double(tickAfterTempo)
    out["precisionSuite"] = math
    out["hapticsSupported"] = haptics.supported
    out["hapticScheduleAttempts"] = hapticScheduleAttempts
    out["note"] =
      "metronomeSelfTest120 uses V13 per-click AVAudioTime sample scheduling. Live BPM changes do not call player.stop()."
    return out
  }

  func precisionDiagnosticSuite() -> [String: Any] {
    PocktTransportMath.diagnosticSuite(sampleRate: sampleRate > 0 ? sampleRate : 48000)
  }

  func runAudioSanityTest(sound: String, volume: Double) throws -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    try playPreview(sound: sound, volume: volume)
    var probe = audioProbe()
    probe["sanityScheduled"] = true
    probe["previewNode"] = true
    probe["note"] = "Preview uses a dedicated player node. Production PLAY does not reset that node."
    return probe
  }

  func teardown() {
    sched.lock()
    defer { sched.unlock() }
    stopTuner()
    invalidate(generationBump: true, emitState: false)
    removeObservers()
    haptics.stopEngine()
    if engine.isRunning {
      engine.stop()
    }
    clicks.unload()
    prepared = false
  }

  func nativeState() -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    var info = audioProbe()
    info["running"] = running
    info["generation"] = Double(generation)
    info["lookAheadSeconds"] = Self.lookAheadSeconds
    info["hapticsSupported"] = haptics.supported
    info["prepared"] = prepared
    info["originSample"] = Double(originSample)
    info["nextChunkStartSample"] = Double(nextChunkStartSample)
    info["nextMusicalEventIndex"] = Double(nextMusicalEventIndex)
    info["scheduledThroughSample"] = Double(scheduledThroughSample)
    info["queuedChunkCount"] = queuedChunkCount
    info["refillCount"] = refillCount
    info["missedTicks"] = missedTicks
    info["gridLostTicks"] = gridLostTicks
    info["schedulerThread"] = "renderQueue"
    info["architecture"] = architecture
    info["measurementKind"] = PocktTransportMath.architecture
    return info
  }

  func startReport() -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    var info = nativeState()
    info["firstScheduledSample"] = Double(initialEventSamples.first ?? originSample)
    info["scheduledEventCount"] = scheduledEventCount
    info["scheduledAudioCount"] = scheduledAudioCount
    info["engineRunning"] = engine.isRunning
    info["playerPlaying"] = player.isPlaying
    info["playerNodePlaying"] = player.isPlaying
    info["playerPlayCalled"] = playerPlayCalled
    info["playerSampleAdvanced"] = playerSampleAdvanced
    info["hasDefaultBuffer"] = clicks.defaultNormalBuffer != nil
    info["chunkDurationSeconds"] = Self.chunkDurationSeconds
    info["initialQueuedSeconds"] = Double(scheduledThroughSample) / max(1, sampleRate)
    info["firstChunkFrameCount"] = firstChunkFrameCount
    info["firstChunkPeakAmplitude"] = Double(firstChunkPeakAmplitude)
    info["firstChunkNonZeroSampleCount"] = firstChunkNonZeroSampleCount
    let originSeconds = visualOriginHostTime == 0
      ? 0
      : AVAudioTime.seconds(forHostTime: visualOriginHostTime)
    let firstSample = initialEventSamples.first ?? originSample
    let firstTick = initialEventIndexes.first ?? 0
    let firstEvent = PocktTimeline.event(tickIndex: firstTick, config: config)
    let firstEventSeconds = Double(firstSample) / max(1, sampleRate)
    info["visualOriginHostSeconds"] = originSeconds
    info["firstBeatHostTime"] = originSeconds + firstEventSeconds
    info["firstBeatIndex"] = Double(firstEvent.beatIndex)
    info["secondsPerBeat"] = config.secondsPerBeat
    return info
  }

  func liveDiagnostics() -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    var snap = diagnostics.snapshot(
      bpm: config.bpm,
      subdivision: config.subdivision,
      sampleRate: sampleRate,
      originSample: originSample,
      currentSample: currentPlayerSample(),
      generation: generation
    )
    let probe = audioProbe()
    for (key, value) in probe {
      if snap[key] == nil {
        snap[key] = value
      }
    }
    snap["scheduledAudioCount"] = scheduledAudioCount
    snap["scheduledEventCount"] = scheduledEventCount
    snap["beatEventsEmitted"] = beatEventsEmitted
    snap["refillCount"] = refillCount
    snap["missedTicks"] = missedTicks
    snap["gridLostTicks"] = gridLostTicks
    snap["scheduledThroughSample"] = Double(scheduledThroughSample)
    snap["queuedChunkCount"] = queuedChunkCount
    snap["architecture"] = architecture
    return snap
  }

  private func beginChunkPlayback() throws {
    NSLog("[POCKT] entering beginSamplePlayback")
    generation &+= 1
    let gen = generation
    running = true
    refillTimer?.cancel()
    refillTimer = nil
    playerStartedThisGeneration = false
    playerPlayCalled = false
    playerSampleAdvanced = false
    lastHapticSeconds = nil
    hapticScheduleAttempts = 0
    hapticScheduleFailures = 0
    haptics.cancelAll()
    resetPlayerNode()
    scheduledAudioCount = 0
    scheduledEventCount = 0
    queuedChunkCount = 0
    nextChunkStartSample = 0
    scheduledThroughSample = 0
    nextMusicalEventIndex = 0
    nextControlEventIndex = 0
    lastScheduledTick = nil
    lastKnownPlayerSample = 0
    originSample = 0
    bpmChangeCount = 0
    tempoRestartCount = 0
    beatEventsEmitted = 0
    refillCount = 0
    firstChunkFrameCount = 0
    firstChunkPeakAmplitude = 0
    firstChunkNonZeroSampleCount = 0
    initialEventSamples.removeAll()
    initialEventIndexes.removeAll()
    initialEventAccents.removeAll()
    firstChunkBuffer = nil
    missingSoundLogged.removeAll()
    gridAnchorTick = -1
    gridAnchorHost = 0
    gridLostTicks = 0
    missedTicks = 0
    diagnostics.reset()
    tempoSegments = [
      PocktTransportMath.initialSegment(bpm: config.bpm, ticksPerBeat: config.ticksPerBeat)
    ]

    try ensureEngineRunning()
    sampleRate = actualSampleRate()
    engine.mainMixerNode.outputVolume = clampedAudibleVolume(config.volume)
    player.volume = 1

    try PocktAudioSession.perform(.playerPlay) {
      self.player.play()
    }
    playerPlayCalled = true
    playerStartedThisGeneration = true
    NSLog("[POCKT] player.play called isPlaying=%d scheduled=%d", player.isPlaying ? 1 : 0, scheduledEventCount)
    if !player.isPlaying && engine.isRunning {
      // isPlaying can stay false until the first buffer is committed. Schedule first, then retry.
      NSLog("[POCKT] player.play did not report isPlaying; scheduling then retrying play")
    }

    waitForPlayerTimeline(timeout: 0.12)
    let now = currentPlayerSample() ?? lastKnownPlayerSample
    let pickupBeats = pendingPickupBeats
    pendingPickupBeats = 0
    if pendingStartCue {
      pendingStartCue = false
      playStartCue()
    }
    let originLeadIn = pickupBeats > 0
      ? pickupBeats * (60.0 / max(1, config.bpm)) * max(1, sampleRate)
      : 0.08 * max(1, sampleRate)
    let origin = now + Int64(originLeadIn.rounded())
    originSample = origin
    tempoSegments = [
      PocktTransportMath.initialSegment(
        bpm: config.bpm,
        ticksPerBeat: config.ticksPerBeat,
        startSample: origin
      )
    ]

    visualOriginHostTime = mach_absolute_time()
    scheduleUntilHorizon(generation: gen)
    NSLog("[POCKT] initial sample events scheduled count=%d origin=%lld", scheduledEventCount, origin)
    if scheduledEventCount < 1 {
      throw NSError(
        domain: "PocktTiming",
        code: 23,
        userInfo: [NSLocalizedDescriptionKey: "V13 failed to schedule the first click"]
      )
    }
    if let first = firstChunkBuffer {
      firstChunkFrameCount = Int(first.frameLength)
      let energy = PocktAudioChunkRenderer.measureEnergy(first)
      firstChunkPeakAmplitude = energy.peakAmplitude
      firstChunkNonZeroSampleCount = energy.nonZeroSampleCount
    }
    // Mute / state-0 on beat 1 is legal silence. Do not abort the engine.
    NSLog(
      "[POCKT] first chunk frames=%d peak=%g nonzero=%d (silence is legal)",
      firstChunkFrameCount,
      firstChunkPeakAmplitude,
      firstChunkNonZeroSampleCount
    )

    captureHapticOrigin(hapticOriginDelay())
    armRefillTimer(generation: gen)
    if !player.isPlaying {
      try PocktAudioSession.perform(.playerPlay) {
        self.player.play()
      }
    }
    NSLog("[POCKT] sample scheduler armed lookahead=%g origin=%lld isPlaying=%d", Self.lookAheadSeconds, origin, player.isPlaying ? 1 : 0)
    emitState()
  }

  private func waitForPlayerTimeline(timeout: TimeInterval) {
    let startedAt = Date()
    var firstSample: Int64?
    var latestSample: Int64 = 0
    var advanced = false
    while Date().timeIntervalSince(startedAt) < timeout {
      Thread.sleep(forTimeInterval: 0.008)
      if let sample = currentPlayerSample() {
        if firstSample == nil {
          firstSample = sample
        }
        latestSample = sample
        lastKnownPlayerSample = sample
        if let first = firstSample, sample > first {
          advanced = true
          break
        }
      }
    }
    playerSampleAdvanced = advanced
    NSLog(
      "[POCKT] player timeline first=%lld latest=%lld advanced=%d",
      firstSample ?? -1,
      latestSample,
      advanced ? 1 : 0
    )
  }

  private func verifyPlayerIsRendering() throws {
    waitForPlayerTimeline(timeout: 0.75)
    if currentPlayerSample() == nil && lastKnownPlayerSample <= 0 {
      throw NSError(
        domain: "PocktTiming",
        code: 29,
        userInfo: [NSLocalizedDescriptionKey: "player sample position stayed nil after play()"]
      )
    }
  }

  /// Hardware recovery only. Never used for live BPM changes.
  private func restartChunkPlayback() {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.running else { return }
      self.recoverPlaybackPreservingPhase()
    }
  }

  private func recoverPlaybackPreservingPhase() {
    sched.lock()
    defer { sched.unlock() }
    guard running else { return }
    defer { DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in self?.loopRescheduleAfterRecovery() } }
    let preservedTick = max(lastScheduledTick ?? nextMusicalEventIndex, 0)
    let preservedConfig = config
    refillTimer?.cancel()
    refillTimer = nil
    haptics.cancelAll()
    resetPlayerNode()
    tempoRestartCount += 1
    scheduledAudioCount = 0
    queuedChunkCount = 0
    nextMusicalEventIndex = preservedTick
    lastScheduledTick = preservedTick > 0 ? preservedTick - 1 : nil
    lastKnownPlayerSample = 0
    do {
      try PocktAudioSession.perform(.playerPlay) {
        self.player.play()
      }
      playerPlayCalled = true
      playerStartedThisGeneration = true
      waitForPlayerTimeline(timeout: 0.12)
      sampleRate = actualSampleRate()
      let rate = max(1, sampleRate)
      let now = currentPlayerSample() ?? 0
      var startTick = lastScheduledTick ?? 0
      var origin = now + Int64((0.08 * rate).rounded())
      // Resume on the same beat grid in host time: the clicks keep their places, as if the graph had never
      // restarted. A click that fell inside the restart itself is the only one that can be lost.
      if gridAnchorTick >= 0, gridAnchorHost > 0, gridAnchorSpt > 0,
         let nowHost = hostSeconds(forPlayerSample: now) {
        let earliest = nowHost + 0.03
        let steps = Int64(((earliest - gridAnchorHost) / gridAnchorSpt).rounded(.up))
        let k = max(0, gridAnchorTick + steps)
        let kHost = gridAnchorHost + Double(k - gridAnchorTick) * gridAnchorSpt
        let lost = max(0, k - preservedTick - 1)
        gridLostTicks += Int(lost)
        startTick = k
        origin = now + Int64(((kHost - nowHost) * rate).rounded())
        nextMusicalEventIndex = k
        lastScheduledTick = k > 0 ? k - 1 : nil
        NSLog("[POCKT] grid-preserving recovery resume tick=%lld (preserved %lld, lost %lld)", k, preservedTick, lost)
      }
      originSample = origin
      tempoSegments = [
        PocktTempoSegment(
          startTick: startTick,
          startSample: origin,
          bpm: preservedConfig.bpm,
          ticksPerBeat: preservedConfig.ticksPerBeat
        )
      ]
      if lastScheduledTick == nil && startTick == 0 {
        nextMusicalEventIndex = 0
      }
      visualOriginHostTime = mach_absolute_time()
      scheduleUntilHorizon(generation: generation)
      captureHapticOrigin(hapticOriginDelay())
      armRefillTimer(generation: generation)
    } catch {
      NSLog("[POCKT] phase-preserving recovery failed: %@", error.localizedDescription)
    }
  }

  private func scheduleUntilHorizon(generation gen: UInt64) {
    guard generation == gen, running else { return }
    sampleRate = actualSampleRate()
    let now = currentAbsoluteSample()
    var scheduled = 0
    while scheduled < PocktTransportMath.maxLookAheadBeats {
      let tick = nextMusicalEventIndex
      let sample = PocktTransportMath.sample(forTick: tick, segments: tempoSegments, sampleRate: sampleRate)
      let decision = PocktTransportMath.scheduleDecision(
        tick: tick,
        segments: tempoSegments,
        nowSample: now,
        sampleRate: sampleRate,
        lastScheduledTick: lastScheduledTick
      )
      if decision == .skipMissed {
        missedTicks += 1
        NSLog("[POCKT] MISSED tick %lld (scheduler late)", tick)
        nextMusicalEventIndex = tick + 1
        continue
      }
      if decision == .wait {
        break
      }
      scheduleTick(tick, at: sample, generation: gen)
      if let host = hostSeconds(forPlayerSample: sample) {
        gridAnchorTick = tick
        gridAnchorHost = host
        gridAnchorSpt = PocktTransportMath.segment(forTick: tick, segments: tempoSegments).secondsPerTick
      }
      nextMusicalEventIndex = tick + 1
      lastScheduledTick = tick
      scheduledThroughSample = sample
      scheduled += 1
    }
  }

  private func scheduleTick(_ tick: Int64, at sample: Int64, generation gen: UInt64) {
    guard generation == gen else { return }
    let event = PocktTimeline.event(tickIndex: tick, config: config)
    let click = bufferForEvent(event)
    if let click {
      let gain = Float(max(0.05, min(1, event.volume)))
      var scaled = PocktClickBank.scaled(click, volume: gain)
      // One player node plays buffers back to back: a sound longer than the gap to the next tick would
      // push that tick late. Long sounds (spoken counts) are cut to the gap with a short fade.
      var nextTick = tick + 1
      var look = 0
      while look < 96 {
        let ev = PocktTimeline.event(tickIndex: nextTick, config: config)
        if ev.audible && ev.accentLevel != "mute" { break }
        nextTick += 1
        look += 1
      }
      let nextSample = PocktTransportMath.sample(forTick: nextTick, segments: tempoSegments, sampleRate: sampleRate)
      let gap = nextSample - sample - Int64(0.004 * sampleRate)
      if gap > 64 && Int64(scaled.frameLength) > gap {
        scaled = Self.truncated(scaled, frames: Int(gap), fadeFrames: Int(0.006 * sampleRate))
      }
      let when = AVAudioTime(sampleTime: sample, atRate: sampleRate)
      player.scheduleBuffer(scaled, at: when, options: [])
      if tunerLive, let host = hostSeconds(forPlayerSample: sample) {
        clickHostRing[clickHostIdx % clickHostRing.count] = host + player.outputPresentationLatency
        clickHostIdx &+= 1
      }
      scheduledAudioCount += 1
      queuedChunkCount += 1
      if firstChunkBuffer == nil {
        firstChunkBuffer = scaled
        firstChunkFrameCount = Int(scaled.frameLength)
        let energy = PocktAudioChunkRenderer.measureEnergy(scaled)
        firstChunkPeakAmplitude = energy.peakAmplitude
        firstChunkNonZeroSampleCount = energy.nonZeroSampleCount
      }
    }
    scheduledEventCount += 1
    if initialEventSamples.count < 16 {
      initialEventSamples.append(sample)
      initialEventIndexes.append(tick)
      initialEventAccents.append(event.accentLevel)
    }
    let previousSeconds: Double
    if tick == 0 {
      previousSeconds = 0
    } else {
      let prevSample = PocktTransportMath.sample(
        forTick: tick - 1,
        segments: tempoSegments,
        sampleRate: sampleRate
      )
      previousSeconds = Double(prevSample) / max(1, sampleRate)
    }
    let eventSeconds = Double(sample) / max(1, sampleRate)
    diagnostics.record(
      PocktDiagnosticEvent(
        generation: gen,
        eventIndex: tick,
        beatIndex: event.beatIndex,
        subdivisionIndex: event.subdivisionIndex,
        bpm: config.bpm,
        targetSeconds: eventSeconds,
        targetSample: sample,
        scheduledSample: sample,
        intervalSeconds: eventSeconds - previousSeconds,
        accent: event.isAccent,
        feelOffsetMs: event.feelOffsetSeconds * 1000,
        hapticSeconds: eventSeconds + config.hapticSyncMs / 1000.0,
        lookAheadSeconds: Self.lookAheadSeconds
      )
    )
    scheduleHapticSafely(event: event, atSeconds: eventSeconds, generation: gen)
    scheduleVisual(event: event, targetSample: sample, eventSeconds: eventSeconds, generation: gen)
  }

  static func truncated(_ buffer: AVAudioPCMBuffer, frames: Int, fadeFrames: Int) -> AVAudioPCMBuffer {
    let n = max(1, min(Int(buffer.frameLength), frames))
    guard let src = buffer.floatChannelData,
          let out = AVAudioPCMBuffer(pcmFormat: buffer.format, frameCapacity: AVAudioFrameCount(n)),
          let dst = out.floatChannelData else { return buffer }
    out.frameLength = AVAudioFrameCount(n)
    let fade = max(1, min(n, fadeFrames))
    for c in 0..<Int(buffer.format.channelCount) {
      for i in 0..<n {
        let g: Float = i >= n - fade ? Float(n - i) / Float(fade) : 1
        dst[c][i] = src[c][i] * g
      }
    }
    return out
  }

  private func invalidate(generationBump: Bool, emitState: Bool) {
    let work = { [weak self] in
      guard let self else { return }
      if generationBump {
        self.generation &+= 1
      }
      self.running = false
      self.refillTimer?.cancel()
      self.refillTimer = nil
      self.haptics.cancelAll()
      self.resetPlayerNode()
      self.playerStartedThisGeneration = false
      self.nextChunkStartSample = 0
      self.scheduledThroughSample = 0
      self.queuedChunkCount = 0
      self.nextMusicalEventIndex = 0
      self.nextControlEventIndex = 0
      self.lastHapticSeconds = nil
      self.visualOriginHostTime = 0
    }
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.sync(execute: work)
    }
    if emitState {
      emitStateLocked()
    }
  }

  private func resetPlayerNode() {
    guard player.engine != nil else { return }
    if player.isPlaying {
      player.stop()
    }
    player.reset()
  }

  private func armRefillTimer(generation gen: UInt64) {
    refillTimer?.cancel()
    let timer = DispatchSource.makeTimerSource(queue: renderQueue)
    timer.schedule(
      deadline: .now() + .milliseconds(Self.refillIntervalMs),
      repeating: .milliseconds(Self.refillIntervalMs),
      leeway: .milliseconds(4)
    )
    timer.setEventHandler { [weak self] in
      guard let self else { return }
      self.sched.lock()
      defer { self.sched.unlock() }
      guard self.generation == gen, self.running else { return }
      self.refillCount += 1
      if self.playerStartedThisGeneration && !self.player.isPlaying && self.engine.isRunning {
        // the player itself stopped: graph work belongs on the main thread, once
        if !self.recoverQueued {
          self.recoverQueued = true
          DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.sched.lock()
            defer { self.sched.unlock() }
            self.recoverQueued = false
            guard self.generation == gen, self.running, !self.player.isPlaying else { return }
            NSLog("[POCKT] player stopped unexpectedly; recovering on the same beat grid")
            self.recoverPlaybackPreservingPhase()
          }
        }
        return
      }
      self.scheduleUntilHorizon(generation: gen)
    }
    timer.resume()
    refillTimer = timer
  }

  private func refillIfNeeded(generation gen: UInt64) {
    guard generation == gen, running else { return }
    if playerStartedThisGeneration && !player.isPlaying && engine.isRunning {
      NSLog("[POCKT] player stopped unexpectedly; recovering without resetting beat index")
      recoverPlaybackPreservingPhase()
      return
    }
    scheduleUntilHorizon(generation: gen)
  }

  private func queuedSecondsRemaining() -> Double {
    let current = currentAbsoluteSample()
    return max(0, Double(scheduledThroughSample - current) / max(1, sampleRate))
  }

  private func bufferForEvent(_ event: PocktMusicalEvent) -> AVAudioPCMBuffer? {
    if !event.audible || event.accentLevel == "mute" {
      return nil
    }
    var key = config.sound
    if event.soundRole == "downbeat", !config.soundDownbeat.isEmpty {
      key = config.soundDownbeat
    } else if event.soundRole == "beat", !config.soundBeat.isEmpty {
      key = config.soundBeat
    } else if event.soundRole == "sub", !config.soundSub.isEmpty {
      key = config.soundSub
    }
    // Spoken counts belong on the primary beat. A fast subdivision keeps a short click.
    if config.voiceCount, !event.isPrimaryBeat,
       key.hasPrefix("count") || key.hasPrefix("lib-vocal") || key.hasPrefix("lib-choir") {
      key = "click"
    }
    if config.voiceCount, event.isPrimaryBeat {
      let spokenIndex = (event.beatIndex % 12) + 1
      let spoken = "count-\(spokenIndex)"
      let customDownbeat = event.soundRole == "downbeat"
        && !config.soundDownbeat.isEmpty
        && config.soundDownbeat != "count"
        && !config.soundDownbeat.hasPrefix("count-")
      if customDownbeat, let custom = clicks.resolvedBuffer(sound: config.soundDownbeat, accentLevel: event.accentLevel) {
        return custom
      }
      if let spokenBuffer = clicks.buffer(for: spoken) ?? clicks.buffer(for: "voice-\(spokenIndex)") {
        return spokenBuffer
      }
    }
    if let resolved = clicks.resolvedBuffer(sound: key, accentLevel: event.accentLevel) {
      if clicks.buffer(for: key) == nil, !missingSoundLogged.contains(key) {
        missingSoundLogged.insert(key)
        NSLog("[POCKT] requested sound '%@' not loaded; derived/fallback buffer used", key)
      }
      return resolved
    }
    if !missingSoundLogged.contains(key) {
      missingSoundLogged.insert(key)
      NSLog("[POCKT] requested buffer missing; using guaranteed native default for '%@'", key)
    }
    switch event.accentLevel {
    case "strong":
      return clicks.defaultStrongAccentBuffer ?? clicks.defaultAccentBuffer ?? clicks.defaultNormalBuffer
    case "accent":
      return clicks.defaultAccentBuffer ?? clicks.defaultNormalBuffer
    default:
      return clicks.defaultNormalBuffer ?? clicks.defaultAccentBuffer ?? clicks.defaultStrongAccentBuffer
    }
  }

  private func scheduleControlUntilHorizon(generation gen: UInt64) {
    scheduleUntilHorizon(generation: gen)
  }

  private func scheduleHapticSafely(event: PocktMusicalEvent, atSeconds eventSeconds: Double, generation gen: UInt64) {
    scheduleHaptic(event: event, atSeconds: eventSeconds, generation: gen)
  }

  private func scheduleHaptic(event: PocktMusicalEvent, atSeconds eventSeconds: Double, generation gen: UInt64) {
    var timed = event
    timed.eventSeconds = eventSeconds
    guard PocktTimeline.shouldHaptic(
      event: timed,
      config: config,
      minIntervalSeconds: haptics.hardwareMinIntervalSeconds,
      lastHapticSeconds: lastHapticSeconds
    ) else { return }
    hapticScheduleAttempts += 1
    let intensities = PocktTimeline.hapticIntensity(event: event, config: config)
    let scheduled = haptics.schedule(
      atSecondsFromMusicalOrigin: eventSeconds,
      userOffsetSeconds: config.hapticSyncMs / 1000.0,
      intensity: intensities.intensity,
      sharpness: intensities.sharpness,
      generation: gen,
      boost: config.hapticStrength >= 1.9,
      isCurrent: { [weak self] in
        guard let self else { return false }
        return self.generation == gen && self.running
      }
    )
    if !scheduled && haptics.supported {
      hapticScheduleFailures += 1
    }
    lastHapticSeconds = eventSeconds
  }

  /// Built-in and wired routes add the player node's output presentation latency
  /// to the sample-timeline visual delay. Bluetooth and AirPlay are reported only.
  private func presentationOffset(_ session: AVAudioSession) -> (seconds: Double, trusted: Bool, route: String) {
    let port = session.currentRoute.outputs.first?.portType
    let route: String
    let trusted: Bool
    switch port {
    case .builtInSpeaker, .builtInReceiver:
      route = "builtIn"
      trusted = true
    case .headphones, .headsetMic, .lineOut, .usbAudio, .HDMI:
      route = "wired"
      trusted = true
    case .bluetoothA2DP, .bluetoothHFP, .bluetoothLE:
      route = "bluetooth"
      trusted = false
    case .airPlay:
      route = "airPlay"
      trusted = false
    default:
      route = port?.rawValue ?? "unknown"
      trusted = false
    }
    return (player.outputPresentationLatency, trusted, route)
  }

  private func scheduleVisual(
    event: PocktMusicalEvent,
    targetSample: Int64,
    eventSeconds: Double,
    generation gen: UInt64
  ) {
    let originSeconds = visualOriginHostTime == 0
      ? AVAudioTime.seconds(forHostTime: mach_absolute_time())
      : AVAudioTime.seconds(forHostTime: visualOriginHostTime)
    let nowSeconds = AVAudioTime.seconds(forHostTime: mach_absolute_time())
    var delay = max(0, originSeconds + eventSeconds - nowSeconds)
    if let nowSample = currentPlayerSample() {
      delay = max(0, Double(targetSample - nowSample) / max(1, sampleRate))
    }
    let session = AVAudioSession.sharedInstance()
    let presentation = presentationOffset(session)
    if presentation.trusted {
      delay += presentation.seconds
    }
    var payload = tickPayload(event: event, targetSample: targetSample)
    payload["expectedMs"] = eventSeconds * 1000
    payload["scheduledMusicalPosition"] = eventSeconds
    payload["expectedMusicalSeconds"] = eventSeconds
    payload["eventHostTime"] = originSeconds + eventSeconds
    payload["secondsPerBeat"] = config.secondsPerBeat
    payload["lookAheadSeconds"] = Self.lookAheadSeconds
    payload["visualDelaySeconds"] = delay
    payload["visualAlignsTo"] = presentation.trusted ? "expectedPresentation" : "playerSampleTimeline"
    payload["presentationCompensation"] = presentation.trusted ? "playerOutputPresentationLatency" : "reported-not-applied-external-route"
    payload["routeClass"] = presentation.route
    payload["outputLatencySeconds"] = session.outputLatency
    payload["ioBufferDurationSeconds"] = session.ioBufferDuration
    payload["sessionSampleRate"] = session.sampleRate
    payload["outputPresentationLatencySeconds"] = engine.outputNode.presentationLatency
    payload["playerOutputPresentationLatencySeconds"] = presentation.seconds
    payload["playerSampleAtSchedule"] = currentPlayerSample().map { Double($0) } ?? NSNull()
    NotificationCenter.default.post(name: Notification.Name("PocktBeatBusTick"), object: nil, userInfo: payload)
    DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
      guard let self, self.generation == gen, self.running else { return }
      self.emitVisual(payload)
    }
  }

  private func emitVisual(_ payload: [String: Any]) {
    beatEventsEmitted += 1
    guard let onTick else { return }
    onTick(payload)
  }

  private func tickPayload(event: PocktMusicalEvent, targetSample: Int64) -> [String: Any] {
    var payload: [String: Any] = [:]
    payload["generation"] = Double(generation)
    payload["eventIndex"] = Double(event.tickIndex)
    payload["tickIndex"] = Double(event.tickIndex)
    payload["measureIndex"] = event.measureIndex
    payload["beatIndex"] = event.beatIndex
    payload["beatStrength"] = event.accentLevel
    payload["subdivisionIndex"] = event.subdivisionIndex
    payload["isDownbeat"] = event.isDownbeat
    payload["isPrimaryBeat"] = event.isPrimaryBeat
    payload["isBackbeat"] = event.isBackbeat
    payload["isAccent"] = event.isAccent
    payload["accentLevel"] = event.accentLevel
    payload["audible"] = event.audible
    payload["silentMeasure"] = event.silentMeasure
    payload["clickReturned"] = event.clickReturned
    payload["volume"] = event.volume
    payload["soundRole"] = event.soundRole
    payload["visualIntensity"] = event.visualIntensity
    payload["feelOffsetMs"] = event.feelOffsetSeconds * 1000
    payload["expectedMs"] = event.eventSeconds * 1000
    payload["scheduledMusicalPosition"] = event.eventSeconds
    payload["expectedMusicalSeconds"] = event.eventSeconds
    payload["bpm"] = config.bpm
    payload["targetSample"] = Double(targetSample)
    payload["absoluteEventSample"] = Double(targetSample)
    payload["sampleRate"] = sampleRate
    return payload
  }

  private func currentPlayerSample() -> Int64? {
    guard let nodeTime = player.lastRenderTime, nodeTime.isSampleTimeValid else {
      return nil
    }
    guard let playerTime = player.playerTime(forNodeTime: nodeTime), playerTime.isSampleTimeValid else {
      return nil
    }
    let sample = playerTime.sampleTime
    if sample < 0 {
      return nil
    }
    lastKnownPlayerSample = sample
    return sample
  }

  /// Host seconds at which player sample `s` reaches the output, from the player's last render time.
  private func hostSeconds(forPlayerSample s: Int64) -> Double? {
    guard let nodeTime = player.lastRenderTime, nodeTime.isSampleTimeValid, nodeTime.isHostTimeValid,
          let pt = player.playerTime(forNodeTime: nodeTime), pt.isSampleTimeValid else { return nil }
    return AVAudioTime.seconds(forHostTime: nodeTime.hostTime) + Double(s - pt.sampleTime) / max(1, sampleRate)
  }

  /// Haptic events are given as player-sample seconds; their origin is player sample 0, heard at the output.
  private func hapticOriginDelay() -> Double {
    let machNow = AVAudioTime.seconds(forHostTime: mach_absolute_time())
    guard let h0 = hostSeconds(forPlayerSample: 0) else {
      return -Double(currentAbsoluteSample()) / max(1, sampleRate)
    }
    var d = h0 - machNow
    let pres = presentationOffset(AVAudioSession.sharedInstance())
    if pres.trusted { d += pres.seconds }
    return d
  }

  private func currentAbsoluteSample() -> Int64 {
    if let sample = currentPlayerSample() {
      return sample
    }
    return lastKnownPlayerSample
  }

  private func actualSampleRate() -> Double {
    let mixerRate = engine.mainMixerNode.outputFormat(forBus: 0).sampleRate
    if mixerRate > 0 { return mixerRate }
    let sessionRate = AVAudioSession.sharedInstance().sampleRate
    return sessionRate > 0 ? sessionRate : 44100
  }

  private func chunkFormat() throws -> AVAudioFormat {
    let mixer = engine.mainMixerNode.outputFormat(forBus: 0)
    if mixer.sampleRate > 0 && mixer.channelCount > 0 && mixer.commonFormat == .pcmFormatFloat32 {
      return mixer
    }
    let rate = actualSampleRate()
    let channels: AVAudioChannelCount = mixer.channelCount > 0 ? mixer.channelCount : 2
    guard
      let format = AVAudioFormat(
        commonFormat: .pcmFormatFloat32,
        sampleRate: rate,
        channels: channels,
        interleaved: false
      )
    else {
      throw NSError(
        domain: "PocktTiming",
        code: 26,
        userInfo: [NSLocalizedDescriptionKey: "V11 could not create a PCM chunk format"]
      )
    }
    return format
  }

  /// Immediate mixer gain only. Never stops, reschedules, or resets phase.
  func setMasterGain(_ volume: Double) {
    sched.lock()
    defer { sched.unlock() }
    let safe = min(1, max(0, volume.isFinite ? volume : 0.8))
    config.volume = safe
    engine.mainMixerNode.outputVolume = clampedAudibleVolume(safe)
    player.volume = 1
  }

  private func clampedAudibleVolume(_ volume: Double) -> Float {
    let linear = min(1, max(0, volume.isFinite ? volume : 0))
    if linear <= 0 { return 0 }
    // Perceptual curve so the first half of the slider is usable. 0 is silence.
    return Float(pow(linear, 0.55) * 0.92)
  }

  private func muteRenderProof() -> Bool {
    var muteConfig = PocktEngineConfig.default
    muteConfig.bpm = 120
    muteConfig.subdivision = "quarter"
    muteConfig.feel = "straight"
    muteConfig.accentPattern = ["accent", "mute", "normal", "normal"]
    muteConfig.sound = "pockt-default"
    muteConfig.volume = 0.85
    guard let format = try? chunkFormat() else { return false }
    guard
      let chunk = PocktAudioChunkRenderer.renderChunk(
        startSample: 0,
        sampleRate: sampleRate,
        format: format,
        config: muteConfig,
        bufferForEvent: { [weak self] event in
          self?.bufferForEvent(event)
        }
      )
    else { return false }
    let mutedSample = PocktAudioChunkRenderer.expectedQuarterSamples(bpm: 120, count: 2, sampleRate: sampleRate)[1]
    let mutedPeak = PocktAudioChunkRenderer.peakNear(
      chunk.buffer,
      absoluteSample: mutedSample,
      chunkStartSample: 0,
      window: 32
    )
    let downbeatPeak = PocktAudioChunkRenderer.peakNear(
      chunk.buffer,
      absoluteSample: 0,
      chunkStartSample: 0,
      window: 32
    )
    let mutedAccent = chunk.eventAccentLevels.dropFirst().first == "mute"
    return mutedPeak < 0.001 && downbeatPeak > 0.02 && mutedAccent
  }

  func setInputCapture(_ enabled: Bool) throws {
    sched.lock()
    defer { sched.unlock() }
    inputCapture = enabled
    if enabled {
      lifecycle = lifecycle == .playing ? .playing : .recording
      try configureSession()
    } else {
      _ = try restorePlaybackGraph(reloadClicks: false)
      if lifecycle == .recording {
        lifecycle = running ? .playing : .stopped
      }
    }
    if engine.isRunning {
      engine.mainMixerNode.outputVolume = clampedAudibleVolume(config.volume)
    }
  }

  func startTuner() throws -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    try requireMicrophonePermission()
    tunerAccumCount = 0
    tunerSinceAnalysis = 0
    for i in 0..<clickHostRing.count { clickHostRing[i] = 0 }
    updateClickGuard()
    // The clock never stops for the tuner. While it plays (or the looper already holds the mic) the
    // microphone joins the running graph on the same beat grid.
    let micOpen = micTap && inputCapture && engine.isRunning
    if running || micOpen {
      tunerBuffersReceived = 0
      tunerLastRms = 0
      tunerLastFrequency = 0
      tunerLastConfidence = 0
      if !micOpen {
        guard try openSharedInput() else {
          throw NSError(domain: "PocktTiming", code: 44, userInfo: [NSLocalizedDescriptionKey: "Microphone tap refused by the audio engine"])
        }
      }
      let hw = engine.inputNode.inputFormat(forBus: 0)
      tunerInputSampleRate = hw.sampleRate
      tunerInputChannels = Int(hw.channelCount)
      tunerLive = true
      lastAudioLifecycleOp = "startTuner-withClick"
      NSLog("[POCKT TUNER] started alongside the click sr=%g guard=%d", hw.sampleRate, clickGuardActive ? 1 : 0)
      return tunerSnapshot(status: "initializing")
    }
    tunerLive = false
    removeTunerTap()
    tunerBuffersReceived = 0
    tunerLastRms = 0
    tunerLastFrequency = 0
    tunerLastConfidence = 0
    tunerInputSampleRate = 0
    tunerInputChannels = 0
    if engine.isRunning {
      engine.stop()
    }
    inputCapture = true
    tunerMeasurement = true
    do {
      try configureTunerSession()
      settleTunerInputRoute()
      _ = engine.inputNode
      try PocktAudioSession.perform(.enginePrepare) {
        self.engine.prepare()
      }
      if !engine.isRunning {
        try PocktAudioSession.perform(.engineStart) {
          try self.engine.start()
        }
      }
      var format: AVAudioFormat
      do {
        format = try waitForValidTunerFormat()
      } catch {
        try PocktAudioSession.perform(.configureAudioSession) {
          try PocktAudioSession.shared.applyRecording()
        }
        sessionActivated = true
        settleTunerInputRoute()
        format = try waitForValidTunerFormat()
      }
      try installTunerTap(using: format)
    tunerLive = true
    lifecycle = .tunerInput
    lastAudioLifecycleOp = "startTuner"
      let snap = tunerSnapshot(status: "initializing")
      NSLog(
        "[POCKT TUNER] started category=%@ mode=%@ sr=%g ch=%d tap=%d sessionSR=%g",
        snap["sessionCategory"] as? String ?? "?",
        snap["sessionMode"] as? String ?? "?",
        tunerInputSampleRate,
        tunerInputChannels,
        tunerTapInstalled ? 1 : 0,
        AVAudioSession.sharedInstance().sampleRate
      )
      return snap
    } catch {
      tunerLive = false
      removeTunerTap()
      inputCapture = false
      tunerMeasurement = false
      _ = try? restorePlaybackGraph(reloadClicks: false)
      throw error
    }
  }

  func stopTuner() {
    sched.lock()
    defer { sched.unlock() }
    lastAudioLifecycleOp = "stopTuner"
    tunerLive = false
    removeTunerTap()
    tunerBuffersReceived = 0
    tunerLastFrequency = 0
    tunerLastConfidence = 0
    if running {
      // Closing the mic would restart the graph under the clock. It stays open until Stop.
      if lifecycle == .tunerInput { lifecycle = .playing }
      return
    }
    if loop.wantsInput && micTap { return }
    inputCapture = false
    tunerMeasurement = false
    freshEngine()
    do {
      _ = try restorePlaybackGraph(reloadClicks: true)
    } catch {
      NSLog("[POCKT TUNER] restore after stop failed: %@", error.localizedDescription)
      try? configureSession()
      if !engine.isRunning {
        try? engine.start()
      }
    }
    if lifecycle == .tunerInput {
      lifecycle = .stopped
    }
    safeHapticsRestart()
    connectUiClickPlayers(force: false)
  }

  private func requireMicrophonePermission() throws {
    let permission = AVAudioSession.sharedInstance().recordPermission
    switch permission {
    case .granted:
      return
    case .denied:
      throw NSError(
        domain: "PocktTiming",
        code: 41,
        userInfo: [NSLocalizedDescriptionKey: "Microphone permission denied"]
      )
    case .undetermined:
      throw NSError(
        domain: "PocktTiming",
        code: 42,
        userInfo: [NSLocalizedDescriptionKey: "Microphone permission not requested"]
      )
    @unknown default:
      throw NSError(
        domain: "PocktTiming",
        code: 41,
        userInfo: [NSLocalizedDescriptionKey: "Microphone permission unavailable"]
      )
    }
  }

  private func configureTunerSession() throws {
    try PocktAudioSession.perform(.configureAudioSession) {
      try PocktAudioSession.shared.applyTuner()
    }
    sessionActivated = true
  }

  private func settleTunerInputRoute() {
    let session = AVAudioSession.sharedInstance()
    let deadline = Date().addingTimeInterval(0.28)
    while Date() < deadline {
      if session.sampleRate > 0 && !session.currentRoute.inputs.isEmpty {
        break
      }
      RunLoop.current.run(mode: .common, before: Date().addingTimeInterval(0.02))
    }
  }

  private func resolvedTunerFormat() -> AVAudioFormat? {
    let session = AVAudioSession.sharedInstance()
    let input = engine.inputNode
    let inFmt = input.inputFormat(forBus: 0)
    let outFmt = input.outputFormat(forBus: 0)
    if outFmt.sampleRate > 0 && outFmt.channelCount > 0 {
      return outFmt
    }
    if inFmt.sampleRate > 0 && inFmt.channelCount > 0 {
      return inFmt
    }
    let hardwareRate = session.sampleRate
    let hardwareChannels = max(1, session.inputNumberOfChannels)
    guard hardwareRate > 0, hardwareChannels > 0 else { return nil }
    return AVAudioFormat(standardFormatWithSampleRate: hardwareRate, channels: AVAudioChannelCount(hardwareChannels))
  }

  private func waitForValidTunerFormat() throws -> AVAudioFormat {
    let deadline = Date().addingTimeInterval(0.5)
    var lastDesc = "none"
    while Date() < deadline {
      if let format = resolvedTunerFormat(), format.sampleRate > 0, format.channelCount > 0 {
        return format
      }
      let session = AVAudioSession.sharedInstance()
      let inFmt = engine.inputNode.inputFormat(forBus: 0)
      let outFmt = engine.inputNode.outputFormat(forBus: 0)
      lastDesc =
        "inSR=\(inFmt.sampleRate) inCh=\(inFmt.channelCount) outSR=\(outFmt.sampleRate) outCh=\(outFmt.channelCount) sessSR=\(session.sampleRate) hwCh=\(session.inputNumberOfChannels) inPorts=\(session.currentRoute.inputs.map { $0.portType.rawValue }.joined(separator: ",")) cat=\(session.category.rawValue) mode=\(session.mode.rawValue)"
      RunLoop.current.run(mode: .common, before: Date().addingTimeInterval(0.03))
    }
    throw NSError(
      domain: "PocktTiming",
      code: 43,
      userInfo: [
        NSLocalizedDescriptionKey: "Tuner input format invalid after route settle. \(lastDesc)",
      ]
    )
  }

  @discardableResult
  private func installTunerTap(using format: AVAudioFormat) throws -> AVAudioFormat {
    guard format.sampleRate > 0, format.channelCount > 0 else {
      throw NSError(
        domain: "PocktTiming",
        code: 43,
        userInfo: [
          NSLocalizedDescriptionKey:
            "Tuner input format invalid sr=\(format.sampleRate) ch=\(format.channelCount)",
        ]
      )
    }
    let input = engine.inputNode
    let nodeFormat = input.outputFormat(forBus: 0)
    let hw = input.inputFormat(forBus: 0)
    let tapFormat: AVAudioFormat? = hw.sampleRate > 0 && hw.channelCount > 0 ? hw : (nodeFormat.sampleRate > 0 && nodeFormat.channelCount > 0 ? nodeFormat : format)
    tunerInputSampleRate = (tapFormat ?? nodeFormat).sampleRate > 0
      ? (tapFormat ?? nodeFormat).sampleRate
      : format.sampleRate
    tunerInputChannels = Int(
      (tapFormat ?? nodeFormat).channelCount > 0
        ? (tapFormat ?? nodeFormat).channelCount
        : format.channelCount
    )
    micTap = false
    let ok = installMicTap()
    guard ok else {
      throw NSError(domain: "PocktTiming", code: 44, userInfo: [NSLocalizedDescriptionKey: "Microphone tap refused by the audio engine"])
    }
    return format
  }

  private func removeTunerTap() {
    removeMicTap(force: false)
  }

  /// One microphone tap feeds the looper and the tuner, so either can run while the other does.
  private func installMicTap() -> Bool {
    if micTap { return true }
    _ = PocktTryObjC({ self.engine.inputNode.removeTap(onBus: 0) }, nil)
    let ok = installTapSafely(on: engine.inputNode, bufferSize: 2048) { [weak self] buffer, when in
      guard let self else { return }
      self.loopCapture(buffer: buffer, when: when)
      if self.tunerLive { self.tunerFeed(buffer: buffer, when: when) }
    }
    micTap = ok
    tunerTapInstalled = ok
    loop.tapInstalled = ok
    return ok
  }

  /// Removes the tap unless the tuner (or, without `force`, the looper) still listens. Never restarts the graph.
  private func removeMicTap(force: Bool) {
    guard micTap else { return }
    if !force && (tunerLive || loop.wantsInput) { return }
    if force && tunerLive { return }
    _ = PocktTryObjC({ self.engine.inputNode.removeTap(onBus: 0) }, nil)
    micTap = false
    tunerTapInstalled = false
    loop.tapInstalled = false
  }

  private func updateClickGuard() {
    let port = AVAudioSession.sharedInstance().currentRoute.outputs.first?.portType
    clickGuardActive = port == .builtInSpeaker || port == .builtInReceiver
  }

  /// Audio input thread: a sliding 4096-sample window, analysed every 2048 new samples. While the click plays
  /// through the phone's own speaker, a window that holds a click is skipped, so the tuner reads the
  /// instrument and not the metronome. Headphones need no such guard.
  private func tunerFeed(buffer: AVAudioPCMBuffer, when: AVAudioTime) {
    guard let ch = buffer.floatChannelData else { return }
    let n = Int(buffer.frameLength)
    if n <= 0 { return }
    if Date().timeIntervalSince1970 < tunerConfirmMuteUntil { return }
    let chans = max(1, Int(buffer.format.channelCount))
    let rate = buffer.format.sampleRate
    let cap = tunerAccum.count
    tunerAccum.withUnsafeMutableBufferPointer { acc in
      guard let base = acc.baseAddress else { return }
      if n >= cap {
        for k in 0..<cap {
          let i = n - cap + k
          var v: Float = 0
          for c in 0..<chans { v += ch[c][i] }
          base[k] = v / Float(chans)
        }
      } else {
        memmove(base, base + n, (cap - n) * MemoryLayout<Float>.stride)
        for i in 0..<n {
          var v: Float = 0
          for c in 0..<chans { v += ch[c][i] }
          base[cap - n + i] = v / Float(chans)
        }
      }
    }
    tunerAccumCount = min(cap, tunerAccumCount + n)
    tunerSinceAnalysis += n
    guard tunerAccumCount >= cap, tunerSinceAnalysis >= 2048 else { return }
    tunerSinceAnalysis = 0
    if running && clickGuardActive {
      let end = when.isHostTimeValid
        ? AVAudioTime.seconds(forHostTime: when.hostTime) + Double(n) / max(1, rate)
        : AVAudioTime.seconds(forHostTime: mach_absolute_time())
      let start = end - Double(cap) / max(1, rate)
      for h in clickHostRing where h > 0 && h > start - 0.07 && h < end + 0.01 { return }
    }
    if tunerFeedBuffer == nil || tunerFeedBuffer?.format.sampleRate != rate {
      if let f = AVAudioFormat(standardFormatWithSampleRate: rate, channels: 1) {
        tunerFeedBuffer = AVAudioPCMBuffer(pcmFormat: f, frameCapacity: AVAudioFrameCount(cap))
      }
    }
    guard let fb = tunerFeedBuffer, let dst = fb.floatChannelData else { return }
    tunerAccum.withUnsafeBufferPointer { acc in
      if let b = acc.baseAddress { dst[0].update(from: b, count: cap) }
    }
    fb.frameLength = AVAudioFrameCount(cap)
    tunerBuffersReceived += 1
    var payload = PocktTuner.analyze(buffer: fb)
    let rms = (payload["rms"] as? Double) ?? 0
    tunerLastRms = rms
    tunerLastFrequency = (payload["frequency"] as? Double) ?? 0
    tunerLastConfidence = (payload["confidence"] as? Double) ?? 0
    payload["buffersReceived"] = tunerBuffersReceived
    payload["inputSampleRate"] = tunerInputSampleRate
    payload["inputChannelCount"] = tunerInputChannels
    payload["listeningProven"] = true
    payload["permission"] = "granted"
    payload["withClick"] = running
    emitTunerPitch(payload)
  }


  func tunerSnapshot(status: String) -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    let session = AVAudioSession.sharedInstance()
    let permission: String
    switch session.recordPermission {
    case .granted: permission = "granted"
    case .denied: permission = "denied"
    case .undetermined: permission = "undetermined"
    @unknown default: permission = "unknown"
    }
    let input = engine.inputNode
    let inFmt = input.inputFormat(forBus: 0)
    let outFmt = input.outputFormat(forBus: 0)
    return [
      "status": status,
      "permission": permission,
      "sessionCategory": session.category.rawValue,
      "sessionMode": session.mode.rawValue,
      "sessionOptions": session.categoryOptions.rawValue,
      "sessionActive": sessionActivated && session.sampleRate > 0,
      "sessionRouteInputs": session.currentRoute.inputs.map { $0.portType.rawValue },
      "availableInputs": (session.availableInputs ?? []).map { $0.portType.rawValue },
      "inputPort": session.currentRoute.inputs.first?.portType.rawValue ?? "",
      "inputNumberOfChannels": session.inputNumberOfChannels,
      "hardwareSampleRate": session.sampleRate,
      "preferredSampleRate": session.preferredSampleRate,
      "ioBufferDuration": session.ioBufferDuration,
      "isOtherAudioPlaying": session.isOtherAudioPlaying,
      "inputFormatSampleRate": inFmt.sampleRate,
      "inputFormatChannels": Int(inFmt.channelCount),
      "outputFormatSampleRate": outFmt.sampleRate,
      "outputFormatChannels": Int(outFmt.channelCount),
      "inputSampleRate": tunerInputSampleRate,
      "inputChannelCount": tunerInputChannels,
      "sessionSampleRate": session.sampleRate,
      "engineRunning": engine.isRunning,
      "tapInstalled": tunerTapInstalled,
      "buffersReceived": tunerBuffersReceived,
      "rms": tunerLastRms,
      "frequency": tunerLastFrequency,
      "confidence": tunerLastConfidence,
      "listeningProven": tunerBuffersReceived > 0,
    ]
  }

  /// Rebuild the playback graph after tuner/recorder/interrupt without resetting musical math.
  /// Does not start the metronome and does not recreate tempo segments.
  ///
  /// After a session category/mode change, a still-running AVAudioEngine can report
  /// `isRunning == true` while producing no audible output. Stop it before applying
  /// playback, then start it again. Do not skip that restart just because the engine
  /// already claims to be running.
  @discardableResult
  func restorePlaybackGraph(reloadClicks: Bool) throws -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    lastAudioLifecycleOp = "restorePlaybackGraph"
    cancelPreview()
    if !inputCapture {
      tunerLive = false
      removeMicTap(force: true)
    }
    // Keep playAndRecord while the session recorder is armed so Play cannot
    // drop the microphone or terminate an in-flight take.
    let keepCapture = inputCapture
    if !keepCapture {
      inputCapture = false
    }
    // While the session recorder is armed, do not stop/disconnect the player —
    // that restarts the graph and can terminate an in-flight take.
    let playerWired = player.engine === engine
      && !engine.outputConnectionPoints(for: player, outputBus: 0).isEmpty
    let skipRebuild = keepCapture && playerWired && engine.isRunning
    if !skipRebuild, engine.isRunning {
      NSLog("[POCKT] stopping running engine before playback session restore")
      engine.stop()
    }
    try configureSession()
    if player.engine == nil {
      engine.attach(player)
    }
    if !skipRebuild {
      let mixer = engine.mainMixerNode.outputFormat(forBus: 0)
      engine.disconnectNodeOutput(player)
      try PocktAudioSession.perform(.engineConnect) {
        if mixer.sampleRate > 0 && mixer.channelCount > 0 {
          self.engine.connect(self.player, to: self.engine.mainMixerNode, format: mixer)
        } else {
          self.engine.connect(self.player, to: self.engine.mainMixerNode, format: nil)
        }
      }
      connectPreviewPlayer()
    }
    connectUiClickPlayers(force: true)
    if !engine.isRunning {
      try PocktAudioSession.perform(.enginePrepare) {
        self.engine.prepare()
      }
      try PocktAudioSession.perform(.engineStart) {
        try self.engine.start()
      }
    }
    sampleRate = actualSampleRate()
    let format = engine.mainMixerNode.outputFormat(forBus: 0)
    if reloadClicks || !clicks.isLoaded || clicks.needsReload(for: format) {
      try PocktAudioSession.perform(.loadClickFile) {
        try self.clicks.loadBundled(format: format, uris: self.clickUris)
      }
    }
    engine.mainMixerNode.outputVolume = clampedAudibleVolume(config.volume)
    player.volume = 1
    prepared = true
    sessionActivated = true
    if running {
      recoverPlaybackPreservingPhase()
    }
    NSLog(
      "[POCKT] playback graph restored engine=%d playerAttached=%d mixerSR=%g lifecycle=%@ playerLive=%d",
      engine.isRunning ? 1 : 0,
      player.engine != nil ? 1 : 0,
      format.sampleRate,
      lifecycle.rawValue,
      currentPlayerSample() != nil ? 1 : 0
    )
    return audioProbe()
  }

  /// Distinct non-grid start cue. Never increments beat/bar index.
  private func playStartCue() {
    do {
      connectPreviewPlayer()
      try ensureEngineRunning()
      guard let format = try? chunkFormat() else { return }
      let frames = max(32, Int(format.sampleRate * 0.045))
      guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(frames)) else { return }
      buffer.frameLength = AVAudioFrameCount(frames)
      let channels = Int(format.channelCount)
      for ch in 0..<channels {
        guard let data = buffer.floatChannelData?[ch] else { continue }
        for i in 0..<frames {
          let t = Double(i) / format.sampleRate
          let env = Float(exp(-t * 55.0))
          data[i] = env * 0.22 * Float(sin(2.0 * Double.pi * 1760.0 * t))
        }
      }
      previewGeneration += 1
      if previewPlayer.isPlaying {
        previewPlayer.stop()
      }
      previewPlayer.reset()
      previewPlayer.volume = 0.7
      previewPlayer.scheduleBuffer(buffer, at: nil, options: [])
      previewPlayer.play()
      NSLog("[POCKT] pendulum start cue scheduled (not a grid beat)")
    } catch {
      NSLog("[POCKT] start cue skipped: %@", error.localizedDescription)
    }
  }

  func audioLifecycleStress() throws -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    var failures: [String] = []
    func note(_ label: String, _ ok: Bool) {
      if !ok { failures.append(label) }
    }
    let original = config
    var test = PocktEngineConfig.default
    test.bpm = 120
    test.volume = 0.4
    test.sound = "pockt-default"
    test.haptic = false
    _ = try restorePlaybackGraph(reloadClicks: true)

    for i in 0..<50 {
      do {
        _ = try start(with: test)
        note("play-\(i)-running", running && engine.isRunning && scheduledEventCount > 0)
        stop()
        note("stop-\(i)", !running)
      } catch {
        failures.append("play-stop-\(i): \(error.localizedDescription)")
        _ = try? restorePlaybackGraph(reloadClicks: true)
      }
    }

    for i in 0..<20 {
      preview(sound: "pockt-default", volume: 0.5)
      do {
        _ = try start(with: test)
        note("preview-play-\(i)", running && scheduledEventCount > 0)
        stop()
      } catch {
        failures.append("preview-play-\(i): \(error.localizedDescription)")
        _ = try? restorePlaybackGraph(reloadClicks: false)
      }
    }

    for i in 0..<20 {
      do {
        _ = try start(with: test)
        stop()
        _ = try start(with: test)
        note("room-play-\(i)", running && scheduledEventCount > 0)
        stop()
      } catch {
        failures.append("room-play-\(i): \(error.localizedDescription)")
      }
    }

    for i in 0..<20 {
      do {
        _ = try startTuner()
      } catch {
        NSLog("[POCKT] stress tuner start skipped: %@", error.localizedDescription)
      }
      stopTuner()
      do {
        _ = try start(with: test)
        note("tuner-play-\(i)", running && engine.isRunning && scheduledEventCount > 0)
        stop()
      } catch {
        failures.append("tuner-play-\(i): \(error.localizedDescription)")
        _ = try? restorePlaybackGraph(reloadClicks: false)
      }
    }

    for i in 0..<20 {
      do {
        try setInputCapture(true)
        try setInputCapture(false)
        _ = try start(with: test)
        note("capture-play-\(i)", running && scheduledEventCount > 0)
        stop()
      } catch {
        failures.append("capture-play-\(i): \(error.localizedDescription)")
        _ = try? restorePlaybackGraph(reloadClicks: false)
      }
    }

    config = original
    return [
      "passed": failures.isEmpty,
      "failureCount": failures.count,
      "failures": Array(failures.prefix(12)),
      "note": "Native audio lifecycle stress. Zero Could-not-start equivalents required.",
      "lifecycle": lifecycle.rawValue,
      "engineRunning": engine.isRunning,
    ]
  }

  private func configureSession() throws {
    try PocktAudioSession.perform(.configureAudioSession) {
      if self.inputCapture && self.tunerMeasurement {
        try PocktAudioSession.shared.applyTuner()
      } else if self.inputCapture {
        try PocktAudioSession.shared.applyRecording()
      } else {
        try PocktAudioSession.shared.applyPlayback(mixWithOthers: self.config.mixWithOthers)
      }
    }
    sessionActivated = true
  }

  private func ensureEngineRunning() throws {
    if player.engine == nil {
      _ = try bootAudioGraph(reloadClicks: !clicks.isLoaded)
    }
    if !engine.isRunning {
      try PocktAudioSession.perform(.enginePrepare) {
        self.engine.prepare()
      }
      try PocktAudioSession.perform(.engineStart) {
        try self.engine.start()
      }
    }
    engine.mainMixerNode.outputVolume = clampedAudibleVolume(config.volume)
    player.volume = 1
    if !engine.isRunning {
      throw PocktAudioSession.annotate(
        NSError(
          domain: "PocktTiming",
          code: 15,
          userInfo: [NSLocalizedDescriptionKey: "AVAudioEngine failed to start"]
        ),
        operation: .engineStart
      )
    }
  }

  @discardableResult
  private func bootAudioGraph(reloadClicks: Bool) throws -> [String: Any] {
    try configureSession()
    if player.engine == nil {
      engine.attach(player)
    }
    let mixerBefore = engine.mainMixerNode.outputFormat(forBus: 0)
    engine.disconnectNodeOutput(player)
    try PocktAudioSession.perform(.engineConnect) {
      if mixerBefore.sampleRate > 0 && mixerBefore.channelCount > 0 {
        self.engine.connect(self.player, to: self.engine.mainMixerNode, format: mixerBefore)
      } else {
        self.engine.connect(self.player, to: self.engine.mainMixerNode, format: nil)
      }
    }
    if !engine.isRunning {
      try PocktAudioSession.perform(.enginePrepare) {
        self.engine.prepare()
      }
      try PocktAudioSession.perform(.engineStart) {
        try self.engine.start()
      }
    }
    sampleRate = actualSampleRate()
    let format = engine.mainMixerNode.outputFormat(forBus: 0)
    if format.sampleRate <= 0 || format.channelCount <= 0 {
      throw NSError(
        domain: "PocktTiming",
        code: 14,
        userInfo: [NSLocalizedDescriptionKey: "AVAudioEngine mixer format is invalid (sr=\(format.sampleRate) ch=\(format.channelCount))"]
      )
    }
    if format.sampleRate != mixerBefore.sampleRate || format.channelCount != mixerBefore.channelCount {
      engine.disconnectNodeOutput(player)
      try PocktAudioSession.perform(.engineConnect) {
        self.engine.connect(self.player, to: self.engine.mainMixerNode, format: format)
      }
    }
    engine.mainMixerNode.outputVolume = clampedAudibleVolume(config.volume)
    player.volume = 1
    connectPreviewPlayer()
    connectUiClickPlayer()
    if reloadClicks || !clicks.isLoaded || clicks.needsReload(for: format) {
      try PocktAudioSession.perform(.loadClickFile) {
        try self.clicks.loadBundled(format: format, uris: self.clickUris)
      }
    }
    if clicks.defaultNormalBuffer == nil {
      NSLog("[POCKT] guaranteed default buffer missing after load")
    }
    NSLog(
      "[POCKT] Audio graph booted engineRunning=%d mixerSR=%g playerVolume=%g mixerVolume=%g",
      engine.isRunning ? 1 : 0,
      format.sampleRate,
      player.volume,
      engine.mainMixerNode.outputVolume
    )
    lastPrepareReport = audioProbe()
    return lastPrepareReport
  }

  func audioProbe() -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    let session = AVAudioSession.sharedInstance()
    var info: [String: Any] = [:]
    let sessionSnap = PocktAudioSession.shared.snapshot()
    for (key, value) in sessionSnap {
      info[key] = value
    }
    info["lifecycle"] = lifecycle.rawValue
    info["sessionActive"] = sessionActivated && session.sampleRate > 0
    info["sessionSampleRate"] = session.sampleRate
    info["sessionCategory"] = session.category.rawValue
    info["sessionMode"] = session.mode.rawValue
    info["sessionOutputs"] = session.currentRoute.outputs.map { $0.portType.rawValue }
    info["sessionIOBufferDuration"] = session.ioBufferDuration
    info["mixerFormat"] = "\(engine.mainMixerNode.outputFormat(forBus: 0))"
    info["outputFormat"] = "\(engine.outputNode.outputFormat(forBus: 0))"
    info["playerFormat"] = "\(player.outputFormat(forBus: 0))"
    info["sessionOtherAudio"] = session.isOtherAudioPlaying
    info["engineRunning"] = engine.isRunning
    info["playerPlaying"] = player.isPlaying
    info["playerPlayCalled"] = playerPlayCalled
    info["playerSampleAdvanced"] = playerSampleAdvanced
    info["playerSampleTimeValid"] = currentPlayerSample() != nil
    info["playerSample"] = currentPlayerSample().map { Double($0) } ?? NSNull()
    info["sampleRate"] = sampleRate
    info["mixerSampleRate"] = engine.mainMixerNode.outputFormat(forBus: 0).sampleRate
    info["mixerChannels"] = Int(engine.mainMixerNode.outputFormat(forBus: 0).channelCount)
    info["outputVolume"] = engine.mainMixerNode.outputVolume
    info["playerVolume"] = player.volume
    info["scheduledAudioCount"] = scheduledAudioCount
    info["scheduledEventCount"] = scheduledEventCount
    info["queuedChunkCount"] = queuedChunkCount
    info["firstScheduledSample"] = Double(initialEventSamples.first ?? originSample)
    info["originSample"] = Double(originSample)
    info["scheduledThroughSample"] = Double(scheduledThroughSample)
    info["nextChunkStartSample"] = Double(nextChunkStartSample)
    info["chunkDurationSeconds"] = Self.chunkDurationSeconds
    info["initialQueuedSeconds"] = Self.initialQueuedSeconds
    info["firstChunkFrameCount"] = firstChunkFrameCount
    info["firstChunkPeakAmplitude"] = Double(firstChunkPeakAmplitude)
    info["firstChunkNonZeroSampleCount"] = firstChunkNonZeroSampleCount
    info["refillCount"] = refillCount
    info["generation"] = Double(generation)
    info["running"] = running
    info["loadedSounds"] = clicks.loadedKeys
    info["currentSound"] = config.sound
    info["hasCurrentBuffer"] = clicks.buffer(for: config.sound) != nil
    info["hasDefaultBuffer"] = clicks.defaultNormalBuffer != nil
    info["clickBundle"] = clicks.bundleURL
    info["buffers"] = clicks.inventory()
    info["resourceFound"] = clicks.isLoaded
    info["bundledWavs"] = clicks.bundledWavNames()
    info["hapticsSupported"] = haptics.supported
    info["hapticScheduleAttempts"] = hapticScheduleAttempts
    info["hapticScheduleFailures"] = hapticScheduleFailures
    info["beatEventsEmitted"] = beatEventsEmitted
    info["architecture"] = architecture
    info["lastAudioLifecycleOp"] = lastAudioLifecycleOp
    info["tunerLive"] = tunerLive
    info["inputCapture"] = inputCapture
    return info
  }

  private func safeHapticsPrepare() {
    haptics.prepare()
    if !haptics.supported {
      NSLog("[POCKT] Core Haptics unavailable; audio continues")
    }
  }

  private func safeHapticsRestart() {
    haptics.restartIfNeeded()
  }

  private func captureHapticOrigin(_ delay: Double) {
    haptics.captureOrigin(audioOriginDelaySeconds: delay)
  }

  private func installObserversIfNeeded() {
    guard interruptionObservers.isEmpty else { return }
    let center = NotificationCenter.default
    interruptionObservers.append(
      center.addObserver(
        forName: AVAudioSession.interruptionNotification,
        object: AVAudioSession.sharedInstance(),
        queue: .main
      ) { [weak self] notification in
        self?.handleInterruption(notification)
      }
    )
    interruptionObservers.append(
      center.addObserver(
        forName: AVAudioSession.routeChangeNotification,
        object: AVAudioSession.sharedInstance(),
        queue: .main
      ) { [weak self] notification in
        self?.handleSessionRouteChange(notification)
      }
    )
    observeEngineConfiguration()
    interruptionObservers.append(
      center.addObserver(
        forName: AVAudioSession.mediaServicesWereResetNotification,
        object: AVAudioSession.sharedInstance(),
        queue: .main
      ) { [weak self] _ in
        self?.handleRouteChange()
      }
    )
  }

  private func observeEngineConfiguration() {
    if let o = engineConfigObserver { NotificationCenter.default.removeObserver(o) }
    engineConfigObserver = NotificationCenter.default.addObserver(
      forName: .AVAudioEngineConfigurationChange,
      object: engine,
      queue: .main
    ) { [weak self] _ in
      self?.handleRouteChange()
    }
  }

  /// A brand-new AVAudioEngine with no input node in its graph. Every player node moves across; the next
  /// restore wires them up and reloads the clicks. Only while the clock is stopped.
  func freshEngine() {
    sched.lock()
    defer { sched.unlock() }
    guard !running else { return }
    let old = engine
    _ = PocktTryObjC({ old.inputNode.removeTap(onBus: 0) }, nil)
    tunerTapInstalled = false
    loop.tapInstalled = false
    micTap = false
    old.stop()
    for node in [player, previewPlayer, loop.player] + uiClickPlayers where node.engine === old {
      node.stop()
      _ = PocktTryObjC({ old.detach(node) }, nil)
    }
    engine = AVAudioEngine()
    observeEngineConfiguration()
    prepared = false
    NSLog("[POCKT] fresh audio engine (microphone released)")
  }

  private func removeObservers() {
    if let o = engineConfigObserver { NotificationCenter.default.removeObserver(o); engineConfigObserver = nil }
    for observer in interruptionObservers {
      NotificationCenter.default.removeObserver(observer)
    }
    interruptionObservers.removeAll()
  }

  private func handleInterruption(_ notification: Notification) {
    sched.lock()
    defer { sched.unlock() }
    guard
      let info = notification.userInfo,
      let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: typeValue)
    else { return }

    switch type {
    case .began:
      PocktAudioSession.shared.markInterrupted()
      lifecycle = .interrupted
      if running {
        player.pause()
      }
    case .ended:
      lifecycle = .recovering
      _ = try? restorePlaybackGraph(reloadClicks: false)
      if running {
        safeHapticsRestart()
        restartChunkPlayback()
        lifecycle = .playing
      } else {
        lifecycle = .stopped
      }
    @unknown default:
      break
    }
  }

  private func handleSessionRouteChange(_ notification: Notification) {
    sched.lock()
    defer { sched.unlock() }
    let reasonValue = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt
    let reason = reasonValue.flatMap { AVAudioSession.RouteChangeReason(rawValue: $0) }
    if reason == .oldDeviceUnavailable && config.headphoneStop && running {
      stop()
      emitState()
      return
    }
    handleRouteChange()
  }

  private func handleRouteChange() {
    sched.lock()
    defer { sched.unlock() }
    updateClickGuard()
    guard prepared else { return }
    sampleRate = actualSampleRate()
    let format = engine.mainMixerNode.outputFormat(forBus: 0)
    if clicks.needsReload(for: format) {
      _ = try? bootAudioGraph(reloadClicks: true)
    }
    if !engine.isRunning {
      engine.prepare()
      try? engine.start()
    }
    if running {
      restartChunkPlayback()
    }
    connectUiClickPlayers(force: false)
  }

  private func emitTunerPitch(_ payload: [String: Any]) {
    // AVAudioEngine input taps fire on the I/O thread. onTick / onEngineState
    // are already main-queued; sendEvent from this thread can kill the process.
    DispatchQueue.main.async { [weak self] in
      guard let self, self.tunerLive else { return }
      self.onTunerPitch?(payload)
    }
  }

  private func emitState() {
    let payload = nativeState()
    DispatchQueue.main.async { [weak self] in
      self?.onState?(payload)
    }
  }

  private func emitStateLocked() {
    emitState()
  }
}

// MARK: - Looper ------------------------------------------------------------------------------------------
// A phrase looper with layers, run on the click's own timeline. The microphone is captured raw with the host
// time of every block; when a take or a layer ends, the span between the two heard bar lines is cut from the
// raw capture, resampled to the click's exact sample length for those bars, and stored as a layer. The layers
// are mixed into one buffer that a second player node plays, scheduled by host time on every loop start, so
// it can never drift from the click. Layers can be undone, redone, muted and deleted; the mix is rebuilt.

final class PocktLoopState {
  enum Phase: String { case idle, recording, ready, playing }
  var phase: Phase = .idle
  var capturing = false            // the mic is being recorded into `raw` (a take or a layer)
  // raw capture
  var raw: UnsafeMutablePointer<Float>?
  var rawCapacity = 0
  var rawWritten = 0
  var rawRate: Double = 0
  var rawStartHost: Double = 0     // host seconds of the first captured sample (as it reached the tap)
  var blocks = 0
  var tapInstalled = false
  var tapError = ""
  // the loop
  var startMeasure = 0
  var bars = 0
  var length = 0                   // samples per cycle, at the output rate
  var layers: [[Float]] = []       // each exactly `length` samples
  var muted: [Bool] = []
  var redo: [Float]? = nil
  var mix: AVAudioPCMBuffer?
  // playback
  let player = AVAudioPlayerNode()
  var playFromMeasure = 0
  var nextCycle = 0
  var timer: DispatchSourceTimer?
  // host-time to click-sample mapping, refreshed on the main thread
  var mapHost: Double = 0
  var mapSample: Int64 = 0
  var mapRate: Double = 48000
  var outLatency: Double = 0
  var inLatency: Double = 0
  var generation: UInt64 = 0
  var wantsInput = false
  deinit { raw?.deallocate() }
}

extension PocktTimingEngine {
  private func loopSample(forMeasure m: Int) -> Int64 {
    let tick = Int64(max(0, m)) * Int64(config.ticksPerMeasure)
    return PocktTransportMath.sample(forTick: tick, segments: tempoSegments, sampleRate: sampleRate)
  }

  @discardableResult
  private func loopRefreshMap() -> Bool {
    guard let nodeTime = player.lastRenderTime, nodeTime.isSampleTimeValid, nodeTime.isHostTimeValid,
          let pt = player.playerTime(forNodeTime: nodeTime), pt.isSampleTimeValid else { return false }
    loop.mapHost = AVAudioTime.seconds(forHostTime: nodeTime.hostTime)
    loop.mapSample = pt.sampleTime
    loop.mapRate = sampleRate
    loop.outLatency = max(0, min(0.25, player.outputPresentationLatency))
    loop.inLatency = max(0, min(0.25, AVAudioSession.sharedInstance().inputLatency))
    return true
  }

  /// Host seconds at which the downbeat of measure `m` is heard, from the click's own schedule.
  private func loopHeardHost(measure m: Int) -> Double? {
    guard loop.mapHost > 0 else { return nil }
    let s = loopSample(forMeasure: m)
    return loop.mapHost + Double(s - loop.mapSample) / loop.mapRate + loop.outLatency
  }

  private func loopEnsureTimer() {
    guard loop.timer == nil else { return }
    // the loop is queued from the scheduler's queue, so a busy main thread cannot starve it either
    let t = DispatchSource.makeTimerSource(queue: renderQueue)
    t.schedule(deadline: .now(), repeating: .milliseconds(40))
    t.setEventHandler { [weak self] in self?.loopTick() }
    t.resume()
    loop.timer = t
  }

  private func loopTick() {
    sched.lock()
    defer { sched.unlock() }
    loopRefreshMap()
    if loop.phase == .playing { loopScheduleAhead() }
    if loop.phase == .idle || loop.phase == .ready {
      loop.timer?.cancel()
      loop.timer = nil
    }
  }

  private func loopAttachPlayer() {
    if loop.player.engine == nil { engine.attach(loop.player) }
    engine.disconnectNodeOutput(loop.player)
    engine.connect(loop.player, to: engine.mainMixerNode, format: loop.mix?.format)
  }

  var loopWantsInput: Bool { loop.wantsInput }

  /// Opens the microphone path before a take, the way the tuner does it (the one path proven to deliver
  /// audio): the engine is stopped, the session goes to record mode, the tap goes on the input while the
  /// engine is down, then the engine starts with the input live. If the click was running it picks up again
  /// on its own timeline. The tap stays on until the mic is released; takes just switch capture on and off.
  func loopPrepare() throws -> Bool {
    sched.lock()
    defer { sched.unlock() }
    try requireMicrophonePermission()
    loop.wantsInput = true
    if micTap && inputCapture && engine.isRunning {
      if loop.raw == nil { loopAllocRaw(rate: liveInputRate()) }
      return true
    }
    return try loopOpenInput()
  }

  private func liveInputRate() -> Double {
    let r = engine.inputNode.inputFormat(forBus: 0).sampleRate
    return r > 0 ? r : max(8000, AVAudioSession.sharedInstance().sampleRate)
  }

  @discardableResult
  private func loopOpenInput() throws -> Bool {
    let ok = try openSharedInput()
    if ok { loopAllocRaw(rate: liveInputRate()) }
    return ok
  }

  /// Opens the microphone for the looper and the tuner. The click's graph has to restart once for the
  /// record session; the clock resumes on its own beat grid (see recoverPlaybackPreservingPhase).
  @discardableResult
  private func openSharedInput() throws -> Bool {
    let wasRunning = running
    inputCapture = true
    tunerMeasurement = false
    if engine.isRunning { engine.stop() }
    try configureSession()
    // the input format settles a moment after the switch to record mode
    var hw = engine.inputNode.inputFormat(forBus: 0)
    var tries = 0
    while (hw.sampleRate <= 0 || hw.channelCount == 0) && tries < 15 {
      Thread.sleep(forTimeInterval: 0.02)
      hw = engine.inputNode.inputFormat(forBus: 0)
      tries += 1
    }
    guard hw.sampleRate > 0, hw.channelCount > 0 else {
      loop.tapError = "no microphone input (format)"
      try? startEngineAfterInput(wasRunning: wasRunning)
      return false
    }
    micTap = false
    let ok = installMicTap()
    if !ok { loop.tapError = "microphone refused" }
    updateClickGuard()
    try startEngineAfterInput(wasRunning: wasRunning)
    return ok
  }

  private func startEngineAfterInput(wasRunning: Bool) throws {
    if player.engine == nil { engine.attach(player) }
    connectUiClickPlayers(force: false)
    if !engine.isRunning {
      engine.prepare()
      try engine.start()
    }
    engine.mainMixerNode.outputVolume = clampedAudibleVolume(config.volume)
    if wasRunning { recoverPlaybackPreservingPhase() }
  }

  private func loopAllocRaw(rate: Double) {
    let cap = Int(rate * 240)   // four minutes of raw capture
    if loop.raw == nil || loop.rawCapacity != cap {
      loop.raw?.deallocate()
      loop.raw = UnsafeMutablePointer<Float>.allocate(capacity: cap)
      loop.rawCapacity = cap
    }
    loop.rawRate = rate
  }

  // ---- capture --------------------------------------------------------------------------------------------

  private func loopBeginCapture() throws {
    try requireMicrophonePermission()
    loop.capturing = false
    loop.generation &+= 1
    loop.rawWritten = 0
    loop.rawStartHost = 0
    loop.blocks = 0
    loop.tapError = ""
    loop.wantsInput = true
    if !micTap || !inputCapture || !engine.isRunning {
      try loopOpenInput()
    } else if loop.raw == nil {
      loopAllocRaw(rate: liveInputRate())
    }
    loopRefreshMap()
    loopEnsureTimer()
    loop.capturing = true
  }

  private func loopEndCapture() {
    loop.capturing = false
  }

  private func loopRemoveTap() {
    loop.capturing = false
    removeMicTap(force: true)   // the tuner may still be listening
  }

  /// Starts capturing for the first take; it begins on the downbeat of `startMeasure`.
  func loopArm(startMeasure: Int) throws -> Bool {
    sched.lock()
    defer { sched.unlock() }
    guard running else { return false }
    loopHalt()
    loop.startMeasure = startMeasure
    loop.bars = 0
    loop.length = 0
    loop.layers = []
    loop.muted = []
    loop.redo = nil
    loop.mix = nil
    loop.phase = .recording
    try loopBeginCapture()
    return true
  }

  /// Starts capturing a new layer over the playing loop; the layer is one full pass from the loop start
  /// at measure `passStartMeasure`.
  func loopArmLayer() throws -> Bool {
    sched.lock()
    defer { sched.unlock() }
    guard running, loop.phase == .playing, loop.length > 0, loop.layers.count < 6 else { return false }
    try loopBeginCapture()
    return true
  }

  /// Audio input thread: append the block, remember when the first sample arrived.
  private func loopCapture(buffer: AVAudioPCMBuffer, when: AVAudioTime) {
    guard loop.capturing, let raw = loop.raw, let ch = buffer.floatChannelData else { return }
    let n = Int(buffer.frameLength)
    if n <= 0 { return }
    let chans = max(1, Int(buffer.format.channelCount))
    if loop.rawWritten == 0 {
      loop.rawStartHost = when.isHostTimeValid ? AVAudioTime.seconds(forHostTime: when.hostTime) : AVAudioTime.seconds(forHostTime: mach_absolute_time())
    }
    let room = loop.rawCapacity - loop.rawWritten
    let m = min(n, room)
    if m <= 0 { return }
    let base = loop.rawWritten
    if chans == 1 {
      (raw + base).update(from: ch[0], count: m)
    } else {
      for i in 0..<m {
        var v: Float = 0
        for c in 0..<chans { v += ch[c][i] }
        raw[base + i] = v / Float(chans)
      }
    }
    loop.rawWritten = base + m
    loop.blocks += 1
  }

  /// Cuts the span between two heard host times out of the raw capture, resampled to `len` samples.
  private func loopCut(startHost: Double, endHost: Double, len: Int) -> (samples: [Float], peak: Float)? {
    guard let raw = loop.raw, loop.rawWritten > 0, len > 64 else { return nil }
    let inRate = loop.rawRate
    let acousticStart = loop.rawStartHost - loop.inLatency
    let i0 = (startHost - acousticStart) * inRate
    let i1 = (endHost - acousticStart) * inRate
    let have = Double(loop.rawWritten)
    if i1 > have + inRate * 0.3 { return nil }
    var out = [Float](repeating: 0, count: len)
    let step = (i1 - i0) / Double(len)
    var peak: Float = 0
    for k in 0..<len {
      let pos = i0 + Double(k) * step
      if pos >= 0 && pos < have - 1 {
        let j = Int(pos)
        let f = Float(pos - Double(j))
        let v = raw[j] * (1 - f) + raw[j + 1] * f
        out[k] = v
        peak = max(peak, abs(v))
      }
    }
    // 4 ms edges so the seam never clicks
    let fade = max(1, Int(0.004 * Double(len > 0 ? sampleRate : 48000)))
    for k in 0..<min(fade, len) {
      let g = Float(k) / Float(fade)
      out[k] *= g
      out[len - 1 - k] *= g
    }
    return (out, peak)
  }

  /// Sums the unmuted layers into the playback buffer, levelled so the loudest layer sits at -3 dB.
  private func loopRebuildMix() {
    let len = loop.length
    guard len > 0 else { loop.mix = nil; return }
    let mixer = engine.mainMixerNode.outputFormat(forBus: 0)
    let outRate = sampleRate > 0 ? sampleRate : 48000
    guard let fmt = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: outRate, channels: min(2, max(1, mixer.channelCount)), interleaved: false),
          let buf = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: AVAudioFrameCount(len)),
          let dst = buf.floatChannelData else { loop.mix = nil; return }
    buf.frameLength = AVAudioFrameCount(len)
    var sum = [Float](repeating: 0, count: len)
    for (i, layer) in loop.layers.enumerated() where !(loop.muted[safe: i] ?? false) {
      let g = Self.loopLayerGain(layer)
      for k in 0..<len { sum[k] += layer[k] * g }
    }
    var peak: Float = 0
    for k in 0..<len { peak = max(peak, abs(sum[k])) }
    let g: Float = peak > 0.7 ? 0.7 / peak : 1
    for k in 0..<len { sum[k] *= g }
    for c in 0..<Int(fmt.channelCount) { dst[c].update(from: sum, count: len) }
    loop.mix = buf
  }

  /// Each layer is brought to the same level (peak -3 dB), so a quiet second pass sits with the first.
  private static func loopLayerGain(_ layer: [Float]) -> Float {
    var peak: Float = 0
    for v in layer { peak = max(peak, abs(v)) }
    return peak > 0.0005 ? min(8, 0.7 / peak) : 1
  }

  /// Ends the first take on the downbeat of `endMeasure` (call just after it was heard) and starts
  /// playback from that same downbeat, so the loop comes back seamlessly. Returns {ok, reason, bars}.
  func loopFinalize(endMeasure: Int, jsStartHost: Double, jsEndHost: Double) -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    func fail(_ reason: String) -> [String: Any] {
      NSLog("[POCKT LOOP] take failed: %@", reason)
      loopEndCapture()
      loop.phase = .idle
      return ["ok": false, "reason": reason, "blocks": loop.blocks, "frames": loop.rawWritten]
    }
    guard loop.phase == .recording, loop.capturing else { return fail("not recording") }
    if !loop.tapError.isEmpty && loop.blocks == 0 { return fail(loop.tapError) }
    guard loop.blocks > 0, loop.rawWritten > 0 else { return fail("no microphone input") }
    let endM = max(loop.startMeasure + 1, endMeasure)
    let bars = endM - loop.startMeasure
    loopRefreshMap()
    var startHost = loopHeardHost(measure: loop.startMeasure) ?? 0
    var endHost = loopHeardHost(measure: endM) ?? 0
    if startHost <= 0 || endHost <= startHost { startHost = jsStartHost; endHost = jsEndHost }
    guard startHost > 0, endHost > startHost else { return fail("timing map unavailable") }
    loopEndCapture()
    let outRate = sampleRate > 0 ? sampleRate : 48000
    let clickLen = Int(loopSample(forMeasure: endM) - loopSample(forMeasure: loop.startMeasure))
    let len = clickLen > 64 ? clickLen : Int((endHost - startHost) * outRate)
    guard let cut = loopCut(startHost: startHost, endHost: endHost, len: len) else { return fail("take ended early") }
    guard cut.peak > 0.0005 else { return fail("silent take · check the mic") }
    loop.length = len
    loop.layers = [cut.samples]
    loop.muted = [false]
    loop.redo = nil
    loop.bars = bars
    loopRebuildMix()
    loop.phase = .ready
    NSLog("[POCKT LOOP] take ready bars=%d len=%d", bars, len)
    // straight into playback from the bar line that just passed
    _ = loopPlay(fromMeasure: endM)
    return ["ok": true, "bars": bars, "reason": "", "layers": loop.layers.count]
  }

  /// Ends a layer: the pass that began on the loop start at `passStartMeasure` and ended one loop later.
  func loopFinalizeLayer(passStartMeasure: Int, jsStartHost: Double, jsEndHost: Double) -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    func fail(_ reason: String) -> [String: Any] {
      NSLog("[POCKT LOOP] layer failed: %@", reason)
      loopEndCapture()
      return ["ok": false, "reason": reason, "layers": loop.layers.count]
    }
    guard loop.capturing, loop.length > 0, loop.bars > 0 else { return fail("not recording a layer") }
    if !loop.tapError.isEmpty && loop.blocks == 0 { return fail(loop.tapError) }
    guard loop.blocks > 0 else { return fail("no microphone input") }
    loopRefreshMap()
    var startHost = loopHeardHost(measure: passStartMeasure) ?? 0
    var endHost = loopHeardHost(measure: passStartMeasure + loop.bars) ?? 0
    if startHost <= 0 || endHost <= startHost { startHost = jsStartHost; endHost = jsEndHost }
    guard startHost > 0, endHost > startHost else { return fail("timing map unavailable") }
    loopEndCapture()
    guard let cut = loopCut(startHost: startHost, endHost: endHost, len: loop.length) else { return fail("layer ended early") }
    guard cut.peak > 0.0005 else { return fail("silent layer") }
    loop.layers.append(cut.samples)
    loop.muted.append(false)
    loop.redo = nil
    loopRebuildMix()
    loopRestartPlaybackWithNewMix()
    return ["ok": true, "layers": loop.layers.count, "reason": ""]
  }

  /// Drops the capture of a layer in progress (the loop keeps playing).
  func loopCancelLayer() {
    sched.lock()
    defer { sched.unlock() }
    loopEndCapture()
  }

  // ---- layers ---------------------------------------------------------------------------------------------

  /// Undo the last layer (kept for redo); the first take itself is never undone, use clear.
  func loopUndo() -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    guard loop.layers.count > 1 else { return ["ok": false, "layers": loop.layers.count] }
    loop.redo = loop.layers.removeLast()
    loop.muted.removeLast()
    loopRebuildMix()
    loopRestartPlaybackWithNewMix()
    return ["ok": true, "layers": loop.layers.count, "canRedo": true]
  }

  func loopRedo() -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    guard let r = loop.redo else { return ["ok": false, "layers": loop.layers.count] }
    loop.layers.append(r)
    loop.muted.append(false)
    loop.redo = nil
    loopRebuildMix()
    loopRestartPlaybackWithNewMix()
    return ["ok": true, "layers": loop.layers.count, "canRedo": false]
  }

  func loopSetLayerMuted(_ index: Int, _ muted: Bool) -> Bool {
    sched.lock()
    defer { sched.unlock() }
    guard index >= 0, index < loop.layers.count else { return false }
    loop.muted[index] = muted
    loopRebuildMix()
    loopRestartPlaybackWithNewMix()
    return true
  }

  func loopDeleteLayer(_ index: Int) -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    guard index >= 0, index < loop.layers.count else { return ["ok": false, "layers": loop.layers.count] }
    if loop.layers.count == 1 { loopClear(); return ["ok": true, "layers": 0] }
    loop.layers.remove(at: index)
    loop.muted.remove(at: index)
    loop.redo = nil
    loopRebuildMix()
    loopRestartPlaybackWithNewMix()
    return ["ok": true, "layers": loop.layers.count]
  }

  /// A new mix while playing: the queued cycles carry the old sound, so re-queue from the next cycle.
  private func loopRestartPlaybackWithNewMix() {
    guard loop.phase == .playing else { return }
    let from = loop.playFromMeasure
    loop.player.stop()
    loopAttachPlayer()
    _ = PocktTryObjC({ self.loop.player.play() }, nil)
    loop.playFromMeasure = from
    loop.nextCycle = max(0, loop.nextCycle - 3)
    loopRefreshMap()
    loopScheduleAhead()
  }

  // ---- playback -------------------------------------------------------------------------------------------

  /// Plays the loop from the downbeat of `fromMeasure`, a new cycle every `bars` measures, until halted.
  func loopPlay(fromMeasure: Int) -> Bool {
    sched.lock()
    defer { sched.unlock() }
    guard running, loop.mix != nil, loop.bars > 0, loop.phase == .ready || loop.phase == .playing else { return false }
    guard engine.isRunning else { return false }
    if loop.player.engine != nil { loop.player.stop() }
    loopAttachPlayer()
    loop.playFromMeasure = fromMeasure
    loop.nextCycle = 0
    loop.phase = .playing
    _ = PocktTryObjC({ self.loop.player.play() }, nil)
    loopRefreshMap()
    loopScheduleAhead()
    loopEnsureTimer()
    return true
  }

  private func loopScheduleAhead() {
    guard loop.phase == .playing, let buf = loop.mix, loop.mapHost > 0, loop.bars > 0 else { return }
    let now = AVAudioTime.seconds(forHostTime: mach_absolute_time())
    var guardCount = 0
    while guardCount < 6 {
      guardCount += 1
      let m = loop.playFromMeasure + loop.nextCycle * loop.bars
      let s = loopSample(forMeasure: m)
      let host = loop.mapHost + Double(s - loop.mapSample) / loop.mapRate
      if host > now + 1.2 { break }            // far enough ahead
      if host < now - 0.02 {
        // a cycle that has already begun: join it in progress rather than wait a whole loop
        let late = now - host + 0.03
        let skip = Int(late * loop.mapRate)
        if skip < Int(buf.frameLength) - 64, let part = Self.loopTail(of: buf, from: skip) {
          let when = AVAudioTime(hostTime: AVAudioTime.hostTime(forSeconds: now + 0.03))
          _ = PocktTryObjC({ self.loop.player.scheduleBuffer(part, at: when, options: [], completionHandler: nil) }, nil)
        }
        loop.nextCycle += 1
        continue
      }
      let when = AVAudioTime(hostTime: AVAudioTime.hostTime(forSeconds: host))
      _ = PocktTryObjC({ self.loop.player.scheduleBuffer(buf, at: when, options: [], completionHandler: nil) }, nil)
      loop.nextCycle += 1
    }
  }

  private static func loopTail(of buf: AVAudioPCMBuffer, from skip: Int) -> AVAudioPCMBuffer? {
    let n = Int(buf.frameLength) - skip
    guard n > 0, let out = AVAudioPCMBuffer(pcmFormat: buf.format, frameCapacity: AVAudioFrameCount(n)),
          let src = buf.floatChannelData, let dst = out.floatChannelData else { return nil }
    out.frameLength = AVAudioFrameCount(n)
    let fade = min(n, 96)
    for c in 0..<Int(buf.format.channelCount) {
      dst[c].update(from: src[c] + skip, count: n)
      for k in 0..<fade { dst[c][k] *= Float(k) / Float(fade) }
    }
    return out
  }

  func loopHalt() {
    sched.lock()
    defer { sched.unlock() }
    if loop.player.engine != nil { loop.player.stop() }
    if loop.phase == .playing { loop.phase = .ready }
  }

  func loopClear() {
    sched.lock()
    defer { sched.unlock() }
    loop.generation &+= 1
    loopEndCapture()   // the mic stays open while the click runs, ready for the next take
    loopHalt()
    loop.layers = []
    loop.muted = []
    loop.redo = nil
    loop.mix = nil
    loop.length = 0
    loop.bars = 0
    loop.phase = .idle
  }

  /// Hands the session back to playback when the click has stopped (the loop is kept).
  func loopReleaseInput() {
    sched.lock()
    defer { sched.unlock() }
    loopReleaseCore()
    loop.wantsInput = false
    if inputCapture && !running && !tunerLive {
      inputCapture = false
      freshEngine()
      _ = try? restorePlaybackGraph(reloadClicks: true)
    }
  }

  fileprivate func loopReleaseCore() {
    loop.generation &+= 1
    loopRemoveTap()
    if loop.phase == .recording { loop.phase = loop.mix != nil ? .ready : .idle }
    loopHalt()
  }

  func loopInfo() -> [String: Any] {
    sched.lock()
    defer { sched.unlock() }
    var levels: [Double] = []
    for layer in loop.layers {
      var p: Float = 0
      for v in layer { p = max(p, abs(v)) }
      levels.append(Double(p))
    }
    return [
      "phase": loop.phase.rawValue, "bars": loop.bars, "hasTake": loop.mix != nil, "layers": loop.layers.count,
      "muted": loop.muted, "canRedo": loop.redo != nil, "capturing": loop.capturing,
      "blocks": loop.blocks, "frames": loop.rawWritten, "tap": loop.tapInstalled, "tapError": loop.tapError,
      "map": loop.mapHost > 0, "inputCapture": inputCapture,
    ]
  }

  fileprivate func loopRescheduleAfterRecovery() {
    sched.lock()
    defer { sched.unlock() }
    if loop.capturing {
      loopRefreshMap()
      loopEnsureTimer()
    }
    guard loop.phase == .playing, engine.isRunning else { return }
    loopAttachPlayer()
    loop.player.stop()
    _ = PocktTryObjC({ self.loop.player.play() }, nil)
    loop.nextCycle = max(0, loop.nextCycle - 3)
    loopRefreshMap()
    loopScheduleAhead()
    loopEnsureTimer()
  }
}

private extension Array {
  subscript(safe i: Int) -> Element? { i >= 0 && i < count ? self[i] : nil }
}

extension PocktTimingEngine {
  /// Installs a mic tap in the input's own hardware format. AVAudioEngine raises an Objective-C
  /// exception (an instant crash) on any format or state mismatch, so it is caught and reported instead.
  func installTapSafely(on input: AVAudioInputNode, bufferSize: AVAudioFrameCount, block: @escaping AVAudioNodeTapBlock) -> Bool {
    let hw = input.inputFormat(forBus: 0)
    guard hw.sampleRate > 0, hw.channelCount > 0 else { return false }
    _ = PocktTryObjC({ input.removeTap(onBus: 0) }, nil)
    var reason: NSString?
    let ok = PocktTryObjC({ input.installTap(onBus: 0, bufferSize: bufferSize, format: hw, block: block) }, &reason)
    if !ok { NSLog("[POCKT] mic tap refused: %@", (reason as String?) ?? "?") }
    return ok
  }
}
