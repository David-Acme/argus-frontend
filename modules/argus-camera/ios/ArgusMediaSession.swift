import AVFoundation
import UIKit

final class ArgusMediaSession {
  static var open: [String: ArgusMediaSession] = [:]

  let key: String
  let player: AVPlayer
  let file: URL
  weak var owner: HybridArgusCameraView?
  var positionMs: Double = 0
  var rate: Float = 1
  private var observers: [NSKeyValueObservation] = []
  private var timeObserver: Any?
  private var endObserver: NSObjectProtocol?

  init(key: String, file: URL) {
    self.key = key
    self.file = file
    self.player = AVPlayer(url: file)
    timeObserver = player.addPeriodicTimeObserver(
      forInterval: CMTime(value: 1, timescale: 5), queue: .main
    ) { [weak self] time in
      self?.positionMs = max(0, CMTimeGetSeconds(time) * 1000)
    }
    observers.append(
      player.observe(\.timeControlStatus) { [weak self] _, _ in
        DispatchQueue.main.async { self?.report() }
      })
    if let item = player.currentItem {
      observers.append(
        item.observe(\.status) { [weak self] _, _ in
          DispatchQueue.main.async { self?.report() }
        })
      endObserver = NotificationCenter.default.addObserver(
        forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main
      ) { [weak self] _ in
        self?.report()
      }
    }
  }

  var durationMs: Double {
    guard let item = player.currentItem else { return 0 }
    let seconds = CMTimeGetSeconds(item.duration)
    return seconds.isFinite ? seconds * 1000 : 0
  }

  var bufferedMs: Double {
    guard let range = player.currentItem?.loadedTimeRanges.last?.timeRangeValue else { return 0 }
    let seconds = CMTimeGetSeconds(CMTimeRangeGetEnd(range))
    return seconds.isFinite ? seconds * 1000 : 0
  }

  var ended: Bool {
    durationMs > 0 && positionMs >= durationMs - 50
  }

  var state: String {
    if player.currentItem?.status == .failed { return "error" }
    if player.timeControlStatus == .playing { return "playing" }
    if ended { return "ended" }
    if player.currentItem?.status != .readyToPlay { return "loading" }
    if player.timeControlStatus == .waitingToPlayAtSpecifiedRate { return "loading" }
    return "ready"
  }

  func report() {
    UIApplication.shared.isIdleTimerDisabled = player.timeControlStatus == .playing
    owner?.onMediaState?(state)
  }

  func close() {
    observers.removeAll()
    if let timeObserver { player.removeTimeObserver(timeObserver) }
    if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
    player.pause()
    UIApplication.shared.isIdleTimerDisabled = false
    try? FileManager.default.removeItem(at: file)
    if ArgusMediaSession.open[key] === self { ArgusMediaSession.open[key] = nil }
    owner = nil
  }
}
