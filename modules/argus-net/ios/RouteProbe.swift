import CryptoKit
import Foundation
import Network
import Security

private let statusPrefix = Data("HTTP/1.".utf8)
private let credentialHeaders: Set<String> = ["authorization", "cookie", "x-argus-device-credential"]
private let connectFailures: Set<POSIXErrorCode> = [.ECONNREFUSED, .ETIMEDOUT, .ENETUNREACH, .EHOSTUNREACH, .EADDRNOTAVAIL]

struct RouteProbeTarget {
  let url: URL
  let host: String
  let port: UInt16
  let headers: [String: String]
  let timeout: TimeInterval
  let anchor: SecCertificate
}

final class RouteProbe {
  private let target: RouteProbeTarget
  private let queue = DispatchQueue(label: "argus.route-probe")
  private let lock = NSLock()
  private var tlsStarted = false
  private var refused = false
  private var seen = ""
  private var finished = false
  private var connection: NWConnection?
  private var continuation: CheckedContinuation<NetProbeResult, Never>?

  init(target: RouteProbeTarget) {
    self.target = target
  }

  func run() async -> NetProbeResult {
    await withCheckedContinuation { (continuation: CheckedContinuation<NetProbeResult, Never>) in
      self.continuation = continuation
      start()
    }
  }

  private func start() {
    let tls = NWProtocolTLS.Options()
    sec_protocol_options_set_tls_server_name(tls.securityProtocolOptions, target.host)
    sec_protocol_options_set_verify_block(
      tls.securityProtocolOptions,
      { [weak self] _, trust, complete in
        complete(self?.verify(sec_trust_copy_ref(trust).takeRetainedValue()) ?? false)
      },
      queue)
    let connection = NWConnection(
      host: NWEndpoint.Host(target.host),
      port: NWEndpoint.Port(rawValue: target.port) ?? .https,
      using: NWParameters(tls: tls, tcp: NWProtocolTCP.Options()))
    self.connection = connection
    connection.stateUpdateHandler = { [weak self] state in self?.changed(state) }
    connection.start(queue: queue)
    queue.asyncAfter(deadline: .now() + target.timeout) { [weak self] in
      guard let self else { return }
      self.finish(self.started ? "tls-peer-closed" : "connect")
    }
  }

  private var started: Bool {
    lock.lock()
    defer { lock.unlock() }
    return tlsStarted
  }

  private func verify(_ trust: SecTrust) -> Bool {
    SecTrustSetPolicies(trust, SecPolicyCreateSSL(true, target.host as CFString))
    SecTrustSetAnchorCertificates(trust, [target.anchor] as CFArray)
    SecTrustSetAnchorCertificatesOnly(trust, true)
    let leaf = (SecTrustCopyCertificateChain(trust) as? [SecCertificate])?.first
    var error: CFError?
    let trusted = SecTrustEvaluateWithError(trust, &error)
    lock.lock()
    tlsStarted = true
    refused = !trusted
    if let leaf {
      let der = SecCertificateCopyData(leaf) as Data
      seen = SHA256.hash(data: der).map { String(format: "%02X", $0) }.joined()
    }
    lock.unlock()
    return trusted
  }

  private func changed(_ state: NWConnection.State) {
    switch state {
    case .ready:
      lock.lock()
      tlsStarted = true
      lock.unlock()
      send()
    case .waiting(let error), .failed(let error):
      finish(outcome(of: error))
    default:
      break
    }
  }

  private func outcome(of error: NWError) -> String {
    lock.lock()
    let tls = tlsStarted
    let pin = refused
    lock.unlock()
    if pin { return "pin" }
    switch error {
    case .dns:
      return "dns"
    case .tls:
      return "tls-peer-closed"
    case .posix(let code):
      return tls || !connectFailures.contains(code) ? "tls-peer-closed" : "connect"
    default:
      return tls ? "tls-peer-closed" : "connect"
    }
  }

  private func requestData() -> Data {
    let path = target.url.path.isEmpty ? "/" : target.url.path
    let query = target.url.query.map { "?\($0)" } ?? ""
    let authority = target.port == 443 ? target.host : "\(target.host):\(target.port)"
    var lines = "GET \(path)\(query) HTTP/1.1\r\nHost: \(authority)\r\nAccept: application/json\r\nConnection: close\r\n"
    for (name, value) in target.headers
    where !credentialHeaders.contains(name.lowercased()) && name.lowercased() != "host"
      && !(name + value).contains(where: { $0 == "\r" || $0 == "\n" })
    {
      lines += "\(name): \(value)\r\n"
    }
    return Data((lines + "\r\n").utf8)
  }

  private func send() {
    guard let connection else { return }
    connection.send(
      content: requestData(),
      completion: .contentProcessed { [weak self] error in
        guard let self else { return }
        if error != nil {
          self.finish("tls-peer-closed")
          return
        }
        connection.receive(minimumIncompleteLength: statusPrefix.count, maximumLength: 64) { data, _, _, _ in
          self.finish(data?.starts(with: statusPrefix) == true ? "reached" : "tls-peer-closed")
        }
      })
  }

  private func address() -> String {
    guard case .hostPort(let host, let port)? = connection?.currentPath?.remoteEndpoint else { return "" }
    return "\(host):\(port)"
  }

  private func finish(_ outcome: String) {
    lock.lock()
    if finished {
      lock.unlock()
      return
    }
    finished = true
    let fingerprint = outcome == "pin" ? seen : ""
    let continuation = self.continuation
    self.continuation = nil
    lock.unlock()
    let reply = NetProbeResult(
      outcome: outcome, address: outcome == "dns" ? "" : address(), fingerprint: fingerprint)
    connection?.cancel()
    continuation?.resume(returning: reply)
  }
}
