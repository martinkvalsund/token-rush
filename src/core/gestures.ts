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

/** Pointer/touch drag swipes: one command per drag once it passes a pixel threshold. */
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

/** Wire the recognisers to the DOM. Wheel swipes only fire when the trackpad scheme is on. */
export function installGestures(
  target: HTMLElement,
  emit: (cmd: Command) => void,
  enabled: () => { trackpad: boolean; sensitivity: number },
): void {
  const wheel = new WheelSwipe();
  const pointer = new PointerSwipe();
  window.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault(); // stop macOS history swipes and page scroll
      const cfg = enabled();
      if (!cfg.trackpad) return;
      wheel.sensitivity = cfg.sensitivity;
      const scale = e.deltaMode === 1 ? 16 : 1;
      const cmd = wheel.feed(e.deltaX * scale, e.deltaY * scale, e.timeStamp);
      if (cmd) emit(cmd);
    },
    { passive: false },
  );
  target.addEventListener('pointerdown', (e) => {
    pointer.sensitivity = enabled().sensitivity;
    pointer.down(e.clientX, e.clientY);
  });
  target.addEventListener('pointermove', (e) => {
    const cmd = pointer.move(e.clientX, e.clientY);
    if (cmd) emit(cmd);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave'] as const)
    target.addEventListener(ev, () => pointer.up());
}
