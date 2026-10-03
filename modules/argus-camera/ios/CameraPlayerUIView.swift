import AVFoundation
import UIKit

final class CameraPlayerUIView: UIView {
  override class var layerClass: AnyClass { AVSampleBufferDisplayLayer.self }

  private var displayLayer: AVSampleBufferDisplayLayer {
    layer as! AVSampleBufferDisplayLayer
  }

  private let parser = Fmp4Parser()
  private let queue = DispatchQueue(label: "argus.camera.player")
  private let lock = NSLock()
  private var pendingBytes = 0
  private var dropUntilKeyframe = true
  private var active = true

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .black
    displayLayer.videoGravity = .resizeAspect
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    backgroundColor = .black
    displayLayer.videoGravity = .resizeAspect
  }

  func setActive(_ value: Bool) {
    queue.async {
      self.active = value
      if !value {
        self.displayLayer.flush()
      }
    }
  }

  func reset() {
    queue.async {
      self.parser.reset()
      self.dropUntilKeyframe = true
      self.addPending(-self.pending())
      self.displayLayer.flush()
    }
  }

  func push(type: Int, keyframe: Bool, data: Data) {
    addPending(data.count)
    queue.async {
      guard self.active else { return }
      if self.displayLayer.status == .failed {
        self.displayLayer.flush()
      }
      if type == 1 {
        self.parser.reset()
        _ = self.parser.consumeInit(data)
        self.dropUntilKeyframe = false
      } else if self.dropUntilKeyframe && !keyframe {
        self.addPending(-data.count)
        return
      }
      self.parser.parseFragment(data) { buffer in
        self.addPending(-CMSampleBufferGetTotalSampleSize(buffer))
        if self.displayLayer.isReadyForMoreMediaData {
          self.displayLayer.enqueue(buffer)
        } else {
          self.dropUntilKeyframe = true
        }
      }
    }
  }

  func buffered() -> Int {
    lock.lock()
    defer { lock.unlock() }
    return pendingBytes
  }

  private func addPending(_ delta: Int) {
    lock.lock()
    pendingBytes = max(0, pendingBytes + delta)
    lock.unlock()
  }
}
