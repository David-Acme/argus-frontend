import Foundation
import PushKit

final class VoipPushRegistry: NSObject, PKPushRegistryDelegate {
  static let shared = VoipPushRegistry()

  private let store: PushStore
  private let registry: PKPushRegistry
  private let router: PushRouter

  var onToken: ((String) -> Void)?

  private override init() {
    let store = PushStore()
    self.store = store
    registry = PKPushRegistry(queue: .main)
    router = PushRouter(
      parts: PushRouterParts(
        store: store,
        keys: PushKeys(),
        opener: SealedPushOpener(),
        session: CallSession.shared))
    super.init()
    registry.delegate = self
    registry.desiredPushTypes = [.voIP]
  }

  func start() {
    if registry.desiredPushTypes?.contains(.voIP) != true {
      registry.desiredPushTypes = [.voIP]
    }
  }

  func pushRegistry(
    _ registry: PKPushRegistry, didUpdate credentials: PKPushCredentials, for type: PKPushType
  ) {
    guard type == .voIP else { return }
    let token = credentials.token.map { String(format: "%02x", $0) }.joined()
    store.saveToken(token)
    PushTrace.record(PushTraceLine(phase: "push", outcome: "ok", reason: "voip-token"))
    onToken?(token)
  }

  func pushRegistry(
    _ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType,
    completion: @escaping () -> Void
  ) {
    guard type == .voIP else {
      completion()
      return
    }
    PushTrace.record(PushTraceLine(phase: "push", outcome: "start", reason: "voip-received"))
    router.route(PushRouteInput(dictionary: payload.dictionaryPayload, completion: completion))
  }

  func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
    guard type == .voIP else { return }
    store.clearToken()
    PushTrace.record(PushTraceLine(phase: "push", outcome: "cleared", reason: "voip-token"))
  }
}
