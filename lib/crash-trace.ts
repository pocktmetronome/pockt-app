import PocktTiming from '@/modules/pockt-timing';

/**
 * Crash-identity breadcrumbs for the next physical-device build.
 * These never swallow exceptions. A failed log must not hide a crash.
 */
export type CrashIdentity =
  | 'boot'
  | 'ident-done'
  | 'first-use-selector'
  | 'resume-pocket'
  | 'pocket-enter'
  | 'pocket-leave'
  | 'play'
  | 'stop'
  | 'bpm'
  | 'tuner-enter'
  | 'tuner-exit'
  | 'app-background'
  | 'app-foreground'
  | 'native-tick'
  | 'native-tick-ui-fail'
  | 'native-listener-fail'
  | 'non-finite-visual'
  | 'pendulum-angle'
  | 'pendulum-align'
  | 'pulse-rotary'
  | 'session-recover'
  | 'session-healthy'
  | 'detent-audio-fail'
  | 'unhandled';

let installed = false;

export function crashBreadcrumb(identity: CrashIdentity | string, extra?: Record<string, unknown>): void {
  const payload = extra ? JSON.stringify(extra) : '';
  console.error(`[POCKT CRASH] ${identity}${payload ? ` ${payload}` : ''}`);
  try {
    PocktTiming?.logBreadcrumb?.(identity, extra ?? {});
  } catch {
    /* logging must never become a crash source */
  }
}

export function finiteOr(value: number, fallback: number, identity: string): number {
  if (Number.isFinite(value)) return value;
  crashBreadcrumb('non-finite-visual', { identity, value });
  return fallback;
}

export function installCrashInstrumentation(): void {
  if (installed) return;
  installed = true;
  crashBreadcrumb('boot', { t: Date.now() });
  const globalError = globalThis as typeof globalThis & {
    ErrorUtils?: {
      getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
      setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
    };
  };
  const utils = globalError.ErrorUtils;
  if (!utils?.getGlobalHandler || !utils.setGlobalHandler) return;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    const err = error instanceof Error ? error : new Error(String(error));
    crashBreadcrumb('unhandled', {
      fatal: isFatal === true,
      message: err.message,
      stack: err.stack?.slice(0, 1200),
    });
    previous?.(error, isFatal);
  });
}
