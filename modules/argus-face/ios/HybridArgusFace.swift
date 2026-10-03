import Foundation
import NitroModules
import UIKit
import Vision

@objc(HybridArgusFace)
class HybridArgusFace: HybridArgusFaceSpec {
  func detectFaces(jpegUri: String) throws -> Promise<FaceFrame> {
    return Promise.async {
      let path = jpegUri.replacingOccurrences(of: "file://", with: "")
      guard let image = UIImage(contentsOfFile: path), let cgImage = image.cgImage else {
        return FaceFrame(luminance: 0, faces: [])
      }

      let request = VNDetectFaceRectanglesRequest()
      request.usesCPUOnly = false
      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      try handler.perform([request])

      let luminance = Self.averageLuminance(cgImage: cgImage)
      guard let observations = request.results else {
        return FaceFrame(luminance: luminance, faces: [])
      }
      let faces = observations.map { face in
        let b = face.boundingBox
        return FaceDetection(
          bounds: FaceBounds(
            x: Double(b.origin.x),
            y: Double(1.0 - b.origin.y - b.size.height),
            width: Double(b.size.width),
            height: Double(b.size.height)
          ),
          yawDeg: Double(face.yaw?.doubleValue ?? 0) * 180.0 / .pi,
          pitchDeg: Double(face.pitch?.doubleValue ?? 0) * 180.0 / .pi,
          rollDeg: Double(face.roll?.doubleValue ?? 0) * 180.0 / .pi,
          leftEyeOpenProbability: 0,
          rightEyeOpenProbability: 0,
          leftEye: nil,
          rightEye: nil,
          nose: nil,
          mouth: nil
        )
      }
      return FaceFrame(luminance: luminance, faces: faces)
    }
  }

  private static func averageLuminance(cgImage: CGImage) -> Double {
    let width = cgImage.width
    let height = cgImage.height
    guard width > 0, height > 0,
      let data = cgImage.dataProvider?.data,
      let bytes = CFDataGetBytePtr(data) else {
      return 0
    }
    let bytesPerRow = cgImage.bytesPerRow
    let bpp = cgImage.bitsPerPixel / 8
    var sum = 0.0
    var count = 0
    var y = 0
    while y < height {
      var x = 0
      while x < width {
        let offset = y * bytesPerRow + x * bpp
        let r = Int(bytes[offset])
        let g = Int(bytes[offset + 1])
        let b = Int(bytes[offset + 2])
        sum += Double(r * 299 + g * 587 + b * 114) / 1000
        count += 1
        x += 4
      }
      y += 4
    }
    return count > 0 ? sum / Double(count) : 0
  }
}