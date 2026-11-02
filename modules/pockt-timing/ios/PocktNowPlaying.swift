import Foundation
import MediaPlayer
import UIKit

/// Lock Screen / Control Center / Dynamic Island transport for the native metronome.
/// Uses MPNowPlayingInfoCenter + MPRemoteCommandCenter. Not a Home Screen widget
/// and not a Live Activity — those cannot drive the audio engine.
final class PocktNowPlaying {
  static let shared = PocktNowPlaying()

  var onPlay: (() -> Bool)?
  var onPause: (() -> Void)?

  private var armed = false
  private var playing = false

  private init() {}

  func configure() {
    if armed { return }
    armed = true
    let center = MPRemoteCommandCenter.shared()
    center.playCommand.isEnabled = true
    center.pauseCommand.isEnabled = true
    center.stopCommand.isEnabled = true
    center.togglePlayPauseCommand.isEnabled = true
    center.nextTrackCommand.isEnabled = false
    center.previousTrackCommand.isEnabled = false
    center.changePlaybackPositionCommand.isEnabled = false
    center.playCommand.addTarget { [weak self] _ in
      self?.runPlay() ?? .commandFailed
    }
    center.pauseCommand.addTarget { [weak self] _ in
      self?.runPause()
      return .success
    }
    center.stopCommand.addTarget { [weak self] _ in
      self?.runPause()
      return .success
    }
    center.togglePlayPauseCommand.addTarget { [weak self] _ in
      guard let self else { return .commandFailed }
      if self.playing {
        self.runPause()
        return .success
      }
      return self.runPlay()
    }
    DispatchQueue.main.async {
      UIApplication.shared.beginReceivingRemoteControlEvents()
    }
  }

  func publish(playing: Bool, bpm: Double, soundLabel: String) {
    configure()
    self.playing = playing
    var info: [String: Any] = [:]
    info[MPMediaItemPropertyTitle] = "POCKT"
    info[MPMediaItemPropertyArtist] = "\(Int(bpm.rounded())) BPM · \(soundLabel)"
    info[MPNowPlayingInfoPropertyPlaybackRate] = playing ? 1.0 : 0.0
    info[MPNowPlayingInfoPropertyIsLiveStream] = true
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    MPNowPlayingInfoCenter.default().playbackState = playing ? .playing : .paused
  }

  func clear() {
    playing = false
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    MPNowPlayingInfoCenter.default().playbackState = .stopped
  }

  private func runPlay() -> MPRemoteCommandHandlerStatus {
    var ok = false
    let work = {
      ok = self.onPlay?() ?? false
    }
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.sync(execute: work)
    }
    return ok ? .success : .commandFailed
  }

  private func runPause() {
    let work = {
      self.onPause?()
    }
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.sync(execute: work)
    }
  }
}
