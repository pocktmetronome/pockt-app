import AVFoundation
import CoreHaptics
import CoreMotion
import ExpoModulesCore
import ImageIO
import Metal
import QuartzCore
import simd
import UIKit

/// Fragment texture indices — MUST match PocktDialShader.metal [[texture(n)]].
private enum FragTex {
  static let face = 0
  static let knobAlbedo = 1
  static let knobNormal = 2
  static let knobAo = 3
  static let knobRough = 4
  static let knobAniso = 5
  static let staticBeauty = 6
  static let staticNormal = 7
  static let envMap = 8
}

/// 1×1 fallbacks. Env MUST NOT be the lilac normal (128,128,255) — that is the
/// Build 120 motion-flip: decodeRGBM/mix of that texel paints the whole face (0.5,0.5,1).
private enum FragFallback {
  static let normal: [UInt8] = [128, 128, 255, 255]
  static let ao: [UInt8] = [255, 255, 255, 255]
  static let rough: [UInt8] = [90, 90, 90, 255]
  static let aniso: [UInt8] = [128, 128, 174, 255]
  static let env: [UInt8] = [0, 0, 0, 16]
  static let clear: [UInt8] = [0, 0, 0, 0]
}

private struct DialUniforms {
  var resolution: SIMD2<Float>
  var angle: Float
  var press: Float
  var lightDir: SIMD4<Float>
  var parallax: SIMD2<Float>
  var time: Float
  var visualScale: Float
  var playing: Float
  var pad: Float
}

final class PocktDialView: ExpoView {
  let onBpm = EventDispatcher()
  let onCenterTap = EventDispatcher()
  /// Wheel face: a touch that never turned the ring (under 3 degrees). Angle is clockwise from 12 o'clock.
  let onRingTap = EventDispatcher()
  /// The ring's turned angle (radians, clockwise positive) while the finger is on it: the JS layer draws the knurl from this.
  let onTurn = EventDispatcher()
  private var lastTurnEmit: CFTimeInterval = 0
  private var customInnerFrac: CGFloat = -1

  private let metalLayer = CAMetalLayer()
  private var device: MTLDevice?
  private var commandQueue: MTLCommandQueue?
  private var pipeline: MTLRenderPipelineState?
  private var uniformBuffer: MTLBuffer?
  private var faceTexture: MTLTexture?
  private var knobAlbedo: MTLTexture?
  private var knobNormal: MTLTexture?
  private var knobAo: MTLTexture?
  private var knobRough: MTLTexture?
  private var knobAniso: MTLTexture?
  private var staticBeauty: MTLTexture?
  private var staticNormal: MTLTexture?
  private var envMap: MTLTexture?
  private var sampler: MTLSamplerState?
  private var envSampler: MTLSamplerState?
  private let passDescriptor = MTLRenderPassDescriptor()
  private var displayLink: CADisplayLink?
  private let displayLinkProxy = PocktDialDisplayLinkProxy()

  private let motion = CMMotionManager()
  private var hapticEngine: CHHapticEngine?
  private var hapticPlayers: [CHHapticPatternPlayer] = []

  private var angle: CGFloat = 0
  private var omega: CGFloat = 0
  private var press: CGFloat = 0
  private var pressVel: CGFloat = 0
  private var pressTarget: CGFloat = 0
  private var lastFingerAngle: CGFloat = 0
  private var haveFingerAngle = false
  private var dragging = false
  private var lastHapticAt: CFTimeInterval = 0
  private var lastEmittedBpm: Int = 120
  private var instantOmega: CGFloat = 0
  private var lastFrame: CFTimeInterval = CACurrentMediaTime()
  private var startedAt: CFTimeInterval = CACurrentMediaTime()
  private var dragTravel: CGFloat = 0
  private var beganInHub = false
  private var invert = false

  // MARK: Ring face (North Star). The finger turns a real ring image; Metal is not drawn.
  private var ringMode = false
  /// Wheel face (Rhythm, Pulse): same detents, haptics and ticks, but the flutes are not drawn,
  /// a touch must turn 3 degrees before it moves the tempo, and a still touch is reported as a tap.
  private var wheelMode = false
  private var wheelTravelDeg: Double = 0
  private var wheelEngaged = false
  private var wheelBeganPoint: CGPoint = .zero
  private var wheelBeganAt: CFTimeInterval = 0
  private static let wheelDeadbandDeg: Double = 3
  private static let wheelInnerFrac: CGFloat = 148.0 / 300.0
  /// Rim faces (Pendulum, Pro, Beatline): only the knurled rim turns; the window belongs to the face.
  private var rimMode = false
  private var ringHidden = false
  /// Fling: the ring keeps turning after a throw and slows under friction, like a weighted wheel.
  private var ringVel: Double = 0
  private var coastLink: CADisplayLink?
  private let coastProxy = CoastProxy()
  private var coastLast: CFTimeInterval = 0
  private static let coastTau: Double = 0.34
  private static let rimInnerFrac: CGFloat = 279.0 / 300.0
  /// Two copies of the flute band. The flutes advance continuously while each copy turns at most one
  /// flute pitch, so the baked lighting never visibly travels around the dial.
  private let ringLayer = CALayer()
  private let ringUnder = CALayer()
  private static let flutePitch: CGFloat = 6 * .pi / 180
  private var ringImageLoaded = false
  private var ringRotation: CGFloat = 0
  private var ringValue: Double = 120
  private var ringActive = false
  private var ringLastAngle: CGFloat = 0
  private var ringHaveAngle = false
  private var ringLimitArmed = true
  private var ringReleasedAt: CFTimeInterval = 0
  private var ringLastHapticAt: CFTimeInterval = 0
  /// Slow turns: 1.3 degrees per BPM. Fast flicks gain up to 2.5x so 20 to 400 is one easy spin.
  private static let ringDegPerBpm: Double = 1.3
  private static let ringHysteresis: Double = 0.2
  private static let ringFeedbackGap: CFTimeInterval = 0.022
  private var ringLastTime: TimeInterval = 0
  private var ringSpeed: Double = 0
  /// Crisp, short detents (a machined ratchet), a fuller click on the tens, a heavy stop at the ends.
  private let detentFeedback = UIImpactFeedbackGenerator(style: .rigid)
  private let majorFeedback = UIImpactFeedbackGenerator(style: .heavy)
  private let stopFeedback = UIImpactFeedbackGenerator(style: .heavy)
  private var tickPlayers: [AVAudioPlayer] = []
  private var majorPlayers: [AVAudioPlayer] = []
  private var stopPlayer: AVAudioPlayer?
  private var tickIndex = 0
  /// flute-ring.png is a 600 px canvas; the flutes start at r = 198.
  private static let ringInnerFrac: CGFloat = 198.0 / 600.0
  private var playing = false
  private var hapticsEnabled = true

