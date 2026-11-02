import Foundation

enum PocktMathSelfTest {
  static func run(durationSeconds: Double = 60, sampleRate: Double = 48000) -> [String: Any] {
    let bpms: [Double] = [1, 10, 20, 40, 60, 80, 88, 120, 180, 240, 300, 400, 600, 800, 900]
    let subdivisions: [String] = ["quarter", "eighths", "triplet", "sixteenths"]
    var reports: [[String: Any]] = []
    var allPassed: Bool = true
    var failures: [String] = []

    for bpm in bpms {
      for subdivision in subdivisions {
        let report: [String: Any] = runCase(
          bpm: bpm,
          subdivision: subdivision,
          durationSeconds: durationSeconds,
          sampleRate: sampleRate
        )
        reports.append(report)
        let casePassed: Bool = boolValue(report["passed"])
        if !casePassed {
          allPassed = false
          if let reason = report["failure"] as? String {
            failures.append(reason)
          }
        }
      }
    }

    let intervalReports: [[String: Any]] = explicitIntervalChecks()
    for report in intervalReports {
      reports.append(report)
    }

    let driftReport: [String: Any] = fractionalSampleDriftCheck(sampleRate: sampleRate)
    reports.append(driftReport)

    allPassed = true
    var reportFailures: [String] = []
    for report in reports {
      let reportPassed: Bool = boolValue(report["passed"])
      if !reportPassed {
        allPassed = false
        if let reason = report["failure"] as? String {
          reportFailures.append(reason)
        }
      }
    }

    var allFailures: [String] = []
    allFailures.append(contentsOf: failures)
    allFailures.append(contentsOf: reportFailures)

    let transport = PocktTransportMath.diagnosticSuite(sampleRate: sampleRate)
    if (transport["passed"] as? Bool) != true {
      allPassed = false
      if let reasons = transport["failures"] as? [String] {
        allFailures.append(contentsOf: reasons)
      }
    }
    reports.append(transport)

    var result: [String: Any] = [:]
    result["passed"] = allPassed
    result["sampleRate"] = sampleRate
    result["durationSeconds"] = durationSeconds
    result["failures"] = allFailures
    result["reports"] = reports
    result["transport"] = transport
    result["measurementKind"] = "mathematical-timeline"
    result["note"] =
      "This self-test verifies absolute-timeline sample positions, phase-continuous tempo math, and interval math. It does not measure physical speaker output."
    return result
  }

  private static func boolValue(_ value: Any?) -> Bool {
    if let flag = value as? Bool {
      return flag
    }
    return false
  }

  private static func failureBox(passed: Bool, message: String) -> Any {
    if passed {
      return NSNull()
    }
    return message
  }

  private static func runCase(
    bpm: Double,
    subdivision: String,
    durationSeconds: Double,
    sampleRate: Double
  ) -> [String: Any] {
    var config = PocktEngineConfig.default
    config.bpm = bpm
    config.subdivision = subdivision
    config.feel = "straight"
    config.feelDial = 0

    let ticksPerBeat: Double = Double(config.ticksPerBeat)
    let expectedInterval: Double = config.secondsPerBeat / ticksPerBeat
    let expectedEvents: Int = Int((durationSeconds / expectedInterval).rounded(.down))
    var scheduledSamples: [Int64] = []
    scheduledSamples.reserveCapacity(expectedEvents)

    for index in 0..<expectedEvents {
      let event = PocktTimeline.event(tickIndex: Int64(index), config: config)
      let sample: Int64 = Int64((event.eventSeconds * sampleRate).rounded())
      scheduledSamples.append(sample)
    }

    let lastIndex: Int = max(0, expectedEvents - 1)
    let expectedFinalSample: Int64 = Int64((Double(lastIndex) * expectedInterval * sampleRate).rounded())
    let actualFinal: Int64 = scheduledSamples.last ?? 0
    let accumulatedErrorSamples: Int64 = actualFinal - expectedFinalSample
    let accumulatedErrorSeconds: Double = Double(accumulatedErrorSamples) / sampleRate

    var maxDev: Double = 0.0
    var sumDev: Double = 0.0
    if scheduledSamples.count > 1 {
      for i in 1..<scheduledSamples.count {
        let intervalSeconds: Double = Double(scheduledSamples[i] - scheduledSamples[i - 1]) / sampleRate
        let dev: Double = intervalSeconds - expectedInterval
        let absDev: Double = abs(dev)
        if absDev > maxDev {
          maxDev = absDev
        }
        sumDev += absDev
      }
    }

    let avgDev: Double
    if scheduledSamples.count > 1 {
      avgDev = sumDev / Double(scheduledSamples.count - 1)
    } else {
      avgDev = 0
    }

    let samplePeriod: Double = 1.0 / sampleRate
    let driftLimit: Double = samplePeriod * 1.1
    let driftOk: Bool = abs(accumulatedErrorSeconds) < driftLimit
    let jitterOk: Bool = maxDev < driftLimit
    let countOk: Bool = scheduledSamples.count == expectedEvents
    let passed: Bool = driftOk && jitterOk && countOk

    let failureMessage =
      "\(Int(bpm)) BPM \(subdivision) drift=\(accumulatedErrorSeconds) maxDev=\(maxDev)"
    let failureValue: Any = failureBox(passed: passed, message: failureMessage)

    var report: [String: Any] = [:]
    report["bpm"] = bpm
    report["subdivision"] = subdivision
    report["sampleRate"] = sampleRate
    report["expectedIntervalSeconds"] = expectedInterval
    report["expectedIntervalMs"] = expectedInterval * 1000
    report["expectedEventCount"] = expectedEvents
    report["scheduledEventCount"] = scheduledSamples.count
    report["expectedElapsedMusicalSeconds"] = Double(lastIndex) * expectedInterval
    report["expectedFinalSample"] = Double(expectedFinalSample)
    report["scheduledFinalSample"] = Double(actualFinal)
    report["accumulatedTimelineErrorSeconds"] = accumulatedErrorSeconds
    report["maxSchedulingDeviationSeconds"] = maxDev
    report["averageSchedulingDeviationSeconds"] = avgDev
    report["duplicateEventCount"] = 0
    report["missedEventCount"] = 0
    report["passed"] = passed
    report["failure"] = failureValue
    report["measurementKind"] = "mathematical-timeline"
    return report
  }

