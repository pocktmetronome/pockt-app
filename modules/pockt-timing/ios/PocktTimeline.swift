import Foundation

struct PocktEngineConfig: Equatable {
  var bpm: Double
  var timeSignature: String
  var subdivision: String
  var feel: String
  var feelDial: Double
  var sound: String
  var soundDownbeat: String
  var soundBeat: String
  var soundSub: String
  var voiceCount: Bool
  var volume: Double
  var haptic: Bool
  var hapticSyncMs: Double
  var hapticStrength: Double = 1
  var accentPattern: [String]
  var lockIn: String
  var skin: String
  var countInBars: Int
  var clickShift: Int
  var sparseMode: String
  var pan: Double
  var accentVolume: Double
  var subVolume: Double
  var swing: String
  var polyA: Int
  var polyB: Int
  var mixWithOthers: Bool
  var headphoneStop: Bool

  static let `default` = PocktEngineConfig(
    bpm: 120,
    timeSignature: "4/4",
    subdivision: "quarter",
    feel: "straight",
    feelDial: 0,
    sound: "pockt-studio",
    soundDownbeat: "",
    soundBeat: "",
    soundSub: "",
    voiceCount: false,
    volume: 0.8,
    haptic: true,
    hapticSyncMs: 0,
    accentPattern: ["strong", "normal", "normal", "normal"],
    lockIn: "full",
    skin: "studio",
    countInBars: 0,
    clickShift: 0,
    sparseMode: "all",
    pan: 0,
    accentVolume: 1,
    subVolume: 0.72,
    swing: "straight",
    polyA: 0,
    polyB: 0,
    mixWithOthers: true,
    headphoneStop: false
  )

  var beatsPerMeasure: Int {
    let core = timeSignature.split(separator: "-").first.map(String.init) ?? timeSignature
    let parts = core.split(separator: "/")
    if let raw = parts.first, let value = Int(raw) {
      return max(1, min(16, value))
    }
    return 4
  }

  var ticksPerBeat: Int {
    switch subdivision {
    case "eighths", "dotted": return 2
    case "triplet": return 3
    case "sixteenths": return 4
    default: return 1
    }
  }

  var ticksPerMeasure: Int { ticksPerBeat * beatsPerMeasure }

  var backbeatBeats: [Int] {
    switch timeSignature {
    case "1/4": return []
    case "2/4": return [1]
    case "3/4": return [1]
    case "5/4", "5/4-32": return [3]
    case "5/4-23": return [2]
    case "6/8", "7/8": return [3]
    case "7/4": return [3]
    case "9/8": return [3, 6]
    case "12/8": return [3, 9]
    default: return [1, 3]
    }
  }

  var secondsPerBeat: Double { 60.0 / max(1.0, min(900.0, bpm)) }

  var isClassicSound: Bool {
    ["click", "wood", "stick", "clave", "pulse"].contains(sound)
  }
}

struct PocktMusicalEvent {
  var tickIndex: Int64
  var measureIndex: Int
  var beatIndex: Int
  var subdivisionIndex: Int
  var ticksPerBeat: Int
  var isDownbeat: Bool
  var isPrimaryBeat: Bool
  var isBackbeat: Bool
  var isAccent: Bool
  var accentLevel: String
  var audible: Bool
  var silentMeasure: Bool
  var clickReturned: Bool
  var volume: Double
  var soundRole: String
  var visualIntensity: Double
  var gridSeconds: Double
  var feelOffsetSeconds: Double
  var eventSeconds: Double
}

enum PocktTimeline {
  static let feelDialMaxMsAt120 = 24.0
  static let maxFeelOffsetRatio = 0.1
  static let maxFeelOffsetMs = 48.0

  static func clamp(_ value: Double, _ minValue: Double, _ maxValue: Double) -> Double {
    min(maxValue, max(minValue, value))
  }

  static func tempoScale(bpm: Double) -> Double {
    120.0 / bpm
  }

  static func maxOffsetSeconds(bpm: Double, secondsPerBeat: Double) -> Double {
    min(maxFeelOffsetMs / 1000.0, secondsPerBeat * maxFeelOffsetRatio)
  }

