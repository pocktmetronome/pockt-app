/**
 * When to ask for an App Store rating: once the player has actually used the thing for a while.
 * Counts TOTAL playing time across every run rather than one unbroken stretch, because real practice
 * is start-stop-adjust-start and almost nobody plays two minutes straight. Never on first launch,
 * never right after something went wrong, at most once per app version. Apple's sheet is shown by
 * iOS, which may still choose not to, and iOS caps it at three prompts per user per year.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import PocktTiming from '@/modules/pockt-timing';

const KEY = 'pockt.review.v1';
/** Total playing time, across any number of runs, before we ask. */
const MIN_TOTAL_S = 90;
/** Ignore taps that were obviously not practice, so a dozen one-second presses don't add up to a prompt. */
const MIN_RUN_S = 5;
/** Not on first launch; an hour is enough to know they came back to it. */
const MIN_AGE_MS = 60 * 60 * 1000;
/** After an error, stay quiet for a bit — but not for a whole day. */
const TROUBLE_QUIET_MS = 2 * 60 * 60 * 1000;

type State = { firstUse: number; totalSeconds: number; askedVersion: string | null; troubleAt: number };

async function load(): Promise<State> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State> & { sessions?: number };
      return {
        firstUse: saved.firstUse ?? Date.now(),
        // carry anyone who was part-way through the old three-session rule
        totalSeconds: saved.totalSeconds ?? (saved.sessions ?? 0) * 120,
        askedVersion: saved.askedVersion ?? null,
        troubleAt: saved.troubleAt ?? 0,
      };
    }
  } catch {
    // fall through to a fresh record
  }
  return { firstUse: Date.now(), totalSeconds: 0, askedVersion: null, troubleAt: 0 };
}

async function save(s: State) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // a rating prompt is never worth an error
  }
}

/** Call once at launch: starts the first-use clock then, not at the first Stop. */
export async function noteAppOpened() {
  try {
    if (await AsyncStorage.getItem(KEY)) return;
  } catch {
    return;
  }
  await save(await load());
}

/** Something went wrong (a reset face, a looper or tuner error): no prompt for a couple of hours. */
export async function noteTrouble() {
  const s = await load();
  s.troubleAt = Date.now();
  await save(s);
}

/** Call when playback stops, with how long that run lasted. */
export async function notePracticeStopped(playedSeconds: number) {
  const s = await load();
  const now = Date.now();
  if (playedSeconds >= MIN_RUN_S) s.totalSeconds += playedSeconds;
  const version = Constants.expoConfig?.version ?? 'unknown';
  const ready =
    s.totalSeconds >= MIN_TOTAL_S &&
    now - s.firstUse >= MIN_AGE_MS &&
    s.askedVersion !== version &&
    now - s.troubleAt > TROUBLE_QUIET_MS;
  if (ready) s.askedVersion = version;
  await save(s);
  if (!ready) return;
  // a beat after Stop, so it never lands on the button press itself
  setTimeout(() => {
    void PocktTiming?.requestReview?.().catch(() => undefined);
  }, 1200);
}