  private var lightDir = SIMD3<Float>(0.064, 0.834, 0.550)
  private var targetLight = SIMD3<Float>(0.064, 0.834, 0.550)
  private var parallax = SIMD2<Float>(repeating: 0)
  private var lastGravity = SIMD3<Float>(repeating: 0)
  private var hasMotionHardware = false
  private var simulatorTime: Float = 0
  private var renderRunning = false
  private var idleMotionFrames = 0
  private var metalReady = false

  private var bgObserver: NSObjectProtocol?
  private var fgObserver: NSObjectProtocol?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    isMultipleTouchEnabled = false
    isExclusiveTouch = true
    backgroundColor = UIColor(red: 0.02, green: 0.018, blue: 0.016, alpha: 1)
    displayLinkProxy.owner = self
    setupMetal()
    setupLifecycle()
  }

  deinit {
    coastLink?.invalidate()
    stopDisplayLink()
    stopMotion()
    hapticEngine?.stop(completionHandler: { _ in })
    if let bgObserver { NotificationCenter.default.removeObserver(bgObserver) }
    if let fgObserver { NotificationCenter.default.removeObserver(fgObserver) }
  }

  override func willMove(toWindow newWindow: UIWindow?) {
    super.willMove(toWindow: newWindow)
    if newWindow == nil {
      stopCoast()
      ringActive = false
      ringHaveAngle = false
      dragging = false
      pressTarget = 0
      stopMotion()
      stopDisplayLink()
      hapticEngine?.stop(completionHandler: { _ in })
    }
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil, metalReady else { return }
    if ringMode {
      startHaptics()
      layoutRing()
      return
    }
    syncDrawableSize()
    startHaptics()
    startMotion()
    wakeRenderer()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    if ringMode {
      layoutRing()
      return
    }
    guard metalReady else { return }
    syncDrawableSize()
    wakeRenderer()
  }

  override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
    super.traitCollectionDidChange(previousTraitCollection)
    guard metalReady else { return }
    syncDrawableSize()
    wakeRenderer()
  }

  override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
    guard ringMode else { return super.point(inside: point, with: event) }
    // The ring's centre belongs to the BPM readout underneath; only the flutes turn.
    let half = min(bounds.width, bounds.height) * 0.5
    if wheelMode {
      // The wheel starts at the glass; the glass itself stays with the readout underneath.
      return bounds.contains(point) && fingerRadius(at: point) >= half * (customInnerFrac > 0 ? customInnerFrac : (rimMode ? PocktDialView.rimInnerFrac : PocktDialView.wheelInnerFrac))
    }
    if customInnerFrac > 0 { let r = fingerRadius(at: point); return r >= half * customInnerFrac && r <= half * 1.04 }
    let inner = half * PocktDialView.ringInnerFrac
    return bounds.contains(point) && fingerRadius(at: point) >= inner * 0.92
  }

  override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
    if ringMode {
      guard !ringActive, let touch = touches.first else { return }
      ringBegin(touch, event: event)
      return
    }
    guard metalReady, let touch = touches.first else { return }
    applyCoalesced(touch, event: event, began: true)
  }

  override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
    if ringMode {
      guard ringActive, let touch = touches.first else { return }
      ringMove(touch, event: event)
      return
    }
    guard metalReady, let touch = touches.first else { return }
    applyCoalesced(touch, event: event, began: false)
  }

  override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
    if ringMode {
      ringEnd()
      return
    }
    guard metalReady else { return }
    endDrag()
  }

  override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
    if ringMode {
      ringEnd()
      return
    }
    guard metalReady else { return }
    endDrag()
  }

  func applyBpm(_ value: Double) {
    if ringMode {
      // The finger owns the value while turning and briefly after release, so a late echo never snaps it back.
      guard !ringActive, coastLink == nil, CACurrentMediaTime() - ringReleasedAt > 0.2 else { return }
      lastEmittedBpm = Int(PocktDialScale.clampBpm(value))
      ringValue = Double(lastEmittedBpm)
      return
    }
    guard !dragging else { return }
    let next = PocktDialScale.angleFromBpm(value)
    lastEmittedBpm = Int(PocktDialScale.clampBpm(value))
    if abs(next - angle) > 0.0008 {
      angle = next
      omega = 0
      wakeRenderer()
    }
  }

  func applyInnerFraction(_ value: Double?) {
    customInnerFrac = CGFloat(value ?? -1)
  }

  func applyFace(_ value: String?) {
    let wheel = value == "wheel" || value == "rim"
    rimMode = value == "rim"
    // 'knurl': the ring turns exactly like 'ring', but the JS layer draws it (no image, no deadband).
    let hide = wheel || value == "knurl"
    let next = value == "ring" || value == "knurl" || wheel
    if next && ringMode {
      wheelMode = wheel
      ringHidden = hide
      ringLayer.isHidden = hide
      ringUnder.isHidden = hide
      return
    }
    wheelMode = wheel
    ringHidden = hide
    guard next != ringMode else { return }
    ringMode = next
    if ringMode {
      dragging = false
      isOpaque = false
      backgroundColor = .clear
      metalLayer.isHidden = true
      loadRingImageIfNeeded()
      if ringLayer.superlayer == nil {
        layer.addSublayer(ringUnder)
        layer.addSublayer(ringLayer)
      }
      ringLayer.isHidden = ringHidden
      ringUnder.isHidden = ringHidden
      ringValue = Double(lastEmittedBpm)
      layoutRing()
      stopDisplayLink()
    } else {
      backgroundColor = UIColor(red: 0.02, green: 0.018, blue: 0.016, alpha: 1)
      metalLayer.isHidden = false
      ringLayer.isHidden = true
      ringUnder.isHidden = true
      wakeRenderer()
    }
  }

  private func loadRingImageIfNeeded() {
    guard !ringImageLoaded else { return }
    guard let bundle = resolveShaderBundle(),
          let url = urlInShaderBundle(bundle, name: "flute_ring", ext: "png"),
          let image = UIImage(contentsOfFile: url.path),
          let cg = image.cgImage
    else {
      NSLog("[POCKT][Dial] flute_ring.png missing from PocktDial.bundle")
      return
    }
    for l in [ringLayer, ringUnder] {
      l.contents = cg
      l.contentsGravity = .resizeAspect
      l.minificationFilter = .trilinear
      l.magnificationFilter = .linear
      l.actions = ["transform": NSNull(), "bounds": NSNull(), "position": NSNull(), "contents": NSNull(), "opacity": NSNull()]
    }
    ringImageLoaded = true
  }

  private func layoutRing() {
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    for l in [ringLayer, ringUnder] {
      l.setAffineTransform(.identity)
      l.bounds = CGRect(origin: .zero, size: bounds.size)
      l.position = CGPoint(x: bounds.midX, y: bounds.midY)
      l.contentsScale = currentNativeScale()
    }
    applyRingTransform()
    CATransaction.commit()
  }

  private func applyRingTransform() {
    let p = PocktDialView.flutePitch
    var phase = ringRotation.truncatingRemainder(dividingBy: p)
    if phase < 0 { phase += p }
    let t = Float(phase / p)
    ringLayer.setAffineTransform(CGAffineTransform(rotationAngle: phase))
    ringLayer.opacity = 1 - t
    ringUnder.setAffineTransform(CGAffineTransform(rotationAngle: phase - p))
    ringUnder.opacity = 1
  }

  private func ringBegin(_ touch: UITouch, event: UIEvent?) {
    stopCoast()
    ringVel = 0
    ringActive = true
    ringHaveAngle = false
    ringSpeed = 0
    ringValue = Double(lastEmittedBpm)
    wheelTravelDeg = 0
    wheelEngaged = !wheelMode
    wheelBeganPoint = touch.location(in: self)
    wheelBeganAt = CACurrentMediaTime()
    // UI ticks must never interrupt the user's music: before the metronome owns the session, mix politely.
    let session = AVAudioSession.sharedInstance()
    if session.category == .soloAmbient {
      try? session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
    }
    loadDialSoundsIfNeeded()
    detentFeedback.prepare()
    majorFeedback.prepare()
    stopFeedback.prepare()
    ringTrack(touch.location(in: self), time: touch.timestamp)
  }

  private func loadDialSoundsIfNeeded() {
    guard tickPlayers.isEmpty, let bundle = resolveShaderBundle() else { return }
    func players(_ name: String, count: Int, volume: Float) -> [AVAudioPlayer] {
      guard let url = urlInShaderBundle(bundle, name: name, ext: "wav") else {
        NSLog("[POCKT][Dial] %@.wav missing", name)
        return []
      }
      return (0..<count).compactMap { _ in
        let player = try? AVAudioPlayer(contentsOf: url)
        player?.volume = volume
        player?.prepareToPlay()
        return player
      }
    }
    tickPlayers = players("dial_tick", count: 6, volume: 0.11)
    majorPlayers = players("dial_tick_major", count: 3, volume: 0.15)
    stopPlayer = players("dial_stop", count: 1, volume: 0.45).first
  }

  private func playFrom(_ pool: [AVAudioPlayer]) {
    guard !pool.isEmpty else { return }
    tickIndex = (tickIndex + 1) % pool.count
    let player = pool[tickIndex]
    player.currentTime = 0
    player.play()
  }

  private func ringMove(_ touch: UITouch, event: UIEvent?) {
    let samples = event?.coalescedTouches(for: touch) ?? []
    if samples.isEmpty {
      ringTrack(touch.location(in: self), time: touch.timestamp)
    } else {
      for sample in samples {
        ringTrack(sample.location(in: self), time: sample.timestamp)
      }
    }
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    applyRingTransform()
    CATransaction.commit()
  }

  private func ringEnd() {
    guard ringActive else { return }
    ringActive = false
    onTurn(["rad": Double(ringRotation)])
    ringHaveAngle = false
    ringReleasedAt = CACurrentMediaTime()
    // The tempo stays exactly where the finger lets go. (A thrown ring used to coast on, adding tens of
    // BPM after release — the 45 → 151 jump on Rhythm.)
    stopCoast()
    ringVel = 0
    ringValue = Double(lastEmittedBpm)
    if wheelMode && !wheelEngaged && CACurrentMediaTime() - wheelBeganAt < 0.8 {
      let c = dialCenter()
      let dx = wheelBeganPoint.x - c.x
      let dy = wheelBeganPoint.y - c.y
      var deg = Double(atan2(dx, -dy)) * 180 / .pi
      if deg < 0 { deg += 360 }
      let half = Double(min(bounds.width, bounds.height)) * 0.5
      onRingTap(["angle": deg, "radius": Double(hypot(dx, dy)) / max(1, half)])
    }
  }

  /// One finger sample. Clockwise raises tempo. Every integer is stepped in order.
  private func ringTrack(_ point: CGPoint, time: TimeInterval) {
    if fingerRadius(at: point) < 8 { return }
    let next = fingerAngle(at: point)
    guard ringHaveAngle else {
      ringLastAngle = next
      ringLastTime = time
      ringHaveAngle = true
      return
    }
    var delta = next - ringLastAngle
    while delta > .pi { delta -= 2 * .pi }
    while delta < -.pi { delta += 2 * .pi }
    ringLastAngle = next
    // fingerAngle is counter-clockwise positive; turn it into clockwise degrees.
    var clockwiseDeg = Double(-delta) * 180 / .pi
    if invert { clockwiseDeg = -clockwiseDeg }
    if !wheelEngaged {
      // A tap on the wheel must never nudge the tempo: the ring only engages after a deliberate turn.
      wheelTravelDeg += clockwiseDeg
      ringLastTime = time
      if abs(wheelTravelDeg) < PocktDialView.wheelDeadbandDeg { return }
      wheelEngaged = true
      return
    }
    // Smoothed finger speed in degrees per second decides the gain.
    let dt = max(0.004, min(0.05, time - ringLastTime))
    ringLastTime = time
    let instant = abs(clockwiseDeg) / dt
    ringSpeed += (instant - ringSpeed) * 0.35
    ringVel += (clockwiseDeg / dt - ringVel) * 0.4
    applyTurn(clockwiseDeg)
  }

  /// Turns the ring by a clockwise angle (degrees, after invert): steps every BPM it passes.
  @discardableResult
  private func applyTurn(_ clockwiseDeg: Double) -> Bool {
    let gain = 1 + min(1.5, max(0, (ringSpeed - 240) / 480))
    let lo = PocktDialTuning.minBpm - 0.49
    let hi = PocktDialTuning.maxBpm + 0.49
    let proposed = ringValue + clockwiseDeg * gain / PocktDialView.ringDegPerBpm
    let clamped = min(hi, max(lo, proposed))
    // The ring follows the finger one to one until it meets a stop, then it holds.
    let fraction = proposed == ringValue ? 1 : (clamped - ringValue) / (proposed - ringValue)
    var appliedDeg = clockwiseDeg * fraction
    ringValue = clamped
    if invert { appliedDeg = -appliedDeg }
    ringRotation += CGFloat(appliedDeg * .pi / 180)
    let nowT = CACurrentMediaTime()
    if nowT - lastTurnEmit > 0.007 { lastTurnEmit = nowT; onTurn(["rad": Double(ringRotation)]) }

    var committed = lastEmittedBpm
    let minB = Int(PocktDialTuning.minBpm)
    let maxB = Int(PocktDialTuning.maxBpm)
    while ringValue >= Double(committed) + 0.5 + PocktDialView.ringHysteresis, committed < maxB {
      committed += 1
      ringDetent(committed)
    }
    while ringValue <= Double(committed) - 0.5 - PocktDialView.ringHysteresis, committed > minB {
      committed -= 1
      ringDetent(committed)
    }
    if committed != lastEmittedBpm {
      lastEmittedBpm = committed
      onBpm(["bpm": committed])
    }
    return clamped == proposed
  }

  private func startCoast() {
    stopCoast()
    coastProxy.owner = self
    let link = CADisplayLink(target: coastProxy, selector: #selector(CoastProxy.tick(_:)))
    if #available(iOS 15.0, *) { link.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 120, preferred: 120) }
    link.add(to: .main, forMode: .common)
    coastLink = link
    coastLast = CACurrentMediaTime()
  }

  private func stopCoast() {
    coastLink?.invalidate()
    coastLink = nil
  }

  fileprivate func coastTick() {
    let now = CACurrentMediaTime()
    let dt = min(0.05, max(0.001, now - coastLast))
    coastLast = now
    ringVel *= exp(-dt / PocktDialView.coastTau)
    ringSpeed = abs(ringVel)
    let free = applyTurn(ringVel * dt)
    if ringMode {
      CATransaction.begin()
      CATransaction.setDisableActions(true)
      applyRingTransform()
      CATransaction.commit()
    }
    if abs(ringVel) < 35 || !free {
      stopCoast()
      ringReleasedAt = CACurrentMediaTime()
      ringValue = Double(lastEmittedBpm)
      onTurn(["rad": Double(ringRotation)])
    }
  }

  /// One click per BPM: a light haptic detent and a soft mechanical tick, a firmer one on the tens,
  /// a solid stop at 20 and 400. Very fast spins thin the clicks so they never turn into buzz.
  private func ringDetent(_ value: Int) {
    let minB = Int(PocktDialTuning.minBpm)
    let maxB = Int(PocktDialTuning.maxBpm)
    let now = CACurrentMediaTime()
    if value == minB || value == maxB {
      if ringLimitArmed {
        ringLimitArmed = false
        ringLastHapticAt = now
        if hapticsEnabled {
          stopFeedback.impactOccurred(intensity: 1.0)
          // A second knock 60 ms later: the dial has hit metal.
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.06) { [weak self] in
            self?.stopFeedback.impactOccurred(intensity: 0.8)
          }
        }
        stopPlayer?.currentTime = 0
        stopPlayer?.play()
      }
      return
    }
    ringLimitArmed = true
    let major = value % 10 == 0
    guard major || now - ringLastHapticAt >= PocktDialView.ringFeedbackGap else { return }
    ringLastHapticAt = now
    if major {
      if hapticsEnabled { majorFeedback.impactOccurred(intensity: 1.0) }
      playFrom(majorPlayers)
    } else {
      if hapticsEnabled { detentFeedback.impactOccurred(intensity: 1.0) }
      playFrom(tickPlayers)
    }
    detentFeedback.prepare()
    majorFeedback.prepare()
  }

  func applyPlaying(_ value: Bool) {
    if playing != value {
      playing = value
      wakeRenderer()
    }
  }

  func applyInvert(_ value: Bool) {
    invert = value
  }

  func applyHaptics(_ value: Bool) {
    hapticsEnabled = value
  }

  private func setupMetal() {
    metalReady = false
    metalLayer.pixelFormat = .bgra8Unorm_srgb
    metalLayer.framebufferOnly = true
    metalLayer.isOpaque = true
    metalLayer.colorspace = CGColorSpace(name: CGColorSpace.sRGB)

    guard let device = MTLCreateSystemDefaultDevice() else {
      NSLog("[POCKT][Dial] MTLCreateSystemDefaultDevice() returned nil")
      return
    }

    guard let shaderBundle = resolveShaderBundle() else { return }
    let bundlePath = shaderBundle.bundlePath

    let library: MTLLibrary
    do {
      library = try device.makeDefaultLibrary(bundle: shaderBundle)
    } catch {
      NSLog(
        "[POCKT][Dial] makeDefaultLibrary(bundle:) failed. Searched bundle %@. PocktDialShader.metal must compile into this pod's default metallib. %@",
        bundlePath,
        error.localizedDescription
      )
      return
    }
    guard let vertex = library.makeFunction(name: "pockt_dial_vertex") else {
      NSLog("[POCKT][Dial] missing Metal function pockt_dial_vertex in default metallib. Bundle searched: %@", bundlePath)
      return
    }
    guard let fragment = library.makeFunction(name: "pockt_dial_fragment") else {
      NSLog("[POCKT][Dial] missing Metal function pockt_dial_fragment in default metallib. Bundle searched: %@", bundlePath)
      return
    }
    do {
      let descriptor = MTLRenderPipelineDescriptor()
      descriptor.vertexFunction = vertex
      descriptor.fragmentFunction = fragment
      descriptor.colorAttachments[0].pixelFormat = metalLayer.pixelFormat
      pipeline = try device.makeRenderPipelineState(descriptor: descriptor)
    } catch {
      NSLog("[POCKT][Dial] render pipeline failed (bundle %@): %@", bundlePath, String(describing: error))
      pipeline = nil
      return
    }

    self.device = device
    metalLayer.device = device
    commandQueue = device.makeCommandQueue()
    uniformBuffer = device.makeBuffer(length: MemoryLayout<DialUniforms>.stride, options: .storageModeShared)

    let samp = MTLSamplerDescriptor()
    samp.minFilter = .linear
    samp.magFilter = .linear
    samp.sAddressMode = .clampToEdge
    samp.tAddressMode = .clampToEdge
    sampler = device.makeSamplerState(descriptor: samp)

    let envSamp = MTLSamplerDescriptor()
    envSamp.minFilter = .linear
    envSamp.magFilter = .linear
    envSamp.mipFilter = .linear
    envSamp.sAddressMode = .repeat
    envSamp.tAddressMode = .clampToEdge
    envSampler = device.makeSamplerState(descriptor: envSamp)

    faceTexture = uploadFaceAtlas(device: device) ?? makeFallbackTexture(device: device)
    guard loadBakedMaps(device: device, bundle: shaderBundle) else {
      NSLog("[POCKT][Dial] baked IBL maps missing from PocktDial.bundle — renderer stays inert")
      return
    }
    generateEnvMips()

    layer.addSublayer(metalLayer)
    metalReady = true
    syncDrawableSize()
  }

  private func currentNativeScale() -> CGFloat {
    let screen = window?.windowScene?.screen ?? window?.screen ?? UIScreen.main
    return max(screen.nativeScale, screen.scale, 1)
  }

  /// CAMetalLayer defaults contentsScale to 1.0. Fine brushing/knurl require native scale.
  private func syncDrawableSize() {
    metalLayer.frame = bounds
    let scale = currentNativeScale()
    contentScaleFactor = scale
    metalLayer.contentsScale = scale
    let pixelW = max(bounds.width, 1) * scale
    let pixelH = max(bounds.height, 1) * scale
    let next = CGSize(width: pixelW, height: pixelH)
    let previous = metalLayer.drawableSize
    metalLayer.drawableSize = next
    if abs(previous.width - next.width) > 0.5 || abs(previous.height - next.height) > 0.5 {
      NSLog(
        "[POCKT][Dial] drawableSize=%.1fx%.1f bounds=%.1fx%.1f nativeScale=%.3f (bounds×scale=%.1fx%.1f)",
        next.width,
        next.height,
        bounds.width,
        bounds.height,
        scale,
        pixelW,
        pixelH
      )
    }
  }

  /// CocoaPods copies PocktDial.bundle into the app; static_framework means
  /// Bundle(for:) is usually the main bundle, but search both roots.
  private func resolveShaderBundle() -> Bundle? {
    let roots: [(label: String, bundle: Bundle)] = [
      ("Bundle(for: PocktDialView.self)", Bundle(for: PocktDialView.self)),
      ("Bundle.main", .main),
    ]
    var searched: [String] = []
    for root in roots {
      searched.append("\(root.label) (\(root.bundle.bundlePath))")
      if let url = root.bundle.url(forResource: "PocktDial", withExtension: "bundle"),
         let resolved = Bundle(url: url) {
        NSLog("[POCKT][Dial] resolved PocktDial.bundle via %@ at %@", root.label, url.path)
        return resolved
      }
    }
    NSLog(
      "[POCKT][Dial] PocktDial.bundle not found. Searched: %@",
      searched.joined(separator: " | ")
    )
    return nil
  }

  private func uploadFaceAtlas(device: MTLDevice) -> MTLTexture? {
    guard let cgImage = PocktDialFace.makeAtlas(size: 2048) else {
      NSLog("[POCKT][Dial] face atlas failed; ticks/numbers will be missing, renderer still runs")
      return nil
    }
    return MTKTextureLoaderSafe(device: device).texture(
      from: cgImage,
      pixelFormat: .rgba8Unorm_srgb,
      preserveEncodedBytes: false,
      label: "face_atlas"
    )
  }

  /// PocktDial.bundle may flatten Resources/*.png or keep the subdirectory.
  private func urlInShaderBundle(_ bundle: Bundle, name: String, ext: String) -> URL? {
    if let url = bundle.url(forResource: name, withExtension: ext) {
      return url
    }
    if let url = bundle.url(forResource: name, withExtension: ext, subdirectory: "Resources") {
      return url
    }
    return nil
  }

  private func loadBakedMaps(device: MTLDevice, bundle: Bundle) -> Bool {
    let loader = MTKTextureLoaderSafe(device: device)
    func load(_ name: String, srgb: Bool, mipmapped: Bool = false) -> MTLTexture? {
      guard let url = urlInShaderBundle(bundle, name: name, ext: "png") else {
        NSLog("[POCKT][Dial] baked map %@ not in PocktDial.bundle", name)
        return nil
      }
      let format: MTLPixelFormat = srgb ? .rgba8Unorm_srgb : .rgba8Unorm
      guard let tex = loader.texture(
        url: url,
        pixelFormat: format,
        mipmapped: mipmapped,
        preserveEncodedBytes: !srgb,
        label: name
      ) else {
        NSLog("[POCKT][Dial] baked map %@ failed to upload", name)
        return nil
      }
      NSLog(
        "[POCKT][Dial] tex %@ pixelFormat=%d (%@) %dx%d",
        name,
        tex.pixelFormat.rawValue,
        srgb ? "sRGB" : "data",
        tex.width,
        tex.height
      )
      return tex
    }
    guard
      let albedo = load("knob_albedo", srgb: true),
      let beauty = load("static_beauty", srgb: true)
    else {
      return false
    }
    knobAlbedo = albedo
    staticBeauty = beauty
    knobNormal = load("knob_normal", srgb: false) ?? makeFallbackTexture(device: device, pixel: FragFallback.normal)
    knobAo = load("knob_ao", srgb: false) ?? makeFallbackTexture(device: device, pixel: FragFallback.ao)
    knobRough = load("knob_rough", srgb: false) ?? makeFallbackTexture(device: device, pixel: FragFallback.rough)
    knobAniso = load("knob_aniso", srgb: false) ?? makeFallbackTexture(device: device, pixel: FragFallback.aniso)
    staticNormal = load("static_normal", srgb: false) ?? makeFallbackTexture(device: device, pixel: FragFallback.normal)
    envMap = load("env_rgbm", srgb: false, mipmapped: true) ?? makeFallbackTexture(device: device, pixel: FragFallback.env)
    return true
  }

  private func generateEnvMips() {
    guard let envMap, envMap.mipmapLevelCount > 1, let commandQueue else { return }
    guard let command = commandQueue.makeCommandBuffer(),
          let blit = command.makeBlitCommandEncoder()
    else { return }
    blit.generateMipmaps(for: envMap)
    blit.endEncoding()
    command.commit()
    command.waitUntilCompleted()
  }

  private func makeFallbackTexture(device: MTLDevice, pixel: [UInt8] = FragFallback.clear) -> MTLTexture? {
    let opaque = pixel.count >= 4 && pixel[3] > 0
    let descriptor = MTLTextureDescriptor.texture2DDescriptor(
      pixelFormat: opaque ? .rgba8Unorm : .rgba8Unorm_srgb,
      width: 1,
      height: 1,
      mipmapped: false
    )
    descriptor.usage = [.shaderRead]
    descriptor.storageMode = .shared
    guard let texture = device.makeTexture(descriptor: descriptor) else { return nil }
    var pixel = pixel.count >= 4 ? Array(pixel.prefix(4)) : FragFallback.clear
    pixel.withUnsafeBytes { raw in
      guard let base = raw.baseAddress else { return }
      texture.replace(
        region: MTLRegion(origin: MTLOrigin(x: 0, y: 0, z: 0), size: MTLSize(width: 1, height: 1, depth: 1)),
        mipmapLevel: 0,
        withBytes: base,
        bytesPerRow: 4
      )
    }
    return texture
  }

  private func setupLifecycle() {
    bgObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.didEnterBackgroundNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      guard let self else { return }
      self.dragging = false
      self.pressTarget = 0
      self.stopMotion()
      self.stopDisplayLink()
    }
    fgObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.willEnterForegroundNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      guard let self, self.metalReady else { return }
      self.startHaptics()
      self.startMotion()
      self.wakeRenderer()
    }
  }

  private func wakeRenderer() {
    guard metalReady, !ringMode else { return }
    lastFrame = CACurrentMediaTime()
    startDisplayLink()
  }

  private func startDisplayLink() {
    guard metalReady else { return }
    if displayLink == nil {
      let link = CADisplayLink(target: displayLinkProxy, selector: #selector(PocktDialDisplayLinkProxy.tick(_:)))
      link.preferredFrameRateRange = CAFrameRateRange(minimum: 30, maximum: 120, preferred: 120)
      link.add(to: .main, forMode: .common)
      displayLink = link
    }
    if displayLink?.isPaused == true || !renderRunning {
      renderRunning = true
    }
    displayLink?.isPaused = false
  }

  private func stopDisplayLink() {
    displayLink?.isPaused = true
    displayLink?.invalidate()
    displayLink = nil
    renderRunning = false
  }

  fileprivate func onFrame(_ link: CADisplayLink) {
    guard metalReady else { return }
    let now = CACurrentMediaTime()
    let dt = min(0.032, max(0.001, now - lastFrame))
    lastFrame = now
    stepMotion(dt: dt)
    stepPhysics(dt: dt)
    drawFrame()

    let still = simd_length(targetLight - lightDir) < Float(PocktDialTuning.motionWakeEpsilon)
    if !hasMotionHardware { idleMotionFrames += 1 } else if still { idleMotionFrames += 1 } else { idleMotionFrames = 0 }

    let idle = !dragging
      && abs(omega) < PocktDialTuning.idleOmega
      && abs(press - pressTarget) < PocktDialTuning.idlePress
      && abs(pressVel) < 0.02
      && (hasMotionHardware ? idleMotionFrames > 8 : idleMotionFrames > Int(2.0 / dt))
    if idle {
      displayLink?.isPaused = true
      renderRunning = false
    }
  }

  private func drawFrame() {
    guard metalReady else { return }
    let expectedW = max(bounds.width, 1) * currentNativeScale()
    if abs(metalLayer.drawableSize.width - expectedW) > 0.5 {
      syncDrawableSize()
    }
    guard
      let pipeline,
      let commandQueue,
      let buffer = uniformBuffer,
      let drawable = metalLayer.nextDrawable()
    else { return }

    var uniforms = DialUniforms(
      resolution: SIMD2(Float(metalLayer.drawableSize.width), Float(metalLayer.drawableSize.height)),
      angle: Float(angle),
      press: Float(press),
      lightDir: SIMD4(lightDir.x, lightDir.y, lightDir.z, 0),
      parallax: parallax * (1.0 - 0.4 * Float(press)),
      time: Float(CACurrentMediaTime() - startedAt),
      visualScale: mixf(1.0, PocktDialTuning.pressScale, Float(press)),
      playing: playing ? 1 : 0,
      pad: 0
    )
    memcpy(buffer.contents(), &uniforms, MemoryLayout<DialUniforms>.stride)

    passDescriptor.colorAttachments[0].texture = drawable.texture
    passDescriptor.colorAttachments[0].loadAction = .clear
    passDescriptor.colorAttachments[0].storeAction = .store
    passDescriptor.colorAttachments[0].clearColor = MTLClearColor(red: 0.02, green: 0.018, blue: 0.016, alpha: 1)

    guard let command = commandQueue.makeCommandBuffer(),
          let encoder = command.makeRenderCommandEncoder(descriptor: passDescriptor)
    else { return }

    encoder.setRenderPipelineState(pipeline)
    encoder.setFragmentBuffer(buffer, offset: 0, index: 0)
    if let sampler {
      encoder.setFragmentSamplerState(sampler, index: 0)
    }
    if let envSampler {
      encoder.setFragmentSamplerState(envSampler, index: 1)
    }
    encoder.setFragmentTexture(faceTexture, index: FragTex.face)
    encoder.setFragmentTexture(knobAlbedo, index: FragTex.knobAlbedo)
    encoder.setFragmentTexture(knobNormal, index: FragTex.knobNormal)
    encoder.setFragmentTexture(knobAo, index: FragTex.knobAo)
    encoder.setFragmentTexture(knobRough, index: FragTex.knobRough)
    encoder.setFragmentTexture(knobAniso, index: FragTex.knobAniso)
    encoder.setFragmentTexture(staticBeauty, index: FragTex.staticBeauty)
    encoder.setFragmentTexture(staticNormal, index: FragTex.staticNormal)
    encoder.setFragmentTexture(envMap, index: FragTex.envMap)
    encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
    encoder.endEncoding()
    command.present(drawable)
    command.commit()
  }

  private func applyCoalesced(_ touch: UITouch, event: UIEvent?, began: Bool) {
    if began {
      beginDrag(at: touch.location(in: self))
    }
    if let coalesced = event?.coalescedTouches(for: touch), !coalesced.isEmpty {
      var index = 0
      for sample in coalesced {
        if !began || index > 0 {
          moveDrag(at: sample.location(in: self))
        }
        index += 1
      }
      return
    }
    if !began {
      moveDrag(at: touch.location(in: self))
    }
  }

  private func beginDrag(at point: CGPoint) {
    dragging = true
    dragTravel = 0
    beganInHub = fingerRadius(at: point) <= deadZone
    pressTarget = 1
    omega = 0
    wakeRenderer()
    if !beganInHub {
      haveFingerAngle = true
      lastFingerAngle = fingerAngle(at: point)
    } else {
      haveFingerAngle = false
    }
  }

  private func moveDrag(at point: CGPoint) {
    wakeRenderer()
    let radius = fingerRadius(at: point)
    if beganInHub {
      if radius <= deadZone { return }
      beganInHub = false
      haveFingerAngle = true
      lastFingerAngle = fingerAngle(at: point)
      return
    }
    if radius < 8 { return }
    let next = fingerAngle(at: point)
    if !haveFingerAngle {
      lastFingerAngle = next
      haveFingerAngle = true
      return
    }
    var delta = next - lastFingerAngle
    while delta > .pi { delta -= 2 * .pi }
    while delta < -.pi { delta += 2 * .pi }
    if invert { delta = -delta }
    lastFingerAngle = next
    angle = min(PocktDialTuning.maxAngle, max(PocktDialTuning.minAngle, angle + delta))
    dragTravel += abs(delta)
    instantOmega = delta / 0.016
    emitBpmIfNeeded()
  }

  private func endDrag() {
    let hubTap = beganInHub && dragTravel < PocktDialTuning.hubTapMaxTravel
    dragging = false
    pressTarget = 0
    haveFingerAngle = false
    omega = 0
    wakeRenderer()
    if hubTap {
      onCenterTap([:])
    } else {
      emitBpmIfNeeded()
    }
  }

  private func emitBpmIfNeeded() {
    let bpm = Int(PocktDialScale.bpmFromAngle(angle))
    guard bpm != lastEmittedBpm else { return }
    lastEmittedBpm = bpm
    let now = CACurrentMediaTime()
    if now - lastHapticAt >= PocktDialTuning.hapticMinGap {
      lastHapticAt = now
      let speed = min(1, abs(instantOmega) / 14)
      playHaptic(intensity: mixf(0.72, 0.26, Float(speed)), sharpness: mixf(0.40, 0.82, Float(speed)))
    }
    onBpm(["bpm": bpm])
  }

  private func stepPhysics(dt: CGFloat) {
    let down = pressTarget > 0.5
    let k = down ? PocktDialTuning.pressDownK : PocktDialTuning.pressUpK
    let damp = down ? PocktDialTuning.pressDownDamp : PocktDialTuning.pressUpDamp
    let pressAcc = (pressTarget - press) * k - pressVel * damp
    pressVel += pressAcc * dt
    press += pressVel * dt
    press = min(1.2, max(-0.05, press))

    if dragging { return }

    let target = PocktDialScale.angleFromBpm(PocktDialScale.bpmFromAngle(angle))
    let dist = target - angle
    if abs(omega) < PocktDialTuning.captureSpeed {
      omega += (PocktDialTuning.springK * dist - PocktDialTuning.springDamp * omega) * dt
      angle += omega * dt
      angle = min(PocktDialTuning.maxAngle, max(PocktDialTuning.minAngle, angle))
      if abs(target - angle) < 0.0005, abs(omega) < PocktDialTuning.idleOmega {
        angle = target
        omega = 0
        emitBpmIfNeeded()
      }
    } else {
      omega += -PocktDialTuning.friction * omega * dt
      angle += omega * dt
      if angle < PocktDialTuning.minAngle {
        angle = PocktDialTuning.minAngle
        omega = 0
      } else if angle > PocktDialTuning.maxAngle {
        angle = PocktDialTuning.maxAngle
        omega = 0
      }
    }
  }

  private func startMotion() {
    guard metalReady else { return }
    hasMotionHardware = motion.isDeviceMotionAvailable
    guard hasMotionHardware else { return }
    motion.deviceMotionUpdateInterval = 1.0 / 60.0
    motion.startDeviceMotionUpdates(using: .xArbitraryZVertical, to: .main) { [weak self] data, _ in
      guard let self, let g = data?.gravity else { return }
      let incoming = SIMD3<Float>(Float(-g.x), Float(g.y), Float(max(0.12, -g.z + 0.35)))
      self.targetLight = simd_normalize(incoming)
      let grav = SIMD3<Float>(Float(g.x), Float(g.y), Float(g.z))
      if simd_length(grav - self.lastGravity) > Float(PocktDialTuning.motionWakeEpsilon) {
        self.lastGravity = grav
        self.idleMotionFrames = 0
        self.wakeRenderer()
      }
    }
  }

  private func stopMotion() {
    motion.stopDeviceMotionUpdates()
  }

  private func stepMotion(dt: CGFloat) {
    if !hasMotionHardware {
      simulatorTime += Float(dt) * PocktDialTuning.simulatorDriftSpeed
      targetLight = simd_normalize(SIMD3<Float>(
        -0.38 + 0.32 * sin(simulatorTime),
        0.46 + 0.18 * cos(simulatorTime * 0.7),
        0.74
      ))
    }
    let a = Float(1 - exp(-dt / PocktDialTuning.motionFilterTau))
    lightDir = simd_normalize(lightDir + (targetLight - lightDir) * a)
    let amp = PocktDialTuning.parallaxAmplitude
    let desired = SIMD2<Float>(lightDir.x, -lightDir.y) * amp
    parallax += (desired - parallax) * a
  }

  private func startHaptics() {
    guard metalReady else { return }
    let supports = CHHapticEngine.capabilitiesForHardware().supportsHaptics
    guard supports else {
      NSLog("[POCKT][Dial] haptic engine skipped supportsHaptics=0")
      return
    }
    if hapticEngine == nil {
      do {
        let engine = try CHHapticEngine()
        engine.playsHapticsOnly = true
        engine.isAutoShutdownEnabled = false
        hapticEngine = engine
        engine.resetHandler = { [weak self] in
          DispatchQueue.main.async {
            NSLog("[POCKT][Dial] haptic engine reset — restarting")
            self?.restartHapticEngine()
          }
        }
        engine.stoppedHandler = { [weak self] reason in
          DispatchQueue.main.async {
            NSLog("[POCKT][Dial] haptic engine stopped reason=%@ — restarting", String(describing: reason))
            self?.restartHapticEngine()
          }
        }
        try engine.start()
        NSLog(
          "[POCKT][Dial] haptic engine started currentTime=%.4f isAutoShutdownEnabled=%d playsHapticsOnly=%d supportsHaptics=%d",
          engine.currentTime,
          engine.isAutoShutdownEnabled ? 1 : 0,
          engine.playsHapticsOnly ? 1 : 0,
          supports ? 1 : 0
        )
      } catch {
        NSLog("[POCKT][Dial] haptic engine failed: %@", error.localizedDescription)
        hapticEngine = nil
        return
      }
    } else {
      restartHapticEngine()
    }
  }

  private func restartHapticEngine() {
    guard window != nil else { return }
    guard let engine = hapticEngine else { return }
    do {
      try engine.start()
      NSLog(
        "[POCKT][Dial] haptic engine started currentTime=%.4f isAutoShutdownEnabled=%d playsHapticsOnly=%d supportsHaptics=%d",
        engine.currentTime,
        engine.isAutoShutdownEnabled ? 1 : 0,
        engine.playsHapticsOnly ? 1 : 0,
        CHHapticEngine.capabilitiesForHardware().supportsHaptics ? 1 : 0
      )
    } catch {
      NSLog("[POCKT][Dial] haptic engine restart failed: %@", error.localizedDescription)
    }
  }

  private func playHaptic(intensity: Float, sharpness: Float) {
    guard metalReady, hapticsEnabled else { return }
    if hapticEngine == nil {
      startHaptics()
    }
    guard let engine = hapticEngine else { return }
    do {
      try engine.start()
    } catch {
      NSLog("[POCKT][Dial] haptic engine start-before-play failed: %@", error.localizedDescription)
      return
    }
    let i = max(0.01, min(1, intensity))
    let s = max(0.01, min(1, sharpness))
    let event = CHHapticEvent(
      eventType: .hapticTransient,
      parameters: [
        CHHapticEventParameter(parameterID: .hapticIntensity, value: i),
        CHHapticEventParameter(parameterID: .hapticSharpness, value: s)
      ],
      relativeTime: 0
    )
    do {
      let pattern = try CHHapticPattern(events: [event], parameters: [])
      let player = try engine.makePlayer(with: pattern)
      hapticPlayers.append(player)
      if hapticPlayers.count > 8 { hapticPlayers.removeFirst() }
      try player.start(atTime: CHHapticTimeImmediate)
    } catch {
      NSLog("[POCKT][Dial] haptic play failed: %@", error.localizedDescription)
    }
  }

  private var deadZone: CGFloat {
    max(16, min(bounds.width, bounds.height) * PocktDialTuning.deadZoneFrac)
  }

  private func dialCenter() -> CGPoint {
    CGPoint(x: bounds.midX, y: bounds.midY)
  }

  private func fingerRadius(at point: CGPoint) -> CGFloat {
    let c = dialCenter()
    return hypot(point.x - c.x, point.y - c.y)
  }

  private func fingerAngle(at point: CGPoint) -> CGFloat {
    let c = dialCenter()
    return atan2(-(point.y - c.y), point.x - c.x)
  }
}

