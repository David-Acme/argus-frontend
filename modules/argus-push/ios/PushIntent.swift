import Foundation

struct PushIntent {
  static let kindAlert = "alert"
  static let kindCall = "call"

  let intentId: String
  let kind: String
  let urgency: String
  let notificationId: String
  let callId: String
  let title: String
  let body: String
  let expiresAtSeconds: Int64
  let cancel: Bool
  let type: String
  let reason: String
  let subject: String
  let episode: String
  let ringFollows: Bool

  var critical: Bool {
    urgency == "critical"
  }

  static func parse(_ text: String) -> PushIntent? {
    guard
      let data = text.data(using: .utf8),
      let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    else { return nil }
    let intentId = object["intentId"] as? String ?? ""
    let kind = normalizedKind(object["kind"] as? String ?? "")
    let expiresAt = (object["exp"] as? NSNumber)?.int64Value ?? 0
    guard !intentId.isEmpty, expiresAt > 0 else { return nil }
    guard kind == kindAlert || kind == kindCall else { return nil }
    return PushIntent(
      intentId: intentId,
      kind: kind,
      urgency: object["urgency"] as? String ?? "normal",
      notificationId: object["notificationId"] as? String ?? "",
      callId: object["callId"] as? String ?? "",
      title: object["title"] as? String ?? "",
      body: object["body"] as? String ?? "",
      expiresAtSeconds: expiresAt,
      cancel: object["cancel"] as? Bool ?? false,
      type: object["type"] as? String ?? "",
      reason: object["reason"] as? String ?? "",
      subject: object["subject"] as? String ?? "",
      episode: object["episode"] as? String ?? "",
      ringFollows: object["ringFollows"] as? Bool ?? false)
  }

  private static func normalizedKind(_ kind: String) -> String {
    kind == "notification" ? kindAlert : kind
  }
}
