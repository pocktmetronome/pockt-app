import AVFoundation
import Accelerate
import Foundation
import os

enum PocktAudioLog {
  static let logger = Logger(subsystem: "com.moneytest.pockt", category: "audio")

  static func info(_ message: String) {
    logger.info("\(message, privacy: .public)")
    NSLog("[POCKT AUDIO] %@", message)
  }

  static func error(_ message: String) {
    logger.error("\(message, privacy: .public)")
    NSLog("[POCKT AUDIO][ERROR] %@", message)
  }
}

enum PocktClickBankError: LocalizedError {
  case resourceMissing(String, [String])
  case unreadable(String, String)
  case emptyBuffer(String, String)
  case convertFailed(String)

  var errorDescription: String? {
    switch self {
    case .resourceMissing(let key, let tried):
      return "POCKT click resource missing for '\(key)'. Tried: \(tried.joined(separator: " | "))"
    case .unreadable(let key, let path):
      return "POCKT could not open click WAV '\(key)' at \(path)"
    case .emptyBuffer(let key, let path):
      return "POCKT click WAV '\(key)' decoded to 0 frames (\(path))"
    case .convertFailed(let key):
      return "POCKT could not convert click WAV '\(key)' to the engine output format"
    }
  }
}

struct PocktBufferReport {
  var key: String
  var found: Bool
  var url: String
  var frames: Int
  var sampleRate: Double
  var channels: Int
}

final class PocktClickBank {
  static let bundledKeys: [String] = [
    "click",
    "wood",
    "stick",
    "clave",
    "pulse",
    "subkick",
    "pockt-studio",
    "pockt-altered",
    "pockt-after-dark",
    "pocket",
    "pocket-accent",
    "pockt-default",
    "pockt-default-accent",
    "pockt-heavy",
    "pockt-heavy-accent",
    "pockt-heart",
    "pockt-heart-accent",
    "pockt-studio-accent",
    "pockt-altered-accent",
    "pockt-after-dark-accent",
    "subkick-accent",
    "brass",
    "tight",
    "clap",
    "sharp",
    "pockt-roots",
    "pockt-roots-accent",
    "pockt-sundown",
    "pockt-sundown-accent",
    "accent",
    "digital-click",
    "mechanical",
    "woodblock",
    "rim",
    "cowbell",
    "beep",
    "soft-click",
    "hard-click",
    "high-click",
    "low-click",
    "studio-click",
    "stage-cut",
    "stage-cut-accent",
    "precision",
    "precision-accent",
    "lib-wood",
    "lib-jam",
    "lib-kick-deep",
    "lib-kick",
    "lib-snare",
    "lib-hat",
    "lib-djembe",
    "lib-doumbek",
    "lib-bell",
    "lib-tom",
    "lib-timpani",
    "lib-click",
    "lib-click-tight",
    "lib-blip",
    "lib-digital",
    "lib-synth",
    "lib-vocal-hit",
    "lib-vocal-male",
    "lib-vocal-female",
    "lib-vocal-shout",
    "lib-vocal-call",
    "lib-vocal-ahh",
    "lib-vocal-character",
    "lib-vocal-chamber",
    "lib-vocal-hit-b",
    "lib-vocal-male-b",
    "lib-vocal-effort",
    "lib-vocal-effort-m",
    "lib-vocal-emote",
    "lib-vocal-emote-b",
    "lib-vocal-ooh",
    "lib-vocal-ahh-deep",
    "lib-vocal-chorus",
    "lib-vocal-chorus-b",
    "lib-vocal-ensemble",
    "lib-vocal-ensemble-b",
    "lib-choir-a",
    "lib-choir-b",
    "lib-choir-c",
    "lib-choir-d",
    "lib-choir-e",
    "lib-choir-f",
    "lib-choir-g",
    "lib-choir-h",
    "count",
    "count-1",
    "count-2",
    "count-3",
    "count-4",
    "count-5",
    "count-6",
    "count-7",
    "count-8",
    "count-9",
    "count-10",
    "count-11",
    "count-12",
    "plain-tick",
    "blend-tick",
    "bell",
    "electronic-tick",
    "snare",
    "kick",
    "hihat",
    "temple",
    "dry-stick",
    "soft-wood",
    "pockt-ident",
    "bar-tap",
    "bar-metal-tap",
    "bar-jigger",
    "bar-shaker",
    "bar-ice",
    "bar-wood-tap",
    "bar-glass",
    "bar-spoon",
    "bar-thud",
    "bar-shake",
    "bar-bottle",
    "bar-knock",
    "bar-clink",
    "bar-crate",
    "bar-shaker-accent",
    "marimba",
    "side-stick",
    "conga",
    "cajon",
    "tambourine",
    "shaker",
    "triangle",
    "analog-blip",
    "snap",
    "sticks",
    "kalimba",
    "tick-tock",
  ]

