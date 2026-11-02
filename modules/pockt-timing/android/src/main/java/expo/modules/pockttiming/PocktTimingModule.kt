package expo.modules.pockttiming

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PocktTimingModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PocktTiming")

    Events("onTick", "onEngineState")

    Constant("isNativeEngine") { false }

    Constant("lookAheadSeconds") { 0.0 }

    Function("isAvailable") { false }

    Function("isRunning") { false }

    Function("visualHostSeconds") { 0.0 }

    Function("engineInfo") {
      mapOf(
        "running" to false,
        "isNativeEngine" to false,
        "platform" to "android",
        "note" to "POCKT V8.6 professional timing engine is implemented natively for iOS."
      )
    }

    AsyncFunction("prepare") { _: Map<String, String>? ->
      mapOf(
        "resourceFound" to false,
        "note" to "Native iOS engine is not available on Android."
      )
    }

    AsyncFunction("start") { _: Map<String, Any?> ->
      throw Exception("POCKT V8.6 native timing engine is iOS-only")
    }

    Function("stop") { }

    Function("setConfig") { _: Map<String, Any?> -> }

    Function("setMasterGain") { _: Double -> }

    Function("preview") { _: String, _: Double -> }

    Function("resetDiagnostics") { }

    Function("getDiagnostics") {
      mapOf(
        "measurementKind" to "unavailable",
        "note" to "Native iOS engine is not available on Android."
      )
    }

    AsyncFunction("runMathSelfTest") { _: Double, _: Double ->
      mapOf(
        "passed" to false,
        "measurementKind" to "unavailable",
        "note" to "Native iOS engine is not available on Android."
      )
    }

    AsyncFunction("runAudioSanityTest") { _: String, _: Double ->
      mapOf(
        "ok" to false,
        "note" to "Native iOS engine is not available on Android."
      )
    }

    AsyncFunction("audioSanityTest") {
      mapOf(
        "ok" to false,
        "note" to "Native iOS engine is not available on Android."
      )
    }

    AsyncFunction("metronomeSelfTest120") {
      mapOf(
        "ok" to false,
        "selfTestReady" to false,
        "note" to "Native iOS engine is not available on Android."
      )
    }

    AsyncFunction("reclaimSession") {
      mapOf(
        "ok" to false,
        "note" to "Native iOS engine is not available on Android."
      )
    }

    Function("audioProbe") {
      mapOf(
        "resourceFound" to false,
        "engineRunning" to false,
        "playerPlaying" to false,
        "note" to "Native iOS engine is not available on Android."
      )
    }

    Function("hapticLimitationNote") {
      "Native Core Haptics scheduling is iOS-only."
    }

    Function("playIdentFinalRumble") { }

    Function("stopIdentHaptics") { }

    Function("playUiDetent") { _: String, _: Boolean, _: Boolean ->
      false
    }

    Function("prepareUiDetent") { }
  }
}
