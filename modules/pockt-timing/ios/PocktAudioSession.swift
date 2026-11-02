import AVFoundation
import Foundation

/// Single owner of AVAudioSession for POCKT.
///
/// Order of operations (do not reorder casually):
/// 1. If the category is changing, deactivate the stale session first.
/// 2. setCategory with a *valid* category + options pair.
/// 3. Best-effort preferred sample rate / IO buffer.
/// 4. setActive(true).
/// 5. Never overrideOutputAudioPort for `.playback`.
///    On `.playAndRecord`, route to `.speaker` so metronome volume does not collapse to the receiver.
///
/// Valid pairs used here:
/// - Playback:  `.playback` + optional `.mixWithOthers`
///   `.defaultToSpeaker` is ILLEGAL on `.playback` and returns OSStatus -50.
/// - Recording: `.playAndRecord` + `.defaultToSpeaker` + `.mixWithOthers`
///
/// Do not change category on every beat. Reconfigure only on an actual mode change.
enum PocktAudioSessionMode: String {
  case inactive
  case playback
  case recording
  case tuner
  case interrupted
}

enum PocktAudioOperation: String {
  case configureAudioSession
  case setCategory
  case setPreferredSampleRate
  case setPreferredIOBufferDuration
  case setActive
  case overrideOutputAudioPort
  case engineConnect
  case enginePrepare
  case engineStart
  case loadClickFile
  case createPCMBuffer
  case scheduleBuffer
  case playerPlay
}

final class PocktAudioSession {
  static let shared = PocktAudioSession()

  private(set) var mode: PocktAudioSessionMode = .inactive
  private var lastMixWithOthers = true
  private let lock = NSLock()

  private init() {}

  func applyPlayback(mixWithOthers: Bool) throws {
    try apply(
      mode: .playback,
      category: .playback,
      sessionMode: .default,
      options: Self.playbackOptions(mixWithOthers: mixWithOthers),
      mixWithOthers: mixWithOthers
    )
  }

  func applyRecording() throws {
    try apply(
      mode: .recording,
      category: .playAndRecord,
      sessionMode: .default,
      options: Self.recordingOptions(),
      mixWithOthers: true
    )
  }

  func applyTuner() throws {
    try apply(
      mode: .tuner,
      category: .playAndRecord,
      sessionMode: .measurement,
      options: Self.recordingOptions(),
      mixWithOthers: true
    )
  }

  /// Internal mode switches must never notify other apps. That lets Music/podcasts
  /// steal the session and is a primary cause of later "Could not start".
  func restorePlayback(mixWithOthers: Bool) throws {
    try applyPlayback(mixWithOthers: mixWithOthers)
  }

  func markInterrupted() {
    lock.lock()
    mode = .interrupted
    lock.unlock()
  }

  func snapshot() -> [String: Any] {
    let session = AVAudioSession.sharedInstance()
    return [
      "sessionModeState": mode.rawValue,
      "sessionCategory": session.category.rawValue,
      "sessionMode": session.mode.rawValue,
      "sessionCategoryOptions": session.categoryOptions.rawValue,
      "sessionOutputs": session.currentRoute.outputs.map { $0.portType.rawValue },
      "sessionInputs": session.currentRoute.inputs.map { $0.portType.rawValue },
      "sessionSampleRate": session.sampleRate,
      "sessionIOBufferDuration": session.ioBufferDuration,
      "sessionOtherAudio": session.isOtherAudioPlaying,
    ]
  }

  static func playbackOptions(mixWithOthers: Bool) -> AVAudioSession.CategoryOptions {
    // Legal for .playback: mixWithOthers, duckOthers, allowBluetoothA2DP, allowAirPlay.
    // Illegal for .playback: defaultToSpeaker, allowBluetooth (HFP).
    mixWithOthers ? [.mixWithOthers] : []
  }

  static func recordingOptions() -> AVAudioSession.CategoryOptions {
    // defaultToSpeaker is only legal with playAndRecord. A2DP keeps Bluetooth headphones playing in full
    // quality while the phone's own mic listens (without it, the click would jump to the speaker).
    [.defaultToSpeaker, .mixWithOthers, .allowBluetoothA2DP]
  }

  static func perform(_ operation: PocktAudioOperation, _ work: () throws -> Void) throws {
    do {
      try work()
    } catch {
      throw annotate(error, operation: operation)
    }
  }

