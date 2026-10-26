import Foundation

struct PushRouteInput {
  let dictionary: [AnyHashable: Any]
  let completion: () -> Void
}

struct PushRouterParts {
  let store: PushStore
  let keys: PushKeys
  let opener: SealedPushOpener
  let session: CallSession
}

final class PushRouter {
  private let store: PushStore
  private let keys: PushKeys
  private let opener: SealedPushOpener
  private let session: CallSession

  init(parts: PushRouterParts) {
    store = parts.store
    keys = parts.keys
    opener = parts.opener
    session = parts.session
  }

  func route(_ input: PushRouteInput) {
    defer { input.completion() }
    guard let payload = SealedPushPayload.parse(dictionary: input.dictionary) else {
      PushTrace.record(PushTraceLine(phase: "push", outcome: "ignored", reason: "payload-unreadable"))
      return
    }
    let now = Int64(Date().timeIntervalSince1970)
    if store.isSeen("delivery:\(payload.deliveryId)", now: now) {
      PushTrace.record(PushTraceLine(phase: "push", outcome: "dropped", reason: "delivery-seen"))
      return
    }
    store.remember("delivery:\(payload.deliveryId)", now: now)
    guard
      let privateKey = try? keys.privateKey(),
      let keyId = try? keys.keys().keyId,
      let plaintext = opener.open(
        SealedPushOpenInput(payload: payload, privateKey: privateKey, keyId: keyId)),
      let intent = PushIntent.parse(String(decoding: plaintext, as: UTF8.self))
    else {
      PushTrace.record(PushTraceLine(phase: "push", outcome: "ignored", reason: "sealed-unreadable"))
      return
    }
    if store.isSeen("intent:\(intent.intentId)", now: now) {
      PushTrace.record(PushTraceLine(phase: "push", outcome: "dropped", reason: "intent-seen"))
      return
    }
    store.remember("intent:\(intent.intentId)", now: now)
    switch intent.kind {
    case PushIntent.kindCall:
      routeCall(intent, now: now)
    default:
      PushTrace.record(PushTraceLine(phase: "push", outcome: "ignored", reason: "alert-on-voip"))
    }
  }

  private func routeCall(_ intent: PushIntent, now: Int64) {
    let callId = intent.callId
    guard !callId.isEmpty else { return }
    if intent.cancel {
      store.remember("cancel:\(callId)", now: now)
      session.cancelRinging(callId)
      return
    }
    if store.isSeen("cancel:\(callId)", now: now) || store.isSeen("call:\(callId)", now: now) {
      PushTrace.record(PushTraceLine(phase: "push", outcome: "dropped", reason: "call-seen"))
      return
    }
    session.ring(
      RingRequest(callId: callId, expiresAtSeconds: intent.expiresAtSeconds, subject: intent.subject))
  }
}