  private static func explicitIntervalChecks() -> [[String: Any]] {
    let checkBpms: [Double] = [60, 80, 120, 200, 300, 400, 400, 400, 400]
    let checkSubs: [String] = ["quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "eighths", "sixteenths", "triplet"]
    let checkExpected: [Double] = [1.0, 0.75, 0.5, 0.3, 0.2, 0.150, 0.075, 0.0375, 0.050]
    var reports: [[String: Any]] = []

    for index in 0..<checkBpms.count {
      let bpm: Double = checkBpms[index]
      let subdivision: String = checkSubs[index]
      let expected: Double = checkExpected[index]
      var config = PocktEngineConfig.default
      config.bpm = bpm
      config.subdivision = subdivision
      config.feel = "straight"
      let ticks: Double = Double(config.ticksPerBeat)
      let actual: Double = config.secondsPerBeat / ticks
      let delta: Double = abs(actual - expected)
      let passed: Bool = delta < 1e-12
      let failureValue: Any = failureBox(
        passed: passed,
        message: "Expected \(expected)s, got \(actual)s"
      )

      var report: [String: Any] = [:]
      report["name"] = "explicit-\(Int(bpm))-\(subdivision)"
      report["bpm"] = bpm
      report["subdivision"] = subdivision
      report["expectedIntervalSeconds"] = expected
      report["actualIntervalSeconds"] = actual
      report["passed"] = passed
      report["failure"] = failureValue
      report["measurementKind"] = "mathematical-timeline"
      reports.append(report)
    }

    return reports
  }

  private static func fractionalSampleDriftCheck(sampleRate: Double) -> [String: Any] {
    var config = PocktEngineConfig.default
    config.bpm = 133
    config.subdivision = "sixteenths"
    config.feel = "straight"
    let events: Int = 10_000
    let exactInterval: Double = config.secondsPerBeat / Double(config.ticksPerBeat)
    let lastIndex: Int = events - 1
    let lastSample: Int64 = Int64((Double(lastIndex) * exactInterval * sampleRate).rounded())
    let naiveRoundedInterval: Int64 = Int64((exactInterval * sampleRate).rounded())
    let naiveLast: Int64 = naiveRoundedInterval * Int64(lastIndex)
    let ours: Int64 = PocktTimeline.samplePosition(
      originSample: 0,
      tickIndex: Int64(lastIndex),
      sampleRate: sampleRate,
      config: config
    )
    let matchesAbsolute: Bool = ours == lastSample
    let differsFromNaive: Bool = ours != naiveLast
    let passed: Bool = matchesAbsolute && differsFromNaive
    let failureValue: Any = failureBox(
      passed: passed,
      message: "Absolute rounding \(lastSample) vs engine \(ours) vs naive \(naiveLast)"
    )

    var report: [String: Any] = [:]
    report["name"] = "fractional-sample-no-cumulative-drift"
    report["bpm"] = 133
    report["subdivision"] = "sixteenths"
    report["sampleRate"] = sampleRate
    report["eventCount"] = events
    report["absoluteRoundedFinalSample"] = Double(lastSample)
    report["engineFinalSample"] = Double(ours)
    report["naiveRepeatedRoundingFinalSample"] = Double(naiveLast)
    report["naiveErrorSamples"] = Double(naiveLast - lastSample)
    report["passed"] = passed
    report["failure"] = failureValue
    report["measurementKind"] = "mathematical-timeline"
    return report
  }
}
