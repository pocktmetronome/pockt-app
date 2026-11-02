import AVFoundation
import Foundation

enum PocktGeneratedClickKind {
  case defaultSoft
  case defaultNormal
  case defaultAccent
  case defaultStrong
  case woodSoft
  case woodNormal
  case woodStrong
  case digitalSoft
  case digitalNormal
  case digitalStrong
  case heavyNormal
  case heavyAccent
  case rootsNormal
  case rootsAccent
  case sundownNormal
  case sundownAccent
}

/// Short PCM clicks synthesized in-process. The default family is guaranteed
/// in memory at engine init and never requires a bundled WAV lookup.
enum PocktGeneratedClicks {
  static let keys = [
    "pockt-default-soft",
    "pockt-default",
    "pockt-default-accent",
    "pockt-default-strong",
    "wood-soft",
    "wood-strong",
    "digital-click-soft",
    "digital-click-strong",
    "click-soft",
    "click-strong",
    "pockt-heavy",
    "pockt-heavy-accent",
    "pockt-roots",
    "pockt-roots-accent",
    "pockt-sundown",
    "pockt-sundown-accent",
  ]

  static func makeAll(format: AVAudioFormat) -> [String: AVAudioPCMBuffer] {
    var out: [String: AVAudioPCMBuffer] = [:]
    let pairs: [(String, PocktGeneratedClickKind)] = [
      ("pockt-default-soft", .defaultSoft),
      ("pockt-default", .defaultNormal),
      ("pockt-default-accent", .defaultAccent),
      ("pockt-default-strong", .defaultStrong),
      ("wood-soft", .woodSoft),
      ("wood-strong", .woodStrong),
      ("digital-click-soft", .digitalSoft),
      ("digital-click-strong", .digitalStrong),
      ("click-soft", .defaultSoft),
      ("click-strong", .defaultStrong),
      ("pockt-heavy", .heavyNormal),
      ("pockt-heavy-accent", .heavyAccent),
      ("pockt-roots", .rootsNormal),
      ("pockt-roots-accent", .rootsAccent),
      ("pockt-sundown", .sundownNormal),
      ("pockt-sundown-accent", .sundownAccent),
    ]
    for (key, kind) in pairs {
      if let buffer = synthesize(format: format, kind: kind) {
        out[key] = buffer
      }
    }
    return out
  }

