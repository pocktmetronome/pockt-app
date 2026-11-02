import Accelerate
import AVFoundation
import Foundation

/// Instrument-pitch detector: McLeod normalised square-difference (amplitude-invariant, so a decaying
/// string reads true to a fraction of a cent all the way down its ring), with octave guarding. Tuner only.
enum PocktTuner {
  static let minHz: Double = 40
  static let maxHz: Double = 1400
  static let guitarLow: Double = 58
  static let guitarHigh: Double = 720
  static let threshold: Float = 0.12

  static func analyze(buffer: AVAudioPCMBuffer) -> [String: Any] {
    guard let channel = buffer.floatChannelData?[0] else {
      return ["frequency": 0.0, "confidence": 0.0, "rms": 0.0]
    }
    let count = Int(buffer.frameLength)
    if count < 64 {
      return ["frequency": 0.0, "confidence": 0.0, "rms": 0.0]
    }
    var rms: Float = 0
    for i in 0 ..< count {
      let s = channel[i]
      rms += s * s
    }
    rms = sqrt(rms / Float(max(1, count)))
    let rate = buffer.format.sampleRate
    // remove DC and rumble below the lowest string (a one-pole high-pass), so handling noise and the
    // mic's offset never pull the period estimate
    var clean = [Float](repeating: 0, count: count)
    var mean: Float = 0
    for i in 0 ..< count { mean += channel[i] }
    mean /= Float(count)
    let a = Float(exp(-2 * Double.pi * 35 / max(1, rate)))
    var prevIn: Float = 0, prevOut: Float = 0
    for i in 0 ..< count {
      let x = channel[i] - mean
      let y = a * (prevOut + x - prevIn)
      prevIn = x
      prevOut = y
      clean[i] = y
    }
    let result = clean.withUnsafeBufferPointer { ptr in
      nsdf(samples: ptr.baseAddress!, count: count, sampleRate: rate, rms: rms)
    }
    return [
      "frequency": result.frequency,
      "confidence": result.confidence,
      "rms": Double(rms),
    ]
  }

  /// Peak value (0...1) of the normalised square difference is the clarity: a clean string reads
  /// 0.97+, a noisy tail ~0.85.
  private static func nsdf(
    samples: UnsafePointer<Float>,
    count: Int,
    sampleRate: Double,
    rms: Float
  ) -> (frequency: Double, confidence: Double) {
    if rms < 0.00045 { return (0, 0) }
    let w = count / 2
    let minTau = max(2, Int(sampleRate / maxHz))
    let maxTau = min(w - 2, Int(sampleRate / minHz))
    if maxTau <= minTau + 4 { return (0, 0) }
    var n = [Float](repeating: 0, count: maxTau + 2)
    var e0: Float = 0
    vDSP_svesq(samples, 1, &e0, vDSP_Length(w))
    for tau in 1 ... maxTau + 1 {
      var cross: Float = 0
      var e1: Float = 0
      vDSP_dotpr(samples, 1, samples + tau, 1, &cross, vDSP_Length(w))
      vDSP_svesq(samples + tau, 1, &e1, vDSP_Length(w))
      n[tau] = 2 * cross / max(1e-12, e0 + e1)
    }
    // key maxima: the highest point of each positive lobe after the first zero crossing
    var peaks: [(tau: Int, value: Float)] = []
    var t = minTau
    while t < maxTau && n[t] > 0 { t += 1 }
    while t < maxTau {
      while t < maxTau && n[t] <= 0 { t += 1 }
      var best: Float = -1
      var bestTau = -1
      while t < maxTau && n[t] > 0 {
        if n[t] > best { best = n[t]; bestTau = t }
        t += 1
      }
      if bestTau > 0 { peaks.append((bestTau, best)) }
    }
    guard let top = peaks.map({ $0.value }).max(), top >= 0.5 else { return (0, 0) }
    guard var pick = peaks.first(where: { $0.value >= 0.93 * top }) else { return (0, 0) }
    // octave guard: above the guitar's range, prefer the period twice as long when it is nearly as clear
    let hz0 = sampleRate / Double(pick.tau)
    if hz0 > guitarHigh {
      let want = pick.tau * 2
      if let twice = peaks.first(where: { abs(Double($0.tau - want)) / Double(want) < 0.06 && $0.value >= 0.9 * pick.value }),
         sampleRate / Double(twice.tau) >= guitarLow {
        pick = twice
      }
    }
    let prev = n[pick.tau - 1], cur = n[pick.tau], next = n[pick.tau + 1]
    let den = 2 * cur - prev - next
    let refined = Double(pick.tau) + (abs(den) > 1e-12 ? Double((next - prev) / (2 * den)) : 0)
    let frequency = sampleRate / refined
    if !frequency.isFinite || frequency <= 0 { return (0, 0) }
    return (frequency, Double(max(0, min(1, pick.value))))
  }

