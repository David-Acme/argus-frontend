import Foundation
import os

struct PushTraceLine {
  let phase: String
  let outcome: String
  let reason: String
}

enum PushTrace {
  private static let phases: Set<String> = [
    "restore", "refresh", "route", "voice", "lock", "session", "decline", "call", "push",
  ]

  private static let outcomes: Set<String> = [
    "ok", "error", "partial", "absent", "refresh-rejected", "unavailable",
    "stay", "redirect", "start", "joined", "fallback", "sent", "stop", "shown",
    "cleared", "held", "released", "ended", "left", "failed", "queued",
    "background", "foreground", "ringing", "answered", "ignored", "dropped", "mute",
  ]

  private static let logger = Logger(subsystem: "com.davidacme.argus", category: "ArgusTrace")

  static func record(_ line: PushTraceLine) {
    guard phases.contains(line.phase) else { return }
    guard outcomes.contains(line.outcome) else { return }
    guard isReasonShape(line.reason) else { return }
    logger.info(
      "trace \(line.phase, privacy: .public) outcome=\(line.outcome, privacy: .public) reason=\(line.reason, privacy: .public)")
  }

  private static func isReasonShape(_ reason: String) -> Bool {
    let bytes = Array(reason.utf8)
    guard !bytes.isEmpty, bytes.count <= 96 else { return false }
    return bytes.allSatisfy { byte in
      (byte >= 0x61 && byte <= 0x7A) || (byte >= 0x30 && byte <= 0x39) || byte == 0x2D
    }
  }
}