  static func annotate(_ error: Error, operation: PocktAudioOperation) -> NSError {
    let ns = error as NSError
    let session = AVAudioSession.sharedInstance()
    let route = session.currentRoute.outputs.map { $0.portType.rawValue }.joined(separator: ",")
    NSLog(
      "[POCKT AUDIO][FAIL] op=%@ domain=%@ code=%ld desc=%@ category=%@ mode=%@ options=%lu route=%@ sr=%g io=%g",
      operation.rawValue,
      ns.domain,
      ns.code,
      ns.localizedDescription,
      session.category.rawValue,
      session.mode.rawValue,
      session.categoryOptions.rawValue,
      route,
      session.sampleRate,
      session.ioBufferDuration
    )
    return NSError(
      domain: "PocktTiming",
      code: ns.code == 0 ? 50 : ns.code,
      userInfo: [
        NSLocalizedDescriptionKey:
          "\(operation.rawValue) failed: \(ns.localizedDescription)",
        NSUnderlyingErrorKey: ns,
        "operation": operation.rawValue,
        "nsErrorDomain": ns.domain,
        "nsErrorCode": ns.code,
        "sessionCategory": session.category.rawValue,
        "sessionMode": session.mode.rawValue,
        "sessionCategoryOptions": session.categoryOptions.rawValue,
        "sessionRoute": route,
        "sessionSampleRate": session.sampleRate,
        "sessionIOBufferDuration": session.ioBufferDuration,
      ]
    )
  }

  private func apply(
    mode next: PocktAudioSessionMode,
    category: AVAudioSession.Category,
    sessionMode: AVAudioSession.Mode,
    options: AVAudioSession.CategoryOptions,
    mixWithOthers: Bool
  ) throws {
    lock.lock()
    defer { lock.unlock() }

    let session = AVAudioSession.sharedInstance()
    let sameCategory = session.category == category
    let sameOptions = session.categoryOptions == options
    let sameAvMode = session.mode == sessionMode
    let sameMode = mode == next && lastMixWithOthers == mixWithOthers && sameAvMode

    if sameCategory && sameOptions && sameMode && session.sampleRate > 0 {
      try Self.perform(.setActive) {
        try session.setActive(true)
      }
      mode = next
      lastMixWithOthers = mixWithOthers
      logActive(session, intended: next)
      return
    }

    // Prefer setCategory while remaining active. Deactivate only if that fails.
    // Never .notifyOthersOnDeactivation for in-app tuner/recorder/play switches —
    // that hands the session to Music and leaves Play unable to start.
    do {
      try Self.perform(.setCategory) {
        try session.setCategory(category, mode: sessionMode, options: options)
      }
    } catch {
      NSLog("[POCKT AUDIO] setCategory while active failed; quiet deactivate then retry")
      do {
        try session.setActive(false)
      } catch {
        NSLog(
          "[POCKT AUDIO] deactivate before category change: %@",
          error.localizedDescription
        )
      }
      try Self.perform(.setCategory) {
        try session.setCategory(category, mode: sessionMode, options: options)
      }
    }

    do {
      try session.setPreferredSampleRate(48000)
    } catch {
      NSLog("[POCKT AUDIO] setPreferredSampleRate skipped: %@", error.localizedDescription)
    }
    do {
      try session.setPreferredIOBufferDuration(0.005)
    } catch {
      NSLog("[POCKT AUDIO] setPreferredIOBufferDuration skipped: %@", error.localizedDescription)
    }

    try Self.perform(.setActive) {
      try session.setActive(true)
    }

    if category == .playAndRecord {
      do {
        try Self.perform(.overrideOutputAudioPort) {
          try session.overrideOutputAudioPort(.speaker)
        }
      } catch {
        NSLog("[POCKT AUDIO] speaker route skipped: %@", error.localizedDescription)
      }
    } else if category == .playback {
      try? session.overrideOutputAudioPort(.none)
    }

    if category == .playAndRecord, let preferred = session.availableInputs?.first {
      do {
        try session.setPreferredInput(preferred)
      } catch {
        NSLog("[POCKT AUDIO] setPreferredInput skipped: %@", error.localizedDescription)
      }
    }

    mode = next
    lastMixWithOthers = mixWithOthers
    logActive(session, intended: next)
  }

  private func logActive(_ session: AVAudioSession, intended: PocktAudioSessionMode) {
    NSLog(
      "[POCKT AUDIO] session ready mode=%@ category=%@ avMode=%@ options=%lu sr=%g io=%g outputs=%@",
      intended.rawValue,
      session.category.rawValue,
      session.mode.rawValue,
      session.categoryOptions.rawValue,
      session.sampleRate,
      session.ioBufferDuration,
      session.currentRoute.outputs.map { $0.portType.rawValue }.joined(separator: ",")
    )
  }
}
