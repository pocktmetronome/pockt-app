/**
 * Expo Modules registers a Fabric component as:
 *   ViewManagerAdapter_<ModuleName>                 for the first View() in the module
 *   ViewManagerAdapter_<ModuleName>_<ViewName>      for every later View()
 *
 * requireNativeViewManager(moduleName, viewName?) must use those names.
 * Build 156 asked for ViewManagerAdapter_PocktDialControl. iOS exported
 * ViewManagerAdapter_PocktControls. Fabric then drew the red fallback.
 */

export type RequiredNativeView = {
  role: 'PocktDialControl' | 'PocktMechButton' | 'PocktLampView' | 'PocktReadout';
  moduleName: 'PocktControls';
  /** Omitted for the module's default (first) view. */
  viewName?: 'PocktMechButton' | 'PocktLampView' | 'PocktReadout';
};

export const REQUIRED_NATIVE_VIEWS: RequiredNativeView[] = [
  { role: 'PocktDialControl', moduleName: 'PocktControls' },
  { role: 'PocktMechButton', moduleName: 'PocktControls', viewName: 'PocktMechButton' },
  { role: 'PocktLampView', moduleName: 'PocktControls', viewName: 'PocktLampView' },
  { role: 'PocktReadout', moduleName: 'PocktControls', viewName: 'PocktReadout' },
];

export function fabricComponentName(view: RequiredNativeView): string {
  return view.viewName
    ? `ViewManagerAdapter_${view.moduleName}_${view.viewName}`
    : `ViewManagerAdapter_${view.moduleName}`;
}

type ExpoRuntime = {
  getViewConfig?: (moduleName: string, viewName?: string | null) => { validAttributes?: object } | null;
};

function expoRuntime(): ExpoRuntime | undefined {
  return (globalThis as { expo?: ExpoRuntime }).expo;
}

/** Names of required views whose Expo view config is missing. Empty means the registry exported them. */
export function missingNativeViews(): string[] {
  const expo = expoRuntime();
  if (!expo?.getViewConfig) {
    return REQUIRED_NATIVE_VIEWS.map((view) => fabricComponentName(view));
  }
  return REQUIRED_NATIVE_VIEWS.filter((view) => {
    const config = expo.getViewConfig?.(view.moduleName, view.viewName ?? null);
    return !config;
  }).map((view) => `${view.role} (${fabricComponentName(view)})`);
}
