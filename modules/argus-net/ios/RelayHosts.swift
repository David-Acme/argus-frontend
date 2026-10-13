import Foundation

enum HostAdmission {
  case paired
  case relay
  case refused
}

struct RemoteProfile: Equatable {
  let homeId: String
  let domain: String

  static let unset = RemoteProfile(homeId: "", domain: "")

  var usable: Bool {
    RelayHosts.isHomeId(homeId) && RelayHosts.isDomain(domain)
  }

  func admits(_ host: String) -> Bool {
    usable && RelayHosts.services.contains { service in
      host.utf8.elementsEqual("\(service)--\(homeId).\(domain)".utf8)
    }
  }
}

enum RelayHosts {
  static let services = [
    "auth",
    "identity",
    "sync",
    "camera",
    "productivity",
    "notification",
    "guard",
    "settings",
  ]

  private static let homeIdLength = 32
  private static let labelMaxLength = 63
  private static let domainMaxLength = 253

  static func admission(_ host: String, pairedHost: String, remote: RemoteProfile) -> HostAdmission {
    if !pairedHost.isEmpty && host.lowercased() == pairedHost.lowercased() {
      return .paired
    }
    return remote.admits(host) ? .relay : .refused
  }

  static func targetAdmission(_ url: URL, pairedHost: String, remote: RemoteProfile) -> HostAdmission {
    guard
      let scheme = url.scheme?.lowercased(),
      scheme == "https" || scheme == "wss",
      let host = url.host?.lowercased(),
      !host.isEmpty
    else {
      return .refused
    }
    return admission(host, pairedHost: pairedHost, remote: remote)
  }

  static func isHomeId(_ value: String) -> Bool {
    value.utf8.count == homeIdLength && value.utf8.allSatisfy { isDigit($0) || (0x61...0x66).contains($0) }
  }

  static func isDomain(_ value: String) -> Bool {
    let labels = value.split(separator: ".", omittingEmptySubsequences: false)
    guard let last = labels.last else { return false }
    return value.utf8.count <= domainMaxLength
      && labels.count >= 2
      && labels.allSatisfy { isLabel($0) }
      && isTopLevel(last)
  }

  private static func isDigit(_ byte: UInt8) -> Bool {
    (0x30...0x39).contains(byte)
  }

  private static func isLower(_ byte: UInt8) -> Bool {
    (0x61...0x7A).contains(byte)
  }

  private static func isLabel(_ label: Substring) -> Bool {
    let bytes = Array(label.utf8)
    guard let first = bytes.first, let last = bytes.last else { return false }
    return bytes.count <= labelMaxLength
      && first != 0x2D
      && last != 0x2D
      && bytes.allSatisfy { isLower($0) || isDigit($0) || $0 == 0x2D }
  }

  private static func isTopLevel(_ label: Substring) -> Bool {
    let bytes = Array(label.utf8)
    return (2...labelMaxLength).contains(bytes.count) && bytes.allSatisfy { isLower($0) }
  }
}
