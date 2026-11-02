import CoreText
import UIKit

enum PocktDialFace {
  /// Square atlas painted in the rest pose (120 at 12 o'clock). Nil on failure — caller must stay inert-safe.
  static func makeAtlas(size: CGFloat) -> CGImage? {
    let dim = max(256, min(2048, size.rounded()))
    let format = UIGraphicsImageRendererFormat.default()
    format.opaque = false
    format.scale = 1
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: dim, height: dim), format: format)
    let image = renderer.image { ctx in
      let cg = ctx.cgContext
      cg.clear(CGRect(x: 0, y: 0, width: dim, height: dim))
      let center = CGPoint(x: dim / 2, y: dim / 2)
      /// Atlas edge maps to FACE_R_Q (plate outer). Ticks sit on the recessed plate.
      let half = dim * 0.5
      let innerFrac = PocktDialTuning.plateInnerQ / PocktDialTuning.plateOuterQ
      let tickOuter = half * 0.985
      let tickInner = half * innerFrac * 1.015
      let gold = UIColor(red: 0.90, green: 0.68, blue: 0.28, alpha: 1)

      for bpm in PocktDialTuning.marks {
        let dial = PocktDialScale.angleFromBpm(Double(bpm))
        let world = CGFloat.pi / 2 - dial
        let major = bpm == 120 || bpm == 20 || bpm == 400
        let inner = major ? tickInner : tickInner + (tickOuter - tickInner) * 0.18
        let outer = tickOuter
        cg.setStrokeColor(gold.withAlphaComponent(major ? 0.95 : 0.72).cgColor)
        cg.setLineWidth(major ? dim * 0.007 : dim * 0.004)
        cg.setLineCap(.round)
        cg.beginPath()
        cg.move(to: CGPoint(
          x: center.x + cos(world) * inner,
          y: center.y - sin(world) * inner
        ))
        cg.addLine(to: CGPoint(
          x: center.x + cos(world) * outer,
          y: center.y - sin(world) * outer
        ))
        cg.strokePath()

        let label = "\(bpm)"
        let fontSize: CGFloat = bpm == 120 ? dim * 0.055 : dim * 0.032
        let font = UIFont.monospacedDigitSystemFont(ofSize: fontSize, weight: bpm == 120 ? .semibold : .regular)
        let attrs: [NSAttributedString.Key: Any] = [
          .font: font,
          .foregroundColor: gold.withAlphaComponent(bpm == 120 ? 1 : 0.88)
        ]
        let text = NSAttributedString(string: label, attributes: attrs)
        let textSize = text.size()
        let textR = (inner + outer) * 0.52
        let p = CGPoint(
          x: center.x + cos(world) * textR - textSize.width / 2,
          y: center.y - sin(world) * textR - textSize.height / 2
        )
        text.draw(at: p)
      }

      let bpmAttrs: [NSAttributedString.Key: Any] = [
        .font: UIFont.systemFont(ofSize: dim * 0.018, weight: .semibold),
        .foregroundColor: gold.withAlphaComponent(0.7),
        .kern: 2.4
      ]
      let bpmText = NSAttributedString(string: "BPM", attributes: bpmAttrs)
      let bpmSize = bpmText.size()
      bpmText.draw(at: CGPoint(x: center.x - bpmSize.width / 2, y: center.y - tickOuter * 0.62))

      let wordAttrs: [NSAttributedString.Key: Any] = [
        .font: UIFont.systemFont(ofSize: dim * 0.028, weight: .regular),
        .foregroundColor: UIColor(white: 0.72, alpha: 0.82),
        .kern: 6
      ]
      let word = NSAttributedString(string: "POCKT", attributes: wordAttrs)
      let wordSize = word.size()
      word.draw(at: CGPoint(x: center.x - wordSize.width / 2, y: center.y + tickInner * 0.42))

      let subAttrs: [NSAttributedString.Key: Any] = [
        .font: UIFont.systemFont(ofSize: dim * 0.014, weight: .medium),
        .foregroundColor: UIColor(white: 0.55, alpha: 0.7),
        .kern: 3.6
      ]
      let sub = NSAttributedString(string: "METRONOME", attributes: subAttrs)
      let subSize = sub.size()
      sub.draw(at: CGPoint(x: center.x - subSize.width / 2, y: center.y + tickInner * 0.42 + wordSize.height + dim * 0.008))
    }
    return image.cgImage
  }
}
