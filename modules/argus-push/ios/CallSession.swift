import AVFAudio
import CallKit
import Foundation
import UIKit

struct RingRequest {
  let callId: String
  let expiresAtSeconds: Int64
  let subject: String
}

struct CallDeepLink {
  let callId: String
  let enteredFromOutside: Bool

  var url: URL? {
    var allowed = CharacterSet.urlQueryAllowed
    allowed.remove(charactersIn: "&#?=+")
    let encoded = callId.addingPercentEncoding(withAllowedCharacters: allowed) ?? callId
    let outside = enteredFromOutside ? "&outside=1" : ""
    return URL(string: "argus://call?callId=\(encoded)\(outside)")
  }
}

final class CallSession: NSObject, CXProviderDelegate {
  static let shared = CallSession()

  private struct ActiveCall {
    let id: UUID
    let callId: String
    let startedAt: Int64
    var answered: Bool
  }

  private let store: PushStore
  private let provider: CXProvider
  private let lock = NSLock()
  private var calls: [UUID: ActiveCall] = [:]
  private var expiry: [String: DispatchWorkItem] = [:]
  private var suppressedEnds: Set<UUID> = []
  private var suppressedMutes: Set<UUID> = []
  private var routeObserver: NSObjectProtocol?

  var onCallControl: ((String) -> Void)?
  var onDecline: ((String) -> Void)?

  private override init() {
    store = PushStore()
    let configuration = CXProviderConfiguration(localizedName: "Argus")
    configuration.supportsVideo = false
    configuration.maximumCallsPerCallGroup = 1
    configuration.maximumCallGroups = 1
    configuration.supportedHandleTypes = [.generic]
    configuration.iconTemplateImageData = EstelaStill.templateImage(side: 40).pngData()
    provider = CXProvider(configuration: configuration)
    super.init()
    provider.setDelegate(self, queue: .main)
    routeObserver = NotificationCenter.default.addObserver(
      forName: AVAudioSession.routeChangeNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.emit("endpoints")
    }
  }

  deinit {
    if let routeObserver {
      NotificationCenter.default.removeObserver(routeObserver)
    }
  }

