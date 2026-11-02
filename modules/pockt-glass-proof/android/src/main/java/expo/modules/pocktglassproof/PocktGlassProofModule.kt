package expo.modules.pocktglassproof

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PocktGlassProofModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PocktGlassProof")

    View(PocktGlassProofView::class) {}
  }
}
