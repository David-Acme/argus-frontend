import Foundation

final class PushStore {
  private static let suite = "argus.push.state"
  private static let tokenKey = "token"
  private static let declinesKey = "declines"
  private static let seenKey = "seen"
  private static let fullScreenKey = "fullScreenExplained"
  private static let windowSeconds: Int64 = 24 * 60 * 60

  private let defaults: UserDefaults
  private let lock = NSLock()

  init(defaults: UserDefaults? = nil) {
    self.defaults = defaults ?? UserDefaults(suiteName: PushStore.suite) ?? .standard
  }

  func storedToken() -> String {
    lock.lock()
    defer { lock.unlock() }
    return defaults.string(forKey: PushStore.tokenKey) ?? ""
  }

  func saveToken(_ token: String) {
    lock.lock()
    defaults.set(token, forKey: PushStore.tokenKey)
    lock.unlock()
  }

  func clearToken() {
    lock.lock()
    defaults.removeObject(forKey: PushStore.tokenKey)
    lock.unlock()
  }

  func fullScreenExplained() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    return defaults.bool(forKey: PushStore.fullScreenKey)
  }

  func setFullScreenExplained(_ value: Bool) {
    lock.lock()
    defaults.set(value, forKey: PushStore.fullScreenKey)
    lock.unlock()
  }

  func addDecline(_ callId: String) {
    lock.lock()
    var declines = self.declines()
    if !declines.contains(callId) {
      declines.append(callId)
    }
    defaults.set(declines, forKey: PushStore.declinesKey)
    lock.unlock()
  }

  func removeDecline(_ callId: String) {
    lock.lock()
    let declines = self.declines().filter { $0 != callId }
    defaults.set(declines, forKey: PushStore.declinesKey)
    lock.unlock()
  }

  func takeDeclines() -> [String] {
    lock.lock()
    let declines = self.declines()
    defaults.removeObject(forKey: PushStore.declinesKey)
    lock.unlock()
    return declines
  }

  func isSeen(_ key: String, now: Int64) -> Bool {
    lock.lock()
    defer { lock.unlock() }
    let seen = self.seen()
    guard let at = seen[key] else { return false }
    return now - at < PushStore.windowSeconds
  }

  func remember(_ key: String, now: Int64) {
    lock.lock()
    var seen = self.seen().filter { now - $0.value < PushStore.windowSeconds }
    seen[key] = now
    defaults.set(seen, forKey: PushStore.seenKey)
    lock.unlock()
  }

  private func declines() -> [String] {
    defaults.stringArray(forKey: PushStore.declinesKey) ?? []
  }

  private func seen() -> [String: Int64] {
    let raw = defaults.dictionary(forKey: PushStore.seenKey) ?? [:]
    var seen: [String: Int64] = [:]
    for (key, value) in raw {
      if let number = value as? NSNumber {
        seen[key] = number.int64Value
      }
    }
    return seen
  }
}