  private static func yin(
    samples: UnsafePointer<Float>,
    count: Int,
    sampleRate: Double,
    rms: Float
  ) -> (frequency: Double, confidence: Double) {
    if rms < 0.00045 {
      return (0, 0)
    }
    let half = count / 2
    if half < 8 {
      return (0, 0)
    }
    var diff = [Float](repeating: 0, count: half)
    for tau in 1 ..< half {
      var sum: Float = 0
      for i in 0 ..< half {
        let d = samples[i] - samples[i + tau]
        sum += d * d
      }
      diff[tau] = sum
    }
    var cmnd = [Float](repeating: 1, count: half)
    var running: Float = 0
    for tau in 1 ..< half {
      running += diff[tau]
      cmnd[tau] = (diff[tau] * Float(tau)) / max(1e-12, running)
    }
    let minTau = max(2, Int(sampleRate / maxHz))
    let maxTau = min(half - 1, Int(sampleRate / minHz))
    var tauEstimate = -1
    var dips: [Int] = []
    var tau = minTau
    while tau < maxTau {
      if cmnd[tau] < threshold {
        while tau + 1 < maxTau && cmnd[tau + 1] < cmnd[tau] {
          tau += 1
        }
        if tauEstimate < 0 { tauEstimate = tau }
        dips.append(tau)
        tau += 1
      }
      tau += 1
    }
    if tauEstimate < 0 {
      var best: Float = 1
      var bestTau = -1
      for t in minTau ..< maxTau {
        if cmnd[t] < best {
          best = cmnd[t]
          bestTau = t
        }
      }
      if best > 0.28 || bestTau < 0 {
        return (0, 0)
      }
      tauEstimate = bestTau
      dips.append(bestTau)
    }
    tauEstimate = chooseOctaveTau(bestTau: tauEstimate, dips: dips, sampleRate: sampleRate)
    let refined = parabolic(cmnd: cmnd, tau: tauEstimate)
    if refined <= 0 {
      return (0, 0)
    }
    let confidence = max(0, min(1, 1 - Double(cmnd[tauEstimate])))
    let frequency = sampleRate / refined
    if !frequency.isFinite || frequency <= 0 {
      return (0, 0)
    }
    return (frequency, confidence.isFinite ? confidence : 0)
  }

  private static func chooseOctaveTau(bestTau: Int, dips: [Int], sampleRate: Double) -> Int {
    let hz = sampleRate / Double(max(1, bestTau))
    if hz <= guitarHigh { return bestTau }
    let halfTau = bestTau * 2
    let hasHalf = dips.contains { abs(Double($0 - halfTau)) / Double(max(1, halfTau)) < 0.08 }
    if hasHalf && hz / 2 >= guitarLow { return halfTau }
    return bestTau
  }

  private static func parabolic(cmnd: [Float], tau: Int) -> Double {
    let prev = tau > 0 ? cmnd[tau - 1] : cmnd[tau]
    let current = cmnd[tau]
    let next = tau + 1 < cmnd.count ? cmnd[tau + 1] : current
    let denom = 2 * current - prev - next
    if abs(denom) < 1e-12 {
      return Double(tau)
    }
    return Double(tau) + Double((next - prev) / (2 * denom))
  }
}