  private var buffers: [String: AVAudioPCMBuffer] = [:]
  private(set) var reports: [String: PocktBufferReport] = [:]
  private(set) var format: AVAudioFormat?
  private(set) var bundleURL: String = ""

  var isLoaded: Bool {
    buffers["pockt-default"] != nil
      || buffers["pockt-heavy"] != nil
      || buffers["click"] != nil
      || !buffers.isEmpty
  }

  var defaultNormalBuffer: AVAudioPCMBuffer? { buffers["pockt-default"] ?? buffers["pockt-heavy"] }
  var defaultAccentBuffer: AVAudioPCMBuffer? {
    buffers["pockt-default-accent"] ?? buffers["pockt-heavy-accent"] ?? defaultNormalBuffer
  }
  var defaultStrongAccentBuffer: AVAudioPCMBuffer? {
    buffers["pockt-default-strong"] ?? defaultAccentBuffer
  }
  var defaultSoftBuffer: AVAudioPCMBuffer? {
    buffers["pockt-default-soft"] ?? buffers["soft-click"]
  }
  var loadedKeys: [String] { Array(buffers.keys).sorted() }

  func unload() {
    buffers.removeAll()
    reports.removeAll()
    format = nil
  }

  func loadBundled(format: AVAudioFormat, uris: [String: String] = [:]) throws {
    let bundle = Self.resolveClicksBundle()
    bundleURL = bundle.bundleURL.absoluteString
    PocktAudioLog.info("Click bundle resolved: \(bundleURL)")

    var next: [String: AVAudioPCMBuffer] = [:]
    var nextReports: [String: PocktBufferReport] = [:]
    var failures: [String] = []

    let generated = PocktGeneratedClicks.makeAll(format: format)
    for key in PocktGeneratedClicks.keys {
      guard let buffer = generated[key] else { continue }
      next[key] = buffer
      nextReports[key] = PocktBufferReport(
        key: key,
        found: true,
        url: "generated://\(key)",
        frames: Int(buffer.frameLength),
        sampleRate: buffer.format.sampleRate,
        channels: Int(buffer.format.channelCount)
      )
      PocktAudioLog.info(
        "Generated '\(key)' frames=\(buffer.frameLength) sr=\(buffer.format.sampleRate) ch=\(buffer.format.channelCount)"
      )
    }

    for key in Self.bundledKeys {
      do {
        let loaded = try Self.loadBuffer(key: key, bundle: bundle, format: format, uris: uris)
        next[key] = loaded.buffer
        nextReports[key] = loaded.report
        PocktAudioLog.info(
          "Loaded '\(key)' frames=\(loaded.report.frames) sr=\(loaded.report.sampleRate) ch=\(loaded.report.channels) url=\(loaded.report.url)"
        )
      } catch {
        let message = error.localizedDescription
        failures.append(message)
        PocktAudioLog.error(message)
        nextReports[key] = PocktBufferReport(
          key: key,
          found: false,
          url: "",
          frames: 0,
          sampleRate: 0,
          channels: 0
        )
      }
    }

    if !failures.isEmpty {
      PocktAudioLog.error("Click bank missing \(failures.count) WAV(s); continuing with \(next.keys.sorted().joined(separator: ","))")
    }
    if next["pockt-default"] == nil, let fallback = next["pockt-heavy"] {
      next["pockt-default"] = fallback
    }
    if next["pockt-default-accent"] == nil, let fallback = next["pockt-heavy-accent"] ?? next["pockt-default"] {
      next["pockt-default-accent"] = fallback
    }
    if next["pockt-default-strong"] == nil, let fallback = next["pockt-default-accent"] ?? next["pockt-default"] {
      next["pockt-default-strong"] = fallback
    }
    if next["click"] == nil, let fallback = next["pockt-default"] ?? next["pockt-heavy"] {
      next["click"] = fallback
      nextReports["click"] = PocktBufferReport(
        key: "click",
        found: true,
        url: "generated://click-fallback-from-pockt-default",
        frames: Int(fallback.frameLength),
        sampleRate: fallback.format.sampleRate,
        channels: Int(fallback.format.channelCount)
      )
      PocktAudioLog.info("click WAV missing; registered guaranteed native default as click fallback")
    }
    if next["accent"] == nil, let fallback = next["pockt-default-accent"] ?? next["pockt-heavy-accent"] ?? next["pockt-default"] {
      next["accent"] = fallback
      PocktAudioLog.info("accent WAV missing; registered guaranteed native default accent")
    }
    if next["pockt-default-soft"] == nil, let normal = next["pockt-default"] {
      next["pockt-default-soft"] = Self.deriveFamilyMember(normal, brighter: false)
    }
    let familyKeys = next.keys.filter { !$0.contains("-soft") && !$0.contains("-strong") && !$0.contains("-accent") }
    for key in familyKeys {
      guard let source = next[key] else { continue }
      if next["\(key)-soft"] == nil {
        next["\(key)-soft"] = Self.deriveFamilyMember(source, brighter: false)
      }
      if next["\(key)-strong"] == nil {
        next["\(key)-strong"] = next["\(key)-accent"] ?? Self.deriveFamilyMember(source, brighter: true)
      }
    }

    for (key, _) in uris {
      do {
        let loaded = try Self.loadBuffer(key: key, bundle: bundle, format: format, uris: uris)
        next[key] = loaded.buffer
        nextReports[key] = loaded.report
        PocktAudioLog.info("Loaded extra URI sound '\(key)' frames=\(loaded.report.frames)")
      } catch {
        PocktAudioLog.error("Extra URI sound '\(key)' failed: \(error.localizedDescription)")
      }
    }

    buffers = next
    reports = nextReports
    self.format = format

    if next["pockt-default"] == nil && next.isEmpty {
      throw NSError(
        domain: "PocktTiming",
        code: 12,
        userInfo: [
          NSLocalizedDescriptionKey:
            "Native click bank loaded 0 buffers: \(failures.joined(separator: " ;; "))",
        ]
      )
    }

  }

