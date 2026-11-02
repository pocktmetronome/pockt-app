import CoreHaptics
import CoreMotion
import ExpoModulesCore
import Metal
import QuartzCore
import simd
import UIKit

private struct DialUniforms {
  var resolution: SIMD2<Float>
  var angle: Float
  var press: Float
  var lightDir: SIMD4<Float>
  var parallax: SIMD2<Float>
  var time: Float
  var visualScale: Float
}

final class PocktGlassProofView: ExpoView {
  let onSettle = EventDispatcher()

  private let metalLayer = CAMetalLayer()
  private var device: MTLDevice?
  private var commandQueue: MTLCommandQueue?
  private var pipeline: MTLRenderPipelineState?
  private var uniformBuffer: MTLBuffer?
  private var displayLink: CADisplayLink?
  private let displayLinkProxy = GlassProofDisplayLinkProxy()

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
  private var capturing = false
  private var lastDetentUnwrapped: Int = 0
  private var lastHapticAt: CFTimeInterval = 0
  private var movedDetentDuringDrag = false
  private var instantOmega: CGFloat = 0
  private var lastFrame: CFTimeInterval = CACurrentMediaTime()
  private var startedAt: CFTimeInterval = CACurrentMediaTime()
  private var velocitySamples: [(t: CFTimeInterval, a: CGFloat)] = []

  private var lightDir = SIMD3<Float>(-0.35, 0.55, 0.76)
  private var targetLight = SIMD3<Float>(-0.35, 0.55, 0.76)
  private var parallax = SIMD2<Float>(repeating: 0)
  private var lastGravity = SIMD3<Float>(repeating: 0)
  private var hasMotionHardware = false
  private var simulatorTime: Float = 0
  private var renderRunning = false
  private var idleMotionFrames = 0
  private var metalReady = false

  var detentCount: Int = DialTuning.detentCount {
    didSet { detentCount = max(2, detentCount) }
  }

