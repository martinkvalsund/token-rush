import { TUNING } from '../data/tuning';
import type { Command } from './input';

const G = TUNING.input;

/**
 * Turns macOS trackpad two-finger swipes (wheel events with an inertia tail) into single
 * commands: accumulate deltas until a threshold, fire once, then stay locked until the
 * lock time has passed and the inertia has died down.
 */
export class WheelSwipe {
  private ax = 0;
  private ay = 0;
  private lockedUntil = 0;
  private lastTime = 0;
  private lastMag = 0;
  sensitivity = 1;

  feed(dx: number, dy: number, timeMs: number): Command | null {
    const mag = Math.hypot(dx, dy);
    const sinceLast = timeMs - this.lastTime;
    this.lastTime = timeMs;
    if (sinceLast > 120) {
      // A pause means a new gesture.
      this.ax = 0;
      this.ay = 0;
    }
    if (timeMs < this.lockedUntil || this.lastMag > 0) {
      // Still locked: wait for the inertia tail to decay well below the firing level.
      const decayed = mag < this.lastMag / G.swipeDecay || mag < 2 || sinceLast > 120;
      if (timeMs >= this.lockedUntil && decayed) {
        this.lastMag = 0;
        this.ax = 0;
        this.ay = 0;
      } else {
        this.lastMag = Math.max(mag, this.lastMag * 0.9);
        return null;
      }
    }
    this.ax += dx;
    this.ay += dy;
    const threshold = G.swipeThreshold / this.sensitivity;
    if (Math.abs(this.ax) < threshold && Math.abs(this.ay) < threshold) return null;
    let cmd: Command;
    if (Math.abs(this.ax) > Math.abs(this.ay)) cmd = this.ax > 0 ? 'right' : 'left';
    else cmd = this.ay > 0 ? 'slide' : 'jump';
    this.ax = 0;
    this.ay = 0;
    this.lockedUntil = timeMs + G.swipeLockMs;
    this.lastMag = Math.max(mag, 1);
    return cmd;
  }
}

/**
 * One-finger trackpad flicks without clicking: fast pointer movement (pointer-locked while
 * playing, so the cursor never hits the screen edge). Movement fades out quickly, so slow
 * drifting never fires; after firing, the finger has to pause before the next flick.
 */
export class FlickSwipe {
  private ax = 0;
  private ay = 0;
  private last = 0;
  private armed = true;
  private lockedUntil = 0;
  sensitivity = 1;

  feed(dx: number, dy: number, timeMs: number): Command | null {
    const gap = Math.max(0, timeMs - this.last);
    this.last = timeMs;
    const decay = Math.exp(-gap / G.flickWindowMs);
    this.ax = this.ax * decay + dx;
    this.ay = this.ay * decay + dy;
    if (!this.armed) {
      // Re-arm once the finger has (nearly) stopped.
      const speed = Math.hypot(dx, dy) / Math.max(gap, 1);
      if (timeMs >= this.lockedUntil && (speed < 0.25 || gap > 100)) {
        this.armed = true;
        this.ax = dx;
        this.ay = dy;
      }
      return null;
    }
    const threshold = G.flickThreshold / this.sensitivity;
    if (Math.abs(this.ax) < threshold && Math.abs(this.ay) < threshold) return null;
    const cmd: Command =
      Math.abs(this.ax) > Math.abs(this.ay)
        ? this.ax > 0
          ? 'right'
          : 'left'
        : this.ay > 0
          ? 'slide'
          : 'jump';
    this.ax = 0;
    this.ay = 0;
    this.armed = false;
    this.lockedUntil = timeMs + G.swipeLockMs;
    return cmd;
  }
}

/** Touchscreen drag swipes: one command per drag once it passes a pixel threshold. */
export class PointerSwipe {
  private start: { x: number; y: number } | null = null;
  private fired = false;
  sensitivity = 1;

  down(x: number, y: number): void {
    this.start = { x, y };
    this.fired = false;
  }

  move(x: number, y: number): Command | null {
    if (!this.start || this.fired) return null;
    const dx = x - this.start.x;
    const dy = y - this.start.y;
    const t = G.pointerSwipePx / this.sensitivity;
    if (Math.abs(dx) < t && Math.abs(dy) < t) return null;
    this.fired = true;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'slide' : 'jump';
  }

  up(): void {
    this.start = null;
  }
}

/**
 * Wire the recognisers to the DOM.
 * - Two-finger trackpad swipes (wheel events) always work.
 * - One-finger flicks (no click) work in the trackpad scheme while `flicking()` is true.
 * - Touchscreen drags work everywhere; mouse/trackpad drags with a click are ignored.
 */
export function installGestures(
  target: HTMLElement,
  emit: (cmd: Command) => void,
  config: () => { trackpad: boolean; sensitivity: number; flicking: boolean },
): void {
  const wheel = new WheelSwipe();
  const flick = new FlickSwipe();
  const touch = new PointerSwipe();
  window.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault(); // stop macOS history swipes and page scroll
      wheel.sensitivity = config().sensitivity;
      const scale = e.deltaMode === 1 ? 16 : 1;
      const cmd = wheel.feed(e.deltaX * scale, e.deltaY * scale, e.timeStamp);
      if (cmd) emit(cmd);
    },
    { passive: false },
  );
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') {
      const cmd = touch.move(e.clientX, e.clientY);
      if (cmd) emit(cmd);
      return;
    }
    const cfg = config();
    if (!cfg.trackpad || !cfg.flicking) return;
    flick.sensitivity = cfg.sensitivity;
    const cmd = flick.feed(e.movementX, e.movementY, e.timeStamp);
    if (cmd) emit(cmd);
  });
  target.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    touch.sensitivity = config().sensitivity;
    touch.down(e.clientX, e.clientY);
  });
  for (const ev of ['pointerup', 'pointercancel'] as const)
    target.addEventListener(ev, () => touch.up());
}

/** Capture the pointer while playing with the trackpad scheme (hides the cursor, no edges). */
export function setPointerCapture(target: HTMLElement, on: boolean): void {
  try {
    if (on && document.pointerLockElement !== target) {
      const r = target.requestPointerLock() as unknown;
      if (r instanceof Promise) r.catch(() => undefined);
    } else if (!on && document.pointerLockElement) {
      document.exitPointerLock();
    }
  } catch {
    // Pointer lock unavailable: flicks still work from plain cursor movement.
  }
}
