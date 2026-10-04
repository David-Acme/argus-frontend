import NitroModules
import UIKit

public final class HybridArgusCameraView: HybridArgusCameraViewSpec {
  public var view: CameraPlayerUIView = CameraPlayerUIView(frame: .zero)

  public var active: Bool = true {
    didSet { view.setActive(active) }
  }

  public var muted: Bool = true

  public func resetStream() throws {
    view.reset()
  }

  public func pushFragment(
    type: Double,
    keyframe: Bool,
    data: ArrayBuffer
  ) throws {
    view.push(
      type: Int(type),
      keyframe: keyframe,
      data: data.toData(copyIfNeeded: true))
  }

  public func bufferedBytes() throws -> Double {
    Double(view.buffered())
  }
}
