import ExpoModulesCore

public class PocktGlassProofModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PocktGlassProof")

    View(PocktGlassProofView.self) {
      Events("onSettle")
      Prop("detentCount") { (view: PocktGlassProofView, value: Int?) in
        if let value {
          view.applyDetentCount(value)
        }
      }
    }
  }
}
