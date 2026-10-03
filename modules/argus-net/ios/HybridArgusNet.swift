import Foundation
import NitroModules
import Security
import CryptoKit

private let defaultHost = "argus.local"
private let pairingPath = "/pairing"
private let routeServiceType = "_argus-route._tcp"
private let discoverySettleSeconds: TimeInterval = 1.5

private func netError(_ message: String) -> NSError {
  return NSError(
    domain: "ArgusNet", code: 0,
    userInfo: [NSLocalizedDescriptionKey: message])
}

public class HybridArgusNet: HybridArgusNetSpec {
  private var caPem = ""
  private var allowedHost = defaultHost

  private static let sessionCache = NSCache<NSString, URLSession>()

  // MARK: - Spec

  func discover(timeoutMs: Double) throws -> Promise<NetDiscovery> {
    return Promise.async { try await Self.discoverInternal(timeoutMs: timeoutMs) }
  }

  func pair(host: String, ip: String, port: Double, code: String) throws -> Promise<NetPairing> {
    return Promise.async {
      try await Self.pairInternal(host: host, ip: ip, port: port, code: code)
    }
  }

  func configure(caPem: String, allowedHost: String, ip: String) throws -> Void {
    if caPem == self.caPem && allowedHost == self.allowedHost { return }
    self.caPem = caPem
    self.allowedHost = allowedHost
  }

  func configureVerified(caPem: String, caFingerprint: String, allowedHost: String, ip: String) throws -> Void {
    try Self.verifyCaFingerprint(caPem, expected: caFingerprint)
    try configure(caPem: caPem, allowedHost: allowedHost, ip: ip)
  }

  func request(options: NetHttpRequest) throws -> Promise<NetHttpResult> {
    let ca = caPem
    let host = allowedHost
    return Promise.async { try await Self.requestInternal(options: options, caPem: ca, allowedHost: host) }
  }

  func openSocket(options: NetSocketOptions) throws -> Promise<(any HybridArgusSocketSpec)> {
    let ca = caPem
    return Promise.async {
      guard !ca.isEmpty else {
        throw netError("PAIRING_REQUIRED|Server is not paired yet")
      }
      guard let url = URL(string: options.url) else {
        throw netError("NETWORK_ERROR|Invalid socket URL")
      }
      var request = URLRequest(url: url)
      for (key, value) in options.headers ?? [:] {
        request.setValue(value, forHTTPHeaderField: key)
      }
      let session = try Self.strictSession(for: ca)
      return ArgusSocket(session: session, request: request)
    }
  }

  // MARK: - Discovery (Bonjour / mDNS)

  private static func discoverInternal(timeoutMs: Double) async throws -> NetDiscovery {
    let timeout = TimeInterval(max(1000, Int(timeoutMs))) / 1000.0
    let resolver = await BonjourResolver(timeout: timeout)
    return try await withTimeout(seconds: timeout + 2) { try await resolver.resolve() }
  }

  // MARK: - Pairing (one-time trust-any)

