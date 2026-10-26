import UIKit

enum EstelaStill {
  private static let particles = 220
  private static let seed: Int64 = 7919
  private static let modulus: Int64 = 2_147_483_647
  private static let multiplier: Int64 = 16_807
  private static let trail = 0.15
  private static let scale = 0.42
  private static let tilt = -0.25

  static func templateImage(side: CGFloat) -> UIImage {
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: side, height: side))
    let image = renderer.image { context in
      let canvas = context.cgContext
      canvas.setLineCap(.round)
      canvas.setLineWidth(max(1, side / 40))
      canvas.setStrokeColor(UIColor.white.cgColor)
      var state = seed
      let next = { () -> Double in
        state = (state * multiplier) % modulus
        return Double(state - 1) / Double(modulus - 2)
      }
      let half = Double(side) / 2
      let reach = Double(side) * scale
      for _ in 0..<particles {
        let u = next()
        let v = next() * 2 - 1
        let head = swirl(u: u, v: v, turn: 0)
        let tail = swirl(u: u, v: v, turn: -trail)
        canvas.move(to: CGPoint(x: half + tail.x * reach, y: half + tail.y * reach))
        canvas.addLine(to: CGPoint(x: half + head.x * reach, y: half + head.y * reach))
      }
      canvas.strokePath()
    }
    return image.withRenderingMode(.alwaysTemplate)
  }

  private static func swirl(u: Double, v: Double, turn: Double) -> (x: Double, y: Double) {
    let th = 0.6 + u * 4.4 + turn
    let r = 0.1 + 0.8 * u
    let x = cos(th) * r * 1.15
    let y = sin(th) * r * 0.55
    let w = (0.08 * sin(Double.pi * u) + 0.01) * v
    return (x * cos(tilt) - y * sin(tilt) + w, x * sin(tilt) + y * cos(tilt) + w * 0.6)
  }
}
