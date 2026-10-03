import Foundation
import QuartzCore

final class PlayoutClock {
  private let lock = NSLock()
  private var generation: UInt64 = 0
  private var sampleRate: Double = 16000
  private var writtenFrames: Int64 = 0
  private var completedFrames: Int64 = 0
  private var pendingFrames: [Int64] = []
  private var headStartedAt: CFTimeInterval = 0

  func reset(sampleRate rate: Double) {
    lock.lock()
    defer { lock.unlock() }
    generation &+= 1
    sampleRate = rate
    writtenFrames = 0
    completedFrames = 0
    pendingFrames.removeAll()
  }

  func scheduled(frames: Int64) -> UInt64 {
    lock.lock()
    defer { lock.unlock() }
    writtenFrames += frames
    pendingFrames.append(frames)
    if pendingFrames.count == 1 {
      headStartedAt = CACurrentMediaTime()
    }
    return generation
  }

  func played(frames: Int64, generation scheduledGeneration: UInt64) -> Bool {
    lock.lock()
    defer { lock.unlock() }
    guard scheduledGeneration == generation else { return false }
    completedFrames += frames
    if !pendingFrames.isEmpty {
      pendingFrames.removeFirst()
    }
    headStartedAt = CACurrentMediaTime()
    return pendingFrames.isEmpty
  }

  func flush() {
    lock.lock()
    defer { lock.unlock() }
    generation &+= 1
    completedFrames = writtenFrames
    pendingFrames.removeAll()
  }

  func playedFrames() -> Double {
    lock.lock()
    defer { lock.unlock() }
    var head: Double = 0
    if let current = pendingFrames.first {
      let elapsed = max(0, CACurrentMediaTime() - headStartedAt) * sampleRate
      head = min(Double(current), elapsed)
    }
    return min(Double(writtenFrames), Double(completedFrames) + head)
  }
}
