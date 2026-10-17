import CryptoKit
import Foundation

struct SealedPushOpenInput {
  let payload: SealedPushPayload
  let privateKey: Curve25519.KeyAgreement.PrivateKey
  let keyId: String
}

struct SealedPushInfo {
  static let label = "argus.push.v1"

  static func build(keyId: String, prefix: Data) -> Data {
    var out = Data(SealedPushInfo.label.utf8)
    out.append(0)
    out.append(Data(keyId.utf8))
    out.append(0)
    out.append(prefix)
    return out
  }
}

final class SealedPushOpener {
  private static let hpkeVersion = Data("HPKE-v1".utf8)
  private static let kemSuiteId = Data([0x4B, 0x45, 0x4D, 0x00, 0x20])
  private static let hpkeSuiteId = Data([0x48, 0x50, 0x4B, 0x45, 0x00, 0x20, 0x00, 0x01, 0x00, 0x03])
  private static let hashLength = 32

  func open(_ input: SealedPushOpenInput) -> Data? {
    guard let peer = try? Curve25519.KeyAgreement.PublicKey(rawRepresentation: input.payload.enc) else {
      return nil
    }
    guard let shared = try? input.privateKey.sharedSecretFromKeyAgreement(with: peer) else { return nil }
    let dh = shared.withUnsafeBytes { Data($0) }
    let info = SealedPushInfo.build(keyId: input.keyId, prefix: input.payload.prefix)

    let eaePrk = SealedPushOpener.labeledExtract(
      salt: Data(), label: "eae_prk", ikm: dh, suiteId: SealedPushOpener.kemSuiteId)
    var kemContext = Data()
    kemContext.append(input.payload.enc)
    kemContext.append(input.privateKey.publicKey.rawRepresentation)
    let sharedSecret = SealedPushOpener.labeledExpand(
      prk: eaePrk, label: "shared_secret", info: kemContext, length: SealedPushOpener.hashLength,
      suiteId: SealedPushOpener.kemSuiteId)

    let pskIdHash = SealedPushOpener.labeledExtract(
      salt: Data(), label: "psk_id_hash", ikm: Data(), suiteId: SealedPushOpener.hpkeSuiteId)
    let infoHash = SealedPushOpener.labeledExtract(
      salt: Data(), label: "info_hash", ikm: info, suiteId: SealedPushOpener.hpkeSuiteId)
    var context = Data([0x00])
    context.append(pskIdHash)
    context.append(infoHash)

    let secret = SealedPushOpener.labeledExtract(
      salt: sharedSecret, label: "secret", ikm: Data(), suiteId: SealedPushOpener.hpkeSuiteId)
    let key = SealedPushOpener.labeledExpand(
      prk: secret, label: "key", info: context, length: SealedPushOpener.hashLength,
      suiteId: SealedPushOpener.hpkeSuiteId)
    let nonce = SealedPushOpener.labeledExpand(
      prk: secret, label: "base_nonce", info: context, length: 12, suiteId: SealedPushOpener.hpkeSuiteId)

    let ciphertext = input.payload.ciphertext
    guard ciphertext.count > 16 else { return nil }
    let sealed = ChaChaPoly.SealedBox(
      nonce: ChaChaPoly.Nonce(data: nonce),
      ciphertext: Data(ciphertext.prefix(ciphertext.count - 16)),
      tag: Data(ciphertext.suffix(16)))
    return try? ChaChaPoly.open(sealed, using: SymmetricKey(data: key))
  }

  private static func extract(salt: Data, ikm: Data) -> Data {
    let key = salt.isEmpty ? Data(repeating: 0, count: hashLength) : salt
    return Data(HMAC<SHA256>.authenticationCode(for: ikm, using: SymmetricKey(data: key)))
  }

  private static func expand(prk: Data, info: Data, length: Int) -> Data {
    let key = SymmetricKey(data: prk)
    let blocks = (length + hashLength - 1) / hashLength
    var output = Data()
    var block = Data()
    for index in 0..<blocks {
      var input = Data()
      input.append(block)
      input.append(info)
      input.append(UInt8(index + 1))
      block = Data(HMAC<SHA256>.authenticationCode(for: input, using: key))
      output.append(block)
    }
    return output.prefix(length)
  }

  private static func labeledExtract(salt: Data, label: String, ikm: Data, suiteId: Data) -> Data {
    var input = Data(hpkeVersion)
    input.append(suiteId)
    input.append(Data(label.utf8))
    input.append(ikm)
    return extract(salt: salt, ikm: input)
  }

  private static func labeledExpand(prk: Data, label: String, info: Data, length: Int, suiteId: Data) -> Data {
    var input = Data([UInt8((length >> 8) & 0xFF), UInt8(length & 0xFF)])
    input.append(Data(hpkeVersion))
    input.append(suiteId)
    input.append(Data(label.utf8))
    input.append(info)
    return expand(prk: prk, info: input, length: length)
  }
}