  static func swing(for feel: String, swing: String = "straight") -> Double {
    switch swing {
    case "light": return 0.58
    case "medium": return 0.66
    case "heavy", "dotted": return 0.75
    default: break
    }
    switch feel {
    case "push": return 0.484
    case "pocket": return 0.538
    case "laid-back": return 0.522
    case "swampy": return 0.642
    default: return 0.5
    }
  }

  static func backbeatOffsetMsAt120(for feel: String) -> Double {
    switch feel {
    case "push": return -13
    case "pocket": return 11
    case "laid-back": return 22
    case "swampy": return 30
    default: return 0
    }
  }

  static func eventBiasMsAt120(for feel: String) -> Double {
    switch feel {
    case "push": return -8
    case "pocket": return 3
    case "laid-back": return 6
    case "swampy": return 12
    default: return 0
    }
  }

  static func isMeasureAudible(measureIndex: Int, lockIn: String, countInBars: Int = 0) -> Bool {
    if measureIndex < max(0, countInBars) { return true }
    let cycleIndex = measureIndex - max(0, countInBars)
    if lockIn.hasPrefix("custom-") {
      let parts = lockIn.split(separator: "-")
      let onBars = Int(parts.dropFirst().first ?? "3") ?? 3
      let offBars = Int(parts.last ?? "1") ?? 1
      let cycle = max(1, onBars + offBars)
      return (cycleIndex % cycle) < onBars
    }
    switch lockIn {
    case "every-other", "one-on-one-off":
      return cycleIndex % 2 == 0
    case "two-on-one-off":
      return cycleIndex % 3 < 2
    case "three-on-one-off":
      return cycleIndex % 4 < 3
    case "four-on-two-off":
      return cycleIndex % 6 < 4
    case "two-on-two-off":
      return (cycleIndex / 2) % 2 == 0
    case "four-on-four-off":
      return (cycleIndex / 4) % 2 == 0
    default:
      return true
    }
  }

  static func accentLevel(config: PocktEngineConfig, beatIndex: Int) -> String {
    let expected = config.beatsPerMeasure
    if config.accentPattern.count == expected {
      let level = config.accentPattern[beatIndex]
      if level == "strong" || level == "accent" || level == "normal" || level == "mute" || level == "soft" {
        return level == "accent" ? "strong" : level
      }
    }
    return beatIndex == 0 ? "strong" : "normal"
  }

  static func musicalPosition(tickIndex: Int64, config: PocktEngineConfig) -> (measure: Int, beat: Int, sub: Int) {
    let tpm = Int64(config.ticksPerMeasure)
    let tpb = Int64(config.ticksPerBeat)
    let measure = Int(tickIndex / tpm)
    let tickInMeasure = Int(tickIndex % tpm)
    return (measure, tickInMeasure / Int(tpb), tickInMeasure % Int(tpb))
  }

  static func subdivisionOffsetInBeatSeconds(
    subdivisionIndex: Int,
    config: PocktEngineConfig
  ) -> Double {
    let ticks = config.ticksPerBeat
    let beatSec = config.secondsPerBeat
    if ticks <= 1 || subdivisionIndex <= 0 { return 0 }

    let straight = (Double(subdivisionIndex) / Double(ticks)) * beatSec
    let swingAmount = swing(for: config.feel, swing: config.subdivision == "dotted" ? "heavy" : config.swing)
    if abs(swingAmount - 0.5) < 0.0001 { return straight }

    if ticks == 3 {
      let delay = (swingAmount - 0.5) * beatSec * 0.22 * Double(subdivisionIndex)
      return straight + delay
    }

    let phase = Double(subdivisionIndex) / Double(ticks)
    if phase < 0.5 { return straight }
    return straight + (swingAmount - 0.5) * beatSec
  }