  func needsReload(for format: AVAudioFormat) -> Bool {
    guard let current = self.format else { return true }
    return current.sampleRate != format.sampleRate || current.channelCount != format.channelCount
  }

  func buffer(for sound: String) -> AVAudioPCMBuffer? {
    buffers[sound]
  }

  func accentBuffer(for sound: String) -> AVAudioPCMBuffer? {
    if sound == "pockt-heavy" {
      return buffers["pockt-heavy-accent"]
    }
    if sound == "pockt-roots" {
      return buffers["pockt-roots-accent"]
    }
    if sound == "pockt-sundown" {
      return buffers["pockt-sundown-accent"]
    }
    if let dedicated = buffers["\(sound)-accent"] {
      return dedicated
    }
    return buffers["accent"]
  }

  func softBuffer(for sound: String) -> AVAudioPCMBuffer? {
    if let dedicated = buffers["\(sound)-soft"] {
      return dedicated
    }
    if let generated = buffers["pockt-default-soft"], sound.hasPrefix("pockt-") || sound == "click" {
      return generated
    }
    return nil
  }

  func strongAccentBuffer(for sound: String) -> AVAudioPCMBuffer? {
    if let dedicated = buffers["\(sound)-strong"] {
      return dedicated
    }
    if sound == "pockt-heavy" {
      return buffers["pockt-heavy-accent"]
    }
    if sound == "pockt-roots" {
      return buffers["pockt-roots-accent"]
    }
    if sound == "pockt-sundown" {
      return buffers["pockt-sundown-accent"]
    }
    return defaultStrongAccentBuffer
  }

