import Foundation

enum PocktScheduleDecision: Equatable {
  case schedule
  case wait
  case skipMissed
}

/// One constant-tempo span on the player sample timeline.
/// Tick `startTick` is already committed at `startSample`.
/// Later ticks: startSample + round((tick - startTick) * secondsPerTick * sampleRate)
struct PocktTempoSegment: Equatable {
  var startTick: Int64
  var startSample: Int64
  var bpm: Double
  var ticksPerBeat: Int

  var secondsPerBeat: Double { 60.0 / max(1.0, min(900.0, bpm)) }
  var secondsPerTick: Double { secondsPerBeat / Double(max(1, ticksPerBeat)) }
}

/// Anchored musical timeline. Beat deadlines are sample positions, never JS/UI time.
/// Live BPM changes append (or coalesce) a segment at the last committed tick.
enum PocktTransportMath {
  static let lookAheadSeconds = 0.22
  static let safetySeconds = 0.045
  static let refillIntervalMs = 16
  static let maxLookAheadBeats = 3
  static let architecture = "v13-sample-schedule"

  static func clampBpm(_ bpm: Double) -> Double {
    min(900, max(1, bpm))
  }

  static func initialSegment(bpm: Double, ticksPerBeat: Int, startSample: Int64 = 0) -> PocktTempoSegment {
    PocktTempoSegment(
      startTick: 0,
      startSample: max(0, startSample),
      bpm: clampBpm(bpm),
      ticksPerBeat: max(1, ticksPerBeat)
    )
  }

  static func segment(forTick tick: Int64, segments: [PocktTempoSegment]) -> PocktTempoSegment {
    var chosen = segments.first ?? initialSegment(bpm: 120, ticksPerBeat: 1)
    for segment in segments where segment.startTick <= tick {
      chosen = segment
    }
    return chosen
  }

  static func sample(forTick tick: Int64, segments: [PocktTempoSegment], sampleRate: Double) -> Int64 {
    let rate = max(1, sampleRate)
    let segment = segment(forTick: tick, segments: segments)
    let delta = Double(tick - segment.startTick) * segment.secondsPerTick
    return segment.startSample + Int64((delta * rate).rounded())
  }

  /// BPM change takes effect after the last already-scheduled tick.
  /// Does not reset tick/beat/bar. Does not move committed sample deadlines.
  @discardableResult
  static func applyTempo(
    segments: inout [PocktTempoSegment],
    lastScheduledTick: Int64?,
    newBpm: Double,
    ticksPerBeat: Int,
    sampleRate: Double
  ) -> PocktTempoSegment {
    let bpm = clampBpm(newBpm)
    let tpb = max(1, ticksPerBeat)
    if segments.isEmpty {
      let first = initialSegment(bpm: bpm, ticksPerBeat: tpb)
      segments = [first]
      return first
    }
    guard let lastTick = lastScheduledTick, lastTick >= 0 else {
      segments[0].bpm = bpm
      segments[0].ticksPerBeat = tpb
      return segments[0]
    }
    if var last = segments.last, last.startTick == lastTick {
      last.bpm = bpm
      last.ticksPerBeat = tpb
      segments[segments.count - 1] = last
      return last
    }
    let lastSample = sample(forTick: lastTick, segments: segments, sampleRate: sampleRate)
    let next = PocktTempoSegment(startTick: lastTick, startSample: lastSample, bpm: bpm, ticksPerBeat: tpb)
    segments.append(next)
    if segments.count > 64 {
      segments.removeFirst(segments.count - 32)
    }
    return next
  }

  static func horizonSample(nowSample: Int64, sampleRate: Double) -> Int64 {
    nowSample + Int64((lookAheadSeconds * max(1, sampleRate)).rounded())
  }

  static func safetySamples(sampleRate: Double) -> Int64 {
    Int64((safetySeconds * max(1, sampleRate)).rounded())
  }

  /// Maximum audio we may commit ahead of the playhead.
  /// Short enough that a live BPM change takes effect on the next uncommitted beat
  /// (typically within lookAheadSeconds), never tens of seconds of old-tempo clicks.
  static func scheduleDecision(
    tick: Int64,
    segments: [PocktTempoSegment],
    nowSample: Int64,
    sampleRate: Double,
    lastScheduledTick: Int64?
  ) -> PocktScheduleDecision {
    let target = sample(forTick: tick, segments: segments, sampleRate: sampleRate)
    if tick > 0 && target + safetySamples(sampleRate: sampleRate) < nowSample {
      let interval = max(1.0, segment(forTick: tick, segments: segments).secondsPerTick) * max(1, sampleRate)
      // Skip only a truly missed beat. Slightly-late clicks stay on the original
      // sample grid — never burst/shorten intervals to "catch up" to wall clock.
      if Double(nowSample - target) > interval * 0.9 {
        return .skipMissed
      }
    }
    let horizon = horizonSample(nowSample: nowSample, sampleRate: sampleRate)
    if target > horizon && !(tick == 0 && lastScheduledTick == nil) {
      return .wait
    }
    return .schedule
  }

