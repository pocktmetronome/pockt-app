/**
 * When to ask for an App Store rating: only after Stop, only after three real practice sessions
 * (2+ minutes of playing each), never on the first day, at most once per app version, and never
 * right after something went wrong. Apple's sheet is shown by iOS, which may still choose not to.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import PocktTiming from '@/modules/pockt-timing';

const KEY = 'pockt.review.v1';
const MIN_SESSION_S = 120;
const MIN_SESSIONS = 3;
const MIN_AGE_MS = 24 * 60 * 60 * 1000;

type State = { firstUse: number; sessions: number; askedVersion: string | null; troubleAt: number };

async function load(): Promise<State> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return { firstUse: Date.now(), sessions: 0, askedVersion: null, troubleAt: 0, ...(JSON.parse(raw) as Partial<State>) };
  } catch {
    // fall through to a fresh record
  }
  return { firstUse: Date.now(), sessions: 0, askedVersion: null, troubleAt: 0 };
}

async function save(s: State) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // a rating prompt is never worth an error
  }
}

/** Something went wrong (a reset face, a looper or tuner error): no prompt for the rest of the day. */
export async function noteTrouble() {
  const s = await load();
  s.troubleAt = Date.now();
  await save(s);
}

/** Call when playback stops, with how long it ran. */
export async function notePracticeStopped(playedSeconds: number) {
  const s = await load();
  const now = Date.now();
  if (playedSeconds >= MIN_SESSION_S) s.sessions += 1;
  const version = Constants.expoConfig?.version ?? 'unknown';
  const ready =
    s.sessions >= MIN_SESSIONS &&
    now - s.firstUse >= MIN_AGE_MS &&
    s.askedVersion !== version &&
    now - s.troubleAt > MIN_AGE_MS &&
    playedSeconds >= MIN_SESSION_S;
  if (ready) s.askedVersion = version;
  await save(s);
  if (!ready) return;
  // a beat after Stop, so it never lands on the button press itself
  setTimeout(() => {
    void PocktTiming?.requestReview?.().catch(() => undefined);
  }, 1200);
}