  private static func pairInternal(host: String, ip: String, port: Double, code: String) async throws -> NetPairing {
    let url = URL(string: "https://\(ip):\(Int(port))\(pairingPath)")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    let key = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    let nonce = Self.randomHex(bytes: 16)
    request.httpBody = try JSONSerialization.data(
      withJSONObject: [
        "nonce": nonce,
        "proof": Self.hmacHex(key: key, message: "argus-pair-client|\(nonce)"),
      ])

    let session = URLSession(
      configuration: .ephemeral, delegate: TrustAnyDelegate(), delegateQueue: nil)
    let (data, response) = try await session.data(for: request)

    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
    guard status == 200 else {
      switch status {
      case 403, 422:
        throw netError("INVALID_PAIRING_CODE|Invalid pairing code")
      case 409:
        throw netError("ALREADY_PAIRED|Server already paired")
      default:
        throw netError("NETWORK_ERROR|Pairing failed (HTTP \(status))")
      }
    }

    guard
      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let info = json["info"] as? [String: Any],
      let caPem = info["caPem"] as? String,
      let caFingerprint = (info["caFingerprint"] as? String)?.uppercased()
    else {
      throw netError("NETWORK_ERROR|Malformed pairing response")
    }

    let serverProof = (info["serverProof"] as? String)?.uppercased() ?? ""
    let expectedProof = Self.hmacHex(
      key: key, message: "argus-pair-server|\(nonce)|\(caFingerprint)")
    if serverProof != expectedProof {
      throw netError("FINGERPRINT_MISMATCH|The server could not prove the pairing code")
    }

    try Self.verifyCaFingerprint(caPem, expected: caFingerprint)

    let resolvedPort = (info["port"] as? NSNumber)?.doubleValue ?? port
    return NetPairing(
      caPem: caPem,
      caFingerprint: caFingerprint,
      serverFingerprint: info["serverFingerprint"] as? String ?? "",
      instanceId: info["instanceId"] as? String ?? "",
      port: resolvedPort,
      scheme: info["scheme"] as? String ?? "https")
  }

  private static func randomHex(bytes: Int) -> String {
    var buffer = [UInt8](repeating: 0, count: bytes)
    _ = SecRandomCopyBytes(kSecRandomDefault, bytes, &buffer)
    return buffer.map { String(format: "%02x", $0) }.joined()
  }

  private static func hmacHex(key: String, message: String) -> String {
    let code = HMAC<SHA256>.authenticationCode(
      for: Data(message.utf8), using: SymmetricKey(data: Data(key.utf8)))
    return code.map { String(format: "%02X", $0) }.joined()
  }

  private static func verifyCaFingerprint(_ caPem: String, expected: String) throws {
    guard let der = Self.derFromPem(caPem), let _ = SecCertificateCreateWithData(nil, der as CFData) else {
      throw netError("CERT_NOT_TRUSTED|Invalid CA certificate")
    }
    let digest = SHA256.hash(data: der).map { String(format: "%02X", $0) }.joined()
    if !digest.caseInsensitiveCompare(expected).isOrderedSame {
      throw netError("FINGERPRINT_MISMATCH|The server CA does not match the invitation")
    }
  }

  // MARK: - Strict request

