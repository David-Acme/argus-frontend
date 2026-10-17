import CryptoKit
import Foundation
import Security

struct PushKeyPair {
  let publicKey: String
  let keyId: String
}

enum PushKeyError: Error {
  case unavailable(String)
  case unreadable
}

final class PushKeys {
  private static let service = "argus.push.keys"
  private static let account = "hpke-x25519"
  private static let keyIdBytes = 16

  private let lock = NSLock()

  func keys() throws -> PushKeyPair {
    lock.lock()
    defer { lock.unlock() }
    let privateKey = try handle()
    let raw = privateKey.publicKey.rawRepresentation
    let digest = Data(SHA256.hash(data: raw))
    return PushKeyPair(
      publicKey: PushKeys.base64Url(raw),
      keyId: PushKeys.base64Url(digest.prefix(PushKeys.keyIdBytes)))
  }

  func privateKey() throws -> Curve25519.KeyAgreement.PrivateKey {
    lock.lock()
    defer { lock.unlock() }
    return try handle()
  }

  func delete() {
    lock.lock()
    SecItemDelete(PushKeys.query() as CFDictionary)
    lock.unlock()
  }

  private func handle() throws -> Curve25519.KeyAgreement.PrivateKey {
    if let stored = load() {
      return stored
    }
    let created = Curve25519.KeyAgreement.PrivateKey()
    try store(created.rawRepresentation)
    return created
  }

  private func load() -> Curve25519.KeyAgreement.PrivateKey? {
    var query = PushKeys.query()
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne
    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    guard status == errSecSuccess, let data = item as? Data else { return nil }
    guard let key = try? Curve25519.KeyAgreement.PrivateKey(rawRepresentation: data) else {
      SecItemDelete(PushKeys.query() as CFDictionary)
      return nil
    }
    return key
  }

  private func store(_ raw: Data) throws {
    var attributes = PushKeys.query()
    attributes[kSecValueData as String] = raw
    attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    let status = SecItemAdd(attributes as CFDictionary, nil)
    guard status == errSecSuccess else {
      throw PushKeyError.unavailable("PUSH_KEY_UNAVAILABLE|the keychain refused the key with status \(status)")
    }
  }

  private static func query() -> [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
  }

  private static func base64Url(_ data: Data) -> String {
    data.base64EncodedString()
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: "=", with: "")
  }
}
