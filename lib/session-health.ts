import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Crash-recovery semantics.
 *
 * Normal exit / background: last-used Pocket restores.
 * Previous session never reached a healthy checkpoint: open the Pocket selector
 * instead of immediately re-entering a suspected crashing View.
 *
 * Settings (BPM, meter, sound, volume, haptics) are never erased.
 * Transport never auto-starts.
 */

export const SESSION_HEALTH_KEY = 'pockt.session-health.v1';
export const SESSION_HEALTHY_AFTER_MS = 2400;

export type SessionHealthRecord = {
  healthy: boolean;
  startedAt: number;
  lastRoom?: string;
};

export function shouldRecoverToSelector(previous: SessionHealthRecord | null): boolean {
  return previous != null && previous.healthy === false;
}

export async function readSessionHealth(): Promise<SessionHealthRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_HEALTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionHealthRecord;
    if (typeof parsed?.healthy !== 'boolean') return null;
    if (typeof parsed.startedAt !== 'number' || !Number.isFinite(parsed.startedAt)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function beginSession(lastRoom?: string): Promise<{ recover: boolean }> {
  const previous = await readSessionHealth();
  const recover = shouldRecoverToSelector(previous);
  await writeSessionHealth({
    healthy: false,
    startedAt: Date.now(),
    lastRoom: lastRoom ?? previous?.lastRoom,
  });
  return { recover };
}

export async function markSessionHealthy(lastRoom?: string): Promise<void> {
  const current = await readSessionHealth();
  await writeSessionHealth({
    healthy: true,
    startedAt: current?.startedAt ?? Date.now(),
    lastRoom: lastRoom ?? current?.lastRoom,
  });
}

async function writeSessionHealth(record: SessionHealthRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_HEALTH_KEY, JSON.stringify(record));
  } catch {
    /* persistence must never become a crash source */
  }
}