  func accentBuffer() -> AVAudioPCMBuffer? {
    buffers["accent"] ?? defaultAccentBuffer
  }

  /// Select exactly one PCM buffer for a beat. Mute returns nil. Never stacks.
  func resolvedBuffer(sound: String, accentLevel: String) -> AVAudioPCMBuffer? {
    if accentLevel == "mute" {
      return nil
    }
    if accentLevel == "strong" || accentLevel == "accent" {
      return strongAccentBuffer(for: sound)
        ?? accentBuffer(for: sound)
        ?? defaultStrongAccentBuffer
        ?? buffer(for: sound)
        ?? defaultNormalBuffer
    }
    if accentLevel == "soft" {
      return softBuffer(for: sound)
        ?? buffers["soft-click"]
        ?? defaultSoftBuffer
        ?? buffer(for: sound)
        ?? defaultNormalBuffer
    }
    return buffer(for: sound) ?? defaultNormalBuffer
  }

  func inventory() -> [[String: Any]] {
    Self.bundledKeys.map { key in
      let report = reports[key]
      return [
        "key": key,
        "found": report?.found ?? false,
        "url": report?.url ?? "",
        "frames": report?.frames ?? 0,
        "sampleRate": report?.sampleRate ?? 0,
        "channels": report?.channels ?? 0,
      ]
    }
  }

  func bundledWavNames() -> [String] {
    Self.listBundledWavs()
  }

  static func listBundledWavs() -> [String] {
    var names: [String] = []
    let bundles = [resolveClicksBundle(), Bundle(for: PocktClickBank.self), Bundle.main]
    var seen = Set<ObjectIdentifier>()
    for bundle in bundles {
      let id = ObjectIdentifier(bundle)
      if seen.contains(id) { continue }
      seen.insert(id)
      for directory in [nil, "Clicks", "PocktTimingClicks"] as [String?] {
        if let urls = bundle.urls(forResourcesWithExtension: "wav", subdirectory: directory) {
          for url in urls {
            let prefix = directory.map { "\($0)/" } ?? ""
            names.append("\(bundle.bundlePath)::\(prefix)\(url.lastPathComponent)")
          }
        }
      }
    }
    return Array(Set(names)).sorted()
  }

  static func scaled(_ buffer: AVAudioPCMBuffer, volume: Float) -> AVAudioPCMBuffer {
    if volume == 1 {
      return buffer
    }
    guard let out = AVAudioPCMBuffer(pcmFormat: buffer.format, frameCapacity: buffer.frameLength) else {
      return buffer
    }
    out.frameLength = buffer.frameLength
    guard let src = buffer.floatChannelData else {
      return buffer
    }
    guard let dst = out.floatChannelData else {
      return buffer
    }
    var scale = volume
    let frames = vDSP_Length(buffer.frameLength)
    let channelCount = Int(buffer.format.channelCount)
    for channel in 0..<channelCount {
      vDSP_vsmul(src[channel], 1, &scale, dst[channel], 1, frames)
    }
    return out
  }

