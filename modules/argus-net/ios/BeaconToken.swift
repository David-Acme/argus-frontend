import CryptoKit
import Foundation

enum BeaconToken {
  static let tokenBytes = 16

  static func seedBytes(_ seed: String) -> Data? {
    guard let data = Data(base64Encoded: seed.trimmingCharacters(in: .whitespaces)), data.count >= tokenBytes else {
      return nil
    }
    return data
  }

  static func counter(nowSeconds: Int64, rotateSeconds: Int64) -> Int64 {
    let period = max(rotateSeconds, 1)
    let quotient = nowSeconds / period
    return nowSeconds % period < 0 ? quotient - 1 : quotient
  }

  static func uuid(seed: Data, counter: Int64) -> UUID {
    var message = UInt64(bitPattern: counter).bigEndian
    let payload = withUnsafeBytes(of: &message) { Data($0) }
    let digest = Array(HMAC<SHA256>.authenticationCode(for: payload, using: SymmetricKey(data: seed)))
    let bytes = Array(digest.prefix(tokenBytes))
    return UUID(uuid: (
      bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
      bytes[8], bytes[9], bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]
    ))
  }

  static func secondsToNextRotation(now: TimeInterval, rotateSeconds: Int64) -> TimeInterval {
    let period = TimeInterval(max(rotateSeconds, 1))
    return period - now.truncatingRemainder(dividingBy: period)
  }
}