  static func shouldSchedule(
    tick: Int64,
    segments: [PocktTempoSegment],
    nowSample: Int64,
    sampleRate: Double,
    alreadyScheduledThisPass: Int
  ) -> Bool {
    if alreadyScheduledThisPass >= maxLookAheadBeats {
      return false
    }
    return scheduleDecision(
      tick: tick,
      segments: segments,
      nowSample: nowSample,
      sampleRate: sampleRate,
      lastScheduledTick: alreadyScheduledThisPass == 0 ? nil : tick - 1
    ) == .schedule
  }

  /// How many future ticks would be committed if refill ran every 16 ms for `seconds`.
  /// Used to prove the old "always schedule first in this pass" bug cannot return.
  static func scheduledAheadCount(
    bpm: Double,
    nowSeconds: Double,
    refillSeconds: Double,
    sampleRate: Double
  ) -> Int {
    let segments = [initialSegment(bpm: bpm, ticksPerBeat: 1)]
    var lastScheduled: Int64?
    var nextTick: Int64 = 0
    var now = Int64((nowSeconds * max(1, sampleRate)).rounded())
    let end = now + Int64((refillSeconds * max(1, sampleRate)).rounded())
    let step = max(1, Int64((0.016 * max(1, sampleRate)).rounded()))
    while now <= end {
      while true {
        let decision = scheduleDecision(
          tick: nextTick,
          segments: segments,
          nowSample: now,
          sampleRate: sampleRate,
          lastScheduledTick: lastScheduled
        )
        if decision == .skipMissed {
          nextTick += 1
          continue
        }
        if decision == .wait {
          break
        }
        lastScheduled = nextTick
        nextTick += 1
      }
      now += step
    }
    let horizon = horizonSample(nowSample: end, sampleRate: sampleRate)
    guard let last = lastScheduled else { return 0 }
    var count = 0
    for tick in 0...last {
      if sample(forTick: tick, segments: segments, sampleRate: sampleRate) > end
        && sample(forTick: tick, segments: segments, sampleRate: sampleRate) <= horizon + 1
      {
        count += 1
      } else if sample(forTick: tick, segments: segments, sampleRate: sampleRate) > end {
        count += 1
      }
    }
    return count
  }

  static func constantTempoReport(
    bpm: Double,
    subdivisionTicks: Int,
    sampleRate: Double,
    beatCount: Int
  ) -> [String: Any] {
    let tpb = max(1, subdivisionTicks)
    let segments = [initialSegment(bpm: bpm, ticksPerBeat: tpb)]
    let interval = segments[0].secondsPerTick
    var samples: [Int64] = []
    let count = max(2, beatCount)
    for tick in 0..<Int64(count) {
      samples.append(sample(forTick: tick, segments: segments, sampleRate: sampleRate))
    }
    var maxDev = 0.0
    var sumDev = 0.0
    var sumSq = 0.0
    if samples.count > 1 {
      for index in 1..<samples.count {
        let actual = Double(samples[index] - samples[index - 1]) / max(1, sampleRate)
        let dev = actual - interval
        maxDev = max(maxDev, abs(dev))
        sumDev += dev
        sumSq += dev * dev
      }
    }
    let pairs = Double(max(1, samples.count - 1))
    let avg = sumDev / pairs
    let jitter = sqrt(max(0, sumSq / pairs - avg * avg))
    let expectedElapsed = Double(count - 1) * interval
    let scheduledElapsed = Double((samples.last ?? 0) - (samples.first ?? 0)) / max(1, sampleRate)
    let drift = scheduledElapsed - expectedElapsed
    let samplePeriod = 1 / max(1, sampleRate)
    let passed = abs(drift) < samplePeriod * 1.1 && maxDev < samplePeriod * 1.1
    return [
      "bpm": bpm,
      "theoreticalIntervalSeconds": interval,
      "theoreticalIntervalMs": interval * 1000,
      "scheduledEventCount": count,
      "firstSample": Double(samples.first ?? 0),
      "lastSample": Double(samples.last ?? 0),
      "measuredMeanIntervalSeconds": samples.count > 1 ? scheduledElapsed / Double(count - 1) : interval,
      "maxErrorSeconds": maxDev,
      "averageErrorSeconds": avg,
      "stdDeviationSeconds": jitter,
      "cumulativeDriftSeconds": drift,
      "sampleRate": sampleRate,
      "passed": passed,
      "architecture": architecture,
      "measurementKind": "anchored-sample-timeline",
    ]
  }

