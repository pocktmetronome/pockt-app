import AVFoundation
import Accelerate
import Foundation

struct PocktChunkEnergy {
  var frameCount: Int
  var peakAmplitude: Float
  var nonZeroSampleCount: Int
}

struct PocktRenderedChunk {
  var buffer: AVAudioPCMBuffer
  var startSample: Int64
  var endSample: Int64
  var frameCount: Int
  var peakAmplitude: Float
  var nonZeroSampleCount: Int
  var eventIndexes: [Int64]
  var eventSamples: [Int64]
  var eventAccentLevels: [String]
}

/// Renders future metronome audio as PCM chunks. Musical timing is encoded as
/// absolute sample positions inside each buffer. AVAudioPlayerNode only queues
/// these chunks back-to-back (`scheduleBuffer(..., at: nil)`).
enum PocktAudioChunkRenderer {
  static let chunkDurationSeconds: Double = 2.0
  /// The longest sound in the bank (a spoken count or a choir note): a chunk looks back this far so
  /// a word that began in the previous chunk finishes in this one.
  static let maxClickSeconds: Double = 0.66
  static let nonZeroEpsilon: Float = 1.0e-6

  static func frameCount(sampleRate: Double, durationSeconds: Double = chunkDurationSeconds) -> Int {
    max(64, Int((durationSeconds * max(1, sampleRate)).rounded()))
  }

  static func absoluteSample(event: PocktMusicalEvent, sampleRate: Double) -> Int64 {
    Int64((event.eventSeconds * sampleRate).rounded())
  }

  static func measureEnergy(_ buffer: AVAudioPCMBuffer) -> PocktChunkEnergy {
    let frames = Int(buffer.frameLength)
    guard frames > 0, let channels = buffer.floatChannelData else {
      return PocktChunkEnergy(frameCount: frames, peakAmplitude: 0, nonZeroSampleCount: 0)
    }
    let channelCount = Int(buffer.format.channelCount)
    var peak: Float = 0
    var nonZero = 0
    for channel in 0..<max(1, channelCount) {
      var channelPeak: Float = 0
      vDSP_maxmgv(channels[channel], 1, &channelPeak, vDSP_Length(frames))
      if channelPeak > peak {
        peak = channelPeak
      }
      let samples = UnsafeBufferPointer(start: channels[channel], count: frames)
      for sample in samples where abs(sample) > nonZeroEpsilon {
        nonZero += 1
      }
    }
    return PocktChunkEnergy(frameCount: frames, peakAmplitude: peak, nonZeroSampleCount: nonZero)
  }

  static func peakNear(
    _ buffer: AVAudioPCMBuffer,
    absoluteSample: Int64,
    chunkStartSample: Int64,
    window: Int = 64
  ) -> Float {
    let local = Int(absoluteSample - chunkStartSample)
    let frames = Int(buffer.frameLength)
    guard frames > 0, let channels = buffer.floatChannelData else { return 0 }
    let lo = max(0, local - window)
    let hi = min(frames, local + window + 1)
    guard hi > lo else { return 0 }
    var peak: Float = 0
    let count = vDSP_Length(hi - lo)
    vDSP_maxmgv(channels[0] + lo, 1, &peak, count)
    return peak
  }