  static func gridSeconds(tickIndex: Int64, config: PocktEngineConfig) -> Double {
    let pos = musicalPosition(tickIndex: tickIndex, config: config)
    return Double(pos.measure) * config.secondsPerBeat * Double(config.beatsPerMeasure)
      + Double(pos.beat) * config.secondsPerBeat
      + subdivisionOffsetInBeatSeconds(subdivisionIndex: pos.sub, config: config)
  }

  static func feelOffsetSeconds(beatIndex: Int, subdivisionIndex: Int, config: PocktEngineConfig) -> Double {
    if config.feel == "straight" && abs(config.feelDial) < 0.0001 {
      return 0
    }
    if beatIndex == 0 && subdivisionIndex == 0 {
      return 0
    }

    let scale = tempoScale(bpm: config.bpm)
    let isPrimary = subdivisionIndex == 0
    let isBackbeat = isPrimary && config.backbeatBeats.contains(beatIndex)
    let dialMs = config.feelDial * feelDialMaxMsAt120 * scale
    let presetBias = eventBiasMsAt120(for: config.feel) * scale
    let backbeatBias = backbeatOffsetMsAt120(for: config.feel) * scale

    var offsetMs = 0.0
    if isBackbeat {
      offsetMs += backbeatBias + presetBias + dialMs
    } else if isPrimary {
      offsetMs += presetBias * 0.28 + dialMs * 0.22
    } else {
      offsetMs += dialMs * 0.4
      if config.feel == "swampy" || config.feel == "pocket" || config.feel == "laid-back" {
        offsetMs += presetBias * 0.18
      }
    }

    let limitMs = maxOffsetSeconds(bpm: config.bpm, secondsPerBeat: config.secondsPerBeat) * 1000.0
    return clamp(offsetMs, -limitMs, limitMs) / 1000.0
  }

  static func samplePosition(
    originSample: Int64,
    tickIndex: Int64,
    sampleRate: Double,
    config: PocktEngineConfig
  ) -> Int64 {
    let pos = musicalPosition(tickIndex: tickIndex, config: config)
    let grid: Double = gridSeconds(tickIndex: tickIndex, config: config)
    let feel: Double = feelOffsetSeconds(
      beatIndex: pos.beat,
      subdivisionIndex: pos.sub,
      config: config
    )
    let seconds: Double = grid + feel
    let offsetSamples: Int64 = Int64((seconds * sampleRate).rounded())
    return originSample + offsetSamples
  }