private func mixf(_ a: Float, _ b: Float, _ t: Float) -> Float {
  a + (b - a) * t
}

/// Avoid MetalKit so a missing-texture path cannot fatalError through MTKTextureLoader.
private struct MTKTextureLoaderSafe {
  let device: MTLDevice

  func texture(
    url: URL,
    pixelFormat: MTLPixelFormat,
    mipmapped: Bool,
    preserveEncodedBytes: Bool,
    label: String
  ) -> MTLTexture? {
    let options: CFDictionary = [kCGImageSourceShouldCache: true] as CFDictionary
    guard let src = CGImageSourceCreateWithURL(url as CFURL, options),
          let image = CGImageSourceCreateImageAtIndex(src, 0, options)
    else {
      NSLog("[POCKT][Dial] ImageIO failed %@", url.lastPathComponent)
      return nil
    }
    return texture(
      from: image,
      pixelFormat: pixelFormat,
      mipmapped: mipmapped,
      preserveEncodedBytes: preserveEncodedBytes,
      label: label
    )
  }

  func texture(
    from image: CGImage,
    pixelFormat: MTLPixelFormat,
    mipmapped: Bool = false,
    preserveEncodedBytes: Bool = false,
    label: String = "texture"
  ) -> MTLTexture? {
    let width = image.width
    let height = image.height
    guard width > 0, height > 0 else { return nil }
    let descriptor = MTLTextureDescriptor.texture2DDescriptor(
      pixelFormat: pixelFormat,
      width: width,
      height: height,
      mipmapped: mipmapped
    )
    descriptor.usage = [.shaderRead]
    descriptor.storageMode = .shared
    if mipmapped {
      descriptor.usage = [.shaderRead, .shaderWrite]
    }
    guard let texture = device.makeTexture(descriptor: descriptor) else {
      NSLog("[POCKT][Dial] makeTexture returned nil")
      return nil
    }
    let bytesPerRow = width * 4
    var bytes = [UInt8](repeating: 0, count: height * bytesPerRow)
    let painted = bytes.withUnsafeMutableBytes { raw -> Bool in
      // Data maps are PNG-tagged sRGB by the bake writer. Drawing them into a
      // linear context DECODES sRGB (0.5 → ~0.21) — the opposite of a data upload.
      // Use the source space (or sRGB) so encoded bytes pass through; Metal
      // rgba8Unorm then samples them as 0–1 data. Color maps use sRGB + _srgb.
      let space = image.colorSpace ?? CGColorSpace(name: CGColorSpace.sRGB)
      let alpha: CGImageAlphaInfo = preserveEncodedBytes ? .last : .premultipliedLast
      guard let base = raw.baseAddress,
            let space,
            let ctx = CGContext(
              data: base,
              width: width,
              height: height,
              bitsPerComponent: 8,
              bytesPerRow: bytesPerRow,
              space: space,
              bitmapInfo: alpha.rawValue
            )
      else {
        NSLog("[POCKT][Dial] CGContext for texture upload failed")
        return false
      }
      ctx.interpolationQuality = .none
      ctx.translateBy(x: 0, y: CGFloat(height))
      ctx.scaleBy(x: 1, y: -1)
      ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
      texture.replace(
        region: MTLRegion(origin: MTLOrigin(x: 0, y: 0, z: 0), size: MTLSize(width: width, height: height, depth: 1)),
        mipmapLevel: 0,
        withBytes: base,
        bytesPerRow: bytesPerRow
      )
      return true
    }
    if painted {
      let o = (height / 2 * width + width / 2) * 4
      NSLog(
        "[POCKT][Dial] tex %@ pixelFormat=%d %@ %dx%d centerRGBA=%d,%d,%d,%d",
        label,
        pixelFormat.rawValue,
        preserveEncodedBytes ? "data-bytes" : "sRGB",
        width,
        height,
        Int(bytes[o]),
        Int(bytes[o + 1]),
        Int(bytes[o + 2]),
        Int(bytes[o + 3])
      )
    }
    return painted ? texture : nil
  }
}

private final class PocktDialDisplayLinkProxy: NSObject {
  weak var owner: PocktDialView?

  @objc func tick(_ link: CADisplayLink) {
    owner?.onFrame(link)
  }
}

/// Weak target for the fling display link, so the link never keeps the view alive.
private final class CoastProxy: NSObject {
  weak var owner: PocktDialView?
  @objc func tick(_ link: CADisplayLink) {
    guard let owner else { link.invalidate(); return }
    owner.coastTick()
  }
}