  static func makeSilentChunk(format: AVAudioFormat, frameCount: Int) -> AVAudioPCMBuffer? {
    let frames = AVAudioFrameCount(max(64, frameCount))
    guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames) else {
      return nil
    }
    buffer.frameLength = frames
    clear(buffer)
    return buffer
  }

  static func renderChunk(
    startSample: Int64,
    sampleRate: Double,
    format: AVAudioFormat,
    config: PocktEngineConfig,
    bufferForEvent: (PocktMusicalEvent) -> AVAudioPCMBuffer?
  ) -> PocktRenderedChunk? {
    let frames = frameCount(sampleRate: sampleRate)
    guard let buffer = makeSilentChunk(format: format, frameCount: frames) else {
      return nil
    }
    let chunkStart = max(Int64(0), startSample)
    let chunkEnd = chunkStart + Int64(frames)
    let secondsPerTick = max(1e-9, config.secondsPerBeat / Double(max(1, config.ticksPerBeat)))
    let firstSeconds = Double(chunkStart) / max(1, sampleRate) - maxClickSeconds
    var tick = Int64((firstSeconds / secondsPerTick).rounded(.down)) - 4
    if tick < 0 { tick = 0 }

    var eventIndexes: [Int64] = []
    var eventSamples: [Int64] = []
    var eventAccentLevels: [String] = []
    var walked = 0

    while walked < 768 {
      walked += 1
      let event = PocktTimeline.event(tickIndex: tick, config: config)
      let absSample = absoluteSample(event: event, sampleRate: sampleRate)
      if absSample >= chunkEnd + Int64((0.12 * sampleRate).rounded()) {
        break
      }

      let click = (event.audible && event.accentLevel != "mute") ? bufferForEvent(event) : nil
      let clickFrames = Int64(click?.frameLength ?? 0)
      let waveEnd = absSample + max(clickFrames, 1)

      if let click, absSample < chunkEnd, waveEnd > chunkStart {
        mix(
          click: click,
          into: buffer,
          eventAbsoluteSample: absSample,
          chunkStartSample: chunkStart,
          gain: Float(max(0.05, min(1, event.volume)))
        )
      }

      if absSample >= chunkStart && absSample < chunkEnd {
        eventIndexes.append(tick)
        eventSamples.append(absSample)
        eventAccentLevels.append(event.accentLevel)
      }

      tick += 1
    }

    clip(buffer)
    let energy = measureEnergy(buffer)
    return PocktRenderedChunk(
      buffer: buffer,
      startSample: chunkStart,
      endSample: chunkEnd,
      frameCount: energy.frameCount,
      peakAmplitude: energy.peakAmplitude,
      nonZeroSampleCount: energy.nonZeroSampleCount,
      eventIndexes: eventIndexes,
      eventSamples: eventSamples,
      eventAccentLevels: eventAccentLevels
    )
  }

  static func placementReport(sampleRate: Double) -> [String: Any] {
    let checks: [(Double, String, Double)] = [
      (60, "quarter", 1.0),
      (80, "quarter", 0.75),
      (120, "quarter", 0.5),
      (200, "quarter", 0.3),
      (300, "quarter", 0.2),
      (400, "quarter", 0.15),
      (400, "eighths", 0.075),
      (400, "sixteenths", 0.0375),
    ]
    var rows: [[String: Any]] = []
    var allPassed = true
    for (bpm, subdivision, expectedSeconds) in checks {
      var config = PocktEngineConfig.default
      config.bpm = bpm
      config.subdivision = subdivision
      config.feel = "straight"
      config.feelDial = 0
      let first = PocktTimeline.event(tickIndex: 0, config: config)
      let second = PocktTimeline.event(tickIndex: 1, config: config)
      let s0 = absoluteSample(event: first, sampleRate: sampleRate)
      let s1 = absoluteSample(event: second, sampleRate: sampleRate)
      let actualSeconds = Double(s1 - s0) / max(1, sampleRate)
      let expectedSample = Int64((expectedSeconds * sampleRate).rounded())
      let passed = s0 == 0 && (s1 - s0) == expectedSample
      if !passed { allPassed = false }
      rows.append([
        "bpm": bpm,
        "subdivision": subdivision,
        "expectedMs": expectedSeconds * 1000,
        "actualMs": actualSeconds * 1000,
        "expectedIntervalSamples": Double(expectedSample),
        "actualIntervalSamples": Double(s1 - s0),
        "firstSample": Double(s0),
        "secondSample": Double(s1),
        "passed": passed,
      ])
    }
    return [
      "passed": allPassed,
      "sampleRate": sampleRate,
      "checks": rows,
    ]
  }

  static func expectedQuarterSamples(bpm: Double, count: Int, sampleRate: Double) -> [Int64] {
    let seconds = 60.0 / max(1.0, min(900.0, bpm))
    return (0..<count).map { index in
      Int64((Double(index) * seconds * sampleRate).rounded())
    }
  }

  private static func mix(
    click: AVAudioPCMBuffer,
    into dest: AVAudioPCMBuffer,
    eventAbsoluteSample: Int64,
    chunkStartSample: Int64,
    gain: Float
  ) {
    guard let src = click.floatChannelData, let dst = dest.floatChannelData else { return }
    let destFrames = Int(dest.frameLength)
    let srcFrames = Int(click.frameLength)
    let destOffset = Int(eventAbsoluteSample - chunkStartSample)
    let srcOffset = destOffset < 0 ? -destOffset : 0
    let destStart = max(0, destOffset)
    let framesToCopy = min(srcFrames - srcOffset, destFrames - destStart)
    guard framesToCopy > 0, srcOffset < srcFrames, destStart < destFrames else { return }

    var scale = gain
    let channels = min(Int(click.format.channelCount), Int(dest.format.channelCount))
    let count = vDSP_Length(framesToCopy)
    for channel in 0..<max(1, channels) {
      vDSP_vsma(
        src[channel] + srcOffset,
        1,
        &scale,
        dst[channel] + destStart,
        1,
        dst[channel] + destStart,
        1,
        count
      )
    }
  }

  private static func clear(_ buffer: AVAudioPCMBuffer) {
    guard let channels = buffer.floatChannelData else { return }
    let frames = vDSP_Length(buffer.frameLength)
    for channel in 0..<Int(buffer.format.channelCount) {
      vDSP_vclr(channels[channel], 1, frames)
    }
  }

  private static func clip(_ buffer: AVAudioPCMBuffer) {
    guard let channels = buffer.floatChannelData else { return }
    var low: Float = -1
    var high: Float = 1
    let frames = vDSP_Length(buffer.frameLength)
    for channel in 0..<Int(buffer.format.channelCount) {
      vDSP_vclip(channels[channel], 1, &low, &high, channels[channel], 1, frames)
    }
  }
}
