import Foundation
import NitroModules

public class HybridArgusPush: HybridArgusPushSpec {
  private let store = PushStore()
  private let keyStore = PushKeys()
  private let session = CallSession.shared
  private let registry = VoipPushRegistry.shared
  private var alertListener: ((String) -> Void)?

  public override init() {
    super.init()
    registry.start()
  }

  func keys() throws -> Promise<ArgusPushKeys> {
    let keyStore = self.keyStore
    return Promise.async {
      let pair = try keyStore.keys()
      return ArgusPushKeys(publicKey: pair.publicKey, keyId: pair.keyId)
    }
  }

  func storedToken() throws -> Promise<Variant_NullType_String> {
    let store = self.store
    return Promise.async {
      let token = store.storedToken()
      return token.isEmpty ? Variant_NullType_String.first(NullType()) : Variant_NullType_String.second(token)
    }
  }

  func deleteToken() throws -> Promise<Void> {
    store.clearToken()
    return .resolved(withResult: ())
  }

  func deleteKeys() throws -> Promise<Void> {
    keyStore.delete()
    return .resolved(withResult: ())
  }

  func setDeclineListener(listener: @escaping (String) -> Void) throws -> Void {
    session.onDecline = listener
  }

  func setTokenListener(listener: @escaping (String) -> Void) throws -> Void {
    registry.onToken = listener
  }

  func setAlertListener(listener: @escaping (String) -> Void) throws -> Void {
    alertListener = listener
  }

  func setCallControlListener(listener: @escaping (String) -> Void) throws -> Void {
    session.onCallControl = listener
  }

  func telecomCallActive() throws -> Bool {
    session.callActive()
  }

  func startAssistantCall() throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    session.startAssistantCall { active in
      promise.resolve(withResult: active)
    }
    return promise
  }

  func callEndpoints() throws -> String {
    session.endpointsJson()
  }

  func backgroundAllowed() throws -> Bool {
    true
  }

  func requestBackground() throws -> Void {}

  func selectCallEndpoint(id: String) throws -> Void {
    session.selectEndpoint(id)
  }

  func setCallMuted(muted: Bool) throws -> Void {
    session.setMuted(muted)
  }

  func takeDeclines() throws -> [String] {
    store.takeDeclines()
  }

  func ackDecline(callId: String) throws -> Void {
    store.removeDecline(callId)
  }

  func reportCallAction(callId: String, action: String, status: Double) throws -> Void {
  }

  func endActiveCall() throws -> Void {
    session.endActive()
  }

  func stopOngoingCall() throws -> Void {
    session.stopOngoingCall()
  }

  func sendToBackground() throws -> Void {}

  func isKeyguardLocked() throws -> Bool {
    false
  }

  func overKeyguard() throws -> Bool {
    false
  }

  func requestUnlock() throws -> Promise<Bool> {
    Promise.resolved(withResult: true)
  }

  func postCallSummary(title: String, body: String) throws -> Void {
    CallSummaryNotice.post(CallSummaryText(title: title, body: body))
  }

  func outsideCallId() throws -> String {
    ""
  }

  func exactAlarmsAllowed() throws -> Bool {
    true
  }

  func openExactAlarmSettings() throws -> Void {}

  func canUseFullScreenIntent() throws -> Bool {
    true
  }

  func openFullScreenSettings() throws -> Void {}

  func fullScreenExplained() throws -> Bool {
    store.fullScreenExplained()
  }

  func setFullScreenExplained(value: Bool) throws -> Void {
    store.setFullScreenExplained(value)
  }

  func recordTrace(phase: String, outcome: String, reason: String) throws -> Void {
    PushTrace.record(PushTraceLine(phase: phase, outcome: outcome, reason: reason))
  }
}