  func callActive() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    return calls.values.contains { $0.answered }
  }

  func ring(_ request: RingRequest) {
    onMain { [weak self] in self?.reportIncoming(request) }
  }

  func cancelRinging(_ callId: String) {
    onMain { [weak self] in
      guard let self, let entry = self.call(forCallId: callId, answered: false) else { return }
      self.store.remember("cancel:\(callId)", now: Int64(Date().timeIntervalSince1970))
      self.end(entry.id, suppressed: true)
    }
  }

  func endActive() {
    onMain { [weak self] in
      guard let self, let entry = self.active() else { return }
      self.emit("hangup")
      self.end(entry.id, suppressed: true)
    }
  }

  func stopOngoingCall() {
    onMain { [weak self] in
      guard let self, let entry = self.answered() else { return }
      self.end(entry.id, suppressed: true)
    }
  }

  func setMuted(_ muted: Bool) {
    onMain { [weak self] in
      guard let self, let entry = self.answered() ?? self.active() else { return }
      self.lock.lock()
      self.suppressedMutes.insert(entry.id)
      self.lock.unlock()
      self.provider.request(CXTransaction(action: CXSetMutedCallAction(call: entry.id, muted: muted))) { _ in }
    }
  }

  func startAssistantCall(resolve: @escaping (Bool) -> Void) {
    onMain { [weak self] in
      guard let self else {
        resolve(false)
        return
      }
      guard !self.callActive() else {
        resolve(true)
        return
      }
      let uuid = UUID()
      let callId = "assistant-\(Int64(Date().timeIntervalSince1970 * 1000))"
      self.lock.lock()
      self.calls[uuid] = ActiveCall(
        id: uuid, callId: callId, startedAt: Int64(Date().timeIntervalSince1970), answered: false)
      self.lock.unlock()
      let action = CXStartCallAction(call: uuid, handle: CXHandle(type: .generic, value: "Argus"))
      action.isVideo = false
      self.provider.request(CXTransaction(action: action)) { [weak self] error in
        guard let self else {
          resolve(false)
          return
        }
        if error != nil {
          PushTrace.record(PushTraceLine(phase: "call", outcome: "failed", reason: "start-refused"))
          self.clear(uuid)
          resolve(false)
          return
        }
        self.lock.lock()
        self.calls[uuid]?.answered = true
        self.lock.unlock()
        self.provider.reportOutgoingCall(with: uuid, connectedAt: Date())
        resolve(true)
      }
    }
  }

  func endpointsJson() -> String {
    let outputs = AVAudioSession.sharedInstance().currentRoute.outputs
    let objects: [[String: Any]] = outputs.map { port in
      [
        "id": port.uid,
        "kind": CallSession.kind(of: port.portType),
        "name": port.portName,
        "active": true,
      ]
    }
    guard
      let data = try? JSONSerialization.data(withJSONObject: objects),
      let json = String(data: data, encoding: .utf8)
    else { return "[]" }
    return json
  }

  func selectEndpoint(_ id: String) {
    onMain { [weak self] in
      guard let self else { return }
      let session = AVAudioSession.sharedInstance()
      guard let port = session.currentRoute.outputs.first(where: { $0.uid == id }) else { return }
      switch port.portType {
      case .builtInSpeaker:
        try? session.setOverrideOutputAudioPort(.speaker)
      case .builtInReceiver:
        try? session.setOverrideOutputAudioPort(.none)
      default:
        return
      }
      self.emit("endpoints")
    }
  }

  func providerDidReset(_ provider: CXProvider) {
    lock.lock()
    let hadAnswered = calls.values.contains { $0.answered }
    calls.removeAll()
    expiry.removeAll()
    lock.unlock()
    PushTrace.record(PushTraceLine(phase: "call", outcome: "cleared", reason: "provider-reset"))
    if hadAnswered {
      emit("hangup")
    }
  }

  func provider(_ provider: CXProvider, perform action: CXStartCallAction) {
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    guard let entry = call(for: action.callUUID) else {
      action.fail()
      return
    }
    action.fulfill()
    lock.lock()
    calls[action.callUUID]?.answered = true
    lock.unlock()
    cancelExpiry(entry.callId)
    PushTrace.record(PushTraceLine(phase: "call", outcome: "answered", reason: "callkit"))
    let outside = UIApplication.shared.applicationState != .active
    if let url = CallDeepLink(callId: entry.callId, enteredFromOutside: outside).url {
      UIApplication.shared.open(url)
    }
  }

  func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    let entry = call(for: action.callUUID)
    action.fulfill()
    lock.lock()
    let suppressed = suppressedEnds.remove(action.callUUID) != nil
    lock.unlock()
    guard let entry else { return }
    clear(action.callUUID)
    cancelExpiry(entry.callId)
    guard !suppressed else {
      PushTrace.record(PushTraceLine(phase: "call", outcome: "ended", reason: "app-ended"))
      return
    }
    if entry.answered {
      PushTrace.record(PushTraceLine(phase: "call", outcome: "ended", reason: "callkit-ended"))
      emit("hangup")
    } else {
      PushTrace.record(PushTraceLine(phase: "call", outcome: "ended", reason: "callkit-declined"))
      deliverDecline(entry.callId)
    }
  }

  func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
    action.fulfill()
    lock.lock()
    let suppressed = suppressedMutes.remove(action.callUUID) != nil
    lock.unlock()
    if suppressed { return }
    emit(action.isMuted ? "mute-on" : "mute-off")
  }

  func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
    try? audioSession.setCategory(
      .playAndRecord, mode: .voiceChat, options: [.allowBluetooth, .allowBluetoothA2DP])
    try? audioSession.setActive(true)
    PushTrace.record(PushTraceLine(phase: "call", outcome: "ok", reason: "audio-active"))
    emit("endpoints")
  }

  func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
    try? audioSession.setActive(false, options: [.notifyOthersOnDeactivation])
    PushTrace.record(PushTraceLine(phase: "call", outcome: "cleared", reason: "audio-inactive"))
  }

  private func reportIncoming(_ request: RingRequest) {
    guard !request.callId.isEmpty else { return }
    let now = Int64(Date().timeIntervalSince1970)
    if store.isSeen("call:\(request.callId)", now: now) {
      PushTrace.record(PushTraceLine(phase: "call", outcome: "dropped", reason: "already-rang"))
      return
    }
    store.remember("call:\(request.callId)", now: now)
    let uuid = UUID()
    lock.lock()
    let ringing = calls.first { !$0.value.answered }
    calls[uuid] = ActiveCall(id: uuid, callId: request.callId, startedAt: now, answered: false)
    lock.unlock()
    if let ringing {
      end(ringing.key, suppressed: true)
    }
    let update = CXCallUpdate()
    update.remoteHandle = CXHandle(type: .generic, value: CallSession.handleText(request))
    update.localizedCallerName = "Argus"
    update.hasVideo = false
    update.supportsHolding = false
    update.supportsGrouping = false
    update.supportsUngrouping = false
    update.supportsDTMF = false
    provider.reportNewIncomingCall(with: uuid, update: update) { [weak self] error in
      guard let self else { return }
      if error != nil {
        PushTrace.record(PushTraceLine(phase: "call", outcome: "failed", reason: "report-refused"))
        self.store.addDecline(request.callId)
        self.clear(uuid)
        return
      }
      PushTrace.record(PushTraceLine(phase: "call", outcome: "ringing", reason: "reported"))
      self.scheduleExpiry(request)
    }
  }

  private func end(_ uuid: UUID, suppressed: Bool) {
    if suppressed {
      lock.lock()
      suppressedEnds.insert(uuid)
      lock.unlock()
    }
    if let entry = call(for: uuid) {
      cancelExpiry(entry.callId)
    }
    provider.request(CXTransaction(action: CXEndCallAction(call: uuid))) { [weak self] error in
      guard let self, error != nil, let entry = self.call(for: uuid) else { return }
      self.lock.lock()
      let suppressed = self.suppressedEnds.remove(uuid) != nil
      self.lock.unlock()
      self.clear(uuid)
      self.provider.reportCall(with: uuid, endedAt: Date(), reason: .remoteEnded)
      guard !suppressed else { return }
      if entry.answered {
        self.emit("hangup")
      } else {
        self.deliverDecline(entry.callId)
      }
    }
  }

  private func scheduleExpiry(_ request: RingRequest) {
    let seconds = request.expiresAtSeconds - Int64(Date().timeIntervalSince1970)
    guard seconds > 0 else {
      endRinging(request.callId)
      return
    }
    let item = DispatchWorkItem { [weak self] in
      self?.endRinging(request.callId)
    }
    lock.lock()
    expiry[request.callId] = item
    lock.unlock()
    DispatchQueue.main.asyncAfter(deadline: .now() + .seconds(Int(seconds)), execute: item)
  }

  private func endRinging(_ callId: String) {
    guard let entry = call(forCallId: callId, answered: false) else { return }
    PushTrace.record(PushTraceLine(phase: "call", outcome: "ended", reason: "expired"))
    end(entry.id, suppressed: true)
  }

  private func cancelExpiry(_ callId: String) {
    lock.lock()
    let item = expiry.removeValue(forKey: callId)
    lock.unlock()
    item?.cancel()
  }

  private func clear(_ uuid: UUID) {
    lock.lock()
    calls.removeValue(forKey: uuid)
    suppressedEnds.remove(uuid)
    suppressedMutes.remove(uuid)
    lock.unlock()
  }

  private func call(for uuid: UUID) -> ActiveCall? {
    lock.lock()
    defer { lock.unlock() }
    return calls[uuid]
  }

  private func call(forCallId callId: String, answered: Bool) -> ActiveCall? {
    lock.lock()
    defer { lock.unlock() }
    return calls.values.first { $0.callId == callId && $0.answered == answered }
  }

  private func active() -> ActiveCall? {
    lock.lock()
    defer { lock.unlock() }
    return calls.values.first { !$0.answered } ?? calls.values.first
  }

  private func answered() -> ActiveCall? {
    lock.lock()
    defer { lock.unlock() }
    return calls.values.first { $0.answered }
  }

  private func deliverDecline(_ callId: String) {
    guard let listener = onDecline else {
      store.addDecline(callId)
      PushTrace.record(PushTraceLine(phase: "decline", outcome: "queued", reason: "no-listener"))
      return
    }
    listener(callId)
  }

  private func emit(_ action: String) {
    onCallControl?(action)
  }

  private func onMain(_ work: @escaping () -> Void) {
    if Thread.isMainThread {
      work()
      return
    }
    DispatchQueue.main.async(execute: work)
  }

  static func handleText(_ request: RingRequest) -> String {
    let subject = request.subject.trimmingCharacters(in: .whitespacesAndNewlines)
    return subject.isEmpty ? "Argus" : subject
  }

  private static func kind(of port: AVAudioSession.Port) -> String {
    switch port {
    case .builtInSpeaker:
      return "speaker"
    case .builtInReceiver:
      return "earpiece"
    case .bluetoothA2DP, .bluetoothLE, .bluetoothHFP:
      return "bluetooth"
    case .headphones, .headsetMic:
      return "wired"
    case .airPlay, .carAudio:
      return "streaming"
    default:
      return "unknown"
    }
  }
}
