import ExpoModulesCore

public class PocktDialModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PocktDial")

    View(PocktDialView.self) {
      Events("onBpm", "onCenterTap", "onRingTap", "onTurn")
      Prop("bpm") { (view: PocktDialView, value: Double?) in
        if let value {
          view.applyBpm(value)
        }
      }
      Prop("playing") { (view: PocktDialView, value: Bool?) in
        view.applyPlaying(value == true)
      }
      Prop("invert") { (view: PocktDialView, value: Bool?) in
        view.applyInvert(value == true)
      }
      Prop("haptic") { (view: PocktDialView, value: Bool?) in
        view.applyHaptics(value != false)
      }
      Prop("innerFraction") { (view: PocktDialView, value: Double?) in
        view.applyInnerFraction(value)
      }
      Prop("face") { (view: PocktDialView, value: String?) in
        view.applyFace(value)
      }
    }
  }
}