  private static func requestInternal(
    options: NetHttpRequest, caPem: String, allowedHost: String
  ) async throws -> NetHttpResult {
    let trustAny = options.trustAny ?? false
    if !trustAny {
      guard !caPem.isEmpty else {
        throw netError("PAIRING_REQUIRED|Server is not paired yet")
      }
      guard
        let target = URL(string: options.url),
        target.host?.lowercased() == allowedHost.lowercased()
      else {
        throw netError("HOST_NOT_ALLOWED|Host is not allowed")
      }
    }

    guard let target = URL(string: options.url) else {
      throw netError("NETWORK_ERROR|Invalid URL")
    }
    var request = URLRequest(url: target)
    request.httpMethod = options.method.uppercased()
    for (key, value) in options.headers {
      request.setValue(value, forHTTPHeaderField: key)
    }

    if !options.files.isEmpty {
      let (body, boundary) = try buildMultipartBody(options: options)
      request.httpBody = body
      request.setValue(
        "multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
    } else if !options.body.isEmpty {
      request.httpBody = options.body.data(using: .utf8)
    }

    let session: URLSession
    if trustAny {
      session = URLSession(
        configuration: .ephemeral, delegate: TrustAnyDelegate(), delegateQueue: nil)
    } else {
      session = try Self.strictSession(for: caPem)
    }
    let (data, response) = try await session.data(for: request)

    var headers: [String: String] = [:]
    if let httpResponse = response as? HTTPURLResponse {
      for (key, value) in httpResponse.allHeaderFields {
        headers[String(describing: key)] = String(describing: value)
      }
    }
    return NetHttpResult(
      status: Double((response as? HTTPURLResponse)?.statusCode ?? 0),
      headers: headers,
      body: String(data: data, encoding: .utf8) ?? "")
  }

  private static func strictSession(for caPem: String) throws -> URLSession {
    let key = caPem as NSString
    if let session = sessionCache.object(forKey: key) {
      return session
    }
    guard let caCert = certificateFromPem(caPem) else {
      throw netError("CERT_NOT_TRUSTED|Invalid CA certificate")
    }
    let session = URLSession(
      configuration: .ephemeral,
      delegate: StrictDelegate(caCertificate: caCert),
      delegateQueue: nil)
    sessionCache.setObject(session, forKey: key)
    return session
  }

  private static func buildMultipartBody(options: NetHttpRequest) throws -> (Data, String) {
    let boundary = "Boundary-\(UUID().uuidString)"
    var data = Data()

    func append(_ string: String) {
      data.append(Data(string.utf8))
    }

    if !options.body.isEmpty {
      if let fields = try? JSONSerialization.jsonObject(with: Data(options.body.utf8)) as? [String: String] {
        for (name, value) in fields {
          append("--\(boundary)\r\n")
          append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n")
          append(value)
          append("\r\n")
        }
      } else {
        append("--\(boundary)\r\n")
        append("Content-Disposition: form-data; name=\"payload\"\r\n\r\n")
        append(options.body)
        append("\r\n")
      }
    }

    for file in options.files {
      let fileData = try readFilePart(file)
      append("--\(boundary)\r\n")
      append("Content-Disposition: form-data; name=\"\(file.name)\"; filename=\"\(file.filename)\"\r\n")
      append("Content-Type: \(file.contentType)\r\n\r\n")
      data.append(fileData)
      append("\r\n")
    }

    append("--\(boundary)--\r\n")
    return (data, boundary)
  }

  private static func readFilePart(_ file: NetHttpFile) throws -> Data {
    let path = file.uri.hasPrefix("file://") ? String(file.uri.dropFirst(7)) : file.uri
    return try Data(contentsOf: URL(fileURLWithPath: path))
  }

  // MARK: - PEM helper

  private static func certificateFromPem(_ pem: String) -> SecCertificate? {
    guard let der = derFromPem(pem) else { return nil }
    return SecCertificateCreateWithData(nil, der as CFData)
  }

  private static func derFromPem(_ pem: String) -> Data? {
    var base64 = pem
      .replacingOccurrences(of: "-----BEGIN CERTIFICATE-----", with: "")
      .replacingOccurrences(of: "-----END CERTIFICATE-----", with: "")
      .replacingOccurrences(of: "\r", with: "")
      .replacingOccurrences(of: "\n", with: "")
      .replacingOccurrences(of: " ", with: "")

    return Data(base64Encoded: base64, options: .ignoreUnknownCharacters)
  }
}

// MARK: - TLS trust delegates

private final class TrustAnyDelegate: NSObject, URLSessionTaskDelegate {
  func urlSession(
    _ session: URLSession,
    didReceive challenge: URLAuthenticationChallenge,
    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
  ) {
    if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
       let trust = challenge.protectionSpace.serverTrust {
      completionHandler(.useCredential, URLCredential(trust: trust))
    } else {
      completionHandler(.performDefaultHandling, nil)
    }
  }
}

private final class StrictDelegate: NSObject, URLSessionTaskDelegate {
  private let caCertificate: SecCertificate

  init(caCertificate: SecCertificate) {
    self.caCertificate = caCertificate
  }

  func urlSession(
    _ session: URLSession,
    didReceive challenge: URLAuthenticationChallenge,
    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
  ) {
    guard
      challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
      let trust = challenge.protectionSpace.serverTrust
    else {
      completionHandler(.cancelAuthenticationChallenge, nil)
      return
    }

    SecTrustSetAnchorCertificates(trust, [caCertificate] as CFArray)
    SecTrustSetAnchorCertificatesOnly(trust, true)

    var error: CFError?
    if SecTrustEvaluateWithError(trust, &error) {
      completionHandler(.useCredential, URLCredential(trust: trust))
    } else {
      completionHandler(.cancelAuthenticationChallenge, nil)
    }
  }
}

// MARK: - Bonjour resolver

@MainActor
private final class BonjourResolver: NSObject, NetServiceBrowserDelegate, NetServiceDelegate {
  private let browser = NetServiceBrowser()
  private let timeout: TimeInterval
  private var services: [NetService] = []
  private var routes: [String: NetRoute] = [:]
  private var firstIp = ""
  private var continuation: CheckedContinuation<NetDiscovery, Error>?
  private var finished = false

