import Foundation
import NitroModules

private enum SocketEvent {
  case open
  case text(String)
  case binary(ArrayBuffer)
  case failure(code: String, message: String)
  case closed(code: Double, reason: String)
}

private let pingIntervalSeconds: TimeInterval = 20

private final class ArgusSocketTaskDelegate: NSObject, URLSessionWebSocketDelegate {
  var onOpen: (() -> Void)?
  var onClose: ((Int, Data?) -> Void)?
  var onComplete: ((Error?) -> Void)?

  func urlSession(
    _ session: URLSession,
    webSocketTask: URLSessionWebSocketTask,
    didOpenWithProtocol protocol: String?
  ) {
    onOpen?()
  }

  func urlSession(
    _ session: URLSession,
    webSocketTask: URLSessionWebSocketTask,
    didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
    reason: Data?
  ) {
    onClose?(closeCode.rawValue, reason)
  }

  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    onComplete?(error)
  }
}

public class ArgusSocket: HybridArgusSocketSpec {
  public var onOpen: Variant_______Void_NullType = .second(NullType()) {
    didSet { scheduleFlush() }
  }
  public var onMessage: Variant____message__Variant_NullType_String_____data__Variant_NullType_ArrayBuffer______Void_NullType = .second(NullType()) {
    didSet { scheduleFlush() }
  }
  public var onError: Variant____code__String____message__String_____Void_NullType = .second(NullType()) {
    didSet { scheduleFlush() }
  }
  public var onClose: Variant____code__Double____reason__String_____Void_NullType = .second(NullType()) {
    didSet { scheduleFlush() }
  }

  private let task: URLSessionWebSocketTask
  private let taskDelegate = ArgusSocketTaskDelegate()
  private var pending: [SocketEvent] = []
  private var finished = false

  init(session: URLSession, request: URLRequest) {
    self.task = session.webSocketTask(with: request)
    super.init()
    taskDelegate.onOpen = { [weak self] in
      self?.enqueue(.open)
      self?.schedulePing()
    }
    taskDelegate.onClose = { [weak self] code, reason in
      let text = reason.flatMap { String(data: $0, encoding: .utf8) } ?? ""
      self?.finish(.closed(code: Double(code), reason: text))
    }
    taskDelegate.onComplete = { [weak self] error in
      self?.complete(with: error)
    }
    task.delegate = taskDelegate
    task.resume()
    receiveLoop()
  }

  private func receiveLoop() {
    task.receive { [weak self] result in
      guard let self else { return }
      switch result {
      case .success(let message):
        switch message {
        case .string(let text):
          self.enqueue(.text(text))
        case .data(let data):
          if let buffer = try? ArrayBuffer.copy(data: data) {
            self.enqueue(.binary(buffer))
          }
        @unknown default:
          break
        }
        self.receiveLoop()
      case .failure(let error):
        self.complete(with: error)
      }
    }
  }

  private func complete(with error: Error?) {
    let status = (task.response as? HTTPURLResponse)?.statusCode
    if status == 401 {
      finish(.failure(code: "UNAUTHORIZED", message: "WebSocket authorization failed"))
      return
    }
    if let error {
      finish(.failure(code: "NETWORK_ERROR", message: error.localizedDescription))
      return
    }
    finish(.closed(code: Double(task.closeCode.rawValue), reason: ""))
  }

  private func finish(_ event: SocketEvent) {
    DispatchQueue.main.async {
      guard !self.finished else { return }
      self.finished = true
      self.pending.append(event)
      self.flush()
    }
  }

  private func enqueue(_ event: SocketEvent) {
    DispatchQueue.main.async {
      guard !self.finished else { return }
      self.pending.append(event)
      self.flush()
    }
  }

  private func scheduleFlush() {
    DispatchQueue.main.async { self.flush() }
  }

  private func flush() {
    while let event = pending.first {
      guard deliver(event) else { return }
      pending.removeFirst()
    }
  }

  private func deliver(_ event: SocketEvent) -> Bool {
    switch event {
    case .open:
      guard case .first(let callback) = onOpen else { return false }
      callback()
    case .text(let text):
      guard case .first(let callback) = onMessage else { return false }
      callback(.second(text), .first(NullType()))
    case .binary(let buffer):
      guard case .first(let callback) = onMessage else { return false }
      callback(.first(NullType()), .second(buffer))
    case .failure(let code, let message):
      guard case .first(let callback) = onError else { return false }
      callback(code, message)
    case .closed(let code, let reason):
      guard case .first(let callback) = onClose else { return false }
      callback(code, reason)
    }
    return true
  }

  private func schedulePing() {
    DispatchQueue.main.asyncAfter(deadline: .now() + pingIntervalSeconds) { [weak self] in
      guard let self, !self.finished else { return }
      self.task.sendPing { [weak self] error in
        if let error {
          self?.complete(with: error)
        }
      }
      self.schedulePing()
    }
  }

  public func sendText(message: String) throws {
    task.send(.string(message)) { _ in }
  }

  public func sendBinary(data: ArrayBuffer) throws {
    let bytes = data.toData(copyIfNeeded: true)
    task.send(.data(bytes)) { _ in }
  }

  public func close(code: Double?, reason: String?) throws {
    let closeCode = code.flatMap { URLSessionWebSocketTask.CloseCode(rawValue: Int($0)) } ?? .normalClosure
    task.cancel(with: closeCode, reason: reason?.data(using: .utf8))
  }
}
