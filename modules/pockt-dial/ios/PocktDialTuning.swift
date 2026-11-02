import CoreGraphics
import Foundation
import simd

enum PocktDialTuning {
  static let minBpm: Double = 20
  static let maxBpm: Double = 400
  static let homeBpm: Double = 120
  static let minAngle: CGFloat = -130 * .pi / 180
  static let maxAngle: CGFloat = 140 * .pi / 180
  static let homeAngle: CGFloat = 0
  static let marks: [Int] = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400]

  static let wellOuter: Float = 0.492
  static let knurlOuter: Float = 0.468
  static let knurlInner: Float = 0.402
  static let faceRadius: Float = 0.388
  static let hubRadius: Float = 0.214
  /// Visual q-space plate ring (object 0.648–0.876 × VIEW_FILL 0.48).
  /// Matches FACE_R_Q / HUB_R_Q in PocktDialShader.metal. Unused by touch/physics.
  static let plateInnerQ: CGFloat = 0.31104
  static let plateOuterQ: CGFloat = 0.42048
  static let knurlTeeth: Float = 96
  static let knurlDepth: Float = 0.38
  static let brushFrequency: Float = 210
  static let aluminumF0 = SIMD3<Float>(0.91, 0.88, 0.78)
  static let gold = SIMD3<Float>(0.92, 0.68, 0.28)
  static let pressScale: Float = 0.988
  static let parallaxAmplitude: Float = 0.006
  static let motionFilterTau: CGFloat = 0.12
  static let motionWakeEpsilon: CGFloat = 0.0016
  static let simulatorDriftSpeed: Float = 0.28
  static let friction: CGFloat = 5.2
  static let springK: CGFloat = 240
  static let springDamp: CGFloat = 26
  static let captureSpeed: CGFloat = 2.2
  static let idleOmega: CGFloat = 0.02
  static let idlePress: CGFloat = 0.002
  static let pressDownK: CGFloat = 520
  static let pressDownDamp: CGFloat = 38
  static let pressUpK: CGFloat = 340
  static let pressUpDamp: CGFloat = 18
  static let hapticMinGap: CFTimeInterval = 0.018
  static let deadZoneFrac: CGFloat = 0.22
  static let hubTapMaxTravel: CGFloat = 0.035
}

enum PocktDialScale {
  static func clampBpm(_ value: Double) -> Double {
    guard value.isFinite else { return PocktDialTuning.homeBpm }
    return min(PocktDialTuning.maxBpm, max(PocktDialTuning.minBpm, value.rounded()))
  }

  static func angleFromBpm(_ bpm: Double) -> CGFloat {
    let safe = clampBpm(bpm)
    if safe <= PocktDialTuning.homeBpm {
      let t = (safe - PocktDialTuning.minBpm) / (PocktDialTuning.homeBpm - PocktDialTuning.minBpm)
      return PocktDialTuning.minAngle + CGFloat(t) * (PocktDialTuning.homeAngle - PocktDialTuning.minAngle)
    }
    let t = (safe - PocktDialTuning.homeBpm) / (PocktDialTuning.maxBpm - PocktDialTuning.homeBpm)
    return PocktDialTuning.homeAngle + CGFloat(t) * (PocktDialTuning.maxAngle - PocktDialTuning.homeAngle)
  }

  static func bpmFromAngle(_ angle: CGFloat) -> Double {
    let clamped = min(PocktDialTuning.maxAngle, max(PocktDialTuning.minAngle, angle))
    if clamped <= PocktDialTuning.homeAngle {
      let span = PocktDialTuning.homeAngle - PocktDialTuning.minAngle
      let t = span <= 0 ? 0 : (clamped - PocktDialTuning.minAngle) / span
      return clampBpm(PocktDialTuning.minBpm + Double(t) * (PocktDialTuning.homeBpm - PocktDialTuning.minBpm))
    }
    let span = PocktDialTuning.maxAngle - PocktDialTuning.homeAngle
    let t = span <= 0 ? 0 : (clamped - PocktDialTuning.homeAngle) / span
    return clampBpm(PocktDialTuning.homeBpm + Double(t) * (PocktDialTuning.maxBpm - PocktDialTuning.homeBpm))
  }
}
