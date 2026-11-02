package expo.modules.pocktglassproof

import android.content.Context
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

class PocktGlassProofView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  init {
    setBackgroundColor(0xFF050506.toInt())
  }
}
