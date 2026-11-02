import CoreGraphics
import Foundation
import simd

/// Design-iteration surface for Glass Proof v2. Every visual and mechanical constant lives here.
enum DialTuning {
  // MARK: Scene layout (normalized to min(width, height))

  /// Outer lip of the recessed well.
  static let wellOuter: Float = 0.405
  /// Inner floor radius of the well (gap around the dial).
  static let wellFloor: Float = 0.348
  /// Chamfer width of the well lip.
  static let wellChamfer: Float = 0.018
  /// Dial cylinder outer wall (knurl outside edge).
  static let dialWall: Float = 0.322
  /// Inner edge of the knurled grip band.
  static let knurlInner: Float = 0.294
  /// Face-to-knurl chamfer inner radius.
  static let faceRadius: Float = 0.276
  /// Recessed indicator distance from center, as a fraction of face radius.
  static let indicatorRadiusFrac: Float = 0.72
  /// Indicator hole radius.
  static let indicatorSize: Float = 0.016

  // MARK: Material / shading

  /// Radial brush spatial frequency on the face.
  static let brushFrequency: Float = 168
  /// Height of radial scratch perturbation.
  static let brushAmplitude: Float = 0.012
  /// GGX roughness along the grain (smooth sunburst sweep).
  static let anisoAlphaT: Float = 0.055
  /// GGX roughness across the grain (broad perpendicular scatter).
  static let anisoAlphaB: Float = 0.42
  /// Knurl teeth around the rim.
  static let knurlTeeth: Float = 80
  /// Knurl groove depth used as a normal bump.
  static let knurlDepth: Float = 0.34
  /// Aluminum F0 (linear).
  static let aluminumF0 = SIMD3<Float>(0.91, 0.92, 0.92)
  /// Face albedo (linear).
  static let faceAlbedo = SIMD3<Float>(0.42, 0.43, 0.445)
  /// Key light intensity.
  static let keyIntensity: Float = 1.35
  /// Fill light intensity.
  static let fillIntensity: Float = 0.22
  /// Cool ambient term.
  static let ambient: SIMD3<Float> = SIMD3(0.035, 0.038, 0.048)
  /// Contact-shadow opacity at rest.
  static let shadowOpacity: Float = 0.62
  /// Contact-shadow gaussian radius at rest.
  static let shadowRadius: Float = 0.072
  /// Glass-pane sheen strength (static, top of composite).
  static let glassSheen: Float = 0.045

  // MARK: Motion / parallax

  /// Dial/well parallax in normalized units at full tilt (~2–4 pt on a 390pt phone).
  static let parallaxAmplitude: Float = 0.008
  /// Low-pass time constant for gravity → light (seconds). Larger = glidier.
  static let motionFilterTau: CGFloat = 0.12
  /// Wake the renderer when filtered gravity moves more than this.
  static let motionWakeEpsilon: CGFloat = 0.0016
  /// Simulator-only light orbit speed (rad/s).
  static let simulatorDriftSpeed: Float = 0.35

  // MARK: Detents / solver

  /// Number of mechanical detents (every 30°).
  static let detentCount: Int = 12
  /// Extra angular bias toward the nearest detent while dragging (radians). Finger still 1:1.
  static let dragMagnet: CGFloat = 0.010
  /// Detent potential gain on release (rad/s² scale via sin(Nθ)).
  static let detentGain: CGFloat = 42
  /// Linear friction on angular velocity (1/s).
  static let friction: CGFloat = 4.8
  /// Capture spring stiffness once slow and near a well.
  static let springK: CGFloat = 280
  /// Capture damping (slightly under-damped for a short settle tick).
  static let springDamp: CGFloat = 28
  /// Enter spring capture below this |ω| (rad/s).
  static let captureSpeed: CGFloat = 2.4
  /// Enter spring capture within this angle of a detent (rad).
  static let captureWindow: CGFloat = 0.18
  /// Idle when |ω| and press error fall below these.
  static let idleOmega: CGFloat = 0.02
  static let idlePress: CGFloat = 0.002

  // MARK: Press

  /// Shader visual scale at full depression.
  static let pressScale: Float = 0.985
  /// Press spring stiffness (touch-down, quick).
  static let pressDownK: CGFloat = 520
  /// Press damping on the way down.
  static let pressDownDamp: CGFloat = 38
  /// Press spring stiffness on release (underdamped rebound).
  static let pressUpK: CGFloat = 340
  /// Press damping on release (slight overshoot).
  static let pressUpDamp: CGFloat = 18

  // MARK: Haptics

  /// Minimum gap between drag-tick transients (seconds).
  static let hapticMinGap: CFTimeInterval = 0.018
  static let pressDownIntensity: Float = 0.32
  static let pressDownSharpness: Float = 0.35
  static let pressUpIntensity: Float = 0.18
  static let pressUpSharpness: Float = 0.22
  static let settleIntensity: Float = 0.46
  static let settleSharpness: Float = 0.40
  /// Slow-drag tick intensity (fuller click).
  static let slowTickIntensity: Float = 0.78
  /// Fast-spin tick intensity (lighter).
  static let fastTickIntensity: Float = 0.28
  static let slowTickSharpness: Float = 0.42
  static let fastTickSharpness: Float = 0.88
  /// |ω| that maps to the "fast" haptic end (rad/s).
  static let fastSpinRef: CGFloat = 16

  // MARK: Center dead zone

  /// Ignore angular updates inside this fraction of min(side) so hub crossings cannot jump.
  static let deadZoneFrac: CGFloat = 0.07
}