  /// Original family member: duller/lower vs brighter/higher. Never volume-only.
  static func deriveFamilyMember(_ buffer: AVAudioPCMBuffer, brighter: Bool) -> AVAudioPCMBuffer {
    guard let out = AVAudioPCMBuffer(pcmFormat: buffer.format, frameCapacity: buffer.frameLength) else {
      return buffer
    }
    out.frameLength = buffer.frameLength
    guard let src = buffer.floatChannelData, let dst = out.floatChannelData else {
      return buffer
    }
    let frames = Int(buffer.frameLength)
    let channels = Int(buffer.format.channelCount)
    let coeff: Float = brighter ? 0.22 : 0.18
    for channel in 0..<max(1, channels) {
      var prev: Float = 0
      var lp: Float = 0
      for i in 0..<frames {
        let sample = src[channel][i]
        lp += coeff * (sample - lp)
        let hp = sample - prev
        prev = sample
        let shaped: Float
        if brighter {
          shaped = max(-1, min(1, hp * 0.72 + sample * 0.58 + lp * 0.08))
        } else {
          shaped = max(-1, min(1, lp * 0.82 + sample * 0.22))
        }
        dst[channel][i] = shaped
      }
    }
    return out
  }

  /// Keeps the peak and an 8 ms hold, then an exponential tail.
  /// General clicks are quiet by 34 ms. Voices keep the whole word.
  static let tonalKeys: Set<String> = [
    "kalimba", "marimba", "triangle", "lib-bell", "bell", "lib-timpani", "lib-tom", "conga", "cowbell", "brass",
    "temple", "lib-djembe", "lib-doumbek", "cajon", "analog-blip", "lib-blip", "pockt-altered", "pockt-after-dark",
  ]

  static func shapeForMetronome(_ buffer: AVAudioPCMBuffer, key: String) -> AVAudioPCMBuffer {
    guard let src = buffer.floatChannelData else { return buffer }
    let frames = Int(buffer.frameLength)
    let channels = Int(buffer.format.channelCount)
    let rate = buffer.format.sampleRate
    if frames < 8 || rate < 1000 || channels < 1 { return buffer }
    var peak: Float = 0
    var peakIndex = 0
    for i in 0..<frames {
      let a = abs(src[0][i])
      if a > peak {
        peak = a
        peakIndex = i
      }
    }
    if peak < 0.0001 { return buffer }
    let special = key.hasPrefix("count") || key.hasPrefix("lib-choir") || key.hasPrefix("lib-vocal")
    if special {
      // Voices keep every syllable: from the onset (the files are trimmed to it) to the end of the word,
      // with a short fade so the tail never clicks. Overlapping counts at fast tempos simply mix.
      let maxLen = Int((key.hasPrefix("lib-choir") ? 0.62 : 0.56) * rate)
      let n = max(1, min(frames, maxLen))
      guard let out = AVAudioPCMBuffer(pcmFormat: buffer.format, frameCapacity: AVAudioFrameCount(n)) else { return buffer }
      out.frameLength = AVAudioFrameCount(n)
      guard let dst = out.floatChannelData else { return buffer }
      let fade = max(1, Int(0.03 * rate))
      for channel in 0..<channels {
        for i in 0..<n {
          var g: Float = 1
          if i > n - fade { g = Float(n - i) / Float(fade) }
          var sample = src[channel][i] * g
          if sample > 0.98 { sample = 0.98 }
          if sample < -0.98 { sample = -0.98 }
          dst[channel][i] = sample
        }
      }
      return out
    }
    // Tonal sounds (bars, bells, toms) keep their ring; a click stays crisp. The engine already cuts any
    // sound at the next audible tick, so a longer ring never smears a fast tempo.
    let tonal = Self.tonalKeys.contains(key)
    let hold = Int((tonal ? 0.02 : 0.008) * rate)
    let maxTail = Int((tonal ? 0.24 : 0.034) * rate)
    let tau = (tonal ? 0.06 : 0.0065) * rate
    // Start at the sound's own onset (0.5 ms before it), never cutting into its attack; a slow swell is
    // started at most 12 ms before its peak so the beat still lands where it is felt.
    let floorLevel = peak * 0.01
    var onset = peakIndex
    while onset > 0 && abs(src[0][onset - 1]) > floorLevel { onset -= 1 }
    var scan = onset
    while scan > 0 && peakIndex - scan < Int(0.012 * rate) {
      scan -= 1
      if abs(src[0][scan]) > floorLevel { onset = scan }
    }
    let start = max(0, max(onset - Int(0.0005 * rate), peakIndex - Int(0.012 * rate)))
    let fadeIn = max(1, Int(0.0005 * rate))
    let end = min(frames, peakIndex + maxTail)
    let outFrames = max(1, end - start)
    guard let out = AVAudioPCMBuffer(pcmFormat: buffer.format, frameCapacity: AVAudioFrameCount(outFrames)) else {
      return buffer
    }
    out.frameLength = AVAudioFrameCount(outFrames)
    guard let dst = out.floatChannelData else { return buffer }
    for channel in 0..<channels {
      for i in 0..<outFrames {
        let sourceIndex = start + i
        let fromPeak = sourceIndex - peakIndex
        var gain: Float = 1
        if i < fadeIn { gain = Float(i) / Float(fadeIn) }
        if fromPeak > hold {
          gain *= exp(-Float(fromPeak - hold) / Float(tau))
        }
        if fromPeak >= maxTail - 1 { gain = 0 }
        var sample = src[channel][sourceIndex] * gain
        if sample > 0.98 { sample = 0.98 }
        if sample < -0.98 { sample = -0.98 }
        dst[channel][i] = sample
      }
    }
    return out
  }