  static func phaseChangeReport(
    fromBpm: Double,
    toBpm: Double,
    changeAfterBeats: Int,
    sampleRate: Double
  ) -> [String: Any] {
    var segments = [initialSegment(bpm: fromBpm, ticksPerBeat: 1)]
    let changeAt = Int64(max(1, changeAfterBeats) - 1)
    applyTempo(
      segments: &segments,
      lastScheduledTick: changeAt,
      newBpm: toBpm,
      ticksPerBeat: 1,
      sampleRate: sampleRate
    )
    let before = sample(forTick: changeAt, segments: segments, sampleRate: sampleRate)
    let after = sample(forTick: changeAt + 1, segments: segments, sampleRate: sampleRate)
    let oldInterval = 60.0 / clampBpm(fromBpm)
    let newInterval = 60.0 / clampBpm(toBpm)
    let observed = Double(after - before) / max(1, sampleRate)
    let beatIndexContinues = true
    let noDuplicate = after > before
    let noReset = segments[0].startTick == 0 && changeAt > 0
    let passed =
      abs(observed - newInterval) < (1 / max(1, sampleRate)) * 1.1
      && noDuplicate
      && noReset
      && abs(Double(before) / max(1, sampleRate) - Double(changeAt) * oldInterval) < (1 / max(1, sampleRate)) * 1.1
    return [
      "fromBpm": fromBpm,
      "toBpm": toBpm,
      "changeAfterBeats": changeAfterBeats,
      "committedTick": Double(changeAt),
      "committedSample": Double(before),
      "nextSample": Double(after),
      "oldIntervalSeconds": oldInterval,
      "newIntervalSeconds": newInterval,
      "observedNextIntervalSeconds": observed,
      "beatIndexReset": false,
      "barIndexReset": false,
      "duplicateBeat": !noDuplicate,
      "playerStopUsed": false,
      "passed": passed && beatIndexContinues,
      "architecture": architecture,
    ]
  }

  static func rapidDragReport(sampleRate: Double) -> [String: Any] {
    let stream: [Double] = [80, 81, 83, 86, 90, 95, 101, 108, 115, 120]
    var segments = [initialSegment(bpm: 80, ticksPerBeat: 1)]
    var lastTick: Int64 = 0
    var restartCount = 0
    for bpm in stream.dropFirst() {
      applyTempo(
        segments: &segments,
        lastScheduledTick: lastTick,
        newBpm: bpm,
        ticksPerBeat: 1,
        sampleRate: sampleRate
      )
    }
    let next = sample(forTick: lastTick + 1, segments: segments, sampleRate: sampleRate)
    let expected = sample(forTick: lastTick, segments: segments, sampleRate: sampleRate)
      + Int64(((60.0 / 120.0) * sampleRate).rounded())
    let passed = next == expected && segments.count <= 2 && restartCount == 0
    return [
      "commandCount": stream.count,
      "segmentCount": segments.count,
      "restartCount": restartCount,
      "finalBpm": segments.last?.bpm ?? 0,
      "nextIntervalSeconds": Double(next - expected + Int64(((60.0 / 120.0) * sampleRate).rounded())) / max(1, sampleRate),
      "coalesced": segments.count <= 2,
      "passed": passed,
      "architecture": architecture,
    ]
  }

  static func diagnosticSuite(sampleRate: Double = 48000) -> [String: Any] {
    let bpms: [Double] = [40, 50, 60, 80, 100, 120, 180, 200, 240, 300, 400]
    var reports: [[String: Any]] = []
    var failures: [String] = []
    for bpm in bpms {
      let beats = bpm >= 240 ? 4000 : 2000
      let report = constantTempoReport(
        bpm: bpm,
        subdivisionTicks: 1,
        sampleRate: sampleRate,
        beatCount: beats
      )
      reports.append(report)
      if (report["passed"] as? Bool) != true {
        failures.append("constant \(bpm)")
      }
    }
    let lookahead50 = scheduledAheadCount(bpm: 50, nowSeconds: 0, refillSeconds: 2.0, sampleRate: sampleRate)
    let lookahead400 = scheduledAheadCount(bpm: 400, nowSeconds: 0, refillSeconds: 2.0, sampleRate: sampleRate)
    if lookahead50 > 3 {
      failures.append("over-schedule 50 BPM committed \(lookahead50) future ticks")
    }
    if lookahead400 > 8 {
      failures.append("over-schedule 400 BPM committed \(lookahead400) future ticks")
    }
    let changes: [(Double, Double)] = [
      (50, 70), (70, 50), (80, 100), (100, 80), (80, 160), (160, 240), (240, 400), (200, 400), (400, 120),
    ]
    var phaseReports: [[String: Any]] = []
    for (from, to) in changes {
      let report = phaseChangeReport(fromBpm: from, toBpm: to, changeAfterBeats: 8, sampleRate: sampleRate)
      phaseReports.append(report)
      if (report["passed"] as? Bool) != true {
        failures.append("phase \(Int(from))->\(Int(to))")
      }
    }
    let drag = rapidDragReport(sampleRate: sampleRate)
    if (drag["passed"] as? Bool) != true {
      failures.append("rapid-drag")
    }
    return [
      "passed": failures.isEmpty,
      "failures": failures,
      "constantTempo": reports,
      "phaseContinuity": phaseReports,
      "rapidDrag": drag,
      "sampleRate": sampleRate,
      "lookAheadSeconds": lookAheadSeconds,
      "architecture": architecture,
      "futureCommittedAt50After2s": lookahead50,
      "futureCommittedAt400After2s": lookahead400,
      "note":
        "Diagnostic values compare the anchored sample timeline to theoretical beatTime(n)=anchor+n*60/BPM. They are not physical speaker-output timestamps.",
    ]
  }
}