  init(timeout: TimeInterval) {
    self.timeout = timeout
  }

  func resolve() async throws -> NetDiscovery {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<NetDiscovery, Error>) in
      self.continuation = continuation
      browser.delegate = self
      browser.searchForServices(ofType: routeServiceType, inDomain: "local.")
      DispatchQueue.main.asyncAfter(deadline: .now() + timeout) { [weak self] in
        self?.finish()
      }
    }
  }

  private func finish() {
    guard !finished else { return }
    finished = true
    browser.stop()
    services.forEach { $0.stop() }
    guard let entry = routes["/pairing"] ?? routes.values.first else {
      continuation?.resume(throwing: netError("DISCOVERY_NOT_FOUND|No Argus server found on the network"))
      return
    }
    continuation?.resume(
      returning: NetDiscovery(
        host: defaultHost,
        ip: firstIp,
        port: entry.port,
        https: entry.https,
        routes: Array(routes.values)))
  }

  func netServiceBrowser(
    _ browser: NetServiceBrowser, didFind service: NetService, moreComing: Bool
  ) {
    guard !finished else { return }
    services.append(service)
    service.delegate = self
    service.resolve(withTimeout: timeout)
  }

  func netServiceBrowser(_ browser: NetServiceBrowser, didNotSearch errorDict: [String: NSNumber]) {
    finish()
  }

  func netServiceDidResolveAddress(_ sender: NetService) {
    guard !finished, let txtData = sender.txtRecordData() else { return }
    let txt = NetService.dictionary(fromTXTRecord: txtData)
    let path = txt["path"].flatMap { String(data: $0, encoding: .utf8) }?
      .trimmingCharacters(in: CharacterSet(charactersIn: "/")) ?? ""
    let ip = sender.addresses?.compactMap { Self.ip(from: $0) }.first ?? ""
    guard !path.isEmpty, !ip.isEmpty else { return }
    if firstIp.isEmpty {
      firstIp = ip
      DispatchQueue.main.asyncAfter(deadline: .now() + discoverySettleSeconds) { [weak self] in
        self?.finish()
      }
    }
    guard ip == firstIp else { return }
    let https = txt["https"].flatMap { String(data: $0, encoding: .utf8) } == "true"
    routes["/\(path)"] = NetRoute(path: "/\(path)", port: Double(sender.port), https: https)
  }

  func netService(_ sender: NetService, didNotResolve errorDict: [String: NSNumber]) {}

  private static func ip(from data: Data) -> String? {
    var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
    data.withUnsafeBytes { (rawBuffer: UnsafeRawBufferPointer) -> Void in
      guard let base = rawBuffer.baseAddress else { return }
      let sockaddr = base.assumingMemoryBound(to: sockaddr.self)
      var addr = sockaddr.pointee
      _ = getnameinfo(&addr, socklen_t(data.count), &host, socklen_t(host.count), nil, 0, NI_NUMERICHOST)
    }
    let value = String(cString: host)
    return value.isEmpty ? nil : value
  }
}

// MARK: - Timeout helper

private func withTimeout<T>(
  seconds: TimeInterval,
  operation: @escaping () async throws -> T
) async throws -> T {
  try await withThrowingTaskGroup(of: T.self) { group in
    group.addTask { try await operation() }
    group.addTask {
      try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
      throw netError("DISCOVERY_NOT_FOUND|No Argus server found on the network")
    }
    defer { group.cancelAll() }
    guard let result = try await group.next() else {
      throw netError("DISCOVERY_NOT_FOUND|No Argus server found on the network")
    }
    return result
  }
}
