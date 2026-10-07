export type Command = 'left' | 'right' | 'jump' | 'slide' | 'pause';

const KEYMAP: Record<string, Command> = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyW: 'jump',
  ArrowUp: 'jump',
  Space: 'jump',
  KeyS: 'slide',
  ArrowDown: 'slide',
  Escape: 'pause',
  KeyP: 'pause',
};

/** Collects commands with timestamps; the sim drains them each tick (supports input buffering). */
export class Input {
  private queue: Array<{ cmd: Command; time: number }> = [];

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const cmd = KEYMAP[e.code];
      if (!cmd) return;
      e.preventDefault();
      this.push(cmd);
    });
  }

  push(cmd: Command): void {
    this.queue.push({ cmd, time: performance.now() });
  }

  /** Remove and return commands younger than maxAgeMs; older ones are dropped. */
  drain(maxAgeMs = 120): Command[] {
    const now = performance.now();
    const out = this.queue.filter((q) => now - q.time <= maxAgeMs).map((q) => q.cmd);
    this.queue.length = 0;
    return out;
  }
}
