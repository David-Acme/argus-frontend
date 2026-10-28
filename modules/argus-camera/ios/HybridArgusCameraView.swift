import AVFoundation
import NitroModules
import UIKit

public final class HybridArgusCameraView: HybridArgusCameraViewSpec {
  public var view: CameraPlayerUIView = CameraPlayerUIView(frame: .zero)

  public var active: Bool = true {
    didSet { view.setActive(active) }
  }

  public var muted: Bool = true {
    didSet {
      let value = muted
      DispatchQueue.main.async { self.session?.player.isMuted = value }
    }
  }

  public var onMediaState: ((_ state: String) -> Void)?

  public var onFirstFrame: (() -> Void)?

  private var session: ArgusMediaSession?
  private var readyObserver: NSKeyValueObservation?

  public var onAudioFailed: ((_ stopped: Bool) -> Void)?

  public var fill: Bool = false {
    didSet { view.setFill(fill) }
  }

  public func resetStream() throws {
    view.reset()
    DispatchQueue.main.async { self.closeOwned() }
  }

  public func loadMedia(data: ArrayBuffer, key: String) throws {
    let bytes = data.toData(copyIfNeeded: true)
    DispatchQueue.main.async { self.openMedia(bytes, key: key) }
  }

  private func openMedia(_ bytes: Data, key: String) {
    ArgusMediaSession.open[key]?.close()
    closeOwned()
    let file = FileManager.default.temporaryDirectory
      .appendingPathComponent("argus-media-\(UUID().uuidString).mp4")
    guard (try? bytes.write(to: file)) != nil else {
      onMediaState?("error")
      return
    }
    let opened = ArgusMediaSession(key: key, file: file)
    ArgusMediaSession.open[key] = opened
    attach(opened)
    if active { opened.player.play() }
  }

  private func attach(_ opened: ArgusMediaSession) {
    session = opened
    opened.owner = self
    opened.player.isMuted = muted
    view.mediaLayer.player = opened.player
    readyObserver = view.mediaLayer.observe(\.isReadyForDisplay) { [weak self] layer, _ in
      guard layer.isReadyForDisplay else { return }
      DispatchQueue.main.async { self?.onFirstFrame?() }
    }
    opened.report()
  }

  private func yieldSession() {
    readyObserver = nil
    view.mediaLayer.player = nil
    session = nil
  }

  private func closeOwned() {
    guard let owned = session else { return }
    yieldSession()
    owned.close()
  }

  public func adoptMedia(key: String) throws -> Bool {
    guard ArgusMediaSession.open[key] != nil else { return false }
    DispatchQueue.main.async {
      guard let found = ArgusMediaSession.open[key], found.owner !== self else { return }
      if self.session !== found { self.closeOwned() }
      found.owner?.yieldSession()
      self.attach(found)
    }
    return true
  }

  public func releaseMedia(key: String) throws {
    DispatchQueue.main.async {
      if self.session?.key == key { self.closeOwned() }
    }
  }

  public func play() throws {
    DispatchQueue.main.async {
      guard let current = self.session else { return }
      if current.ended { current.player.seek(to: .zero) }
      current.player.playImmediately(atRate: current.rate)
    }
  }

  public func pause() throws {
    DispatchQueue.main.async { self.session?.player.pause() }
  }

  public func seekTo(positionMs: Double) throws {
    DispatchQueue.main.async {
      guard let current = self.session else { return }
      current.positionMs = max(0, positionMs)
      current.player.seek(
        to: CMTime(value: CMTimeValue(max(0, positionMs)), timescale: 1000),
        toleranceBefore: .zero, toleranceAfter: .zero)
    }
  }

  public func setRate(rate: Double) throws {
    DispatchQueue.main.async {
      guard let current = self.session else { return }
      current.rate = Float(rate)
      if current.player.timeControlStatus == .playing { current.player.rate = Float(rate) }
    }
  }

  public func mediaPositionMs() throws -> Double {
    session?.positionMs ?? 0
  }

  public func mediaDurationMs() throws -> Double {
    session?.durationMs ?? 0
  }

  public func mediaBufferedMs() throws -> Double {
    session?.bufferedMs ?? 0
  }

  public func pushFragment(
    type: Double,
    keyframe: Bool,
    data: ArrayBuffer
  ) throws {
    view.push(
      type: Int(type),
      keyframe: keyframe,
      data: data.toData(copyIfNeeded: true))
  }

  public func bufferedBytes() throws -> Double {
    Double(view.buffered())
  }
}
