package expo.modules.pocktdial

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PocktDialModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PocktDial")

    View(PocktDialView::class) {
      Events("onBpm", "onCenterTap")
      Prop("bpm") { _: PocktDialView, _: Double? -> }
      Prop("playing") { _: PocktDialView, _: Boolean? -> }
      Prop("invert") { _: PocktDialView, _: Boolean? -> }
      Prop("haptic") { _: PocktDialView, _: Boolean? -> }
    }
  }
}