  static func event(tickIndex: Int64, config: PocktEngineConfig) -> PocktMusicalEvent {
    let pos = musicalPosition(tickIndex: tickIndex, config: config)
    let silent = !isMeasureAudible(measureIndex: pos.measure, lockIn: config.lockIn, countInBars: config.countInBars)
    let isDownbeat = pos.beat == 0 && pos.sub == 0
    let isPrimary = pos.sub == 0
    let isBackbeat = isPrimary && config.backbeatBeats.contains(pos.beat)
    let accent = accentLevel(config: config, beatIndex: pos.beat)
    let grid = gridSeconds(tickIndex: tickIndex, config: config)
    let feel = feelOffsetSeconds(beatIndex: pos.beat, subdivisionIndex: pos.sub, config: config)

    var volume = 0.24 * max(0, min(1, config.subVolume))
    var soundRole = "sub"
    var audible = true

    let shift = max(0, min(config.ticksPerBeat - 1, config.clickShift))
    let shifted = shift > 0 && pos.sub != shift
    let sparseSilent: Bool
    if config.sparseMode == "downbeats" {
      sparseSilent = !(pos.beat == 0 && pos.sub == shift)
    } else if config.sparseMode == "every-2" {
      sparseSilent = (pos.measure - max(0, config.countInBars)) % 2 != 0
    } else if config.sparseMode == "every-4" {
      sparseSilent = (pos.measure - max(0, config.countInBars)) % 4 != 0
    } else {
      sparseSilent = false
    }

    if silent || accent == "mute" || shifted || sparseSilent {
      volume = 0
      soundRole = "beat"
      audible = false
    } else if isPrimary || (shift > 0 && pos.sub == shift) {
      if accent == "strong" || accent == "accent" {
        volume = 0.84 * max(0, min(1, config.accentVolume))
        soundRole = "downbeat"
      } else if accent == "soft" {
        volume = 0.4
        soundRole = "beat"
      } else {
        volume = 0.66
        soundRole = "beat"
      }
    }

    var visual = 0.22
    if silent {
      visual = 0.1
    } else if !isPrimary {
      if accent == "mute" {
        visual = 0
      } else {
        visual = 0.22
      }
    } else if accent == "mute" {
      visual = 0.08
    } else if accent == "strong" || accent == "accent" {
      visual = 1
    } else if accent == "soft" {
      visual = 0.38
    } else if isBackbeat {
      visual = 0.78
    } else {
      visual = 0.62
    }

    let previousMeasureAudible: Bool = isMeasureAudible(
      measureIndex: pos.measure - 1,
      lockIn: config.lockIn,
      countInBars: config.countInBars
    )
    let clickReturned: Bool
    if audible && isDownbeat && pos.measure > 0 && !previousMeasureAudible {
      clickReturned = true
    } else {
      clickReturned = false
    }
    let isStrongOrAccent: Bool = accent == "strong" || accent == "accent"
    let isAccent: Bool = isStrongOrAccent && isPrimary

    return PocktMusicalEvent(
      tickIndex: tickIndex,
      measureIndex: pos.measure,
      beatIndex: pos.beat,
      subdivisionIndex: pos.sub,
      ticksPerBeat: config.ticksPerBeat,
      isDownbeat: isDownbeat,
      isPrimaryBeat: isPrimary,
      isBackbeat: isBackbeat,
      isAccent: isAccent,
      accentLevel: accent,
      audible: audible,
      silentMeasure: silent,
      clickReturned: clickReturned,
      volume: volume,
      soundRole: soundRole,
      visualIntensity: visual,
      gridSeconds: grid,
      feelOffsetSeconds: feel,
      eventSeconds: grid + feel
    )
  }

  static func shouldHaptic(event: PocktMusicalEvent, config: PocktEngineConfig, minIntervalSeconds: Double, lastHapticSeconds: Double?) -> Bool {
    if !config.haptic { return false }
    if !event.isPrimaryBeat { return false }
    if event.silentMeasure { return false }
    if event.accentLevel == "mute" { return false }
    if let last = lastHapticSeconds {
      let elapsed: Double = event.eventSeconds - last + 1e-9
      if elapsed < minIntervalSeconds {
        return false
      }
    }
    return true
  }

  static func hapticIntensity(event: PocktMusicalEvent, config: PocktEngineConfig) -> (intensity: Float, sharpness: Float) {
    let base = baseHapticIntensity(event: event, config: config)
    let k = Float(config.hapticStrength)
    if k >= 1.9 { return (1.0, min(1, base.sharpness + 0.1)) }
    return (min(1, base.intensity * k), base.sharpness)
  }

  static func baseHapticIntensity(event: PocktMusicalEvent, config: PocktEngineConfig) -> (intensity: Float, sharpness: Float) {
    if event.accentLevel == "strong" {
      if config.skin == "after-dark" && event.isDownbeat { return (1.0, 0.95) }
      if config.skin == "studio" && event.isDownbeat { return (0.92, 0.72) }
      if config.skin == "heavy" && event.isDownbeat { return (1.0, 0.98) }
      if config.skin == "heavy" { return (0.96, 0.9) }
      if config.skin == "roots" && event.isDownbeat { return (0.92, 0.48) }
      if config.skin == "roots" { return (0.84, 0.52) }
      if config.sound == "subkick" && event.isDownbeat { return (1.0, 0.88) }
      return (1.0, 0.86)
    }
    if event.accentLevel == "accent" {
      if config.skin == "heavy" { return (0.94, 0.84) }
      if config.skin == "roots" { return (0.8, 0.5) }
      return (0.86, 0.68)
    }
    if config.skin == "heavy" { return (0.8, 0.7) }
    if config.skin == "roots" { return (0.7, 0.42) }
    return (0.72, 0.55)
  }
}
