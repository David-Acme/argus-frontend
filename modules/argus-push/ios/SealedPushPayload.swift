import Foundation

struct SealedPushPayload {
  let prefix: Data
  let deliveryId: String
  let enc: Data
  let ciphertext: Data

  private static let deliveryIdBytes = 16
  private static let maxCollapseIdBytes = 64
  private static let maxTokenBytes = 512
  private static let providerApnsVoip = 3
  private static let kindCall = 2

  static func parse(dictionary: [AnyHashable: Any]) -> SealedPushPayload? {
    guard
      let prefixText = dictionary["prefix"] as? String,
      let encText = dictionary["enc"] as? String,
      let ciphertextText = dictionary["ct"] as? String,
      let prefix = Data(base64Encoded: prefixText),
      let enc = Data(base64Encoded: encText),
      let ciphertext = Data(base64Encoded: ciphertextText)
    else { return nil }
    guard enc.count == 32, (16...2048).contains(ciphertext.count) else { return nil }
    guard let delivery = parsePrefix(prefix) else { return nil }
    return SealedPushPayload(prefix: prefix, deliveryId: delivery, enc: enc, ciphertext: ciphertext)
  }

  private static func parsePrefix(_ bytes: Data) -> String? {
    var offset = 0
    guard let deliveryId = take(bytes, &offset, deliveryIdBytes) else { return nil }
    guard let providerByte = takeByte(bytes, &offset), providerByte == providerApnsVoip else { return nil }
    guard let kindByte = takeByte(bytes, &offset), kindByte == kindCall else { return nil }
    guard let priority = takeByte(bytes, &offset), priority == 0 || priority == 1 else { return nil }
    guard take(bytes, &offset, 4) != nil else { return nil }
    guard let collapseLength = takeByte(bytes, &offset), collapseLength <= maxCollapseIdBytes else { return nil }
    guard take(bytes, &offset, Int(collapseLength)) != nil else { return nil }
    guard let tokenLength = takeU16(bytes, &offset), tokenLength >= 1, tokenLength <= maxTokenBytes else {
      return nil
    }
    guard take(bytes, &offset, Int(tokenLength)) != nil else { return nil }
    guard offset == bytes.count else { return nil }
    return deliveryId.map { String(format: "%02x", $0) }.joined()
  }

  private static func take(_ bytes: Data, _ offset: inout Int, _ count: Int) -> Data? {
    guard count >= 0, offset + count <= bytes.count else { return nil }
    let start = bytes.index(bytes.startIndex, offsetBy: offset)
    let end = bytes.index(start, offsetBy: count)
    offset += count
    return bytes[start..<end]
  }

  private static func takeByte(_ bytes: Data, _ offset: inout Int) -> UInt8? {
    guard let raw = take(bytes, &offset, 1) else { return nil }
    return raw.first
  }

  private static func takeU16(_ bytes: Data, _ offset: inout Int) -> UInt16? {
    guard let raw = take(bytes, &offset, 2), raw.count == 2 else { return nil }
    let low = UInt16(raw[raw.startIndex])
    let high = UInt16(raw[raw.index(after: raw.startIndex)])
    return low | (high << 8)
  }
}