  static func silentBuffer(format: AVAudioFormat, frames: AVAudioFrameCount = 64) -> AVAudioPCMBuffer? {
    guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames) else { return nil }
    buffer.frameLength = frames
    if let channels = buffer.floatChannelData {
      for channel in 0..<Int(format.channelCount) {
        vDSP_vclr(channels[channel], 1, vDSP_Length(frames))
      }
    }
    return buffer
  }

  private static func loadBuffer(
    key: String,
    bundle: Bundle,
    format: AVAudioFormat,
    uris: [String: String]
  ) throws -> (buffer: AVAudioPCMBuffer, report: PocktBufferReport) {
    let (url, tried) = locateWav(named: key, bundle: bundle, uris: uris)
    guard let url else {
      throw PocktClickBankError.resourceMissing(key, tried)
    }
    return try decode(url: url, key: key, format: format)
  }

  private static func decode(
    url: URL,
    key: String,
    format: AVAudioFormat
  ) throws -> (buffer: AVAudioPCMBuffer, report: PocktBufferReport) {
    let file: AVAudioFile
    do {
      file = try AVAudioFile(forReading: url)
    } catch {
      throw PocktClickBankError.unreadable(key, url.absoluteString)
    }

    let sourceFormat = file.processingFormat
    let frameCount = AVAudioFrameCount(file.length)
    if frameCount == 0 {
      throw PocktClickBankError.emptyBuffer(key, url.absoluteString)
    }
    guard let raw = AVAudioPCMBuffer(pcmFormat: sourceFormat, frameCapacity: frameCount) else {
      throw PocktClickBankError.convertFailed(key)
    }
    try file.read(into: raw)
    if raw.frameLength == 0 {
      throw PocktClickBankError.emptyBuffer(key, url.absoluteString)
    }

    let converted: AVAudioPCMBuffer
    let sameRate = sourceFormat.sampleRate == format.sampleRate
    let sameChannels = sourceFormat.channelCount == format.channelCount
    let sameFormat = sourceFormat.commonFormat == format.commonFormat
    if sameRate && sameChannels && sameFormat {
      converted = raw
    } else {
      converted = try convert(raw, to: format, key: key)
    }
    if converted.frameLength == 0 {
      throw PocktClickBankError.emptyBuffer(key, url.absoluteString)
    }

    let shaped = Self.shapeForMetronome(converted, key: key)
    let report = PocktBufferReport(
      key: key,
      found: true,
      url: url.absoluteString,
      frames: Int(shaped.frameLength),
      sampleRate: shaped.format.sampleRate,
      channels: Int(shaped.format.channelCount)
    )
    return (shaped, report)
  }

  private static func convert(_ buffer: AVAudioPCMBuffer, to format: AVAudioFormat, key: String) throws -> AVAudioPCMBuffer {
    guard let converter = AVAudioConverter(from: buffer.format, to: format) else {
      throw PocktClickBankError.convertFailed(key)
    }
    let ratio = format.sampleRate / buffer.format.sampleRate
    let capacity = AVAudioFrameCount((Double(buffer.frameLength) * ratio).rounded(.up) + 32)
    guard let converted = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: capacity) else {
      throw PocktClickBankError.convertFailed(key)
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
    if let error {
      throw error
    }
    return converted
  }

  static func resolveClicksBundle() -> Bundle {
    let classBundle = Bundle(for: PocktClickBank.self)
    let candidates: [Bundle] = [classBundle, Bundle.main] + Bundle.allBundles + Bundle.allFrameworks
    var seen = Set<ObjectIdentifier>()
    for candidate in candidates {
      let id = ObjectIdentifier(candidate)
      if seen.contains(id) { continue }
      seen.insert(id)
      if let url = candidate.url(forResource: "PocktTimingClicks", withExtension: "bundle"),
         let nested = Bundle(url: url) {
        PocktAudioLog.info("Using nested PocktTimingClicks.bundle in \(candidate.bundlePath)")
        return nested
      }
    }
    if let url = classBundle.url(forResource: "click", withExtension: "wav")
      ?? Bundle.main.url(forResource: "click", withExtension: "wav")
      ?? Bundle.main.url(forResource: "click", withExtension: "wav", subdirectory: "PocktTimingClicks") {
      PocktAudioLog.info("Using flattened click bundle at \(url.deletingLastPathComponent().absoluteString)")
      return Bundle(url: url.deletingLastPathComponent()) ?? classBundle
    }
    PocktAudioLog.error("PocktTimingClicks.bundle not found; falling back to \(classBundle.bundlePath)")
    return classBundle
  }

  private static func candidateNames(for key: String) -> [String] {
    switch key {
    case "pockt-roots", "pockt-roots-accent", "pockt-sundown", "pockt-sundown-accent":
      return []
    case "click":
      return ["click", "classic_click_v89"]
    case "stage-cut":
      return ["stage-cut", "stage_cut"]
    case "stage-cut-accent":
      return ["stage-cut-accent", "stage_cut_downbeat"]
    case "precision":
      return ["precision"]
    case "precision-accent":
      return ["precision-accent", "precision_downbeat"]
    case "plain-tick":
      return ["plain-tick", "tick"]
    case "blend-tick":
      return ["blend-tick", "warm"]
    case "bell":
      return ["bell", "accent"]
    case "electronic-tick":
      return ["electronic-tick", "beep"]
    default:
      return [key]
    }
  }

  private static func locateWav(named key: String, bundle: Bundle, uris: [String: String]) -> (URL?, [String]) {
    var tried: [String] = []
    let names = candidateNames(for: key)
    let directories: [String?] = [nil, "Clicks", "PocktTimingClicks"]
    let searchBundles = [bundle, Bundle(for: PocktClickBank.self), Bundle.main]

    for search in searchBundles {
      for name in names {
        for directory in directories {
          let url = search.url(forResource: name, withExtension: "wav", subdirectory: directory)
          let label = "\(search.bundlePath)::\(directory ?? ".")/\(name).wav"
          tried.append(url?.absoluteString ?? "MISS \(label)")
          if let url {
            return (url, tried)
          }
        }
      }
    }

    let uriKeys = [key] + names
    for uriKey in uriKeys {
      if let raw = uris[uriKey], let url = fileURL(from: raw) {
        tried.append(url.absoluteString)
        if FileManager.default.fileExists(atPath: url.path) {
          return (url, tried)
        }
        tried.append("MISS URI \(url.path)")
      }
    }
    return (nil, tried)
  }

  private static func fileURL(from raw: String) -> URL? {
    if raw.hasPrefix("file:") {
      return URL(string: raw)
    }
    if raw.hasPrefix("/") {
      return URL(fileURLWithPath: raw)
    }
    return URL(string: raw)
  }
}
