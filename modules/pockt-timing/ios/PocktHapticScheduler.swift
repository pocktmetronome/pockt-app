import CoreHaptics
import Foundation

final class PocktHapticScheduler {
  private var engine: CHHapticEngine?
  private var players: [CHHapticPatternPlayer] = []
  private(set) var supported = false
  private(set) var originTime: TimeInterval = 0
  /// Hardware floor: Taptic Engine cannot cleanly render transients faster than this.
  let hardwareMinIntervalSeconds = 0.045

  func prepare() {
    guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else {
      supported = false
      engine = nil
      return
    }
    do {
      let next = try CHHapticEngine()
      next.playsHapticsOnly = true
      next.isAutoShutdownEnabled = false
      next.resetHandler = { [weak self] in
        try? self?.engine?.start()
      }
      next.stoppedHandler = { [weak self] _ in
        try? self?.engine?.start()
      }
      try next.start()
      engine = next
      supported = true
      NSLog("[POCKT] CHHapticEngine started")
    } catch {
      supported = false
      engine = nil
      NSLog("[POCKT] Core Haptics init failed; audio continues: %@", error.localizedDescription)
    }
  }

  func captureOrigin(audioOriginDelaySeconds: Double) {
    guard let engine else { return }
    originTime = engine.currentTime + audioOriginDelaySeconds
  }

  func currentTime() -> TimeInterval {
    engine?.currentTime ?? 0
  }

  func cancelAll() {
    for player in players {
      try? player.stop(atTime: CHHapticTimeImmediate)
    }
    players.removeAll(keepingCapacity: true)
  }

  func stopEngine() {
    cancelAll()
    engine?.stop()
  }

  func restartIfNeeded() {
    guard supported else { return }
    do {
      try engine?.start()
    } catch {
      NSLog("[POCKT] Core Haptics restart failed; audio continues: %@", error.localizedDescription)
      prepare()
    }
  }

  /// Immediate UI detent haptic. Same Core Haptics engine as musical beats.
  /// Does not cancel scheduled beat patterns. Does not touch AVAudioEngine.
  @discardableResult
  func playUiTransient(kind: String) -> Bool {
    if engine == nil {
      prepare()
    }
    guard supported, let engine else { return false }
    let intensity: Float
    let sharpness: Float
    switch kind {
    case "pro":
      intensity = 0.72
      sharpness = 0.62
    case "roller":
      intensity = 0.48
      sharpness = 0.35
    default:
      intensity = 0.52
      sharpness = 0.88
    }
    do {
      try engine.start()
      let event = CHHapticEvent(
        eventType: .hapticTransient,
        parameters: [
          CHHapticEventParameter(parameterID: .hapticIntensity, value: min(1, max(0.15, intensity))),
          CHHapticEventParameter(parameterID: .hapticSharpness, value: min(1, max(0, sharpness))),
        ],
        relativeTime: 0
      )
      let pattern = try CHHapticPattern(events: [event], parameters: [])
      let player = try engine.makePlayer(with: pattern)
      try player.start(atTime: CHHapticTimeImmediate)
      players.append(player)
      if players.count > 96 {
        let stale = Array(players.prefix(players.count - 64))
        for old in stale {
          try? old.stop(atTime: CHHapticTimeImmediate)
        }
        players.removeFirst(stale.count)
      }
      return true
    } catch {
      NSLog("[POCKT] UI detent haptic failed; audio click continues")
      return false
    }
  }

  @discardableResult
  func schedule(
    atSecondsFromMusicalOrigin seconds: Double,
    userOffsetSeconds: Double,
    intensity: Float,
    sharpness: Float,
    generation: UInt64,
    boost: Bool = false,
    isCurrent: () -> Bool
  ) -> Bool {
    guard supported else { return false }
    guard let engine else { return false }
    if !isCurrent() {
      return false
    }
    let target = originTime + seconds + userOffsetSeconds
    if target < engine.currentTime - 0.05 {
      return false
    }
    do {
      let clampedIntensity: Float = min(1, max(0.15, intensity))
      let clampedSharpness: Float = min(1, max(0, sharpness))
      let intensityParam = CHHapticEventParameter(
        parameterID: .hapticIntensity,
        value: clampedIntensity
      )
      let sharpnessParam = CHHapticEventParameter(
        parameterID: .hapticSharpness,
        value: clampedSharpness
      )
      let event = CHHapticEvent(
        eventType: .hapticTransient,
        parameters: [intensityParam, sharpnessParam],
        relativeTime: 0
      )
      var events = [event]
      if boost {
        // maximum: the click lands on a short, full-strength body, so every beat thumps
        events.append(CHHapticEvent(
          eventType: .hapticContinuous,
          parameters: [
            CHHapticEventParameter(parameterID: .hapticIntensity, value: 1),
            CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.42),
          ],
          relativeTime: 0,
          duration: 0.038
        ))
      }
      let pattern = try CHHapticPattern(events: events, parameters: [])
      let player = try engine.makePlayer(with: pattern)
      try player.start(atTime: max(target, engine.currentTime))
      players.append(player)
      if players.count == 1 {
        NSLog("[POCKT] haptic pattern/player available")
        NSLog("[POCKT] haptic event scheduled")
      }
      if players.count > 96 {
        let stale = Array(players.prefix(players.count - 64))
        for old in stale {
          try? old.stop(atTime: CHHapticTimeImmediate)
        }
        players.removeFirst(stale.count)
      }
      _ = generation
      return true
    } catch {
      NSLog("[POCKT] haptic schedule failed; audio continues")
      return false
    }
  }
}

/// Intro-only Core Haptics phrase. Separate from the metronome scheduler.
enum PocktIdentHaptics {
  private static var engine: CHHapticEngine?
  private static var player: CHHapticPatternPlayer?

  static func playFinalRumble() {
    guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
    do {
      if engine == nil {
        let next = try CHHapticEngine()
        next.playsHapticsOnly = true
        next.isAutoShutdownEnabled = false
        try next.start()
        engine = next
      } else {
        try engine?.start()
      }
      guard let engine else { return }

      let impact = CHHapticEvent(
        eventType: .hapticTransient,
        parameters: [
          CHHapticEventParameter(parameterID: .hapticIntensity, value: 1),
          CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.28),
        ],
        relativeTime: 0
      )
      let rumble = CHHapticEvent(
        eventType: .hapticContinuous,
        parameters: [
          CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.94),
          CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.16),
        ],
        relativeTime: 0.018,
        duration: 0.42
      )
      let close = CHHapticEvent(
        eventType: .hapticTransient,
        parameters: [
          CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.72),
          CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.2),
        ],
        relativeTime: 0.36
      )
      let decay = CHHapticParameterCurve(
        parameterID: .hapticIntensityControl,
        controlPoints: [
          CHHapticParameterCurve.ControlPoint(relativeTime: 0.018, value: 1),
          CHHapticParameterCurve.ControlPoint(relativeTime: 0.16, value: 0.78),
          CHHapticParameterCurve.ControlPoint(relativeTime: 0.44, value: 0),
        ],
        relativeTime: 0
      )
      let pattern = try CHHapticPattern(events: [impact, rumble, close], parameterCurves: [decay])
      let nextPlayer = try engine.makePlayer(with: pattern)
      try nextPlayer.start(atTime: CHHapticTimeImmediate)
      player = nextPlayer
    } catch {
      NSLog("[POCKT] ident rumble failed: %@", error.localizedDescription)
    }
  }

  static func stop() {
    try? player?.stop(atTime: CHHapticTimeImmediate)
    player = nil
    engine?.stop()
    engine = nil
  }
}
