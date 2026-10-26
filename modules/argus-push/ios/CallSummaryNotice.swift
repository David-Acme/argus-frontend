import Foundation
import UserNotifications

struct CallSummaryText {
  let title: String
  let body: String
}

enum CallSummaryNotice {
  private static let identifier = "argus-call-summary"

  static func post(_ text: CallSummaryText) {
    let content = UNMutableNotificationContent()
    content.title = text.title
    content.body = text.body
    content.sound = nil
    content.interruptionLevel = .passive
    let request = UNNotificationRequest(identifier: identifier, content: content, trigger: nil)
    UNUserNotificationCenter.current().add(request) { error in
      PushTrace.record(
        PushTraceLine(phase: "call", outcome: error == nil ? "shown" : "failed", reason: "call-summary-silent"))
    }
  }
}
