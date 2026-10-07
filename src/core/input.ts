export type Command = 'left' | 'right' | 'jump' | 'slide' | 'pause' | 'mute' | 'confirm';

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
  KeyM: 'mute',
  Enter: 'confirm',
};

/**
 * Turns keyboard events into commands and hands them to a listener immediately.
 * Buffering lives in the sim (it knows when a command becomes legal).
 */
export class Input {
  private listener: (cmd: Command, source: 'key' | 'swipe') => void = () => undefined;

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey) return;
      const cmd = KEYMAP[e.code];
      if (!cmd) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT') return;
      e.preventDefault();
      this.listener(cmd, 'key');
    });
  }

  onCommand(fn: (cmd: Command, source: 'key' | 'swipe') => void): void {
    this.listener = fn;
  }

  /** Used by gesture recognisers and the bot. */
  emit(cmd: Command, source: 'key' | 'swipe' = 'swipe'): void {
    this.listener(cmd, source);
  }
}