  private var bgObserver: NSObjectProtocol?
  private var fgObserver: NSObjectProtocol?

#if DEBUG
  private var pacingStart: CFTimeInterval = 0
  private var pacingDeltas: [CFTimeInterval] = []
  private var pacingLogged = false
#endif

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    isMultipleTouchEnabled = false
    isExclusiveTouch = true
    backgroundColor = UIColor(red: 0.012, green: 0.012, blue: 0.014, alpha: 1)
    lastDetentUnwrapped = unwrappedDetent(angle)
    displayLinkProxy.owner = self
    setupMetal()
    setupLifecycle()
  }

  deinit {
    stopDisplayLink()
    stopMotion()
    hapticEngine?.stop(completionHandler: { _ in })
    if let bgObserver { NotificationCenter.default.removeObserver(bgObserver) }
    if let fgObserver { NotificationCenter.default.removeObserver(fgObserver) }
  }

  override func willMove(toWindow newWindow: UIWindow?) {
    super.willMove(toWindow: newWindow)
    if newWindow == nil {
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
    startHaptics()
    startMotion()
    wakeRenderer()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    guard metalReady else { return }
    metalLayer.frame = bounds
    let scale = window?.screen.scale ?? UIScreen.main.scale
    metalLayer.contentsScale = scale
    metalLayer.drawableSize = CGSize(width: max(bounds.width, 1) * scale, height: max(bounds.height, 1) * scale)
    wakeRenderer()
  }

  override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
    guard metalReady, let touch = touches.first else { return }
#if DEBUG
    if pacingStart == 0 { pacingStart = CACurrentMediaTime() }
#endif
    applyCoalesced(touch, event: event, began: true)
  }

  override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
    guard metalReady, let touch = touches.first else { return }
    applyCoalesced(touch, event: event, began: false)
  }

  override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
    guard metalReady else { return }
    endDrag()
  }

  override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
    guard metalReady else { return }
    endDrag()
  }

  func applyDetentCount(_ value: Int) {
    detentCount = max(2, value)
  }

  private func setupMetal() {
    metalReady = false
    metalLayer.pixelFormat = .bgra8Unorm_srgb
    metalLayer.framebufferOnly = true
    metalLayer.isOpaque = true
    metalLayer.colorspace = CGColorSpace(name: CGColorSpace.sRGB)

    guard let device = MTLCreateSystemDefaultDevice() else {
      NSLog("[POCKT][GlassProof] MTLCreateSystemDefaultDevice() returned nil")
      return
    }

    guard let shaderBundle = resolveShaderBundle() else { return }
    let bundlePath = shaderBundle.bundlePath

    let library: MTLLibrary
    do {
      library = try device.makeDefaultLibrary(bundle: shaderBundle)
    } catch {
      NSLog(
        "[POCKT][GlassProof] makeDefaultLibrary(bundle:) failed. Searched bundle %@. DialShader.metal must compile into this pod's default metallib. %@",
        bundlePath,
        error.localizedDescription
      )
      return
    }
    guard let vertex = library.makeFunction(name: "dial_vertex") else {
      NSLog("[POCKT][GlassProof] missing Metal function dial_vertex in default metallib. Bundle searched: %@", bundlePath)
      return
    }
    guard let fragment = library.makeFunction(name: "dial_fragment") else {
      NSLog("[POCKT][GlassProof] missing Metal function dial_fragment in default metallib. Bundle searched: %@", bundlePath)
      return
    }
    do {
      let descriptor = MTLRenderPipelineDescriptor()
      descriptor.vertexFunction = vertex
      descriptor.fragmentFunction = fragment
      descriptor.colorAttachments[0].pixelFormat = metalLayer.pixelFormat
      pipeline = try device.makeRenderPipelineState(descriptor: descriptor)
    } catch {
      NSLog("[POCKT][GlassProof] render pipeline failed (bundle %@): %@", bundlePath, String(describing: error))
      pipeline = nil
      return
    }

    self.device = device
    metalLayer.device = device
    commandQueue = device.makeCommandQueue()
    uniformBuffer = device.makeBuffer(length: MemoryLayout<DialUniforms>.stride, options: .storageModeShared)
    layer.addSublayer(metalLayer)
    metalReady = true
  }

  /// CocoaPods copies PocktGlassProof.bundle into the app; static_framework means
  /// Bundle(for:) is usually the main bundle, but search both roots.
  private func resolveShaderBundle() -> Bundle? {
    let roots: [(label: String, bundle: Bundle)] = [
      ("Bundle(for: PocktGlassProofView.self)", Bundle(for: PocktGlassProofView.self)),
      ("Bundle.main", .main),
    ]
    var searched: [String] = []
    for root in roots {
      searched.append("\(root.label) (\(root.bundle.bundlePath))")
      if let url = root.bundle.url(forResource: "PocktGlassProof", withExtension: "bundle"),
         let resolved = Bundle(url: url) {
        NSLog("[POCKT][GlassProof] resolved PocktGlassProof.bundle via %@ at %@", root.label, url.path)
        return resolved
      }
    }
    NSLog(
      "[POCKT][GlassProof] PocktGlassProof.bundle not found. Searched: %@",
      searched.joined(separator: " | ")
    )
    return nil
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
    guard metalReady else { return }
    lastFrame = CACurrentMediaTime()
    startDisplayLink()
  }

  private func startDisplayLink() {
    guard metalReady else { return }
    if displayLink == nil {
      let link = CADisplayLink(target: displayLinkProxy, selector: #selector(GlassProofDisplayLinkProxy.tick(_:)))
      link.preferredFrameRateRange = CAFrameRateRange(minimum: 30, maximum: 120, preferred: 120)
      link.add(to: .main, forMode: .common)
      displayLink = link
    }
    if displayLink?.isPaused == true || !renderRunning {
      setRenderRunning(true)
    }
    displayLink?.isPaused = false
  }

  private func stopDisplayLink() {
    displayLink?.isPaused = true
    displayLink?.invalidate()
    displayLink = nil
    setRenderRunning(false)
  }

  private func setRenderRunning(_ running: Bool) {
    if renderRunning != running {
      renderRunning = running
#if DEBUG
      NSLog("[POCKT][GlassProof] render loop %@", running ? "RUN" : "PAUSE")
#endif
    }
  }

  fileprivate func onFrame(_ link: CADisplayLink) {
    guard metalReady else { return }
    let now = CACurrentMediaTime()
    let dt = min(0.032, max(0.001, now - lastFrame))
    lastFrame = now
#if DEBUG
    recordPacing(dt: dt, now: now)
#endif
    stepMotion(dt: dt)
    stepPhysics(dt: dt)
    drawFrame()

    let still = simd_length(targetLight - lightDir) < Float(DialTuning.motionWakeEpsilon)
      && simd_length(lastGravity) > 0
    if !hasMotionHardware { idleMotionFrames += 1 } else if still { idleMotionFrames += 1 } else { idleMotionFrames = 0 }

    let idle = !dragging
      && abs(omega) < DialTuning.idleOmega
      && abs(press - pressTarget) < DialTuning.idlePress
      && abs(pressVel) < 0.02
      && (hasMotionHardware ? idleMotionFrames > 8 : idleMotionFrames > Int(2.0 / dt))
    if idle {
      displayLink?.isPaused = true
      setRenderRunning(false)
    }
  }

  private func drawFrame() {
    guard metalReady else { return }
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
      visualScale: mixf(1.0, DialTuning.pressScale, Float(press))
    )
    memcpy(buffer.contents(), &uniforms, MemoryLayout<DialUniforms>.stride)

    let pass = MTLRenderPassDescriptor()
    pass.colorAttachments[0].texture = drawable.texture
    pass.colorAttachments[0].loadAction = .clear
    pass.colorAttachments[0].storeAction = .store
    pass.colorAttachments[0].clearColor = MTLClearColor(red: 0.012, green: 0.012, blue: 0.014, alpha: 1)

    guard let command = commandQueue.makeCommandBuffer(),
          let encoder = command.makeRenderCommandEncoder(descriptor: pass)
    else { return }

    encoder.setRenderPipelineState(pipeline)
    encoder.setFragmentBuffer(buffer, offset: 0, index: 0)
    encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
    encoder.endEncoding()
    command.present(drawable)
    command.commit()
  }

  private func applyCoalesced(_ touch: UITouch, event: UIEvent?, began: Bool) {
    let points: [CGPoint]
    if let coalesced = event?.coalescedTouches(for: touch), !coalesced.isEmpty {
      points = coalesced.map { $0.location(in: self) }
    } else {
      points = [touch.location(in: self)]
    }
    if began {
      beginDrag(at: points[0])
      for p in points.dropFirst() { moveDrag(at: p) }
    } else {
      for p in points { moveDrag(at: p) }
    }
  }

  private func beginDrag(at point: CGPoint) {
    dragging = true
    capturing = false
    pressTarget = 1
    omega = 0
    velocitySamples.removeAll(keepingCapacity: true)
    wakeRenderer()
    if fingerRadius(at: point) > deadZone {
      haveFingerAngle = true
      lastFingerAngle = fingerAngle(at: point)
    } else {
      haveFingerAngle = false
    }
    lastDetentUnwrapped = unwrappedDetent(angle)
    movedDetentDuringDrag = false
    playHaptic(intensity: DialTuning.pressDownIntensity, sharpness: DialTuning.pressDownSharpness)
  }

  private func moveDrag(at point: CGPoint) {
    wakeRenderer()
    if fingerRadius(at: point) <= deadZone { return }
    let next = fingerAngle(at: point)
    if !haveFingerAngle {
      lastFingerAngle = next
      haveFingerAngle = true
      return
    }
    var delta = next - lastFingerAngle
    while delta > .pi { delta -= 2 * .pi }
    while delta < -.pi { delta += 2 * .pi }
    lastFingerAngle = next
    angle += delta
    instantOmega = delta / 0.016
    let n = CGFloat(detentCount)
    angle += -sin(n * angle) * DialTuning.dragMagnet
    sampleVelocity()
    fireDragDetentIfNeeded()
  }

  private func endDrag() {
    dragging = false
    pressTarget = 0
    haveFingerAngle = false
    omega = releaseVelocity()
    wakeRenderer()
    playHaptic(intensity: DialTuning.pressUpIntensity, sharpness: DialTuning.pressUpSharpness)
  }

  private func stepPhysics(dt: CGFloat) {
    let down = pressTarget > 0.5
    let k = down ? DialTuning.pressDownK : DialTuning.pressUpK
    let damp = down ? DialTuning.pressDownDamp : DialTuning.pressUpDamp
    let pressAcc = (pressTarget - press) * k - pressVel * damp
    pressVel += pressAcc * dt
    press += pressVel * dt
    press = min(1.2, max(-0.05, press))

    if dragging { return }

    let n = CGFloat(detentCount)
    let step = 2 * CGFloat.pi / n
    let nearest = (angle / step).rounded() * step
    let dist = wrapToPi(nearest - angle)

    if capturing || (abs(omega) < DialTuning.captureSpeed && abs(dist) < DialTuning.captureWindow) {
      capturing = true
      omega += (DialTuning.springK * dist - DialTuning.springDamp * omega) * dt
      angle += omega * dt
      if abs(wrapToPi(nearest - angle)) < 0.0004, abs(omega) < DialTuning.idleOmega {
        angle = nearest
        omega = 0
        capturing = false
        emitSettle()
      }
    } else {
      capturing = false
      let acc = -DialTuning.detentGain * sin(n * angle) - DialTuning.friction * omega
      omega += acc * dt
      angle += omega * dt
    }
  }

  private func emitSettle() {
    let index = wrappedDetent(angle)
    lastDetentUnwrapped = unwrappedDetent(angle)
    if movedDetentDuringDrag || abs(omega) > 0.3 {
      playHaptic(intensity: DialTuning.settleIntensity, sharpness: DialTuning.settleSharpness)
    }
    movedDetentDuringDrag = false
    onSettle(["index": index, "angle": Double(angle)])
  }

  private func fireDragDetentIfNeeded() {
    let idx = unwrappedDetent(angle)
    guard idx != lastDetentUnwrapped else { return }
    lastDetentUnwrapped = idx
    movedDetentDuringDrag = true
    let now = CACurrentMediaTime()
    guard now - lastHapticAt >= DialTuning.hapticMinGap else { return }
    lastHapticAt = now
    let speed = min(1, abs(instantOmega) / DialTuning.fastSpinRef)
    let intensity = mixf(DialTuning.slowTickIntensity, DialTuning.fastTickIntensity, Float(speed))
    let sharpness = mixf(DialTuning.slowTickSharpness, DialTuning.fastTickSharpness, Float(speed))
    playHaptic(intensity: intensity, sharpness: sharpness)
  }

  private func sampleVelocity() {
    let now = CACurrentMediaTime()
    velocitySamples.append((now, angle))
    velocitySamples.removeAll { now - $0.t > 0.05 }
  }

  private func releaseVelocity() -> CGFloat {
    sampleVelocity()
    guard let first = velocitySamples.first, let last = velocitySamples.last, last.t > first.t else {
      return omega
    }
    var d = last.a - first.a
    while d > .pi { d -= 2 * .pi }
    while d < -.pi { d += 2 * .pi }
    if abs(last.a - first.a) > .pi {
      d = last.a - first.a
    }
    return d / CGFloat(last.t - first.t)
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
      if simd_length(grav - self.lastGravity) > Float(DialTuning.motionWakeEpsilon) {
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
      simulatorTime += Float(dt) * DialTuning.simulatorDriftSpeed
      targetLight = simd_normalize(SIMD3<Float>(
        -0.42 + 0.38 * sin(simulatorTime),
        0.48 + 0.22 * cos(simulatorTime * 0.7),
        0.72
      ))
    }
    let a = Float(1 - exp(-dt / DialTuning.motionFilterTau))
    lightDir = simd_normalize(lightDir + (targetLight - lightDir) * a)
    let amp = DialTuning.parallaxAmplitude
    let desired = SIMD2<Float>(lightDir.x, -lightDir.y) * amp
    parallax += (desired - parallax) * a
  }

  private func startHaptics() {
    guard metalReady else { return }
    guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
    if hapticEngine == nil {
      do {
        let engine = try CHHapticEngine()
        engine.playsHapticsOnly = true
        engine.resetHandler = { [weak self] in
          guard let self else { return }
          try? self.hapticEngine?.start()
        }
        engine.stoppedHandler = { [weak self] _ in
          guard let self else { return }
          try? self.hapticEngine?.start()
        }
        try engine.start()
        hapticEngine = engine
      } catch {
        NSLog("[POCKT][GlassProof] haptic engine failed: %@", error.localizedDescription)
        hapticEngine = nil
        return
      }
    }
    try? hapticEngine?.start()
  }

  private func playHaptic(intensity: Float, sharpness: Float) {
    guard metalReady, let engine = hapticEngine else { return }
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
    } catch {}
  }

  private var deadZone: CGFloat {
    max(16, min(bounds.width, bounds.height) * DialTuning.deadZoneFrac)
  }

  private func dialCenter() -> CGPoint {
    CGPoint(x: bounds.midX, y: bounds.midY)
  }

  private func fingerRadius(at point: CGPoint) -> CGFloat {
    let c = dialCenter()
    return hypot(point.x - c.x, point.y - c.y)
  }

  /// Y-up to match the Metal shader (screen up is +Y).
  private func fingerAngle(at point: CGPoint) -> CGFloat {
    let c = dialCenter()
    return atan2(-(point.y - c.y), point.x - c.x)
  }

  private func unwrappedDetent(_ a: CGFloat) -> Int {
    let step = 2 * CGFloat.pi / CGFloat(detentCount)
    return Int((a / step).rounded())
  }

  private func wrappedDetent(_ a: CGFloat) -> Int {
    let n = detentCount
    let i = unwrappedDetent(a)
    return ((i % n) + n) % n
  }

  private func wrapToPi(_ v: CGFloat) -> CGFloat {
    var x = v
    while x > .pi { x -= 2 * .pi }
    while x < -.pi { x += 2 * .pi }
    return x
  }

#if DEBUG
  private func recordPacing(dt: CFTimeInterval, now: CFTimeInterval) {
    guard pacingStart > 0, !pacingLogged else { return }
    if now - pacingStart <= 5 {
      pacingDeltas.append(dt)
    } else {
      pacingLogged = true
      guard !pacingDeltas.isEmpty else { return }
      let mean = pacingDeltas.reduce(0, +) / Double(pacingDeltas.count)
      let minV = pacingDeltas.min() ?? 0
      let maxV = pacingDeltas.max() ?? 0
      let var_ = pacingDeltas.map { ($0 - mean) * ($0 - mean) }.reduce(0, +) / Double(pacingDeltas.count)
      NSLog(
        "[POCKT][GlassProof] pacing 5s n=%d mean=%.4f min=%.4f max=%.4f std=%.4f",
        pacingDeltas.count, mean, minV, maxV, sqrt(var_)
      )
    }
  }
#endif
}

private func mixf(_ a: Float, _ b: Float, _ t: Float) -> Float {
  a + (b - a) * t
}

private final class GlassProofDisplayLinkProxy: NSObject {
  weak var owner: PocktGlassProofView?

  @objc func tick(_ link: CADisplayLink) {
    owner?.onFrame(link)
  }
}
