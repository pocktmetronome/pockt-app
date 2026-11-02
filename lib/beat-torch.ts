/**
 * Rear-torch output follower. Never owns musical time.
 * The native clock remains master; this only pulses hardware after a beat.
 */
type Listener = (on: boolean) => void;

export const TORCH_MIN_GAP_MS = 90;

export function shouldPulseTorch(now: number, lastPulseAt: number, minGapMs = TORCH_MIN_GAP_MS): boolean {
  return now - lastPulseAt >= minGapMs;
}

class BeatTorchController {
  private enabled = false;
  private lit = false;
  private listener: Listener | null = null;
  private offTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPulseAt = 0;

  setListener(listener: Listener | null) {
    this.listener = listener;
    if (!listener) this.forceOff();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.forceOff();
  }

  notePrimaryBeat() {
    if (!this.enabled) return;
    const now = Date.now();
    if (!shouldPulseTorch(now, this.lastPulseAt)) return;
    this.lastPulseAt = now;
    this.pulse();
  }

  forceOff() {
    this.lastPulseAt = 0;
    if (this.offTimer) {
      clearTimeout(this.offTimer);
      this.offTimer = null;
    }
    if (!this.lit) {
      this.listener?.(false);
      return;
    }
    this.lit = false;
    this.listener?.(false);
  }

  private pulse() {
    if (this.offTimer) {
      clearTimeout(this.offTimer);
      this.offTimer = null;
    }
    this.lit = true;
    this.listener?.(true);
    this.offTimer = setTimeout(() => {
      this.offTimer = null;
      this.lit = false;
      this.listener?.(false);
    }, 42);
  }
}

export const beatTorch = new BeatTorchController();
