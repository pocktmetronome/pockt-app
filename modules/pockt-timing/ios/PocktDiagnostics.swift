import Foundation

struct PocktDiagnosticEvent {
  var generation: UInt64
  var eventIndex: Int64
  var beatIndex: Int
  var subdivisionIndex: Int
  var bpm: Double
  var targetSeconds: Double
  var targetSample: Int64
  var scheduledSample: Int64
  var intervalSeconds: Double
  var accent: Bool
  var feelOffsetMs: Double
  var hapticSeconds: Double?
  var lookAheadSeconds: Double
}

final class PocktDiagnostics {
  private let lock = NSLock()
  private var events: [PocktDiagnosticEvent] = []
  private let maxEvents = 8000
  private(set) var duplicates = 0
  private(set) var missed = 0
  private var lastIndex: Int64?

  func reset() {
    lock.lock()
    events.removeAll(keepingCapacity: true)
    duplicates = 0
    missed = 0
    lastIndex = nil
    lock.unlock()
  }

  func record(_ event: PocktDiagnosticEvent) {
    lock.lock()
    if let last = lastIndex {
      if event.eventIndex == last {
        duplicates += 1
      } else if event.eventIndex > last + 1 {
        missed += Int(event.eventIndex - last - 1)
      }
    }
    lastIndex = event.eventIndex
    events.append(event)
    if events.count > maxEvents {
      events.removeFirst(events.count - maxEvents)
    }
    lock.unlock()
  }

  func snapshot(
    bpm: Double,
    subdivision: String,
    sampleRate: Double,
    originSample: Int64,
    currentSample: Int64?,
    generation: UInt64
  ) -> [String: Any] {
    lock.lock()
    let copy: [PocktDiagnosticEvent] = events
    let dup: Int = duplicates
    let miss: Int = missed
    lock.unlock()

    if copy.isEmpty {
      var empty: [String: Any] = [:]
      empty["generation"] = Double(generation)
      empty["bpm"] = bpm
      empty["subdivision"] = subdivision
      empty["sampleRate"] = sampleRate
      empty["scheduledEventCount"] = 0
      empty["duplicateEventCount"] = dup
      empty["missedEventCount"] = miss
      empty["note"] =
        "No scheduled events recorded yet. Values are native scheduling diagnostics, not acoustic speaker measurements."
      return empty
    }

    var intervals: [Double] = []
    var targetIntervals: [Double] = []
    if copy.count > 1 {
      for index in 1..<copy.count {
        let next = copy[index]
        let prev = copy[index - 1]
        let scheduledDelta: Double = Double(next.scheduledSample - prev.scheduledSample) / sampleRate
        let targetDelta: Double = next.targetSeconds - prev.targetSeconds
        intervals.append(scheduledDelta)
        targetIntervals.append(targetDelta)
      }
    }

    let first = copy[0]
    let last = copy[copy.count - 1]
    let expectedElapsed: Double = last.targetSeconds - first.targetSeconds
    let scheduledElapsed: Double = Double(last.scheduledSample - first.scheduledSample) / sampleRate
    let accumulatedError: Double = scheduledElapsed - expectedElapsed

    var maxDev: Double = 0.0
    var sumDev: Double = 0.0
    var sumSq: Double = 0.0
    let pairCount: Int = min(intervals.count, targetIntervals.count)
    if pairCount > 0 {
      for index in 0..<pairCount {
        let actual: Double = intervals[index]
        let expected: Double = targetIntervals[index]
        let dev: Double = actual - expected
        let absDev: Double = abs(dev)
        if absDev > maxDev {
          maxDev = absDev
        }
        sumDev += dev
        sumSq += dev * dev
      }
    }

    let count: Double = Double(max(1, pairCount))
    let avgDev: Double = sumDev / count
    let variance: Double = max(0, sumSq / count - avgDev * avgDev)
    let jitter: Double = sqrt(variance)
    let expectedFinalSample: Int64 = last.targetSample
    let lookAhead: Double = last.lookAheadSeconds

    let observedNativeSample: Any
    if let currentSample {
      observedNativeSample = Double(currentSample)
    } else {
      observedNativeSample = NSNull()
    }

    var recentEvents: [[String: Any]] = []
    let startIndex: Int = max(0, copy.count - 24)
    for index in startIndex..<copy.count {
      recentEvents.append(eventPayload(copy[index]))
    }

    var result: [String: Any] = [:]
    result["generation"] = Double(generation)
    result["bpm"] = bpm
    result["subdivision"] = subdivision
    result["sampleRate"] = sampleRate
    result["originSample"] = Double(originSample)
    result["observedNativeSample"] = observedNativeSample
    result["scheduledEventCount"] = copy.count
    result["firstEventIndex"] = Double(first.eventIndex)
    result["lastEventIndex"] = Double(last.eventIndex)
    result["expectedElapsedMusicalSeconds"] = expectedElapsed
    result["scheduledElapsedSeconds"] = scheduledElapsed
    result["expectedFinalSample"] = Double(expectedFinalSample)
    result["scheduledFinalSample"] = Double(last.scheduledSample)
    result["accumulatedTimelineErrorSeconds"] = accumulatedError
    result["maxSchedulingDeviationSeconds"] = maxDev
    result["averageSchedulingDeviationSeconds"] = avgDev
    result["intervalJitterStdDevSeconds"] = jitter
    result["duplicateEventCount"] = dup
    result["missedEventCount"] = miss
    result["lookAheadSeconds"] = lookAhead
    result["measurementKind"] = "native-scheduling"
    result["note"] =
      "These values compare mathematical targets to native AVAudioPlayerNode sample schedules. They are not physical speaker-output timestamps."
    result["events"] = recentEvents
    return result
  }

  private func eventPayload(_ item: PocktDiagnosticEvent) -> [String: Any] {
    let hapticValue: Any
    if let haptic = item.hapticSeconds {
      hapticValue = haptic
    } else {
      hapticValue = NSNull()
    }

    var payload: [String: Any] = [:]
    payload["generation"] = Double(item.generation)
    payload["eventIndex"] = Double(item.eventIndex)
    payload["beatIndex"] = item.beatIndex
    payload["subdivisionIndex"] = item.subdivisionIndex
    payload["bpm"] = item.bpm
    payload["targetSeconds"] = item.targetSeconds
    payload["targetSample"] = Double(item.targetSample)
    payload["scheduledSample"] = Double(item.scheduledSample)
    payload["intervalSeconds"] = item.intervalSeconds
    payload["accent"] = item.accent
    payload["feelOffsetMs"] = item.feelOffsetMs
    payload["hapticSeconds"] = hapticValue
    payload["lookAheadSeconds"] = item.lookAheadSeconds
    return payload
  }
}