  static func synthesize(format: AVAudioFormat, kind: PocktGeneratedClickKind) -> AVAudioPCMBuffer? {
    let sampleRate = format.sampleRate > 0 ? format.sampleRate : 48000
    let channels: AVAudioChannelCount = format.channelCount > 0 ? format.channelCount : 1
    guard let floatFormat = AVAudioFormat(
      commonFormat: .pcmFormatFloat32,
      sampleRate: sampleRate,
      channels: channels,
      interleaved: false
    ) else {
      return nil
    }
    let seconds: Double
    switch kind {
    case .defaultSoft: seconds = 0.038
    case .defaultNormal: seconds = 0.042
    case .defaultAccent: seconds = 0.048
    case .defaultStrong: seconds = 0.052
    case .woodSoft: seconds = 0.046
    case .woodNormal: seconds = 0.052
    case .woodStrong: seconds = 0.056
    case .digitalSoft: seconds = 0.028
    case .digitalNormal: seconds = 0.032
    case .digitalStrong: seconds = 0.034
    case .heavyNormal: seconds = 0.052
    case .heavyAccent: seconds = 0.058
    case .rootsNormal: seconds = 0.058
    case .rootsAccent: seconds = 0.064
    case .sundownNormal: seconds = 0.048
    case .sundownAccent: seconds = 0.054
    }
    let cap = min(sampleRate * 0.08, seconds * sampleRate)
    let frames = AVAudioFrameCount(max(32.0, cap))
    guard let buffer = AVAudioPCMBuffer(pcmFormat: floatFormat, frameCapacity: frames) else {
      return nil
    }
    buffer.frameLength = frames
    guard let channelData = buffer.floatChannelData else {
      return nil
    }

    var noise = LCG(seed: seed(for: kind))
    var prevNoise: Double = 0
    var lp: Double = 0
    let twoPi = Double.pi * 2
    let count = Int(frames)

    for n in 0..<count {
      let t = Double(n) / sampleRate
      let raw = noise.next()
      let hp = raw - prevNoise
      prevNoise = raw
      lp += 0.18 * (raw - lp)

      let sample: Double
      switch kind {
      case .defaultSoft:
        let env = exp(-t / 0.0036)
        let tick = sin(twoPi * 1480 * t) * exp(-t / 0.0018)
        sample = (tick * 0.62 + lp * 0.1) * env
      case .defaultNormal:
        let env = exp(-t / 0.0038)
        let tick = sin(twoPi * 2100 * t) * exp(-t / 0.0018)
        sample = (tick * 0.88 + hp * 0.1) * env
      case .defaultAccent:
        let env = exp(-t / 0.004)
        let tick = sin(twoPi * 2650 * t) * exp(-t / 0.0019)
        sample = (tick * 0.96 + hp * 0.12) * env
      case .defaultStrong:
        let env = exp(-t / 0.0042)
        let tick = sin(twoPi * 3350 * t) * exp(-t / 0.0017)
        let body = sin(twoPi * 280 * t) * exp(-t / 0.006)
        sample = (tick * 1.02 + body * 0.18 + hp * 0.08) * env
      case .woodSoft:
        let env = exp(-t / 0.007)
        let wood = sin(twoPi * 720 * t) * exp(-t / 0.008) + 0.22 * sin(twoPi * 1440 * t) * exp(-t / 0.005)
        sample = (wood * 0.52 + lp * 0.16) * env
      case .woodNormal:
        let env = exp(-t / 0.008)
        let wood = sin(twoPi * 980 * t) * exp(-t / 0.009) + 0.3 * sin(twoPi * 1960 * t) * exp(-t / 0.005)
        sample = (wood * 0.7 + lp * 0.14) * env
      case .woodStrong:
        let env = exp(-t / 0.0072)
        let wood = sin(twoPi * 1240 * t) * exp(-t / 0.007) + 0.34 * sin(twoPi * 2480 * t) * exp(-t / 0.004)
        sample = (wood * 0.86 + hp * 0.1) * env
      case .digitalSoft:
        let env = exp(-t / 0.0024)
        sample = sin(twoPi * 1680 * t) * env * 0.58
      case .digitalNormal:
        let env = exp(-t / 0.0022)
        sample = sin(twoPi * 2200 * t) * env * 0.84
      case .digitalStrong:
        let env = exp(-t / 0.0018)
        sample = sin(twoPi * 2960 * t) * env * 0.98
      case .heavyNormal:
        let env = exp(-t / 0.0068)
        let tick = sin(twoPi * 3350 * t) * exp(-t / 0.0028)
        sample = (hp * 0.52 + tick * 0.78) * env
      case .heavyAccent:
        let env = exp(-t / 0.0074)
        let tick = sin(twoPi * 3100 * t) * exp(-t / 0.0032)
        let body = sin(twoPi * 196 * t) * exp(-t / 0.012)
        sample = (hp * 0.62 + tick * 0.92 + body * 0.42) * env
      case .rootsNormal:
        let env = exp(-t / 0.011)
        let wood = sin(twoPi * 980 * t) * exp(-t / 0.011) + 0.38 * sin(twoPi * 1960 * t) * exp(-t / 0.007)
        sample = (wood * 0.72 + lp * 0.22) * env
      case .rootsAccent:
        let env = exp(-t / 0.012)
        let wood = sin(twoPi * 860 * t) * exp(-t / 0.013) + 0.32 * sin(twoPi * 1720 * t) * exp(-t / 0.008)
        let body = sin(twoPi * 148 * t) * exp(-t / 0.016)
        sample = (wood * 0.7 + body * 0.4 + lp * 0.18) * env
      case .sundownNormal:
        let env = exp(-t / 0.0076)
        let tick = sin(twoPi * 1680 * t) * exp(-t / 0.0036)
        let body = sin(twoPi * 196 * t) * exp(-t / 0.011)
        sample = (tick * 0.7 + body * 0.38 + lp * 0.14) * env
      case .sundownAccent:
        let env = exp(-t / 0.0088)
        let tick = sin(twoPi * 1580 * t) * exp(-t / 0.004)
        let body = sin(twoPi * 176 * t) * exp(-t / 0.014)
        sample = (tick * 0.74 + body * 0.56 + lp * 0.12) * env
      }

      let clipped = max(-1.0, min(1.0, sample * 0.92))
      let value = Float(clipped)
      for channel in 0..<Int(channels) {
        channelData[channel][n] = value
      }
    }

    if floatFormat.sampleRate == format.sampleRate
      && floatFormat.channelCount == format.channelCount
      && floatFormat.commonFormat == format.commonFormat {
      return buffer
    }
    return convert(buffer, to: format)
  }

  private static func convert(_ buffer: AVAudioPCMBuffer, to format: AVAudioFormat) -> AVAudioPCMBuffer? {
    guard let converter = AVAudioConverter(from: buffer.format, to: format) else {
      return buffer
    }
    let ratio = format.sampleRate / buffer.format.sampleRate
    let capacity = AVAudioFrameCount((Double(buffer.frameLength) * ratio).rounded(.up) + 32)
    guard let converted = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: capacity) else {
      return buffer
    }
    var error: NSError?
    var consumed = false
    converter.convert(to: converted, error: &error) { _, status in
      if consumed {
        status.pointee = .endOfStream
        return nil
      }
      consumed = true
      status.pointee = .haveData
      return buffer
    }
    if error != nil {
      return buffer
    }
    return converted
  }

  private static func seed(for kind: PocktGeneratedClickKind) -> UInt32 {
    switch kind {
    case .defaultSoft: return 0x44454630
    case .defaultNormal: return 0x44454631
    case .defaultAccent: return 0x44454632
    case .defaultStrong: return 0x44454633
    case .woodSoft: return 0x574F4430
    case .woodNormal: return 0x574F4431
    case .woodStrong: return 0x574F4432
    case .digitalSoft: return 0x44494730
    case .digitalNormal: return 0x44494731
    case .digitalStrong: return 0x44494732
    case .heavyNormal: return 0x48455631
    case .heavyAccent: return 0x48455632
    case .rootsNormal: return 0x52545331
    case .rootsAccent: return 0x52545332
    case .sundownNormal: return 0x53444E31
    case .sundownAccent: return 0x53444E32
    }
  }
}

private struct LCG {
  var state: UInt32

  init(seed: UInt32) {
    state = seed == 0 ? 1 : seed
  }

  mutating func next() -> Double {
    state = state &* 1_664_525 &+ 1_013_904_223
    return Double(state) / Double(UInt32.max) * 2 - 1
  }
}
