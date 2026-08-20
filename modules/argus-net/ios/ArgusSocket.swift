import Foundation
import NitroModules

public class ArgusSocket: HybridArgusSocketSpec {
  public var onOpen: Variant_______Void_NullType = .second(NullType())
  public var onMessage: Variant____message__Variant_NullType_String_____data__Variant_NullType_ArrayBuffer______Void_NullType = .second(NullType())
  public var onError: Variant____code__String____message__String_____Void_NullType = .second(NullType())
  public var onClose: Variant____code__Double____reason__String_____Void_NullType = .second(NullType())

  private let task: URLSessionWebSocketTask

  init(session: URLSession, request: URLRequest) {
    self.task = session.webSocketTask(with: request)
    self.task.resume()
    receiveLoop()
  }

  private func receiveLoop() {
    task.receive { [weak self] result in
      guard let self else { return }
      switch result {
      case .success(let message):
        switch message {
        case .string(let text):
          DispatchQueue.main.async {
            self.onMessage.asType()?(.second(text), .first(NullType()))
          }
        case .data(let data):
          if let buffer = try? ArrayBuffer.copy(data: data) {
            DispatchQueue.main.async {
              self.onMessage.asType()?(.first(NullType()), .second(buffer))
            }
          }
        @unknown default:
          break
        }
        self.receiveLoop()
      case .failure(let error):
        DispatchQueue.main.async {
          self.onError.asType()?("NETWORK_ERROR", error.localizedDescription)
        }
      }
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
    let closeCode = code.flatMap { URLSessionWebSocketTask.CloseCode(rawValue: UInt16($0)) } ?? .normalClosure
    task.cancel(with: closeCode, reason: reason?.data(using: .utf8))
  }
}
